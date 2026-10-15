// ============================================
// AI Matchmaking Controller
// ============================================

const User = require('../models/User');
const StudyGroup = require('../models/StudyGroup');
const { asyncHandler, calculateMatchScore, calculateAvailabilityScore } = require('../utils/helpers');

/**
 * @desc    AI-powered matchmaking - find best matching users and groups
 * @route   GET /api/matchmaking
 * @access  Private
 * 
 * Algorithm:
 * 1. Get the authenticated user's subjects and availability
 * 2. Find all other users
 * 3. Score each user based on:
 *    - Subject overlap (Jaccard similarity) — weighted 70%
 *    - Availability overlap — weighted 30%
 * 4. Return top matched users and recommended groups
 */
const getMatches = asyncHandler(async (req, res) => {
  const currentUser = req.user;

  // ---- Match Users ----
  const allUsers = await User.find({
    _id: { $ne: currentUser._id } // Exclude current user
  }).select('-password');

  const matchedUsers = allUsers.map(user => {
    // Calculate subject match score (70% weight)
    const subjectScore = calculateMatchScore(currentUser.subjects, user.subjects);

    // Calculate availability match score (30% weight)
    const availabilityScore = calculateAvailabilityScore(
      currentUser.availability,
      user.availability
    );

    // Weighted overall score
    const overallScore = Math.round(subjectScore * 0.7 + availabilityScore * 0.3);

    // Find common subjects
    const commonSubjects = currentUser.subjects.filter(sub =>
      user.subjects.map(s => s.toLowerCase()).includes(sub.toLowerCase())
    );

    return {
      _id: user._id,
      name: user.name,
      avatar: user.avatar,
      university: user.university,
      major: user.major,
      level: user.level,
      subjects: user.subjects,
      availability: user.availability,
      commonSubjects,
      matchScore: overallScore,
      subjectScore,
      availabilityScore
    };
  });

  // Sort by overall match score (highest first)
  matchedUsers.sort((a, b) => b.matchScore - a.matchScore);

  // ---- Match Groups ----
  const allGroups = await StudyGroup.find({
    members: { $nin: [currentUser._id] } // Groups user hasn't joined
  })
    .populate('members', 'name avatar')
    .populate('createdBy', 'name avatar');

  const matchedGroups = allGroups.map(group => {
    const groupTopics = [group.subject, ...group.tags];
    const subjectScore = calculateMatchScore(currentUser.subjects, groupTopics);

    return {
      ...group.toObject(),
      matchScore: subjectScore
    };
  });

  matchedGroups.sort((a, b) => b.matchScore - a.matchScore);

  // Return top results
  res.status(200).json({
    success: true,
    message: 'Matchmaking results generated!',
    data: {
      matchedUsers: matchedUsers.slice(0, 10),   // Top 10 user matches
      matchedGroups: matchedGroups.slice(0, 5),    // Top 5 group matches
      totalUsersScanned: allUsers.length,
      totalGroupsScanned: allGroups.length,
      userSubjects: currentUser.subjects,
      userAvailability: currentUser.availability
    }
  });
});

module.exports = { getMatches };
