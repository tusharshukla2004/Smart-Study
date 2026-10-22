// ============================================
// Real-Time Study Session & Pomodoro Timer Sockets
// ============================================

const mongoose = require('mongoose');
const StudySession = require('../models/StudySession');
const StudyGroup = require('../models/StudyGroup');

// Map of active in-memory timer timeouts: sessionId -> NodeJS.Timeout
const activeTimeouts = new Map();

/**
 * Builds the canonical state payload broadcast to clients
 * @param {object} session - StudySession Mongoose document
 * @returns {object}
 */
const buildStatePayload = (session) => {
  return {
    sessionId: session._id.toString(),
    status: session.status,
    title: session.title,
    subject: session.subject,
    host: session.host,
    timer: session.timer,
    totalCycles: session.totalCycles,
    focusMinutes: session.focusMinutes,
    breakMinutes: session.breakMinutes,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    participants: (session.participants || []).filter(p => !p.leftAt).map(p => ({
      user: p.user,
      joinedAt: p.joinedAt
    })),
    serverTime: new Date()
  };
};

/**
 * Advance phase: focus <-> break or end session when all cycles complete
 */
const advancePhase = async (sessionId, io) => {
  try {
    const session = await StudySession.findById(sessionId)
      .populate('host', 'name avatar')
      .populate('participants.user', 'name avatar');

    if (!session || session.status !== 'live') {
      activeTimeouts.delete(sessionId);
      return;
    }

    const { phase, cycle } = session.timer;
    const roomName = `session:${sessionId}`;

    if (phase === 'focus') {
      if (cycle >= session.totalCycles) {
        // All cycles completed -> Auto-end session
        session.status = 'completed';
        session.endedAt = new Date();
        session.timer.phase = 'idle';
        session.timer.paused = false;

        // Close out remaining active participants
        const now = new Date();
        (session.participants || []).forEach(p => {
          if (!p.leftAt) p.leftAt = now;
        });

        await session.save();
        activeTimeouts.delete(sessionId);

        io.to(roomName).emit('session:ended', {
          sessionId,
          reason: 'completed',
          endedAt: session.endedAt
        });
        io.to(roomName).emit('session:state', buildStatePayload(session));
        return;
      }

      // Transition to break
      const breakDurationSec = (session.breakMinutes || 5) * 60;
      session.timer.phase = 'break';
      session.timer.phaseStartedAt = new Date();
      session.timer.phaseDurationSec = breakDurationSec;
      session.timer.paused = false;
      session.timer.remainingSecWhenPaused = 0;

      await session.save();

      io.to(roomName).emit('session:phaseChanged', {
        phase: 'break',
        cycle
      });
      io.to(roomName).emit('session:state', buildStatePayload(session));

      // Schedule break timeout
      schedulePhaseTimer(sessionId, breakDurationSec, io);
    } else if (phase === 'break') {
      // Transition to next focus cycle
      const nextCycle = cycle + 1;
      const focusDurationSec = (session.focusMinutes || 25) * 60;

      session.timer.phase = 'focus';
      session.timer.cycle = nextCycle;
      session.timer.phaseStartedAt = new Date();
      session.timer.phaseDurationSec = focusDurationSec;
      session.timer.paused = false;
      session.timer.remainingSecWhenPaused = 0;

      await session.save();

      io.to(roomName).emit('session:phaseChanged', {
        phase: 'focus',
        cycle: nextCycle
      });
      io.to(roomName).emit('session:state', buildStatePayload(session));

      // Schedule focus timeout
      schedulePhaseTimer(sessionId, focusDurationSec, io);
    }
  } catch (error) {
    console.error(`❌ Error advancing phase for session ${sessionId}:`, error);
  }
};

/**
 * Sets a server-side timeout to auto-advance the timer
 */
const schedulePhaseTimer = (sessionId, durationSec, io) => {
  // Clear any existing timer for this session
  if (activeTimeouts.has(sessionId)) {
    clearTimeout(activeTimeouts.get(sessionId));
  }

  const timerId = setTimeout(() => {
    advancePhase(sessionId, io);
  }, Math.max(1, durationSec) * 1000);

  activeTimeouts.set(sessionId, timerId);
};

/**
 * Register session socket events
 * @param {object} io - Socket.io server instance
 */
const registerSessionSockets = (io) => {
  io.on('connection', (socket) => {
    const user = socket.data.user;
    if (!user) return;

    /**
     * Helper to verify group membership for a given session
     */
    const verifySessionMember = async (sessionId) => {
      if (!mongoose.Types.ObjectId.isValid(sessionId)) return null;
      const session = await StudySession.findById(sessionId)
        .populate('host', 'name avatar')
        .populate('participants.user', 'name avatar');
      if (!session) return null;

      const group = await StudyGroup.findById(session.group);
      if (!group || !group.members.some(m => m.equals(user._id))) return null;

      return session;
    };

    // ---- Join Session Room ----
    socket.on('session:join', async (data, ack) => {
      const sessionId = data?.sessionId || data;
      try {
        const session = await verifySessionMember(sessionId);
        if (!session) {
          socket.emit('session:error', { message: 'Session not found or membership required.' });
          return ack?.({ success: false, message: 'Access denied.' });
        }

        const roomName = `session:${sessionId}`;
        await socket.join(roomName);

        // Add or reactivate participant (handle multi-tab duplicate joins smoothly)
        let participant = (session.participants || []).find(p =>
          String(p.user?._id || p.user) === String(user._id) && !p.leftAt
        );

        if (!participant) {
          session.participants.push({
            user: user._id,
            joinedAt: new Date(),
            leftAt: null
          });
          await session.save();
          await session.populate('participants.user', 'name avatar');

          socket.to(roomName).emit('session:participantJoined', {
            user: { _id: user._id, name: user.name, avatar: user.avatar }
          });
        }

        const state = buildStatePayload(session);
        socket.emit('session:state', state);
        io.to(roomName).emit('session:state', state);

        ack?.({ success: true, state });
      } catch (err) {
        console.error('❌ session:join error:', err.message);
        socket.emit('session:error', { message: 'Could not join session.' });
        ack?.({ success: false, message: err.message });
      }
    });

    // ---- Leave Session Room ----
    socket.on('session:leave', async (data) => {
      const sessionId = data?.sessionId || data;
      const roomName = `session:${sessionId}`;
      try {
        await socket.leave(roomName);

        // Check if user still has other open sockets in this room
        const socketsInRoom = await io.in(roomName).fetchSockets();
        const hasOtherSockets = socketsInRoom.some(s => String(s.data.user?._id) === String(user._id));

        if (!hasOtherSockets) {
          const session = await StudySession.findById(sessionId).populate('participants.user', 'name avatar');
          if (session) {
            const participant = (session.participants || []).find(p =>
              String(p.user?._id || p.user) === String(user._id) && !p.leftAt
            );
            if (participant) {
              participant.leftAt = new Date();
              await session.save();

              io.to(roomName).emit('session:participantLeft', {
                user: { _id: user._id, name: user.name }
              });
              io.to(roomName).emit('session:state', buildStatePayload(session));
            }
          }
        }
      } catch (err) {
        console.error('❌ session:leave error:', err.message);
      }
    });

    // ---- Start Session (Host Only) ----
    socket.on('session:start', async (data, ack) => {
      const sessionId = data?.sessionId || data;
      try {
        const session = await verifySessionMember(sessionId);
        if (!session) return ack?.({ success: false, message: 'Session not found.' });

        if (String(session.host?._id || session.host) !== String(user._id)) {
          socket.emit('session:error', { message: 'Only the host can start this session.' });
          return ack?.({ success: false, message: 'Host privileges required.' });
        }

        if (session.status !== 'scheduled') {
          socket.emit('session:error', { message: `Cannot start a session with status "${session.status}".` });
          return ack?.({ success: false, message: 'Session is not in scheduled state.' });
        }

        // Ensure ONLY ONE live session per group
        const existingLive = await StudySession.findOne({
          group: session.group,
          status: 'live',
          _id: { $ne: session._id }
        });
        if (existingLive) {
          socket.emit('session:error', { message: 'Another session is already live in this group.' });
          return ack?.({ success: false, message: 'A session is already active in this group.' });
        }

        const focusDurationSec = (session.focusMinutes || 25) * 60;
        session.status = 'live';
        session.startedAt = new Date();
        session.timer = {
          phase: 'focus',
          cycle: 1,
          phaseStartedAt: new Date(),
          phaseDurationSec: focusDurationSec,
          paused: false,
          remainingSecWhenPaused: 0
        };

        await session.save();
        schedulePhaseTimer(sessionId, focusDurationSec, io);

        const roomName = `session:${sessionId}`;
        const state = buildStatePayload(session);
        io.to(roomName).emit('session:state', state);
        io.to(roomName).emit('session:phaseChanged', { phase: 'focus', cycle: 1 });

        ack?.({ success: true, state });
      } catch (err) {
        console.error('❌ session:start error:', err.message);
        ack?.({ success: false, message: err.message });
      }
    });

    // ---- Pause Timer ----
    socket.on('session:pause', async (data, ack) => {
      const sessionId = data?.sessionId || data;
      try {
        const session = await verifySessionMember(sessionId);
        if (!session || session.status !== 'live') return;

        // Any member in room or host can trigger pause
        if (session.timer.paused) return ack?.({ success: true });

        // Calculate remaining seconds
        const elapsedSec = Math.floor((Date.now() - new Date(session.timer.phaseStartedAt).getTime()) / 1000);
        const remainingSec = Math.max(0, session.timer.phaseDurationSec - elapsedSec);

        // Cancel scheduled timeout
        if (activeTimeouts.has(sessionId)) {
          clearTimeout(activeTimeouts.get(sessionId));
          activeTimeouts.delete(sessionId);
        }

        session.timer.paused = true;
        session.timer.remainingSecWhenPaused = remainingSec;
        await session.save();

        const roomName = `session:${sessionId}`;
        const state = buildStatePayload(session);
        io.to(roomName).emit('session:state', state);

        ack?.({ success: true, state });
      } catch (err) {
        console.error('❌ session:pause error:', err.message);
        ack?.({ success: false, message: err.message });
      }
    });

    // ---- Resume Timer ----
    socket.on('session:resume', async (data, ack) => {
      const sessionId = data?.sessionId || data;
      try {
        const session = await verifySessionMember(sessionId);
        if (!session || session.status !== 'live' || !session.timer.paused) return;

        const remainingSec = session.timer.remainingSecWhenPaused || session.timer.phaseDurationSec;
        session.timer.paused = false;
        session.timer.phaseStartedAt = new Date();
        session.timer.phaseDurationSec = remainingSec;
        session.timer.remainingSecWhenPaused = 0;

        await session.save();
        schedulePhaseTimer(sessionId, remainingSec, io);

        const roomName = `session:${sessionId}`;
        const state = buildStatePayload(session);
        io.to(roomName).emit('session:state', state);

        ack?.({ success: true, state });
      } catch (err) {
        console.error('❌ session:resume error:', err.message);
        ack?.({ success: false, message: err.message });
      }
    });

    // ---- Skip Phase ----
    socket.on('session:skipPhase', async (data, ack) => {
      const sessionId = data?.sessionId || data;
      try {
        const session = await verifySessionMember(sessionId);
        if (!session || session.status !== 'live') return;

        if (activeTimeouts.has(sessionId)) {
          clearTimeout(activeTimeouts.get(sessionId));
          activeTimeouts.delete(sessionId);
        }

        await advancePhase(sessionId, io);
        ack?.({ success: true });
      } catch (err) {
        console.error('❌ session:skipPhase error:', err.message);
        ack?.({ success: false, message: err.message });
      }
    });

    // ---- End Session (Host Only) ----
    socket.on('session:end', async (data, ack) => {
      const sessionId = data?.sessionId || data;
      try {
        const session = await verifySessionMember(sessionId);
        if (!session) return ack?.({ success: false, message: 'Session not found.' });

        if (String(session.host?._id || session.host) !== String(user._id)) {
          socket.emit('session:error', { message: 'Only the host can end this session.' });
          return ack?.({ success: false, message: 'Host privileges required.' });
        }

        if (activeTimeouts.has(sessionId)) {
          clearTimeout(activeTimeouts.get(sessionId));
          activeTimeouts.delete(sessionId);
        }

        session.status = 'completed';
        session.endedAt = new Date();
        session.timer.phase = 'idle';
        session.timer.paused = false;

        const now = new Date();
        (session.participants || []).forEach(p => {
          if (!p.leftAt) p.leftAt = now;
        });

        await session.save();

        const roomName = `session:${sessionId}`;
        io.to(roomName).emit('session:ended', {
          sessionId,
          reason: 'host_ended',
          endedAt: session.endedAt
        });
        io.to(roomName).emit('session:state', buildStatePayload(session));

        ack?.({ success: true });
      } catch (err) {
        console.error('❌ session:end error:', err.message);
        ack?.({ success: false, message: err.message });
      }
    });

    // ---- Handle Disconnect ----
    socket.on('disconnect', async () => {
      // Find all session rooms socket was in
      for (const room of socket.rooms) {
        if (room.startsWith('session:')) {
          const sessionId = room.replace('session:', '');
          const socketsInRoom = await io.in(room).fetchSockets();
          const hasOtherSockets = socketsInRoom.some(s => String(s.data.user?._id) === String(user._id));

          if (!hasOtherSockets) {
            try {
              const session = await StudySession.findById(sessionId);
              if (session) {
                const participant = (session.participants || []).find(p =>
                  String(p.user?._id || p.user) === String(user._id) && !p.leftAt
                );
                if (participant) {
                  participant.leftAt = new Date();
                  await session.save();
                  io.to(room).emit('session:participantLeft', {
                    user: { _id: user._id, name: user.name }
                  });
                  io.to(room).emit('session:state', buildStatePayload(session));
                }
              }
            } catch (e) {
              console.error('Error handling socket disconnect leftAt:', e.message);
            }
          }
        }
      }
    });
  });
};

module.exports = {
  registerSessionSockets,
  buildStatePayload,
  advancePhase
};
