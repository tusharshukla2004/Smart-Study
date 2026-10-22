// ============================================
// Matchmaking v2 Configuration & Weights
// Centralized weights, thresholds & cold-start configs
// ============================================

const MATCHMAKING_CONFIG = {
  // Score Component Weights (Sum = 1.0)
  weights: {
    subjectOverlap: 0.30,
    complementarity: 0.25,
    availabilityOverlap: 0.20,
    goalAndStyle: 0.10,
    reputation: 0.10,
    activityRecency: 0.05
  },

  // Availability normalization cap (minutes per week)
  // 300 minutes = 5 hours per week of overlap gives max score 1.0
  availabilityMaxOverlapMinutes: 300,

  // Cache settings
  cacheTtlSeconds: 300, // 5 minutes TTL per user
  maxCandidatesScan: 300, // Indexed candidate pre-filter cap

  // Minimum threshold for partner recommendation (out of 100)
  minMatchScoreThreshold: 20,

  // Inactivity cutoff: users inactive for more than 90 days are excluded
  maxInactivityDays: 90,

  // Study style compatibility matrix (symmetric lookup)
  studyStyleMatrix: {
    silent_focus: {
      silent_focus: 1.0,
      discussion_heavy: 0.2,
      mixed: 0.85
    },
    discussion_heavy: {
      silent_focus: 0.2,
      discussion_heavy: 1.0,
      mixed: 0.85
    },
    mixed: {
      silent_focus: 0.85,
      discussion_heavy: 0.85,
      mixed: 1.0
    }
  },

  // Group recommendation weights
  groupWeights: {
    subjectOverlap: 0.35,
    levelFit: 0.20,
    scheduleOverlap: 0.20,
    recentActivity: 0.15,
    fillRatio: 0.10
  }
};

module.exports = MATCHMAKING_CONFIG;
