// ============================================
// Gamification Routes (Phase 2 Feature B)
// ============================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getMyGamification,
  getLeaderboard,
  updateLeaderboardOpt
} = require('../controllers/gamificationController');

router.use(protect);

router.get('/me', getMyGamification);
router.get('/leaderboard', getLeaderboard);
router.patch('/leaderboard-opt', updateLeaderboardOpt);

module.exports = router;
