// ============================================
// Matchmaking Candidate Retrieval (Database Layer)
// Indexed pre-filtering, exclusion filters & lean projections
// ============================================

const mongoose = require('mongoose');
const User = require('../../models/User');
const MatchAction = require('../../models/MatchAction');
const CONFIG = require('./config');
const { getEffectiveSubjectProfiles } = require('./scoring');

/**
 * Retrieves candidate users eligible for matchmaking with currentUser.
 *
 * Excludes:
 * - Current user themselves
 * - Users previously dismissed by currentUser
 * - Already-accepted study partners
 * - Users inactive for > maxInactivityDays
 *
 * Pre-filters:
 * - Prioritizes users sharing at least one subject
 * - Caps candidates at CONFIG.maxCandidatesScan (~300)
 *
 * @param {object} currentUser - Full current user document or lean object
 * @returns {Promise<Array<object>>} Lean candidate documents
 */
async function getCandidateUsers(currentUser) {
  const currentId = currentUser._id;

  // 1. Find all dismissed and accepted user IDs
  const blockedActions = await MatchAction.find({
    $or: [
      { user: currentId, action: { $in: ['dismissed', 'accepted'] } },
      { targetUser: currentId, action: 'accepted' }
    ]
  }).select('user targetUser').lean();

  const excludedIds = new Set();
  excludedIds.add(String(currentId));

  for (const a of blockedActions) {
    if (String(a.user) === String(currentId)) {
      excludedIds.add(String(a.targetUser));
    } else {
      excludedIds.add(String(a.user));
    }
  }

  // 2. Extract current user's normalized subjects for pre-filter
  const profiles = getEffectiveSubjectProfiles(currentUser);
  const subjectNames = profiles.map(p => p.name).filter(Boolean);

  const inactivityThreshold = new Date(Date.now() - (CONFIG.maxInactivityDays * 24 * 60 * 60 * 1000));

  // 3. Candidate query
  // Priority 1: Users who share at least one subject in subjectProfiles.name OR legacy subjects
  const query = {
    _id: { $nin: Array.from(excludedIds).map(id => new mongoose.Types.ObjectId(id)) },
    $or: [
      { 'subjectProfiles.name': { $in: subjectNames } },
      { subjects: { $in: currentUser.subjects || [] } },
      // Also allow flexible/coarse overlap if subjects differ
      { availability: { $in: currentUser.availability || [] } }
    ],
    updatedAt: { $gte: inactivityThreshold }
  };

  const candidates = await User.find(query)
    .select('name avatar university major subjects subjectProfiles availability availabilitySlots timezone learningGoal studyStyle ratingAvg ratingCount streak lastStudyDate createdAt updatedAt')
    .limit(CONFIG.maxCandidatesScan || 300)
    .lean();

  return candidates;
}

module.exports = {
  getCandidateUsers
};
