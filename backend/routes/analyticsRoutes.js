// ============================================
// Analytics Routes (Phase 2 Feature A)
// All routes protected by JWT authentication
// ============================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getOverview,
  getStudyTime,
  getSubjects,
  getHeatmap,
  getFocusTrend,
  getTaskAnalytics,
  getGroupAnalytics
} = require('../controllers/analyticsController');

// All analytics routes require authentication
router.use(protect);

router.get('/overview', getOverview);
router.get('/study-time', getStudyTime);
router.get('/subjects', getSubjects);
router.get('/heatmap', getHeatmap);
router.get('/focus-trend', getFocusTrend);
router.get('/tasks', getTaskAnalytics);
router.get('/groups/:groupId', getGroupAnalytics);

module.exports = router;
