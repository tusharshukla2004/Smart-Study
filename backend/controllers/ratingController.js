// ============================================
// Peer Rating & Feedback Controller (Phase 2 Feature C)
// Anonymized peer feedback, reputation caching & abuse protection
// ============================================

const mongoose = require('mongoose');
const { PeerRating, ALLOWED_TAGS } = require('../models/PeerRating');
const StudySession = require('../models/StudySession');
const User = require('../models/User');
const { evaluateBadges } = require('./gamificationController');
const { createNotification } = require('../utils/notify');
const { asyncHandler } = require('../utils/helpers');

// Simple profanity filter word list for basic abuse prevention
const BLOCKED_WORDS = ['spam', 'abuse', 'hate', 'idiot', 'stupid', 'scam', 'harass'];

function sanitizeComment(text) {
  if (!text || typeof text !== 'string') return '';
  let clean = text.trim().slice(0, 300);
  for (const word of BLOCKED_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    clean = clean.replace(regex, '***');
  }
  return clean;
}

/**
 * Checks if the session rating window is valid (within 7 days after session ended/completed)
 */
function isWithinRatingWindow(session) {
  const endTime = session.endedAt || session.scheduledAt || session.updatedAt;
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  return (Date.now() - new Date(endTime).getTime()) <= SEVEN_DAYS_MS;
}

/**
 * @desc    Get participants from a session that current user can still rate
 * @route   GET /api/sessions/:id/rateable
 * @access  Private
 */
const getRateableParticipants = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const session = await StudySession.findById(id).populate('participants.user', 'name avatar email');
  if (!session) {
    return res.status(404).json({ success: false, message: 'Session not found.' });
  }

  // Must have ended or be completed
  if (session.status !== 'completed' && !session.endedAt) {
    return res.status(400).json({
      success: false,
      message: 'Ratings can only be submitted for completed study sessions.'
    });
  }

  // Check 7-day expiration window
  if (!isWithinRatingWindow(session)) {
    return res.status(200).json({
      success: true,
      expired: true,
      message: 'The 7-day rating window for this session has closed.',
      rateable: []
    });
  }

  // Verify current user was a participant
  const currentIsParticipant = (session.participants || []).some(
    p => String(p.user?._id || p.user) === String(userId)
  );

  if (!currentIsParticipant) {
    return res.status(403).json({
      success: false,
      message: 'You can only rate participants of sessions you attended.'
    });
  }

  // Find participants already rated by this user for this session
  const alreadyRatedRecords = await PeerRating.find({
    session: id,
    rater: userId
  }).select('ratee');

  const alreadyRatedSet = new Set(alreadyRatedRecords.map(r => String(r.ratee)));

  // Filter out self and already rated users
  const rateable = [];
  for (const p of session.participants || []) {
    const participantUser = p.user;
    if (!participantUser) continue;
    const pId = String(participantUser._id || participantUser);

    if (pId !== String(userId) && !alreadyRatedSet.has(pId)) {
      rateable.push({
        _id: participantUser._id || pId,
        name: participantUser.name || 'Study Partner',
        avatar: participantUser.avatar || 'SP'
      });
    }
  }

  return res.status(200).json({
    success: true,
    expired: false,
    rateable
  });
});

/**
 * @desc    Submit batch peer ratings for a completed session
 * @route   POST /api/sessions/:id/ratings
 * @access  Private
 */
const submitRatings = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { ratings } = req.body;

  if (!Array.isArray(ratings) || ratings.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'ratings must be a non-empty array of peer evaluations.'
    });
  }

  const session = await StudySession.findById(id);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Session not found.' });
  }

  if (session.status !== 'completed' && !session.endedAt) {
    return res.status(400).json({
      success: false,
      message: 'Ratings can only be submitted for completed study sessions.'
    });
  }

  if (!isWithinRatingWindow(session)) {
    return res.status(400).json({
      success: false,
      message: 'The 7-day rating window for this session has closed.'
    });
  }

  const participantIds = new Set(
    (session.participants || []).map(p => String(p.user?._id || p.user))
  );

  if (!participantIds.has(String(userId))) {
    return res.status(403).json({
      success: false,
      message: 'You must have attended this session to rate participants.'
    });
  }

  let submittedCount = 0;
  let skippedCount = 0;
  const notifiedRatees = new Set();

  for (const item of ratings) {
    const { ratee, rating, tags, comment } = item;

    // Self-rating is forbidden
    if (!ratee || String(ratee) === String(userId)) {
      skippedCount++;
      continue;
    }

    // Ratee must be an actual session participant
    if (!participantIds.has(String(ratee))) {
      skippedCount++;
      continue;
    }

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      skippedCount++;
      continue;
    }

    const sanitizedTags = Array.isArray(tags)
      ? tags.filter(t => ALLOWED_TAGS.includes(t))
      : [];

    const cleanComment = sanitizeComment(comment);

    try {
      await PeerRating.create({
        session: id,
        rater: userId,
        ratee,
        rating: numRating,
        tags: sanitizedTags,
        comment: cleanComment
      });

      submittedCount++;

      // Incrementally update ratee's cached reputation on User
      const rateeUser = await User.findById(ratee);
      if (rateeUser) {
        const oldCount = rateeUser.ratingCount || 0;
        const oldAvg = rateeUser.ratingAvg || 0;
        const newCount = oldCount + 1;
        const newAvg = ((oldAvg * oldCount) + numRating) / newCount;

        rateeUser.ratingCount = newCount;
        rateeUser.ratingAvg = Math.round(newAvg * 10) / 10;
        await rateeUser.save();

        // Check if helpful_peer badge now qualifies
        await evaluateBadges(ratee);
      }

      // Notify ratee once per session (without revealing identity)
      if (!notifiedRatees.has(String(ratee))) {
        notifiedRatees.add(String(ratee));
        await createNotification(ratee, {
          type: 'system',
          title: '⭐ New Peer Feedback',
          message: 'You received feedback from your recent study session!',
          link: '/profile',
          data: { sessionId: id }
        });
      }

    } catch (err) {
      if (err.code === 11000) {
        // Already rated this peer for this session
        skippedCount++;
      } else {
        throw err;
      }
    }
  }

  return res.status(201).json({
    success: true,
    message: `Submitted ${submittedCount} rating(s).`,
    submittedCount,
    skippedCount
  });
});

/**
 * @desc    Get user's public reputation summary (average rating, count, top tags, anonymized comments)
 * @route   GET /api/users/:id/reputation
 * @access  Private
 */
const getUserReputation = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select('name avatar ratingAvg ratingCount createdAt');
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const ratingCount = user.ratingCount || 0;
  const ratingAvg = user.ratingAvg || 0;
  const isNewMember = ratingCount < 3;

  // Aggregate tag frequency from received peer ratings
  const tagAggregation = await PeerRating.aggregate([
    { $match: { ratee: new mongoose.Types.ObjectId(id) } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  const topTags = tagAggregation.map(t => ({
    tag: t._id,
    count: t.count
  }));

  // Anonymized comments: only visible if ratingCount >= 3 to preserve anonymity
  let comments = [];
  if (!isNewMember) {
    const rawComments = await PeerRating.find({
      ratee: id,
      comment: { $exists: true, $ne: '' }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('comment rating createdAt tags');

    comments = rawComments.map(c => ({
      _id: c._id,
      rating: c.rating,
      comment: c.comment,
      tags: c.tags,
      createdAt: c.createdAt
      // Rater identity is never included!
    }));
  }

  return res.status(200).json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      avatar: user.avatar
    },
    ratingAvg: isNewMember ? null : ratingAvg,
    ratingCount,
    isNewMember,
    topTags,
    comments
  });
});

module.exports = {
  getRateableParticipants,
  submitRatings,
  getUserReputation
};
