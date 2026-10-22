// ============================================
// SessionLog Model - Log of finished study sessions
// ============================================

const mongoose = require('mongoose');

const sessionLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudySession',
    required: [true, 'Session is required'],
    index: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudyGroup',
    required: [true, 'Group is required'],
    index: true
  },
  topicsStudied: {
    type: [String],
    default: []
  },
  summary: {
    type: String,
    maxlength: [500, 'Summary cannot exceed 500 characters'],
    trim: true,
    default: ''
  },
  focusRating: {
    type: Number,
    min: [1, 'Focus rating must be between 1 and 5'],
    max: [5, 'Focus rating must be between 1 and 5'],
    required: [true, 'Focus rating is required']
  },
  minutesStudied: {
    type: Number,
    required: [true, 'Minutes studied is required'],
    min: [0, 'Minutes studied cannot be negative']
  }
}, {
  timestamps: true
});

// Unique compound index so a user can log only once per session
sessionLogSchema.index({ user: 1, session: 1 }, { unique: true });

// Compound indexes for Phase 2 Analytics queries
sessionLogSchema.index({ user: 1, createdAt: 1 });
sessionLogSchema.index({ group: 1, createdAt: 1 });

module.exports = mongoose.model('SessionLog', sessionLogSchema);
