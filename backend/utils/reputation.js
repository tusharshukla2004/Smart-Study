// ============================================
// Reputation & Bayesian Score Utility (Phase 2 -> Phase 3 prep)
// ============================================

const User = require('../models/User');

const DEFAULT_PRIOR_WEIGHT = 3;   // C: confidence constant
const DEFAULT_PRIOR_MEAN = 3.5;    // m: global average baseline

/**
 * Pure calculation of Bayesian average rating.
 * Formula: (C * m + sum) / (C + count)
 *
 * Prevents small-sample bias (e.g. 1 five-star rating outranking a user with 50 ratings averaging 4.8).
 *
 * @param {number} count - Total number of ratings received (N >= 0)
 * @param {number} sum - Sum of all rating values received (sum >= 0)
 * @param {number} [C=3] - Prior weight constant
 * @param {number} [m=3.5] - Prior mean
 * @returns {number} Bayesian score rounded to 2 decimal places
 */
function calculateBayesianScore(count = 0, sum = 0, C = DEFAULT_PRIOR_WEIGHT, m = DEFAULT_PRIOR_MEAN) {
  const safeCount = Math.max(0, Number(count) || 0);
  const safeSum = Math.max(0, Number(sum) || 0);
  const score = ((C * m) + safeSum) / (C + safeCount);
  return Math.round(score * 100) / 100;
}

/**
 * Computes a user's Bayesian reputation score from User model stats.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {number} [C=3]
 * @param {number} [m=3.5]
 * @returns {Promise<number>}
 */
async function getReputationScore(userId, C = DEFAULT_PRIOR_WEIGHT, m = DEFAULT_PRIOR_MEAN) {
  if (!userId) return DEFAULT_PRIOR_MEAN;

  const user = await User.findById(userId).select('ratingAvg ratingCount');
  if (!user || !user.ratingCount) {
    return DEFAULT_PRIOR_MEAN;
  }

  const sum = (user.ratingAvg || 0) * (user.ratingCount || 0);
  return calculateBayesianScore(user.ratingCount, sum, C, m);
}

module.exports = {
  calculateBayesianScore,
  getReputationScore,
  DEFAULT_PRIOR_WEIGHT,
  DEFAULT_PRIOR_MEAN
};
