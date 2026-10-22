// ============================================
// Notifications Controller - Phase 1 Core Study Experience
// ============================================

const Notification = require('../models/Notification');
const { asyncHandler } = require('../utils/helpers');

/**
 * @desc    Get user notifications (paginated, with optional unread filter)
 * @route   GET /api/notifications?unread=true&page=&limit=
 * @access  Private
 */
const getNotifications = asyncHandler(async (req, res) => {
  const { unread } = req.query;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 15));
  const skip = (page - 1) * limit;

  const query = { user: req.user._id };
  if (unread === 'true') {
    query.read = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(query),
    Notification.countDocuments({ user: req.user._id, read: false })
  ]);

  res.status(200).json({
    success: true,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    totalNotifications: total,
    unreadCount,
    notifications
  });
});

/**
 * @desc    Get unread notifications count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    user: req.user._id,
    read: false
  });

  res.status(200).json({
    success: true,
    unreadCount
  });
});

/**
 * @desc    Mark a single notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found.' });
  }

  notification.read = true;
  await notification.save();

  const unreadCount = await Notification.countDocuments({
    user: req.user._id,
    read: false
  });

  res.status(200).json({
    success: true,
    message: 'Notification marked as read.',
    notification,
    unreadCount
  });
});

/**
 * @desc    Mark all user notifications as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, read: false },
    { $set: { read: true } }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read.',
    unreadCount: 0
  });
});

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id
  });

  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found.' });
  }

  const unreadCount = await Notification.countDocuments({
    user: req.user._id,
    read: false
  });

  res.status(200).json({
    success: true,
    message: 'Notification removed.',
    unreadCount
  });
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
