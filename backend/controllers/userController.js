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
    'name', 'university', 'major', 'level', 'bio',
    'subjects', 'availability', 'studyPreferences', 'avatar'
  ];

  // Build update object from allowed fields only
  const updateData = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  // Prevent email and password updates through this route
  if (req.body.email || req.body.password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password cannot be updated through this route.'
    });
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    {
      new: true,           // Return the updated document
      runValidators: true   // Run schema validators on update
    }
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found.'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully!',
    user
  });
});

module.exports = { getProfile, updateProfile };
