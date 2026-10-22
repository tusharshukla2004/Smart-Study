// ============================================
// StudySession Model - Phase 1 Core Study Experience
// ============================================

const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudyGroup',
    required: [true, 'Study group is required'],
    index: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Host is required']
  },
  title: {
    type: String,
    required: [true, 'Session title is required'],
    trim: true,
    maxlength: [120, 'Title cannot exceed 120 characters']
  },
  subject: {
    type: String,
    trim: true,
    default: ''
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: ''
  },
  scheduledAt: {
    type: Date,
    required: [true, 'Scheduled start time is required'],
    index: true
  },
  focusMinutes: {
    type: Number,
    default: 25,
    min: [5, 'Focus duration must be at least 5 minutes'],
    max: [120, 'Focus duration cannot exceed 120 minutes']
  },
  breakMinutes: {
    type: Number,
    default: 5,
    min: [1, 'Break duration must be at least 1 minute'],
    max: [60, 'Break duration cannot exceed 60 minutes']
  },
  totalCycles: {
    type: Number,
    default: 4,
    min: [1, 'Cycles must be at least 1'],
    max: [12, 'Cycles cannot exceed 12']
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled'],
    default: 'scheduled',
    index: true
  },
  startedAt: {
    type: Date,
    default: null
  },
  endedAt: {
    type: Date,
    default: null
  },
  timer: {
    phase: {
      type: String,
      enum: ['focus', 'break', 'idle'],
      default: 'idle'
    },
    cycle: {
      type: Number,
      default: 1
    },
    phaseStartedAt: {
      type: Date,
      default: null
    },
    phaseDurationSec: {
      type: Number,
      default: 0
    },
    paused: {
      type: Boolean,
      default: false
    },
    remainingSecWhenPaused: {
      type: Number,
      default: 0
    }
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: {
      type: Date,
      default: null
    }
  }],
  rsvps: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['going', 'maybe', 'not_going'],
      default: 'going'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  reminderSent: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Index to quickly query active or upcoming sessions per group
studySessionSchema.index({ group: 1, status: 1, scheduledAt: 1 });

module.exports = mongoose.model('StudySession', studySessionSchema);
