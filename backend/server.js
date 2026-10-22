// ============================================
// SMART STUDY - Server Entry Point
// ============================================
// 
// Features:
// - Express REST API with full CRUD operations
// - JWT Authentication (signup/login + protected routes)
// - MongoDB via Mongoose ODM
// - Socket.io for real-time chat & synced study sessions (Pomodoro)
// - AI Matchmaking (weighted Jaccard similarity)
// - CORS enabled for frontend integration
// - Automated reminder jobs (node-cron)
// ============================================

const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const Message = require('./models/Message');
const StudyGroup = require('./models/StudyGroup');
const User = require('./models/User');

const { setSocketIO, createNotification, checkAndSetChatThrottle } = require('./utils/notify');
const { registerSessionSockets } = require('./sockets/sessionSocket');
const { startReminderJob } = require('./jobs/reminderJob');

const allowedOrigins = [
  'http://localhost:5173',
  'https://smart-study-8d5g.vercel.app'
];

// ---- Import Routes ----
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const groupRoutes = require('./routes/groupRoutes');
const taskRoutes = require('./routes/taskRoutes');
const matchmakingRoutes = require('./routes/matchmakingRoutes');
const chatRoutes = require('./routes/chatRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const { noteRouter } = require('./routes/noteRoutes');
const { resourceRouter } = require('./routes/resourceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const gamificationRoutes = require('./routes/gamificationRoutes');
const ratingRoutes = require('./routes/ratingRoutes');

// ---- Initialize Express App ----
const app = express();
const server = http.createServer(app);

// ---- Initialize Socket.io ----
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

// Register global Socket.io instance for notifications
setSocketIO(io);

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication required.'));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return next(new Error('Invalid or expired authentication token.'));
  }

  try {
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new Error('User not found.'));
    }

    socket.data.user = user;
    next();
  } catch (error) {
    console.error(`❌ Socket authentication lookup failed: ${error.message}`);
    next(new Error('Authentication could not be verified.'));
  }
});

// ---- Middleware ----
// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false // Allow inline scripts/styles for React frontend
}));

// Compression
app.use(compression());

// Cookie parser (for refresh tokens)
app.use(cookieParser());

// NoSQL injection sanitization
app.use(mongoSanitize());

// Request ID middleware
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});

// Rate limiting (1000 requests per 15 minutes per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', apiLimiter);

// Allow local frontend to access backend
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---- Health & Readiness Probes ----
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/ready', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (isDbConnected) {
    return res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  }
  return res.status(503).json({
    status: 'unready',
    database: 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// ---- API Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/notes', noteRouter);
app.use('/api/resources', resourceRouter);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/ratings', ratingRoutes);

// ---- Health Check Route ----
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎓 Smart Study API is running!',
    version: '1.2.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      groups: '/api/groups',
      tasks: '/api/tasks',
      matchmaking: '/api/matchmaking',
      chat: '/api/chat',
      sessions: '/api/sessions',
      notes: '/api/notes',
      resources: '/api/resources',
      notifications: '/api/notifications',
      analytics: '/api/analytics',
      gamification: '/api/gamification',
      ratings: '/api/ratings'
    }
  });
});

// ---- 404 Handler ----
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// ---- Global Error Handler (must be last middleware) ----
app.use(errorHandler);

// ============================================
// Socket.io - Real-Time Chat & Session Sockets
// ============================================

// Register session room & Pomodoro timer socket listeners
registerSessionSockets(io);

io.on('connection', (socket) => {
  const user = socket.data.user;
  console.log(`🔌 Authenticated user connected: ${user.name} (${socket.id})`);

  // Join user's personal notification room: user:<userId>
  const userPersonalRoom = `user:${user._id.toString()}`;
  socket.join(userPersonalRoom);

  const getMemberGroup = async (groupId) => {
    if (!mongoose.Types.ObjectId.isValid(groupId)) return null;
    const group = await StudyGroup.findById(groupId);
    if (!group || !group.members.some(member => member.equals(user._id))) return null;
    return group;
  };

  const emitToCurrentMembers = async (group, event, payload, excludedSocketId) => {
    const sockets = await io.in(group._id.toString()).fetchSockets();
    for (const memberSocket of sockets) {
      const memberId = memberSocket.data.user?._id;
      const isMember = memberId && group.members.some(id => id.equals(memberId));
      if (!isMember) {
        await memberSocket.leave(group._id.toString());
      } else if (memberSocket.id !== excludedSocketId) {
        memberSocket.emit(event, payload);
      }
    }
  };

  socket.on('joinRoom', async (groupId, acknowledge) => {
    try {
      const group = await getMemberGroup(groupId);
      if (!group) {
        return acknowledge?.({ success: false, message: 'Study group not found or access denied.' });
      }

      await socket.join(groupId);
      await emitToCurrentMembers(group, 'userJoined', {
        userId: user._id,
        name: user.name,
        timestamp: new Date()
      }, socket.id);
      acknowledge?.({ success: true });
    } catch (error) {
      console.error(`❌ Socket room join failed: ${error.message}`);
      acknowledge?.({ success: false, message: 'Could not join this study group.' });
    }
  });

  socket.on('leaveRoom', async (groupId) => {
    if (typeof groupId !== 'string' || !socket.rooms.has(groupId)) return;
    try {
      await socket.leave(groupId);
      const group = await getMemberGroup(groupId);
      if (group) {
        await emitToCurrentMembers(group, 'userLeft', {
          userId: user._id,
          name: user.name,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error(`❌ Socket room leave failed: ${error.message}`);
    }
  });

  socket.on('sendMessage', async (data, acknowledge) => {
    const { groupId, content } = data || {};
    if (typeof groupId !== 'string' || !socket.rooms.has(groupId)) {
      return acknowledge?.({ success: false, message: 'Join this study group before sending a message.' });
    }
    if (typeof content !== 'string' || !content.trim() || content.trim().length > 2000) {
      return acknowledge?.({ success: false, message: 'Message must contain 1 to 2000 characters.' });
    }

    try {
      const group = await getMemberGroup(groupId);
      if (!group) {
        await socket.leave(groupId);
        return acknowledge?.({ success: false, message: 'You are no longer a member of this study group.' });
      }

      const message = await Message.create({
        senderId: user._id,
        groupId,
        senderName: user.name,
        senderAvatar: user.avatar,
        content: content.trim()
      });

      await emitToCurrentMembers(group, 'newMessage', {
        _id: message._id,
        senderId: user._id,
        senderName: user.name,
        senderAvatar: user.avatar,
        content: message.content,
        groupId,
        createdAt: message.createdAt
      });

      // Dispatch notifications to offline / not-in-room group members with throttling
      const socketsInRoom = await io.in(groupId).fetchSockets();
      const userIdsInRoom = new Set(socketsInRoom.map(s => String(s.data.user?._id)));

      for (const memberId of group.members) {
        const memStr = memberId.toString();
        if (memStr !== user._id.toString() && !userIdsInRoom.has(memStr)) {
          if (checkAndSetChatThrottle(memStr, groupId)) {
            createNotification(memberId, {
              type: 'new_message',
              title: `New message in ${group.name}`,
              message: `${user.name}: ${message.content.slice(0, 80)}`,
              link: '/chat',
              data: { groupId, messageId: message._id }
            });
          }
        }
      }

      acknowledge?.({ success: true });
    } catch (error) {
      console.error(`❌ Error saving socket message: ${error.message}`);
      acknowledge?.({ success: false, message: 'Failed to send message.' });
    }
  });

  socket.on('typing', async (data) => {
    const { groupId, isTyping } = data || {};
    if (typeof groupId !== 'string' || !socket.rooms.has(groupId) || typeof isTyping !== 'boolean') return;
    try {
      const group = await getMemberGroup(groupId);
      if (!group) {
        await socket.leave(groupId);
        return;
      }
      await emitToCurrentMembers(group, 'userTyping', {
        userId: user._id,
        name: user.name,
        isTyping
      }, socket.id);
    } catch (error) {
      console.error(`❌ Socket typing event failed: ${error.message}`);
    }
  });
});

// ============================================
// Start Server
// ============================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  // Start background reminder job (every minute)
  startReminderJob();

  server.listen(PORT, () => {
    console.log('');
    console.log('============================================');
    console.log('  🎓 SMART STUDY Backend Server');
    console.log('============================================');
    console.log(`  🌐 Server:    http://localhost:${PORT}`);
    console.log(`  📡 API:       http://localhost:${PORT}/api`);
    console.log(`  🔌 Socket.io: ws://localhost:${PORT}`);
    console.log(`  🌍 Mode:      ${process.env.NODE_ENV || 'development'}`);
    console.log('============================================');
    console.log('');
  });

  // Graceful shutdown handler
  const shutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
      console.log('HTTP and Socket server closed.');
      try {
        await mongoose.connection.close(false);
        console.log('MongoDB connection closed.');
        process.exit(0);
      } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });

    // Force close after 10s if connections remain hanging
    setTimeout(() => {
      console.error('Force shutdown after timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();
