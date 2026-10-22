// ============================================
// Study Group Routes
// ============================================

const express = require('express');
const router = express.Router();
const {
  createGroup,
  getAllGroups,
  getGroupById,
  joinGroup,
  leaveGroup,
  getRecommendedGroups
} = require('../controllers/groupController');
const { protect } = require('../middleware/auth');
const { createNote, getGroupNotes } = require('./noteRoutes');
const { createResource, getGroupResources, uploadMiddleware } = require('./resourceRoutes');

// All group routes require authentication
router.use(protect);

// POST /api/groups/create       — Create a new study group
router.post('/create', createGroup);

// GET  /api/groups              — Get all groups (with optional filters)
router.get('/', getAllGroups);

// GET  /api/groups/recommended  — Get AI-recommended groups (must be before /:groupId)
router.get('/recommended', getRecommendedGroups);

// Notes per group
router.post('/:groupId/notes', createNote);
router.get('/:groupId/notes', getGroupNotes);

// Resources per group
router.post('/:groupId/resources', uploadMiddleware, createResource);
router.get('/:groupId/resources', getGroupResources);

// GET  /api/groups/:groupId     — Get a single group by ID
router.get('/:groupId', getGroupById);

// POST /api/groups/join/:groupId  — Join a group
router.post('/join/:groupId', joinGroup);

// POST /api/groups/leave/:groupId — Leave a group
router.post('/leave/:groupId', leaveGroup);

module.exports = router;
