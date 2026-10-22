// ============================================
// Notification Routes - Phase 1 Core Study Experience
// ============================================

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const { protect } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notificationController');

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests. Please slow down.' }
});

router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', writeLimiter, markAllAsRead);
router.patch('/:id/read', writeLimiter, markAsRead);
router.delete('/:id', writeLimiter, deleteNotification);

module.exports = router;
