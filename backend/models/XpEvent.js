// ============================================
// XpEvent Model - Idempotent XP Action Log
// ============================================

const mongoose = require('mongoose');

const xpEventSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  type: {
    type: String,
    enum: ['session_log', 'task_completed', 'streak_continuation', 'bonus'],
    required: [true, 'Event type is required']
  },
  points: {
    type: Number,
    required: [true, 'XP points is required'],
    min: [0, 'XP points cannot be negative']
  },
  refId: {
    type: String,
    required: [true, 'Reference ID is required']
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Unique compound index guarantees idempotency (no double XP for the same action)
xpEventSchema.index({ user: 1, type: 1, refId: 1 }, { unique: true });

// Index for weekly XP aggregations
xpEventSchema.index({ user: 1, createdAt: 1 });

module.exports = mongoose.model('XpEvent', xpEventSchema);
