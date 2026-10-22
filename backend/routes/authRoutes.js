// ============================================
// Authentication Routes
// ============================================

const express = require('express');
const router = express.Router();
const { signup, login, refreshTokenHandler } = require('../controllers/authController');

// POST /api/auth/signup  — Register a new user
router.post('/signup', signup);

// POST /api/auth/login   — Login and get JWT token
router.post('/login', login);

// POST /api/auth/refresh — Refresh access token (opt-in via ENABLE_REFRESH_TOKENS=true)
router.post('/refresh', refreshTokenHandler);

module.exports = router;
