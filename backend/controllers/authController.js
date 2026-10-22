// ============================================
// Authentication Controller
// ============================================

const User = require('../models/User');
const { generateToken, asyncHandler } = require('../utils/helpers');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
const signup = asyncHandler(async (req, res) => {
  const {
    name, email, password, subjects, availability, university, major, level, avatar,
    studyPreferences, subjectProfiles, availabilitySlots, timezone, learningGoal, studyStyle
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'A user with this email already exists.'
    });
  }

  // Create user
  const isStringLevel = typeof level === 'string' && isNaN(Number(level));
  const user = await User.create({
    name,
    email,
    password,
    subjects: subjects || [],
    subjectProfiles: subjectProfiles || [],
    availability: availability || [],
    availabilitySlots: availabilitySlots || [],
    timezone: timezone || 'Asia/Kolkata',
    learningGoal: learningGoal || [],
    studyStyle: studyStyle || 'mixed',
    university: university || '',
    major: major || '',
    academicLevel: isStringLevel ? level : '',
    level: isStringLevel ? 1 : (Number(level) || 1),
    avatar: avatar || name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
    studyPreferences: studyPreferences || '',
    xp: 0,
    longestStreak: 0,
    leaderboardOptIn: true
  });

  // Generate JWT token
  const token = generateToken(user._id);

  // Return user data (without password)
  res.status(201).json({
    success: true,
    message: 'Account created successfully!',
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      subjects: user.subjects,
      availability: user.availability,
      university: user.university,
      major: user.major,
      academicLevel: user.academicLevel || '',
      level: user.level,
      xp: user.xp,
      avatar: user.avatar,
      studyHours: user.studyHours,
      groupsJoined: user.groupsJoined,
      tasksCompleted: user.tasksCompleted,
      streak: user.streak,
      longestStreak: user.longestStreak,
      leaderboardOptIn: user.leaderboardOptIn,
      bio: user.bio,
      createdAt: user.createdAt
    }
  });
});

/**
 * @desc    Login user & return JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both email and password.'
    });
  }

  // Find user and explicitly select password (which is excluded by default)
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.'
    });
  }

  // Verify password using schema method
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.'
    });
  }

  // Generate token
  const token = generateToken(user._id);

  if (process.env.ENABLE_REFRESH_TOKENS === 'true') {
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
    const refreshToken = jwt.sign({ id: user._id }, refreshSecret, { expiresIn: '7d' });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
  }

  res.status(200).json({
    success: true,
    message: 'Login successful!',
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      subjects: user.subjects,
      availability: user.availability,
      university: user.university,
      major: user.major,
      academicLevel: user.academicLevel || '',
      level: user.level,
      xp: user.xp || 0,
      avatar: user.avatar,
      studyHours: user.studyHours,
      groupsJoined: user.groupsJoined,
      tasksCompleted: user.tasksCompleted,
      streak: user.streak,
      longestStreak: user.longestStreak || 0,
      leaderboardOptIn: user.leaderboardOptIn !== false,
      bio: user.bio,
      createdAt: user.createdAt
    }
  });
});

/**
 * @desc    Refresh access token (opt-in via ENABLE_REFRESH_TOKENS=true)
 * @route   POST /api/auth/refresh
 * @access  Public (cookie-based)
 */
const refreshTokenHandler = asyncHandler(async (req, res) => {
  if (process.env.ENABLE_REFRESH_TOKENS !== 'true') {
    return res.status(403).json({
      success: false,
      message: 'Refresh token rotation is currently disabled.'
    });
  }

  const jwt = require('jsonwebtoken');
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'No refresh token provided.'
    });
  }

  try {
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(refreshToken, refreshSecret);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token subject.' });
    }

    const newAccessToken = generateToken(user._id);
    const newRefreshToken = jwt.sign({ id: user._id }, refreshSecret, { expiresIn: '7d' });
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      token: newAccessToken
    });
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token.'
    });
  }
});

module.exports = { signup, login, refreshTokenHandler };
