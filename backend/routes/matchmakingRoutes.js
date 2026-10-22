// ============================================
// Matchmaking Routes (v1 legacy + v2 enhanced)
// ============================================

const express = require('express');
const router = express.Router();
const { getMatches } = require('../controllers/matchmakingController');
const {
  getPartnerMatchesHandler,
  getGroupMatchesHandler,
  connectPartnerHandler,
  respondPartnerHandler,
  dismissPartnerHandler,
  getRequestsHandler
} = require('../controllers/matchmakingV2Controller');
const { protect } = require('../middleware/auth');

// --- v1 Legacy Route (Preserved for backwards compatibility) ---
// GET /api/matchmaking
router.get('/', protect, getMatches);

// --- v2 Enhanced Matchmaking Routes ---
// GET /api/matchmaking/v2/partners?page=1&limit=10&subject=...
router.get('/v2/partners', protect, getPartnerMatchesHandler);

// GET /api/matchmaking/v2/groups?limit=5
router.get('/v2/groups', protect, getGroupMatchesHandler);

// POST /api/matchmaking/v2/connect/:userId — send connection request
router.post('/v2/connect/:userId', protect, connectPartnerHandler);

// POST /api/matchmaking/v2/respond/:userId — accept or decline connection
router.post('/v2/respond/:userId', protect, respondPartnerHandler);

// POST /api/matchmaking/v2/dismiss/:userId — dismiss candidate from recommendations
router.post('/v2/dismiss/:userId', protect, dismissPartnerHandler);

// GET /api/matchmaking/v2/requests — get incoming & outgoing requests
router.get('/v2/requests', protect, getRequestsHandler);

module.exports = router;
