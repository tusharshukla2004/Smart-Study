// ============================================
// MatchAction Model - Phase 3 Partner Interaction
// Records connect requests, dismissals, acceptances & declinations
// ============================================

const mongoose = require('mongoose');

const matchActionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Target user is required'],
    index: true
  },
  action: {
    type: String,
    enum: ['connect_request', 'dismissed', 'accepted', 'declined'],
    required: [true, 'Action is required']
  }
}, {
  timestamps: { createdAt: true, updatedAt: true }
});

// Unique compound index: a user can only have one active relationship state per targetUser
matchActionSchema.index({ user: 1, targetUser: 1 }, { unique: true });

// Compound index for querying incoming requests for targetUser
matchActionSchema.index({ targetUser: 1, action: 1 });

module.exports = mongoose.model('MatchAction', matchActionSchema);
