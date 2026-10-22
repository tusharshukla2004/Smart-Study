// ============================================
// Notification Model - In-app Notifications
// ============================================

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient user is required'],
    index: true
  },
  type: {
    type: String,
    enum: [
      'group_join',
      'new_message',
      'session_scheduled',
      'session_starting',
      'session_cancelled',
      'task_deadline',
      'system'
    ],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [120, 'Title cannot exceed 120 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  link: {
    type: String,
    default: '/'
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for querying user notifications quickly
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

// TTL index to automatically cleanup notifications older than 60 days (60 * 24 * 3600 = 5184000 sec)
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 5184000 });

module.exports = mongoose.model('Notification', notificationSchema);
