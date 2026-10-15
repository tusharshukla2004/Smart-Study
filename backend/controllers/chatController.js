// ============================================
// Chat Controller (REST endpoints for messages)
// ============================================

const Message = require('../models/Message');
const StudyGroup = require('../models/StudyGroup');
const { asyncHandler } = require('../utils/helpers');

/**
 * @desc    Get chat history for a study group
 * @route   GET /api/chat/:groupId
 * @access  Private
 */
const getChatHistory = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;

  // Verify group exists
  const group = await StudyGroup.findById(groupId);
  if (!group) {
    return res.status(404).json({
      success: false,
      message: 'Study group not found.'
    });
  }

  // Verify user is a member of the group
  if (!group.members.some(memberId => memberId.equals(req.user._id))) {
    return res.status(403).json({
      success: false,
      message: 'You must be a member of this group to view chat history.'
    });
  }

  // Build query (supports cursor-based pagination)
  const query = { groupId };
  if (req.query.before) {
    const before = new Date(req.query.before);
    if (Number.isNaN(before.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message cursor.'
      });
    }
    query.createdAt = { $lt: before };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('senderId', 'name avatar');

  // Reverse to get chronological order
  messages.reverse();

  res.status(200).json({
    success: true,
    count: messages.length,
    messages
  });
});

/**
 * @desc    Send a message to a study group (REST fallback, primary is via Socket.io)
 * @route   POST /api/chat/:groupId
 * @access  Private
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { content } = req.body;

  if (typeof content !== 'string' || !content.trim() || content.trim().length > 2000) {
    return res.status(400).json({
      success: false,
      message: 'Message must contain 1 to 2000 characters.'
    });
  }

  // Verify group exists
  const group = await StudyGroup.findById(groupId);
  if (!group) {
    return res.status(404).json({
      success: false,
      message: 'Study group not found.'
    });
  }

  // Verify user is a member
  if (!group.members.some(memberId => memberId.equals(req.user._id))) {
    return res.status(403).json({
      success: false,
      message: 'You must be a member of this group to send messages.'
    });
  }

  const message = await Message.create({
    senderId: req.user._id,
    groupId,
    senderName: req.user.name,
    senderAvatar: req.user.avatar,
    content: content.trim()
  });

  res.status(201).json({
    success: true,
    message: message
  });
});

module.exports = { getChatHistory, sendMessage };
