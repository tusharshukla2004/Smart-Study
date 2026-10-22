// ============================================
// Streak Calculation Utility (Pure Function)
// ============================================

/**
 * Normalizes a Date or date string to a UTC midnight timestamp (in ms)
 * to perform day-boundary arithmetic without timezone drift.
 * @param {Date|string} date
 * @returns {number} UTC midnight epoch in milliseconds
 */
const getUtcMidnight = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Computes updated streak based on previous lastStudyDate and current session date.
 * Uses UTC calendar day boundaries (YYYY-MM-DD).
 *
 * @param {number} currentStreak - Existing streak number (>= 0)
 * @param {Date|string|null} lastStudyDate - Last logged study date
 * @param {Date|string} [sessionDate=new Date()] - Date/time of new study session
 * @returns {{ streak: number, lastStudyDate: Date }}
 */
function calculateStreak(currentStreak = 0, lastStudyDate = null, sessionDate = new Date()) {
  const safeStreak = Math.max(0, Number.isInteger(currentStreak) ? currentStreak : 0);
  const sessionUtc = getUtcMidnight(sessionDate);
  const sessionDateObj = new Date(sessionDate);

  if (!sessionUtc) {
    throw new Error('Invalid sessionDate provided to calculateStreak');
  }

  if (!lastStudyDate || safeStreak === 0) {
    return {
      streak: 1,
      lastStudyDate: sessionDateObj
    };
  }

  const lastUtc = getUtcMidnight(lastStudyDate);
  if (!lastUtc) {
    return {
      streak: 1,
      lastStudyDate: sessionDateObj
    };
  }

  const diffDays = Math.round((sessionUtc - lastUtc) / MS_PER_DAY);

  // Same calendar day -> streak remains unchanged, keep newest date
  if (diffDays === 0) {
    return {
      streak: safeStreak,
      lastStudyDate: sessionDateObj
    };
  }

  // Next calendar day -> streak increments by 1
  if (diffDays === 1) {
    return {
      streak: safeStreak + 1,
      lastStudyDate: sessionDateObj
    };
  }

  // Session happened in the past (e.g. backfill or out of order)
  if (diffDays < 0) {
    return {
      streak: safeStreak,
      lastStudyDate: new Date(lastStudyDate)
    };
  }

  // Gap of 2 or more days -> streak resets to 1
  return {
    streak: 1,
    lastStudyDate: sessionDateObj
  };
}

module.exports = {
  calculateStreak,
  getUtcMidnight
};
