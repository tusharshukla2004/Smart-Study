// ============================================
// Study Session Controller - Phase 1 Core Study Experience
// ============================================

const mongoose = require('mongoose');
const StudySession = require('../models/StudySession');
const SessionLog = require('../models/SessionLog');
const StudyGroup = require('../models/StudyGroup');
const User = require('../models/User');
const { asyncHandler } = require('../utils/helpers');
const { calculateStreak } = require('../utils/streak');
const { createNotification } = require('../utils/notify');
const { awardXp } = require('./gamificationController');
const { XP_RULES } = require('../config/gamification');
const { analyticsCache } = require('../utils/cache');

/**
 * Helper to verify that a user is a member of the given group.
 */
const ensureGroupMember = async (groupId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) return null;
  const group = await StudyGroup.findById(groupId);
  if (!group) return null;
  const isMember = (group.members || []).some(m => String(m._id || m) === String(userId));
  return isMember ? group : false;
};

/**
 * @desc    Create/schedule a new study session
 * @route   POST /api/sessions
 * @access  Private (Group members only)
 */
const createSession = asyncHandler(async (req, res) => {
  const { groupId, title, subject, description, scheduledAt, focusMinutes, breakMinutes, totalCycles } = req.body;

  if (!groupId || !title || !scheduledAt) {
    return res.status(400).json({
      success: false,
      message: 'Group ID, title, and scheduled time are required.'
    });
  }

  const group = await ensureGroupMember(groupId, req.user._id);
  if (group === null) {
    return res.status(404).json({ success: false, message: 'Study group not found.' });
  }
  if (group === false) {
    return res.status(403).json({ success: false, message: 'You must be a member of this group to schedule a session.' });
  }

  const sessionDate = new Date(scheduledAt);
  if (Number.isNaN(sessionDate.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid scheduled date/time.' });
  }

  const session = await StudySession.create({
    group: group._id,
    host: req.user._id,
    title: title.trim(),
    subject: subject ? subject.trim() : group.subject,
    description: description ? description.trim() : '',
    scheduledAt: sessionDate,
    focusMinutes: Number(focusMinutes) || 25,
    breakMinutes: Number(breakMinutes) || 5,
    totalCycles: Number(totalCycles) || 4,
    status: 'scheduled',
    rsvps: [{
      user: req.user._id,
      status: 'going',
      updatedAt: new Date()
    }]
  });

  if (typeof session.populate === 'function') {
    await session.populate('host', 'name avatar email');
    await session.populate('group', 'name subject avatar');
  }

  // Notify group members about the new session (excluding the creator)
  if (Array.isArray(group.members)) {
    for (const memberId of group.members) {
      if (String(memberId) !== String(req.user._id)) {
        createNotification(memberId, {
          type: 'session_scheduled',
          title: 'New Study Session Scheduled',
          message: `${req.user.name} scheduled "${session.title}" for ${group.name}`,
          link: `/sessions/${session._id}`,
          data: { sessionId: session._id, groupId: group._id }
        });
      }
    }
  }

  return res.status(201).json({
    success: true,
    message: 'Study session scheduled successfully!',
    session
  });
});

/**
 * @desc    Get sessions (filter by group and/or status)
 * @route   GET /api/sessions?groupId=&status=
 * @access  Private (Group member)
 */
const getSessions = asyncHandler(async (req, res) => {
  const { groupId, status } = req.query;

  const query = {};

  if (groupId) {
    const group = await ensureGroupMember(groupId, req.user._id);
    if (group === null) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }
    if (group === false) {
      return res.status(403).json({ success: false, message: 'You must be a member of this group to view sessions.' });
    }
    query.group = groupId;
  } else {
    // If no groupId provided, only return sessions from groups where user is a member
    const userGroups = await StudyGroup.find({ members: req.user._id }).select('_id');
    query.group = { $in: userGroups.map(g => g._id) };
  }

  if (status) {
    query.status = status;
  }

  const sessions = await StudySession.find(query)
    .sort({ scheduledAt: 1 })
    .populate('host', 'name avatar')
    .populate('group', 'name subject avatar')
    .populate('rsvps.user', 'name avatar');

  return res.status(200).json({
    success: true,
    count: sessions.length,
    sessions
  });
});

/**
 * @desc    Get upcoming sessions across all user's groups
 * @route   GET /api/sessions/upcoming
 * @access  Private
 */
const getUpcomingSessions = asyncHandler(async (req, res) => {
  const userGroups = await StudyGroup.find({ members: req.user._id }).select('_id');
  const groupIds = userGroups.map(g => g._id);

  const now = new Date();
  const sessions = await StudySession.find({
    group: { $in: groupIds },
    status: { $in: ['scheduled', 'live'] },
    scheduledAt: { $gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) } // include recent live ones
  })
    .sort({ scheduledAt: 1 })
    .limit(10)
    .populate('host', 'name avatar')
    .populate('group', 'name subject avatar')
    .populate('rsvps.user', 'name avatar');

  return res.status(200).json({
    success: true,
    count: sessions.length,
    sessions
  });
});

/**
 * @desc    Get session details (+ rsvp counts & live timer state)
 * @route   GET /api/sessions/:id
 * @access  Private (Group member)
 */
const getSessionById = asyncHandler(async (req, res) => {
  const session = await StudySession.findById(req.params.id)
    .populate('host', 'name avatar email')
    .populate('group', 'name subject avatar members createdBy')
    .populate('rsvps.user', 'name avatar')
    .populate('participants.user', 'name avatar');

  if (!session) {
    return res.status(404).json({ success: false, message: 'Study session not found.' });
  }

  const isMember = (session.group?.members || []).some(m => String(m._id || m) === String(req.user._id));
  if (!isMember) {
    return res.status(403).json({ success: false, message: 'You must be a member of this study group to view this session.' });
  }

  const rsvpCounts = {
    going: (session.rsvps || []).filter(r => r.status === 'going').length,
    maybe: (session.rsvps || []).filter(r => r.status === 'maybe').length,
    not_going: (session.rsvps || []).filter(r => r.status === 'not_going').length
  };

  const userRsvp = (session.rsvps || []).find(r => String(r.user?._id || r.user) === String(req.user._id))?.status || null;

  return res.status(200).json({
    success: true,
    session,
    rsvpCounts,
    userRsvp,
    serverTime: new Date()
  });
});

/**
 * @desc    Edit scheduled session (Host only, only while 'scheduled')
 * @route   PUT /api/sessions/:id
 * @access  Private (Host only)
 */
const updateSession = asyncHandler(async (req, res) => {
  const session = await StudySession.findById(req.params.id);

  if (!session) {
    return res.status(404).json({ success: false, message: 'Study session not found.' });
  }

  if (String(session.host?._id || session.host) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: 'Only the session host can edit this session.' });
  }

  if (session.status !== 'scheduled') {
    return res.status(400).json({
      success: false,
      message: `Cannot edit a session with status "${session.status}". Only scheduled sessions can be edited.`
    });
  }

  const { title, subject, description, scheduledAt, focusMinutes, breakMinutes, totalCycles } = req.body;

  if (title) session.title = title.trim();
  if (subject !== undefined) session.subject = subject.trim();
  if (description !== undefined) session.description = description.trim();
  if (scheduledAt) {
    const sDate = new Date(scheduledAt);
    if (!Number.isNaN(sDate.getTime())) session.scheduledAt = sDate;
  }
  if (focusMinutes) session.focusMinutes = Number(focusMinutes);
  if (breakMinutes) session.breakMinutes = Number(breakMinutes);
  if (totalCycles) session.totalCycles = Number(totalCycles);

  await session.save();

  return res.status(200).json({
    success: true,
    message: 'Session updated successfully.',
    session
  });
});

/**
 * @desc    Cancel session (Host only) -> status 'cancelled' + notify members
 * @route   DELETE /api/sessions/:id
 * @access  Private (Host only)
 */
const cancelSession = asyncHandler(async (req, res) => {
  const session = await StudySession.findById(req.params.id).populate('group', 'name members');

  if (!session) {
    return res.status(404).json({ success: false, message: 'Study session not found.' });
  }

  if (String(session.host?._id || session.host) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: 'Only the session host can cancel this session.' });
  }

  session.status = 'cancelled';
  session.endedAt = new Date();
  await session.save();

  // Notify members
  if (Array.isArray(session.group?.members)) {
    for (const memberId of session.group.members) {
      if (String(memberId) !== String(req.user._id)) {
        createNotification(memberId, {
          type: 'session_cancelled',
          title: 'Study Session Cancelled',
          message: `The study session "${session.title}" was cancelled by the host.`,
          link: `/groups`,
          data: { sessionId: session._id }
        });
      }
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Study session cancelled.',
    session
  });
});

/**
 * @desc    RSVP for a session
 * @route   POST /api/sessions/:id/rsvp
 * @access  Private (Group member)
 */
const setSessionRsvp = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['going', 'maybe', 'not_going'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid RSVP status. Must be "going", "maybe", or "not_going".'
    });
  }

  const session = await StudySession.findById(req.params.id);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Study session not found.' });
  }

  const group = await ensureGroupMember(session.group, req.user._id);
  if (!group) {
    return res.status(403).json({ success: false, message: 'You must be a member of this study group to RSVP.' });
  }

  if (!session.rsvps) session.rsvps = [];
  const existingRsvpIndex = session.rsvps.findIndex(r => String(r.user?._id || r.user) === String(req.user._id));
  if (existingRsvpIndex > -1) {
    session.rsvps[existingRsvpIndex].status = status;
    session.rsvps[existingRsvpIndex].updatedAt = new Date();
  } else {
    session.rsvps.push({
      user: req.user._id,
      status,
      updatedAt: new Date()
    });
  }

  await session.save();

  return res.status(200).json({
    success: true,
    message: `RSVP updated to ${status}.`,
    rsvps: session.rsvps
  });
});

/**
 * @desc    Submit end-of-session log (topicsStudied, summary, focusRating, minutesStudied)
 * @route   POST /api/sessions/:id/log
 * @access  Private (Group member)
 */
const submitSessionLog = asyncHandler(async (req, res) => {
  const { topicsStudied, summary, focusRating, minutesStudied } = req.body;

  if (!focusRating || minutesStudied === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Focus rating (1-5) and minutes studied are required.'
    });
  }

  const session = await StudySession.findById(req.params.id);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Study session not found.' });
  }

  const group = await ensureGroupMember(session.group, req.user._id);
  if (!group) {
    return res.status(403).json({ success: false, message: 'You must be a member of this group to submit a study log.' });
  }

  // Check if user already logged this session
  const existingLog = await SessionLog.findOne({ user: req.user._id, session: session._id });
  if (existingLog) {
    return res.status(400).json({
      success: false,
      message: 'You have already submitted a study log for this session.'
    });
  }

  const numericMinutes = Math.max(0, Number(minutesStudied) || 0);

  const log = await SessionLog.create({
    user: req.user._id,
    session: session._id,
    group: session.group,
    topicsStudied: Array.isArray(topicsStudied) ? topicsStudied : [],
    summary: summary ? summary.slice(0, 500) : '',
    focusRating: Math.min(5, Math.max(1, Number(focusRating))),
    minutesStudied: numericMinutes
  });

  // Update user stats & streak
  const user = await User.findById(req.user._id);
  let xpResult = null;
  if (user) {
    const hoursAdded = numericMinutes / 60;
    user.studyHours = Math.round(((user.studyHours || 0) + hoursAdded) * 10) / 10;

    const streakUpdate = calculateStreak(user.streak || 0, user.lastStudyDate, new Date());
    user.streak = streakUpdate.streak;
    user.lastStudyDate = streakUpdate.lastStudyDate;
    if (user.streak > (user.longestStreak || 0)) {
      user.longestStreak = user.streak;
    }

    await user.save();

    // Phase 2: Gamification XP & Badges
    const sessionXp = XP_RULES.calculateSessionLogXp(numericMinutes, focusRating);
    xpResult = await awardXp(req.user._id, 'session_log', sessionXp, log._id);

    // Daily streak continuation XP
    const todayStr = new Date().toISOString().slice(0, 10);
    await awardXp(req.user._id, 'streak_continuation', XP_RULES.DAILY_STREAK_XP, todayStr);

    // Invalidate analytics cache
    analyticsCache.invalidateUser(req.user._id);
    analyticsCache.invalidateGroup(session.group);
  }

  return res.status(201).json({
    success: true,
    message: 'Study session logged successfully!',
    log,
    stats: {
      studyHours: user ? user.studyHours : 0,
      streak: user ? user.streak : 0,
      longestStreak: user ? user.longestStreak : 0,
      xpGained: xpResult?.points || 0,
      totalXp: user ? user.xp : 0,
      level: user ? user.level : 1,
      newBadges: xpResult?.newBadges || []
    }
  });
});

/**
 * @desc    Get current user's session logs (paginated)
 * @route   GET /api/sessions/logs/me
 * @access  Private
 */
const getMySessionLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const total = await SessionLog.countDocuments({ user: req.user._id });
  const logs = await SessionLog.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('session', 'title subject scheduledAt focusMinutes totalCycles')
    .populate('group', 'name subject avatar');

  return res.status(200).json({
    success: true,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    totalLogs: total,
    logs
  });
});

module.exports = {
  createSession,
  getSessions,
  getUpcomingSessions,
  getSessionById,
  updateSession,
  cancelSession,
  setSessionRsvp,
  submitSessionLog,
  getMySessionLogs
};
