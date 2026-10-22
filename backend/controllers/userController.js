// ============================================
// User Profile Controller
// ============================================

const User = require('../models/User');
const { asyncHandler } = require('../utils/helpers');

/**
 * @desc    Get current user's profile
 * @route   GET /api/users/profile
 * @access  Private (requires JWT)
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found.'
    });
  }

  res.status(200).json({
    success: true,
    user
  });
});

/**
 * @desc    Update current user's profile
 * @route   PUT /api/users/profile
 * @access  Private (requires JWT)
 */
const updateProfile = asyncHandler(async (req, res) => {
  // Fields that are allowed to be updated
  const allowedFields = [
    'name', 'university', 'major', 'level', 'academicLevel', 'bio',
    'subjects', 'availability', 'studyPreferences', 'avatar',
    'subjectProfiles', 'availabilitySlots', 'timezone', 'learningGoal', 'studyStyle'
  ];

  // Prevent email and password updates through this route
  if (req.body.email || req.body.password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password cannot be updated through this route.'
    });
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found.'
    });
  }

  // Update allowed fields
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      if (field === 'level' && typeof req.body.level === 'string' && isNaN(Number(req.body.level))) {
        user.academicLevel = req.body.level;
      } else {
        user[field] = req.body[field];
      }
    }
  }

  await user.save();

  // Invalidate matchmaking cache for current user
  try {
    const { matchmakingCache } = require('../services/matchmaking/cache');
    matchmakingCache.invalidateUser(user._id);
  } catch {
    // Non-blocking
  }

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully!',
    user
  });
});

module.exports = { getProfile, updateProfile };
