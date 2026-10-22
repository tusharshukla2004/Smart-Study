// ============================================
// PeerRating Model - Phase 2 Peer Feedback
// ============================================

const mongoose = require('mongoose');

const ALLOWED_TAGS = ['helpful', 'focused', 'good_explainer', 'punctual', 'collaborative'];

const peerRatingSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudySession',
    required: [true, 'Session is required'],
    index: true
  },
  rater: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Rater user is required'],
    index: true
  },
  ratee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Ratee user is required'],
    index: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  tags: [{
    type: String,
    enum: {
      values: ALLOWED_TAGS,
      message: '{VALUE} is not a valid peer feedback tag'
    }
  }],
  comment: {
    type: String,
    maxlength: [300, 'Comment cannot exceed 300 characters'],
    trim: true,
    default: ''
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// A user can rate each peer at most once per session
peerRatingSchema.index({ session: 1, rater: 1, ratee: 1 }, { unique: true });
// Compound index for querying a user's received ratings
peerRatingSchema.index({ ratee: 1, createdAt: -1 });

module.exports = {
  PeerRating: mongoose.model('PeerRating', peerRatingSchema),
  ALLOWED_TAGS
};
