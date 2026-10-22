// ============================================
// User Profile Routes & Phase 2 Gamification/Reputation
// ============================================

const express = require('express');
const router = express.Router();
const { getProfile, updateProfile } = require('../controllers/userController');
const { updateLeaderboardOpt } = require('../controllers/gamificationController');
const { getUserReputation } = require('../controllers/ratingController');
const { protect } = require('../middleware/auth');

// All user routes require authentication
router.use(protect);

// GET  /api/users/profile  — Get current user's profile
router.get('/profile', getProfile);

// PUT  /api/users/profile  — Update current user's profile
router.put('/profile', updateProfile);

// PATCH /api/users/leaderboard-opt — Opt in/out of public leaderboards
router.patch('/leaderboard-opt', updateLeaderboardOpt);

// GET  /api/users/:id/reputation — Public reputation summary
router.get('/:id/reputation', getUserReputation);

module.exports = router;
