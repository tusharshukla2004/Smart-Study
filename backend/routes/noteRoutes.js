// ============================================
// Note Routes - Phase 1 Core Study Experience
// ============================================

const express = require('express');
const router = express.Router({ mergeParams: true });
const rateLimit = require('express-rate-limit');

const { protect } = require('../middleware/auth');
const {
  createNote,
  getGroupNotes,
  getNoteById,
  updateNote,
  deleteNote,
  togglePinNote
} = require('../controllers/noteController');

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many requests. Please slow down.' }
});

router.use(protect);

// Routes scoped under /api/notes/:id
router.get('/:id', getNoteById);
router.put('/:id', writeLimiter, updateNote);
router.delete('/:id', writeLimiter, deleteNote);
router.patch('/:id/pin', writeLimiter, togglePinNote);

module.exports = {
  noteRouter: router,
  createNote,
  getGroupNotes
};
