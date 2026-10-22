// ============================================
// Matchmaking v2 Pure Scoring Engine
// Pure functions - 0 Database dependencies
// Fully unit-testable and deterministic
// ============================================

const CONFIG = require('./config');
const { calculateBayesianScore } = require('../../utils/reputation');
const { canonicalizeSubjectProfile } = require('../../utils/subjectNormalizer');

const MINUTES_IN_WEEK = 7 * 24 * 60; // 10080 minutes

/**
 * Returns UTC offset in minutes for a given IANA timezone.
 * Positive for timezones ahead of UTC (e.g. +330 for Asia/Kolkata).
 *
 * @param {string} tz - IANA timezone name
 * @returns {number} Offset in minutes
 */
function getTimezoneOffsetMinutes(tz = 'Asia/Kolkata') {
  try {
    const now = new Date();
    const invdate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const utcdate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    return Math.round((invdate.getTime() - utcdate.getTime()) / 60000);
  } catch {
    return 330; // default to Asia/Kolkata (+5:30)
  }
}

/**
 * Normalizes user subject profiles, extracting fallback profiles from legacy subjects if empty.
 */
function getEffectiveSubjectProfiles(user) {
  if (Array.isArray(user.subjectProfiles) && user.subjectProfiles.length > 0) {
    return user.subjectProfiles.map(p => canonicalizeSubjectProfile(p)).filter(Boolean);
  }
  if (Array.isArray(user.subjects) && user.subjects.length > 0) {
    return user.subjects.map(s => canonicalizeSubjectProfile(s)).filter(Boolean);
  }
  return [];
}

/**
 * 1. Subject Overlap Score (Weight: 0.30)
 * Uses Jaccard similarity: Intersection(A, B) / Union(A, B)
 *
 * @param {Array} profilesA
 * @param {Array} profilesB
 * @returns {number} Value between 0.0 and 1.0
 */
function computeSubjectOverlap(profilesA = [], profilesB = []) {
  if (!profilesA.length || !profilesB.length) return 0.0;

  const setA = new Set(profilesA.map(p => p.name));
  const setB = new Set(profilesB.map(p => p.name));

  let intersectionCount = 0;
  for (const name of setA) {
    if (setB.has(name)) intersectionCount++;
  }

  const unionSize = new Set([...setA, ...setB]).size;
  if (unionSize === 0) return 0.0;

  return Math.round((intersectionCount / unionSize) * 100) / 100;
}

/**
 * 2. Complementarity Score (Weight: 0.25)
 * For shared subjects:
 * - Mutual mentoring (A teaches B, B teaches A across shared subjects): 1.0
 * - One-way mentoring (A can teach what B wants to learn): 0.65
 * - Peer co-study (Both want to learn, same level): 0.45
 * - Mixed levels (Different levels, neither teaching): 0.20
 *
 * Formula: Sum(SubjectPairScore) / Count(SharedSubjects)
 *
 * @param {Array} profilesA
 * @param {Array} profilesB
 * @returns {{ score: number, sharedDetails: Array }} Value between 0.0 and 1.0 + details
 */
function computeComplementarity(profilesA = [], profilesB = []) {
  const mapA = new Map(profilesA.map(p => [p.name, p]));
  const mapB = new Map(profilesB.map(p => [p.name, p]));

  const sharedSubjects = [];
  for (const [name, pA] of mapA.entries()) {
    if (mapB.has(name)) {
      sharedSubjects.push({ name, pA, pB: mapB.get(name) });
    }
  }

  if (sharedSubjects.length === 0) {
    return { score: 0.0, sharedDetails: [] };
  }

  // Cross-subject mutual mentoring: A teaches at least one subject B wants, and B teaches at least one A wants
  const aTeachesAnyB = sharedSubjects.some(({ pA, pB }) => pA.canTeach && pB.wantsToLearn);
  const bTeachesAnyA = sharedSubjects.some(({ pA, pB }) => pB.canTeach && pA.wantsToLearn);
  const isGlobalMutual = aTeachesAnyB && bTeachesAnyA;

  let totalScore = 0;
  const sharedDetails = [];

  for (const { name, pA, pB } of sharedSubjects) {
    const aTeachesB = pA.canTeach && pB.wantsToLearn;
    const bTeachesA = pB.canTeach && pA.wantsToLearn;

    let subScore = 0.20;
    let relationship = 'co_learn';

    if (aTeachesB && bTeachesA) {
      subScore = 1.0;
      relationship = 'mutual_mentoring';
    } else if (isGlobalMutual) {
      subScore = 1.0;
      relationship = 'mutual_mentoring';
    } else if (aTeachesB) {
      subScore = 0.65;
      relationship = 'a_mentors_b';
    } else if (bTeachesA) {
      subScore = 0.65;
      relationship = 'b_mentors_a';
    } else if (pA.wantsToLearn && pB.wantsToLearn && pA.level === pB.level) {
      subScore = 0.45;
      relationship = 'peer_study';
    } else if (pA.wantsToLearn && pB.wantsToLearn) {
      subScore = 0.30;
      relationship = 'different_levels';
    }

    totalScore += subScore;
    sharedDetails.push({
      subject: pA.displayName || name,
      relationship,
      score: subScore
    });
  }

  const score = Math.min(1.0, Math.round((totalScore / sharedSubjects.length) * 100) / 100);
  return { score, sharedDetails };
}

/**
 * Converts weekly availability slots { day: 0..6, startMinute, endMinute } in user's
 * local timezone to non-wrapping UTC intervals [start, end) within [0, 10080).
 */
function convertSlotsToUtcIntervals(slots = [], timezone = 'Asia/Kolkata') {
  if (!Array.isArray(slots) || slots.length === 0) return [];

  const offsetMin = getTimezoneOffsetMinutes(timezone);
  const intervals = [];

  for (const s of slots) {
    const localStart = (s.day * 1440) + s.startMinute;
    const localEnd = (s.day * 1440) + s.endMinute;

    // Convert local minute to UTC minute
    // Since offsetMin = local - UTC, UTC = local - offsetMin
    const utcStartRaw = localStart - offsetMin;
    const utcEndRaw = localEnd - offsetMin;

    const utcStart = ((utcStartRaw % MINUTES_IN_WEEK) + MINUTES_IN_WEEK) % MINUTES_IN_WEEK;
    const utcEnd = ((utcEndRaw % MINUTES_IN_WEEK) + MINUTES_IN_WEEK) % MINUTES_IN_WEEK;

    if (utcEnd < utcStart) {
      // Slot crosses week boundary (Sat -> Sun)
      intervals.push({ start: utcStart, end: MINUTES_IN_WEEK });
      intervals.push({ start: 0, end: utcEnd });
    } else if (utcEnd > utcStart) {
      intervals.push({ start: utcStart, end: utcEnd });
    }
  }

  return intervals;
}

/**
 * Calculates total overlapping minutes between two lists of intervals in [0, 10080)
 */
function calculateIntervalsOverlapMinutes(intervalsA = [], intervalsB = []) {
  let overlap = 0;

  for (const a of intervalsA) {
    for (const b of intervalsB) {
      const start = Math.max(a.start, b.start);
      const end = Math.min(a.end, b.end);
      if (end > start) {
        overlap += (end - start);
      }
    }
  }

  return overlap;
}

/**
 * 3. Availability Overlap Score (Weight: 0.20)
 * Evaluates real overlapping study minutes converted to UTC.
 * Normalizes with a cap (default 300 minutes = 5 hours / week = 1.0).
 * Falls back to coarse label Jaccard similarity if either user lacks structured slots.
 *
 * @param {object} userA
 * @param {object} userB
 * @returns {{ score: number, overlapMinutes: number, isCoarseFallback: boolean }}
 */
function computeAvailabilityOverlap(userA, userB) {
  const slotsA = userA.availabilitySlots || [];
  const slotsB = userB.availabilitySlots || [];

  if (slotsA.length > 0 && slotsB.length > 0) {
    const intervalsA = convertSlotsToUtcIntervals(slotsA, userA.timezone);
    const intervalsB = convertSlotsToUtcIntervals(slotsB, userB.timezone);

    const overlapMinutes = calculateIntervalsOverlapMinutes(intervalsA, intervalsB);
    const maxCap = CONFIG.availabilityMaxOverlapMinutes || 300;
    const score = Math.min(1.0, Math.round((overlapMinutes / maxCap) * 100) / 100);

    return { score, overlapMinutes, isCoarseFallback: false };
  }

  // Fallback to coarse label overlap
  const availA = Array.isArray(userA.availability) ? userA.availability : [];
  const availB = Array.isArray(userB.availability) ? userB.availability : [];

  if (!availA.length || !availB.length) {
    // Neutral fallback if one has no preference set
    return { score: 0.50, overlapMinutes: 150, isCoarseFallback: true };
  }

  const setA = new Set(availA.map(s => s.toLowerCase()));
  const setB = new Set(availB.map(s => s.toLowerCase()));

  let overlap = 0;
  for (const time of setA) {
    if (setB.has(time)) overlap++;
  }

  const unionSize = new Set([...setA, ...setB]).size;
  const score = unionSize > 0 ? Math.round((overlap / unionSize) * 100) / 100 : 0.0;
  const estimatedMinutes = Math.round(score * 300);

  return { score, overlapMinutes: estimatedMinutes, isCoarseFallback: true };
}

/**
 * 4. Learning Goal & Study Style Score (Weight: 0.10)
 * 50% goal match + 50% study style compatibility matrix
 *
 * @param {object} userA
 * @param {object} userB
 * @returns {{ score: number, commonGoals: Array, styleMatch: number }}
 */
function computeGoalAndStyle(userA, userB) {
  // Goal matching (max 2 goals per user)
  const goalsA = Array.isArray(userA.learningGoal) ? userA.learningGoal : [];
  const goalsB = Array.isArray(userB.learningGoal) ? userB.learningGoal : [];

  const setB = new Set(goalsB);
  const commonGoals = goalsA.filter(g => setB.has(g));

  let goalScore = 0.5; // neutral if not configured
  if (goalsA.length > 0 && goalsB.length > 0) {
    const unionSize = new Set([...goalsA, ...goalsB]).size;
    goalScore = unionSize > 0 ? (commonGoals.length / unionSize) : 0.0;
  }

  // Study style matrix lookup
  const styleA = userA.studyStyle || 'mixed';
  const styleB = userB.studyStyle || 'mixed';

  const matrix = CONFIG.studyStyleMatrix;
  const styleMatch = (matrix[styleA] && matrix[styleA][styleB]) !== undefined
    ? matrix[styleA][styleB]
    : 0.85;

  const combined = Math.round(((goalScore * 0.5) + (styleMatch * 0.5)) * 100) / 100;
  return { score: combined, commonGoals, styleMatch };
}

/**
 * 5. Reputation Score (Weight: 0.10)
 * Normalized Bayesian rating (0..1).
 * If fewer than 3 reviews received, returns neutral baseline (0.70) so new users are not penalized.
 *
 * @param {number} ratingAvg
 * @param {number} ratingCount
 * @returns {number} Value between 0.0 and 1.0
 */
function computeReputation(ratingAvg = 0, ratingCount = 0) {
  if (ratingCount < 3) {
    return 0.70; // Neutral baseline (corresponding to prior mean 3.5 / 5)
  }
  const bayesian = calculateBayesianScore(ratingCount, (ratingAvg || 0) * (ratingCount || 0));
  return Math.min(1.0, Math.max(0.0, Math.round((bayesian / 5.0) * 100) / 100));
}

/**
 * 6. Activity Recency Decay (Weight: 0.05)
 * Linearly decays over 30 days from last activity.
 *
 * @param {Date|string} lastActiveDate
 * @returns {number} Value between 0.05 and 1.0
 */
function computeActivityRecency(lastActiveDate) {
  if (!lastActiveDate) return 0.50; // Neutral if unknown

  const now = Date.now();
  const activeTime = new Date(lastActiveDate).getTime();
  const diffDays = Math.max(0, (now - activeTime) / (24 * 60 * 60 * 1000));

  if (diffDays <= 1) return 1.0;
  if (diffDays >= 30) return 0.10;

  const score = 1.0 - (0.9 * (diffDays / 30));
  return Math.max(0.05, Math.round(score * 100) / 100);
}

/**
 * Deterministic template-based reason generator (NO LLM)
 * Produces clear, explainable match justifications for users.
 */
function generateReasons(breakdown, userA, userB) {
  const reasons = [];

  // Subject overlap reasons
  const common = breakdown.commonSubjectNames || [];
  if (common.length === 1) {
    reasons.push(`Shared study subject: ${common[0]}`);
  } else if (common.length > 1) {
    reasons.push(`${common.length} common subjects: ${common.slice(0, 3).join(', ')}${common.length > 3 ? ` +${common.length - 3} more` : ''}`);
  }

  // Complementarity reasons
  const compDetails = breakdown.complementarityDetails || [];
  const mutual = compDetails.filter(d => d.relationship === 'mutual_mentoring');
  const aTeaches = compDetails.filter(d => d.relationship === 'a_mentors_b');
  const bTeaches = compDetails.filter(d => d.relationship === 'b_mentors_a');

  if (mutual.length > 0) {
    reasons.push(`Mutual mentoring: Exchange knowledge in ${mutual[0].subject}`);
  } else if (aTeaches.length > 0) {
    reasons.push(`You can teach ${aTeaches[0].subject}, which they want to learn`);
  } else if (bTeaches.length > 0) {
    reasons.push(`They can teach ${bTeaches[0].subject}, which you want to learn`);
  } else if (compDetails.some(d => d.relationship === 'peer_study')) {
    reasons.push('Study-together partners at the same proficiency level');
  }

  // Availability overlap reasons
  if (breakdown.availabilityOverlapMinutes >= 60) {
    const hours = (breakdown.availabilityOverlapMinutes / 60).toFixed(1);
    reasons.push(`${hours} hrs/week overlapping study time`);
  } else if (breakdown.availabilityOverlapMinutes > 0) {
    reasons.push(`${breakdown.availabilityOverlapMinutes} mins/week overlapping time`);
  }

  // Learning goal reasons
  const goals = breakdown.commonGoals || [];
  if (goals.length > 0) {
    const goalLabels = {
      exam_prep: 'Exam Preparation',
      concept_clarity: 'Concept Clarity',
      projects: 'Project Work',
      revision: 'Course Revision',
      interview_prep: 'Interview Preparation'
    };
    reasons.push(`Both targeting ${goalLabels[goals[0]] || goals[0]}`);
  }

  // Study style reasons
  if (breakdown.styleMatch >= 0.95 && userA.studyStyle && userB.studyStyle) {
    const styleLabels = {
      silent_focus: 'Silent Focus',
      discussion_heavy: 'Interactive Discussion',
      mixed: 'Balanced Study'
    };
    reasons.push(`Compatible style: ${styleLabels[userA.studyStyle] || 'Matched pace'}`);
  }

  // Reputation reason
  if (userB.ratingCount >= 3 && userB.ratingAvg >= 4.5) {
    reasons.push(`⭐ Highly rated study peer (${userB.ratingAvg} / 5)`);
  }

  return reasons.slice(0, 4); // Top 4 most informative reasons
}

/**
 * Calculates complete match between two users using all 6 components
 *
 * @param {object} userA - Authenticated current user
 * @param {object} userB - Candidate partner
 * @returns {{ matchScore: number, breakdown: object, reasons: Array, isCompatible: boolean }}
 */
function calculateOverallMatch(userA, userB) {
  const profilesA = getEffectiveSubjectProfiles(userA);
  const profilesB = getEffectiveSubjectProfiles(userB);

  // 1. Subject overlap
  const subjectOverlapScore = computeSubjectOverlap(profilesA, profilesB);

  // 2. Complementarity
  const { score: compScore, sharedDetails } = computeComplementarity(profilesA, profilesB);

  // 3. Availability overlap
  const { score: availScore, overlapMinutes, isCoarseFallback } = computeAvailabilityOverlap(userA, userB);

  // Hard filter check: zero shared subjects AND zero availability overlap
  const commonNames = sharedDetails.map(d => d.subject);
  const hasZeroOverlap = (commonNames.length === 0) && (overlapMinutes === 0);

  // 4. Goal & style
  const { score: goalStyleScore, commonGoals, styleMatch } = computeGoalAndStyle(userA, userB);

  // 5. Reputation
  const repScore = computeReputation(userB.ratingAvg, userB.ratingCount);

  // 6. Activity recency
  const recencyScore = computeActivityRecency(userB.lastStudyDate || userB.updatedAt || userB.createdAt);

  const w = CONFIG.weights;

  // Weighted total (0.0 to 1.0)
  const weightedSum =
    (subjectOverlapScore * w.subjectOverlap) +
    (compScore * w.complementarity) +
    (availScore * w.availabilityOverlap) +
    (goalStyleScore * w.goalAndStyle) +
    (repScore * w.reputation) +
    (recencyScore * w.activityRecency);

  const matchScore = Math.min(100, Math.max(0, Math.round(weightedSum * 100)));

  const breakdown = {
    subjectOverlap: Math.round(subjectOverlapScore * 100),
    complementarity: Math.round(compScore * 100),
    availabilityOverlap: Math.round(availScore * 100),
    availabilityOverlapMinutes: overlapMinutes,
    isCoarseFallback,
    goalAndStyle: Math.round(goalStyleScore * 100),
    reputation: Math.round(repScore * 100),
    activityRecency: Math.round(recencyScore * 100),
    commonSubjectNames: commonNames,
    commonGoals,
    styleMatch,
    complementarityDetails: sharedDetails
  };

  const reasons = generateReasons(breakdown, userA, userB);

  return {
    matchScore: hasZeroOverlap ? 0 : matchScore,
    breakdown,
    reasons,
    isCompatible: !hasZeroOverlap && matchScore >= (CONFIG.minMatchScoreThreshold || 20)
  };
}

/**
 * Calculates profile completeness score (0..100) and actionable improvement tips
 */
function calculateProfileCompleteness(user) {
  let score = 0;
  const tips = [];

  const profiles = getEffectiveSubjectProfiles(user);
  if (profiles.length > 0) {
    score += 35;
    const hasTeaching = profiles.some(p => p.canTeach);
    if (!hasTeaching) {
      tips.push('Mark subjects you can teach or mentor in to find mutual study partners');
    }
  } else {
    tips.push('Add the subjects you are currently studying');
  }

  if (Array.isArray(user.availabilitySlots) && user.availabilitySlots.length > 0) {
    score += 25;
  } else if (Array.isArray(user.availability) && user.availability.length > 0) {
    score += 15;
    tips.push('Set your weekly study time blocks for more precise partner scheduling');
  } else {
    tips.push('Select your study availability preferences');
  }

  if (Array.isArray(user.learningGoal) && user.learningGoal.length > 0) {
    score += 15;
  } else {
    tips.push('Choose your current learning goals (e.g. Exam Prep or Revision)');
  }

  if (user.studyStyle) {
    score += 10;
  } else {
    tips.push('Set your preferred study style (Silent Focus or Discussion)');
  }

  if (user.bio && user.bio.trim().length >= 20) {
    score += 15;
  } else {
    tips.push('Write a short bio to introduce yourself to study peers');
  }

  return {
    completeness: Math.min(100, score),
    tips: tips.slice(0, 3)
  };
}

module.exports = {
  getTimezoneOffsetMinutes,
  getEffectiveSubjectProfiles,
  computeSubjectOverlap,
  computeComplementarity,
  computeAvailabilityOverlap,
  computeGoalAndStyle,
  computeReputation,
  computeActivityRecency,
  generateReasons,
  calculateOverallMatch,
  calculateProfileCompleteness
};
