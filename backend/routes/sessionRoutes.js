// ============================================
// Session Routes - Phase 1 Core Study Experience & Phase 2 Ratings
// ============================================

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const { protect } = require('../middleware/auth');
const StudySession = require('../models/StudySession');
const { generateSessionIcs } = require('../utils/ics');
const {
  createSession,
  getSessions,
  getUpcomingSessions,
  getSessionById,
  updateSession,
  cancelSession,
  setSessionRsvp,
  submitSessionLog,
  getMySessionLogs
} = require('../controllers/sessionController');
const {
  getRateableParticipants,
  submitRatings
} = require('../controllers/ratingController');

// Rate limiting for writes
const sessionWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many requests. Please slow down.' }
});

// All session routes require authentication
router.use(protect);

router.post('/', sessionWriteLimiter, createSession);
router.get('/', getSessions);
router.get('/upcoming', getUpcomingSessions);
router.get('/logs/me', getMySessionLogs);

router.get('/:id', getSessionById);
router.put('/:id', sessionWriteLimiter, updateSession);
router.delete('/:id', sessionWriteLimiter, cancelSession);
router.post('/:id/rsvp', sessionWriteLimiter, setSessionRsvp);
router.post('/:id/log', sessionWriteLimiter, submitSessionLog);

// Phase 2: Peer rating endpoints
router.get('/:id/rateable', getRateableParticipants);
router.post('/:id/ratings', sessionWriteLimiter, submitRatings);

// ICS calendar export
router.get('/:id/ics', async (req, res, next) => {
  try {
    const session = await StudySession.findById(req.params.id).populate('group', 'name');
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const icsContent = generateSessionIcs(session);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="study-session-${session._id}.ics"`);
    res.send(icsContent);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
