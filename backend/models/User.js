// ============================================
// User Model (Phases 1, 2, and 3 Additive Schema)
// ============================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { canonicalizeSubjectProfile, normalizeSubject } = require('../utils/subjectNormalizer');

const userSchema = new mongoose.Schema({
  // Basic info
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password in queries by default
  },

  // Academic info
  university: {
    type: String,
    trim: true,
    default: ''
  },
  major: {
    type: String,
    trim: true,
    default: ''
  },
  // Academic study level (e.g. Undergraduate, Masters, PhD)
  academicLevel: {
    type: String,
    trim: true,
    default: ''
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: ''
  },

  // Study preferences (Legacy subjects array preserved)
  subjects: {
    type: [String],
    default: []
  },

  // Phase 3: Structured subject profiles
  subjectProfiles: [{
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    displayName: {
      type: String,
      trim: true
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate'
    },
    wantsToLearn: {
      type: Boolean,
      default: true
    },
    canTeach: {
      type: Boolean,
      default: false
    }
  }],

  // Phase 3: Matchmaking goals & style preferences
  learningGoal: {
    type: [{
      type: String,
      enum: ['exam_prep', 'concept_clarity', 'projects', 'revision', 'interview_prep']
    }],
    default: [],
    validate: [val => val.length <= 2, 'Cannot specify more than 2 learning goals']
  },
  studyStyle: {
    type: String,
    enum: ['silent_focus', 'discussion_heavy', 'mixed', ''],
    default: 'mixed'
  },
  timezone: {
    type: String,
    trim: true,
    default: 'Asia/Kolkata'
  },

  // Phase 3: Structured weekly availability slots (day: 0=Sun..6=Sat, minutes from midnight: 0..1439)
  availabilitySlots: [{
    day: {
      type: Number,
      min: 0,
      max: 6
    },
    startMinute: {
      type: Number,
      min: 0,
      max: 1439
    },
    endMinute: {
      type: Number,
      min: 0,
      max: 1439
    }
  }],

  // Legacy coarse availability labels (preserved and kept in sync)
  availability: {
    type: [String], // e.g., ['Morning (6am – 12pm)', 'Evening (6pm – 10pm)']
    default: []
  },
  studyPreferences: {
    type: String,
    enum: ['Morning (6am – 12pm)', 'Afternoon (12pm – 6pm)', 'Evening (6pm – 10pm)', 'Night (10pm+)', 'Flexible', ''],
    default: ''
  },

  // Avatar initials (e.g., "AJ")
  avatar: {
    type: String,
    default: ''
  },

  // Stats (tracked on frontend, stored for persistence)
  studyHours: { type: Number, default: 0 },
  groupsJoined: { type: Number, default: 0 },
  tasksCompleted: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  lastStudyDate: { type: Date, default: null },

  // Phase 2: Gamification
  xp: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },
  level: {
    type: Number,
    default: 1,
    min: 1
  },
  badges: [{
    key: {
      type: String,
      required: true
    },
    earnedAt: {
      type: Date,
      default: Date.now
    }
  }],
  longestStreak: {
    type: Number,
    default: 0,
    min: 0
  },
  leaderboardOptIn: {
    type: Boolean,
    default: true,
    index: true
  },

  // Phase 2: Reputation cache (incremental updates from PeerRating)
  ratingAvg: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  ratingCount: {
    type: Number,
    default: 0,
    min: 0
  }

}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Compound indexes
userSchema.index({ leaderboardOptIn: 1, xp: -1 });
userSchema.index({ 'subjectProfiles.name': 1 });
userSchema.index({ timezone: 1 });

// ---- Pre-save Hook: Sync subjectProfiles <-> subjects, hash password, normalize ----
userSchema.pre('save', async function (next) {
  // 1. Sync subjectProfiles and legacy subjects
  if (this.subjectProfiles && this.subjectProfiles.length > 0) {
    // Ensure every profile has a normalized name
    for (const p of this.subjectProfiles) {
      if (!p.name) p.name = normalizeSubject(p.displayName || '');
    }
    // Keep legacy subjects string array in sync
    this.subjects = [...new Set(this.subjectProfiles.map(p => p.displayName || p.name))];
  } else if (this.subjects && this.subjects.length > 0 && (!this.subjectProfiles || this.subjectProfiles.length === 0)) {
    // If legacy subjects provided but subjectProfiles empty, derive profiles
    this.subjectProfiles = this.subjects.map(s => canonicalizeSubjectProfile(s)).filter(Boolean);
  }

  // 2. If academicLevel is empty but level was passed as a string during legacy creation
  if (typeof this.level === 'string' && isNaN(Number(this.level))) {
    this.academicLevel = this.level;
    this.level = 1;
  }

  // 3. Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ---- Instance Method: Compare entered password with hashed password ----
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
