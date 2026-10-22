// ============================================
// Peer Rating Routes (Phase 2 Feature C)
// ============================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getRateableParticipants,
  submitRatings,
  getUserReputation
} = require('../controllers/ratingController');

router.use(protect);

// Session rating endpoints
router.get('/sessions/:id/rateable', getRateableParticipants);
router.post('/sessions/:id/ratings', submitRatings);

// User reputation endpoint
router.get('/users/:id/reputation', getUserReputation);

module.exports = router;
