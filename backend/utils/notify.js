// ============================================
// Notification Dispatcher & Socket Integration
// ============================================

const Notification = require('../models/Notification');

let ioInstance = null;

// In-memory throttling map for chat message notifications: `${userId}:${groupId}` => timestamp
const chatNotificationThrottle = new Map();
const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Register the global Socket.io instance
 * @param {object} io
 */
const setSocketIO = (io) => {
  ioInstance = io;
};

const getSocketIO = () => ioInstance;

/**
 * Creates a notification in MongoDB and broadcasts it over the user's personal socket room.
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {object} payload - { type, title, message, link, data }
 * @returns {Promise<Notification>}
 */
const createNotification = async (userId, payload) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type: payload.type || 'system',
      title: payload.title,
      message: payload.message,
      link: payload.link || '/',
      data: payload.data || {}
    });

    if (ioInstance) {
      const roomName = `user:${userId.toString()}`;
      ioInstance.to(roomName).emit('notification:new', {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        data: notification.data,
        read: notification.read,
        createdAt: notification.createdAt
      });
    }

    return notification;
  } catch (error) {
    console.error(`❌ Failed to create notification for user ${userId}:`, error.message);
    return null;
  }
};

/**
 * Helper to check if a chat notification should be suppressed to avoid spam.
 * Max 1 per group per user per 5 minutes.
 * @param {string} userId
 * @param {string} groupId
 * @returns {boolean} True if allowed to send, false if throttled
 */
const checkAndSetChatThrottle = (userId, groupId) => {
  const key = `${userId.toString()}:${groupId.toString()}`;
  const now = Date.now();
  const lastSent = chatNotificationThrottle.get(key);

  if (lastSent && now - lastSent < THROTTLE_MS) {
    return false; // Throttled
  }

  chatNotificationThrottle.set(key, now);

  // Periodically clean up old keys if map grows large
  if (chatNotificationThrottle.size > 2000) {
    for (const [k, time] of chatNotificationThrottle.entries()) {
      if (now - time > THROTTLE_MS) {
        chatNotificationThrottle.delete(k);
      }
    }
  }

  return true;
};

module.exports = {
  setSocketIO,
  getSocketIO,
  createNotification,
  checkAndSetChatThrottle
};
