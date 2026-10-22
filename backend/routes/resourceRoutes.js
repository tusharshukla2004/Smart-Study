// ============================================
// Resource Routes - Phase 1 Core Study Experience
// ============================================

const express = require('express');
const router = express.Router({ mergeParams: true });
const rateLimit = require('express-rate-limit');

const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createResource,
  getGroupResources,
  deleteResource
} = require('../controllers/resourceController');

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many requests. Please slow down.' }
});

router.use(protect);

// Routes scoped under /api/resources/:id
router.delete('/:id', writeLimiter, deleteResource);

module.exports = {
  resourceRouter: router,
  createResource,
  getGroupResources,
  uploadMiddleware: upload.single('file')
};
