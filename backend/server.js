// ============================================
// SMART STUDY - Server Entry Point
// ============================================
// 
// Features:
// - Express REST API with full CRUD operations
// - JWT Authentication (signup/login + protected routes)
// - MongoDB via Mongoose ODM
// - Socket.io for real-time chat
// - AI Matchmaking (weighted Jaccard similarity)
// - CORS enabled for frontend integration
// ============================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const Message = require('./models/Message');

// ---- Import Routes ----
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const groupRoutes = require('./routes/groupRoutes');
const taskRoutes = require('./routes/taskRoutes');
const matchmakingRoutes = require('./routes/matchmakingRoutes');
const chatRoutes = require('./routes/chatRoutes');

// ---- Initialize Express App ----
const app = express();
const server = http.createServer(app);

// ---- Initialize Socket.io ----
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ---- Middleware ----
// Allow local frontend to access backend
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- API Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/chat', chatRoutes);

// ---- Health Check Route ----
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎓 Smart Study API is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      groups: '/api/groups',
      tasks: '/api/tasks',
      matchmaking: '/api/matchmaking',
      chat: '/api/chat'
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
// Socket.io - Real-Time Chat System
// ============================================

// Track connected users
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  // ---- User identifies themselves ----
  socket.on('register', (userData) => {
    connectedUsers.set(socket.id, {
      userId: userData.userId,
      name: userData.name,
      avatar: userData.avatar
    });
    console.log(`👤 User registered: ${userData.name} (${socket.id})`);
  });

  // ---- Join a study group chat room ----
  socket.on('joinRoom', (groupId) => {
    socket.join(groupId);
    const user = connectedUsers.get(socket.id);
    const userName = user ? user.name : 'A user';

    console.log(`📢 ${userName} joined room: ${groupId}`);

    // Notify others in the room
    socket.to(groupId).emit('userJoined', {
      message: `${userName} has joined the chat`,
      userId: user?.userId,
      name: userName,
      timestamp: new Date()
    });
  });

  // ---- Leave a study group chat room ----
  socket.on('leaveRoom', (groupId) => {
    socket.leave(groupId);
    const user = connectedUsers.get(socket.id);
    const userName = user ? user.name : 'A user';

    console.log(`👋 ${userName} left room: ${groupId}`);

    socket.to(groupId).emit('userLeft', {
      message: `${userName} has left the chat`,
      userId: user?.userId,
      name: userName,
      timestamp: new Date()
    });
  });

  // ---- Send a message ----
  socket.on('sendMessage', async (data) => {
    const { groupId, content } = data;
    const user = connectedUsers.get(socket.id);

    if (!user || !content || !groupId) return;

    try {
      // Save message to database
      const message = await Message.create({
        senderId: user.userId,
        groupId,
        senderName: user.name,
        senderAvatar: user.avatar,
        content: content.trim()
      });

      // Broadcast message to everyone in the room (including sender)
      io.to(groupId).emit('newMessage', {
        _id: message._id,
        senderId: user.userId,
        senderName: user.name,
        senderAvatar: user.avatar,
        content: message.content,
        groupId,
        createdAt: message.createdAt
      });

    } catch (error) {
      console.error('❌ Error saving message:', error.message);
      socket.emit('messageError', { message: 'Failed to send message.' });
    }
  });

  // ---- Typing indicator ----
  socket.on('typing', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user && data.groupId) {
      socket.to(data.groupId).emit('userTyping', {
        userId: user.userId,
        name: user.name,
        isTyping: data.isTyping
      });
    }
  });

  // ---- Disconnect ----
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      console.log(`❌ User disconnected: ${user.name} (${socket.id})`);
    }
    connectedUsers.delete(socket.id);
  });
});

// ============================================
// Start Server
// ============================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

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
};

startServer();
