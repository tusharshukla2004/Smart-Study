// ============================================
// Study Group Controller
// ============================================

const StudyGroup = require('../models/StudyGroup');
const User = require('../models/User');
const { asyncHandler, calculateMatchScore } = require('../utils/helpers');

/**
 * @desc    Create a new study group
 * @route   POST /api/groups/create
 * @access  Private
 */
const createGroup = asyncHandler(async (req, res) => {
  const { name, subject, description, maxMembers, schedule, level, tags, avatar } = req.body;

  // Create group with the creator as the first member
  const group = await StudyGroup.create({
    name,
    subject,
    description: description || '',
    maxMembers: maxMembers || 10,
    schedule: schedule || '',
    level: level || '',
    tags: tags || [],
    avatar: avatar || '📚',
    members: [req.user._id],
    createdBy: req.user._id
  });

  // Populate creator info in the response
  await group.populate('members', 'name avatar');
  await group.populate('createdBy', 'name avatar');

  res.status(201).json({
    success: true,
    message: 'Study group created successfully!',
    group
  });
});

/**
 * @desc    Get all study groups (with optional filters)
 * @route   GET /api/groups
 * @access  Private
 */
const getAllGroups = asyncHandler(async (req, res) => {
  const { subject, level, search } = req.query;

  // Build filter object
  const filter = {};
  if (subject) filter.subject = { $regex: subject, $options: 'i' };
  if (level) filter.level = level;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } }
    ];
  }

  const groups = await StudyGroup.find(filter)
    .populate('members', 'name avatar')
    .populate('createdBy', 'name avatar')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: groups.length,
    groups
  });
});

/**
 * @desc    Get a single group by ID
 * @route   GET /api/groups/:groupId
 * @access  Private
 */
const getGroupById = asyncHandler(async (req, res) => {
  const group = await StudyGroup.findById(req.params.groupId)
    .populate('members', 'name avatar subjects')
    .populate('createdBy', 'name avatar');

  if (!group) {
    return res.status(404).json({
      success: false,
      message: 'Study group not found.'
    });
  }

  res.status(200).json({
    success: true,
    group
  });
});

/**
 * @desc    Join a study group
 * @route   POST /api/groups/join/:groupId
 * @access  Private
 */
const joinGroup = asyncHandler(async (req, res) => {
  const group = await StudyGroup.findById(req.params.groupId);

  if (!group) {
    return res.status(404).json({
      success: false,
      message: 'Study group not found.'
    });
  }

  // Check if user is already a member
  if (group.members.some(memberId => memberId.equals(req.user._id))) {
    return res.status(400).json({
      success: false,
      message: 'You are already a member of this group.'
    });
  }

  // Check if group is full
  if (group.members.length >= group.maxMembers) {
    return res.status(400).json({
      success: false,
      message: 'This group is full.'
    });
  }

  // Add user to group
  group.members.push(req.user._id);
  await group.save();

  // Populate for response
  await group.populate('members', 'name avatar');

  res.status(200).json({
    success: true,
    message: 'Successfully joined the group!',
    group
  });
});

/**
 * @desc    Leave a study group
 * @route   POST /api/groups/leave/:groupId
 * @access  Private
 */
const leaveGroup = asyncHandler(async (req, res) => {
  const group = await StudyGroup.findById(req.params.groupId);

  if (!group) {
    return res.status(404).json({
      success: false,
      message: 'Study group not found.'
    });
  }

  // Check if user is a member
  if (!group.members.some(memberId => memberId.equals(req.user._id))) {
    return res.status(400).json({
      success: false,
      message: 'You are not a member of this group.'
    });
  }

  // Prevent creator from leaving (they should delete the group instead)
  if (group.createdBy.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'As the group creator, you cannot leave. Delete the group instead.'
    });
  }

  // Remove user from group
  group.members = group.members.filter(
    memberId => !memberId.equals(req.user._id)
  );
  await group.save();

  res.status(200).json({
    success: true,
    message: 'Successfully left the group.'
  });
});

/**
 * @desc    Get recommended groups based on user's subjects & interests
 * @route   GET /api/groups/recommended
 * @access  Private
 */
const getRecommendedGroups = asyncHandler(async (req, res) => {
  const user = req.user;

  // Get all groups the user is NOT already a member of
  const groups = await StudyGroup.find({
    members: { $nin: [user._id] }
  })
    .populate('members', 'name avatar')
    .populate('createdBy', 'name avatar');

  // Calculate match score for each group based on subject overlap
  const scoredGroups = groups.map(group => {
    const subjectScore = calculateMatchScore(user.subjects, [group.subject, ...group.tags]);
    return {
      ...group.toObject(),
      matchScore: subjectScore
    };
  });

  // Sort by match score (highest first) and limit to top 10
  scoredGroups.sort((a, b) => b.matchScore - a.matchScore);
  const recommended = scoredGroups.slice(0, 10);

  res.status(200).json({
    success: true,
    count: recommended.length,
    groups: recommended
  });
});

module.exports = {
  createGroup,
  getAllGroups,
  getGroupById,
  joinGroup,
  leaveGroup,
  getRecommendedGroups
};
