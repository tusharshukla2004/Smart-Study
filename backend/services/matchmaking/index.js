// ============================================
// Matchmaking v2 Service Orchestrator
// Coordinates candidate retrieval, scoring, caching, and group matching
// ============================================

const StudyGroup = require('../../models/StudyGroup');
const StudySession = require('../../models/StudySession');
const CONFIG = require('./config');
const { matchmakingCache } = require('./cache');
const { getCandidateUsers } = require('./candidates');
const {
  calculateOverallMatch,
  generateReasons,
  calculateProfileCompleteness,
  getEffectiveSubjectProfiles
} = require('./scoring');
const { normalizeSubject } = require('../../utils/subjectNormalizer');

/**
 * Calculates match score for a study group against current user.
 */
function scoreGroup(currentUser, group, isActiveRecently) {
  const userProfiles = getEffectiveSubjectProfiles(currentUser);
  const userSubjectNames = new Set(userProfiles.map(p => p.name));
  const userLegacySubjects = new Set((currentUser.subjects || []).map(s => normalizeSubject(s)));

  // Combine normalized group subject and tags
  const groupSubjectNorm = normalizeSubject(group.subject || '');
  const groupTagsNorm = (group.tags || []).map(t => normalizeSubject(t));
  const groupKeywords = new Set([groupSubjectNorm, ...groupTagsNorm].filter(Boolean));

  // 1. Subject Overlap (Weight: 0.35)
  let subjectMatches = 0;
  for (const kw of groupKeywords) {
    if (userSubjectNames.has(kw) || userLegacySubjects.has(kw)) {
      subjectMatches++;
    }
  }
  const subjectScore = groupKeywords.size > 0
    ? Math.min(1.0, subjectMatches / Math.min(groupKeywords.size, 3))
    : 0.1;

  // 2. Level Fit (Weight: 0.20)
  let levelScore = 0.7; // default neutral
  if (group.level) {
    const gLevel = group.level.toLowerCase();
    // Check user's level on matching subjects
    const matchingProfile = userProfiles.find(p => groupKeywords.has(p.name));
    if (matchingProfile) {
      const uLevel = matchingProfile.level;
      if (uLevel === gLevel) {
        levelScore = 1.0;
      } else if (
        (uLevel === 'beginner' && gLevel === 'intermediate') ||
        (uLevel === 'intermediate' && (gLevel === 'beginner' || gLevel === 'advanced')) ||
        (uLevel === 'advanced' && gLevel === 'intermediate')
      ) {
        levelScore = 0.6;
      } else {
        levelScore = 0.3; // beginner vs advanced
      }
    }
  }

  // 3. Schedule Overlap (Weight: 0.20)
  let scheduleScore = 0.5;
  if (group.schedule && currentUser.availability?.length) {
    const schedLower = group.schedule.toLowerCase();
    const hasMatch = currentUser.availability.some(slot => schedLower.includes(slot.toLowerCase()));
    if (hasMatch) {
      scheduleScore = 0.9;
    }
  }

  // 4. Recent Activity (Weight: 0.15)
  const activityScore = isActiveRecently ? 1.0 : 0.3;

  // 5. Fill Ratio (Weight: 0.10)
  // Sweet spot: 30% to 80% full
  const maxM = group.maxMembers || 10;
  const currentCount = Array.isArray(group.members) ? group.members.length : 0;
  const ratio = currentCount / maxM;
  let fillScore = 0.5;
  if (ratio >= 0.3 && ratio <= 0.8) {
    fillScore = 1.0;
  } else if (ratio < 0.3) {
    fillScore = 0.4 + (ratio / 0.3) * 0.4;
  } else if (ratio > 0.8 && ratio < 1.0) {
    fillScore = 0.6;
  } else {
    fillScore = 0.1; // Full
  }

  // Weighted total
  const weights = CONFIG.groupWeights;
  const total = (
    weights.subjectOverlap * subjectScore +
    weights.levelFit * levelScore +
    weights.scheduleOverlap * scheduleScore +
    weights.recentActivity * activityScore +
    weights.fillRatio * fillScore
  );

  const finalScore = Math.round(total * 100);

  // Generate readable reasons
  const reasons = [];
  if (subjectScore >= 0.5) reasons.push(`Focuses on ${group.subject}`);
  if (levelScore >= 0.8) reasons.push(`Matches your ${group.level} level`);
  if (activityScore === 1.0) reasons.push('Active sessions this week');
  if (fillScore === 1.0) reasons.push(`Great group size (${currentCount}/${maxM} members)`);

  return {
    score: finalScore,
    reasons: reasons.slice(0, 3)
  };
}

/**
 * Main matchmaking service entry point for partner matches.
 */
async function getPartnerMatches(currentUser, options = {}) {
  const {
    page = 1,
    limit = 10,
    skipCache = false,
    minScore = CONFIG.minMatchScoreThreshold,
    subject = null
  } = options;

  const currentUserId = currentUser._id;
  const cacheKey = matchmakingCache.makeKey(currentUserId, 'partners', {
    page,
    limit,
    minScore,
    subject: subject || ''
  });

  if (!skipCache) {
    const cached = matchmakingCache.get(cacheKey);
    if (cached) return cached;
  }

  // Retrieve candidate pool
  const candidates = await getCandidateUsers(currentUser);

  // Score each candidate
  const scored = [];
  for (const candidate of candidates) {
    const scoreRes = calculateOverallMatch(currentUser, candidate);
    const breakdown = scoreRes.breakdown || {};
    const commonSubjects = breakdown.commonSubjectNames || [];
    const reasons = scoreRes.reasons || [];

    const teachingMatches = [];
    const learningMatches = [];
    for (const d of (breakdown.complementarityDetails || [])) {
      if (d.relationship === 'a_mentors_b') {
        teachingMatches.push(d.subject);
      } else if (d.relationship === 'b_mentors_a') {
        learningMatches.push(d.subject);
      } else if (d.relationship === 'mutual') {
        teachingMatches.push(d.subject);
        learningMatches.push(d.subject);
      }
    }

    if (subject) {
      const normTarget = normalizeSubject(subject);
      const hasSubject = commonSubjects.some(s => normalizeSubject(s) === normTarget) ||
        (candidate.subjects || []).some(s => normalizeSubject(s) === normTarget) ||
        (candidate.subjectProfiles || []).some(p => p.name === normTarget);
      if (!hasSubject) continue;
    }

    scored.push({
      _id: candidate._id,
      name: candidate.name,
      avatar: candidate.avatar,
      university: candidate.university,
      major: candidate.major,
      matchScore: scoreRes.matchScore,
      scoreBreakdown: breakdown,
      commonSubjects,
      teachingMatches,
      learningMatches,
      reasons,
      timezone: candidate.timezone || 'Asia/Kolkata',
      studyStyle: candidate.studyStyle || 'mixed',
      learningGoal: candidate.learningGoal || [],
      streak: candidate.streak || 0,
      ratingAvg: candidate.ratingAvg || 0,
      ratingCount: candidate.ratingCount || 0
    });
  }

  // Filter by threshold (fallback to all if none meet threshold)
  let filtered = scored.filter(m => m.matchScore >= minScore);
  if (filtered.length === 0 && scored.length > 0) {
    filtered = scored;
  }

  // Sort by match score descending
  filtered.sort((a, b) => b.matchScore - a.matchScore);

  // Paginate
  const total = filtered.length;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(startIndex, startIndex + limitNum);

  // Profile completeness
  const profileCompleteness = calculateProfileCompleteness(currentUser);

  const response = {
    matches: paginated,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
    profileCompleteness
  };

  matchmakingCache.set(cacheKey, response);
  return response;
}

/**
 * Main matchmaking service entry point for group recommendations.
 */
async function getGroupMatches(currentUser, options = {}) {
  const { limit = 5, skipCache = false } = options;
  const currentUserId = currentUser._id;
  const cacheKey = matchmakingCache.makeKey(currentUserId, 'groups', { limit });

  if (!skipCache) {
    const cached = matchmakingCache.get(cacheKey);
    if (cached) return cached;
  }

  // Groups user has not yet joined
  const allGroups = await StudyGroup.find({
    members: { $nin: [currentUserId] }
  })
    .populate('members', 'name avatar')
    .populate('createdBy', 'name avatar')
    .lean();

  if (!allGroups.length) {
    return {
      matchedGroups: [],
      total: 0
    };
  }

  // Check 14-day activity
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const groupIds = allGroups.map(g => g._id);
  const recentSessions = await StudySession.find({
    group: { $in: groupIds },
    scheduledAt: { $gte: fourteenDaysAgo }
  }).select('group').lean();

  const activeGroupIds = new Set(recentSessions.map(s => String(s.group)));

  // Score groups
  const scoredGroups = allGroups.map(group => {
    const isActive = activeGroupIds.has(String(group._id));
    const { score, reasons } = scoreGroup(currentUser, group, isActive);

    return {
      ...group,
      matchScore: score,
      reasons,
      isActiveRecently: isActive
    };
  });

  // Sort highest score first
  scoredGroups.sort((a, b) => b.matchScore - a.matchScore);
  const limitNum = Math.min(20, Math.max(1, parseInt(limit, 10)));
  const result = {
    matchedGroups: scoredGroups.slice(0, limitNum),
    total: scoredGroups.length
  };

  matchmakingCache.set(cacheKey, result);
  return result;
}

module.exports = {
  getPartnerMatches,
  getGroupMatches,
  scoreGroup
};
