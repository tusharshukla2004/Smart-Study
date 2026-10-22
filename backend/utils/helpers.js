// ============================================
// Utility Helper Functions
// ============================================

const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token for a given user ID.
 * @param {string} id - The user's MongoDB _id
 * @returns {string} JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/**
 * Calculate match score between two sets (e.g., subjects).
 * Uses Jaccard similarity: intersection / union.
 * @param {Array} setA - First array 
 * @param {Array} setB - Second array
 * @returns {number} Score between 0 and 100
 */
const calculateMatchScore = (setA, setB) => {
  if (!setA.length || !setB.length) return 0;

  const a = new Set(setA.map(s => s.toLowerCase()));
  const b = new Set(setB.map(s => s.toLowerCase()));

  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }

  const union = new Set([...a, ...b]).size;
  return Math.round((intersection / union) * 100);
};

/**
 * Calculate availability overlap score.
 * @param {Array} availA - First user's availability
 * @param {Array} availB - Second user's availability
 * @returns {number} Score between 0 and 100
 */
const calculateAvailabilityScore = (availA, availB) => {
  if (!availA.length || !availB.length) return 50; // Neutral if no preference

  const a = new Set(availA.map(s => s.toLowerCase()));
  const b = new Set(availB.map(s => s.toLowerCase()));

  let overlap = 0;
  for (const time of a) {
    if (b.has(time)) overlap++;
  }

  return Math.round((overlap / Math.max(a.size, b.size)) * 100);
};

/**
 * Async error wrapper for route handlers.
 * Eliminates the need for try-catch in every controller.
 * @param {Function} fn - Async route handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  generateToken,
  calculateMatchScore,
  calculateAvailabilityScore,
  asyncHandler
};
