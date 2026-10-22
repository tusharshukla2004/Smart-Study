// ============================================
// Matchmaking v2 Controller
// Advanced partner matching, group recommendations, and connection actions
// ============================================

const User = require('../models/User');
const StudyGroup = require('../models/StudyGroup');
const MatchAction = require('../models/MatchAction');
const { asyncHandler } = require('../utils/helpers');
const { createNotification } = require('../utils/notify');
const { matchmakingCache } = require('../services/matchmaking/cache');
const {
  getPartnerMatches,
  getGroupMatches
} = require('../services/matchmaking');

/**
 * @desc    Get enhanced partner matches with explainable scores
 * @route   GET /api/matchmaking/v2/partners
 * @access  Private
 */
const getPartnerMatchesHandler = asyncHandler(async (req, res) => {
  const { page, limit, subject, skipCache } = req.query;

  const results = await getPartnerMatches(req.user, {
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 10,
    subject: subject || null,
    skipCache: skipCache === 'true'
  });

  res.status(200).json({
    success: true,
    data: results
  });
});

/**
 * @desc    Get group recommendations based on subject, level, schedule, and activity
 * @route   GET /api/matchmaking/v2/groups
 * @access  Private
 */
const getGroupMatchesHandler = asyncHandler(async (req, res) => {
  const { limit, skipCache } = req.query;

  const results = await getGroupMatches(req.user, {
    limit: limit ? parseInt(limit, 10) : 5,
    skipCache: skipCache === 'true'
  });

  res.status(200).json({
    success: true,
    data: results
  });
});

/**
 * @desc    Send a connection request to a potential study partner
 * @route   POST /api/matchmaking/v2/connect/:userId
 * @access  Private
 */
const connectPartnerHandler = asyncHandler(async (req, res) => {
  const targetUserId = req.params.userId;
  const currentUserId = req.user._id;

  if (String(targetUserId) === String(currentUserId)) {
    return res.status(400).json({
      success: false,
      message: 'You cannot send a connection request to yourself'
    });
  }

  const targetUser = await User.findById(targetUserId).select('name');
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check rate limit: max 20 requests in 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentRequestsCount = await MatchAction.countDocuments({
    user: currentUserId,
    createdAt: { $gte: oneDayAgo }
  });

  if (recentRequestsCount >= 20) {
    return res.status(429).json({
      success: false,
      message: 'Daily connection request limit reached (max 20 per day).'
    });
  }

  // Check if target user already sent a pending request to current user
  const reverseAction = await MatchAction.findOne({
    user: targetUserId,
    targetUser: currentUserId
  });

  if (reverseAction && reverseAction.action === 'connect_request') {
    return res.status(400).json({
      success: false,
      message: 'This user has already sent you a connection request. Please respond to it in your requests tab.'
    });
  }

  // Check existing action from current user to target
  const existingAction = await MatchAction.findOne({
    user: currentUserId,
    targetUser: targetUserId
  });

  if (existingAction) {
    if (existingAction.action === 'connect_request') {
      return res.status(400).json({
        success: false,
        message: 'Connection request already sent'
      });
    }
    if (existingAction.action === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'You are already connected with this user'
      });
    }
    // If previously dismissed or declined, allow re-requesting
    existingAction.action = 'connect_request';
    await existingAction.save();
  } else {
    await MatchAction.create({
      user: currentUserId,
      targetUser: targetUserId,
      action: 'connect_request'
    });
  }

  // Invalidate cache
  matchmakingCache.invalidateUser(currentUserId);

  // Dispatch in-app notification
  await createNotification(targetUserId, {
    type: 'system',
    title: 'New Study Partner Request',
    message: `${req.user.name} wants to connect with you as a study partner!`,
    link: '/matches',
    data: { requesterId: currentUserId }
  });

  res.status(200).json({
    success: true,
    message: 'Connection request sent successfully'
  });
});

/**
 * @desc    Respond to an incoming connection request (accept or decline)
 * @route   POST /api/matchmaking/v2/respond/:userId
 * @access  Private
 */
const respondPartnerHandler = asyncHandler(async (req, res) => {
  const targetUserId = req.params.userId; // requester
  const currentUserId = req.user._id; // recipient
  const { accept } = req.body;

  const pendingRequest = await MatchAction.findOne({
    user: targetUserId,
    targetUser: currentUserId,
    action: 'connect_request'
  });

  if (!pendingRequest) {
    return res.status(404).json({
      success: false,
      message: 'No pending connection request from this user'
    });
  }

  if (accept === true) {
    pendingRequest.action = 'accepted';
    await pendingRequest.save();

    // Upsert reciprocal acceptance
    await MatchAction.findOneAndUpdate(
      { user: currentUserId, targetUser: targetUserId },
      { action: 'accepted' },
      { upsert: true, new: true }
    );

    // Invalidate caches for both users
    matchmakingCache.invalidateUser(currentUserId);
    matchmakingCache.invalidateUser(targetUserId);

    // Create 1-on-1 study pair group
    const requester = await User.findById(targetUserId).select('name');
    const pairGroupName = `Study Pair: ${req.user.name} & ${requester ? requester.name : 'Partner'}`;
    const pairGroup = await StudyGroup.create({
      name: pairGroupName,
      subject: 'Collaborative Study',
      description: 'Private 1-on-1 study partnership group',
      members: [currentUserId, targetUserId],
      createdBy: currentUserId,
      maxMembers: 2
    });

    // Notify requester
    await createNotification(targetUserId, {
      type: 'system',
      title: 'Partner Request Accepted!',
      message: `${req.user.name} accepted your study partner request!`,
      link: `/groups/${pairGroup._id}`,
      data: { groupId: pairGroup._id, partnerId: currentUserId }
    });

    return res.status(200).json({
      success: true,
      message: 'Partner request accepted',
      data: { group: pairGroup }
    });
  } else {
    pendingRequest.action = 'declined';
    await pendingRequest.save();

    return res.status(200).json({
      success: true,
      message: 'Partner request declined'
    });
  }
});

/**
 * @desc    Dismiss a partner candidate from matchmaking recommendations
 * @route   POST /api/matchmaking/v2/dismiss/:userId
 * @access  Private
 */
const dismissPartnerHandler = asyncHandler(async (req, res) => {
  const targetUserId = req.params.userId;
  const currentUserId = req.user._id;

  if (String(targetUserId) === String(currentUserId)) {
    return res.status(400).json({
      success: false,
      message: 'You cannot dismiss yourself'
    });
  }

  await MatchAction.findOneAndUpdate(
    { user: currentUserId, targetUser: targetUserId },
    { action: 'dismissed' },
    { upsert: true, new: true }
  );

  matchmakingCache.invalidateUser(currentUserId);

  res.status(200).json({
    success: true,
    message: 'Partner candidate dismissed'
  });
});

/**
 * @desc    Get pending incoming and outgoing connection requests
 * @route   GET /api/matchmaking/v2/requests
 * @access  Private
 */
const getRequestsHandler = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;

  const [incoming, outgoing] = await Promise.all([
    MatchAction.find({
      targetUser: currentUserId,
      action: 'connect_request'
    })
      .populate('user', 'name avatar university major subjects subjectProfiles ratingAvg ratingCount streak studyStyle learningGoal')
      .sort({ createdAt: -1 })
      .lean(),

    MatchAction.find({
      user: currentUserId,
      action: 'connect_request'
    })
      .populate('targetUser', 'name avatar university major subjects subjectProfiles ratingAvg ratingCount streak studyStyle learningGoal')
      .sort({ createdAt: -1 })
      .lean()
  ]);

  res.status(200).json({
    success: true,
    data: {
      incoming: incoming.filter(item => item.user != null),
      outgoing: outgoing.filter(item => item.targetUser != null)
    }
  });
});

module.exports = {
  getPartnerMatchesHandler,
  getGroupMatchesHandler,
  connectPartnerHandler,
  respondPartnerHandler,
  dismissPartnerHandler,
  getRequestsHandler
};
