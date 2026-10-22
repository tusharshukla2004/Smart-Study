// ============================================
// Gamification Configuration & Rule Engine
// ============================================

/**
 * Level formula: level = floor(sqrt(xp / 50)) + 1
 *
 * Examples:
 *   XP: 0     -> Level 1 (0 / 50 xp)
 *   XP: 50    -> Level 2 (0 / 150 xp)
 *   XP: 200   -> Level 3 (0 / 250 xp)
 *   XP: 450   -> Level 4
 */
function calculateLevel(xp = 0) {
  const safeXp = Math.max(0, Number(xp) || 0);
  return Math.floor(Math.sqrt(safeXp / 50)) + 1;
}

/**
 * Calculates level progress breakdown
 * @param {number} xp
 * @returns {{ currentLevel: number, xpIntoLevel: number, xpForNextLevel: number, percent: number }}
 */
function getLevelProgress(xp = 0) {
  const safeXp = Math.max(0, Number(xp) || 0);
  const currentLevel = calculateLevel(safeXp);

  const xpFloor = 50 * Math.pow(currentLevel - 1, 2);
  const xpCeil = 50 * Math.pow(currentLevel, 2);
  const xpSpan = Math.max(1, xpCeil - xpFloor);

  const xpIntoLevel = Math.max(0, safeXp - xpFloor);
  const xpForNextLevel = Math.max(0, xpCeil - safeXp);
  const percent = Math.min(100, Math.max(0, Math.round((xpIntoLevel / xpSpan) * 100)));

  return {
    currentLevel,
    xpIntoLevel,
    xpForNextLevel,
    percent
  };
}

/**
 * XP Calculation rules
 */
const XP_RULES = {
  // Session log XP: +10 base, +1 per 5 min (cap 30 from time), +5 bonus if focusRating >= 4
  calculateSessionLogXp: (minutesStudied, focusRating) => {
    const base = 10;
    const timeXp = Math.min(30, Math.floor((Math.max(0, Number(minutesStudied) || 0)) / 5));
    const focusBonus = (Number(focusRating) >= 4) ? 5 : 0;
    return base + timeXp + focusBonus;
  },

  // Task XP: +5 base (+3 extra if high priority)
  calculateTaskXp: (priority) => {
    return 5 + (priority === 'high' ? 3 : 0);
  },

  // Daily streak continuation XP
  DAILY_STREAK_XP: 5
};

/**
 * Badge Definitions
 */
const BADGE_DEFINITIONS = [
  {
    key: 'first_session',
    name: 'First Step',
    icon: '🎯',
    description: 'Completed your first study session',
    category: 'session',
    target: 1
  },
  {
    key: 'streak_3',
    name: 'Momentum',
    icon: '🔥',
    description: 'Reached a 3-day study streak',
    category: 'streak',
    target: 3
  },
  {
    key: 'streak_7',
    name: 'Habit Builder',
    icon: '⚡',
    description: 'Reached a 7-day study streak',
    category: 'streak',
    target: 7
  },
  {
    key: 'streak_30',
    name: 'Unstoppable',
    icon: '🏆',
    description: 'Reached a 30-day study streak',
    category: 'streak',
    target: 30
  },
  {
    key: 'hours_10',
    name: 'Dedicated Student',
    icon: '⏳',
    description: 'Logged 10 total study hours',
    category: 'hours',
    target: 10
  },
  {
    key: 'hours_50',
    name: 'Mastery Seeker',
    icon: '📚',
    description: 'Logged 50 total study hours',
    category: 'hours',
    target: 50
  },
  {
    key: 'hours_100',
    name: 'Centurion Scholar',
    icon: '👑',
    description: 'Logged 100 total study hours',
    category: 'hours',
    target: 100
  },
  {
    key: 'tasks_10',
    name: 'Task Finisher',
    icon: '✅',
    description: 'Completed 10 study tasks',
    category: 'tasks',
    target: 10
  },
  {
    key: 'tasks_50',
    name: 'Goal Crusher',
    icon: '🚀',
    description: 'Completed 50 study tasks',
    category: 'tasks',
    target: 50
  },
  {
    key: 'night_owl',
    name: 'Night Owl',
    icon: '🦉',
    description: 'Studied late in 5 sessions after 10:00 PM',
    category: 'time',
    target: 5
  },
  {
    key: 'early_bird',
    name: 'Early Bird',
    icon: '🌅',
    description: 'Studied early in 5 sessions before 7:00 AM',
    category: 'time',
    target: 5
  },
  {
    key: 'team_player',
    name: 'Team Player',
    icon: '🤝',
    description: 'Participated in study sessions across 3 different groups',
    category: 'collaboration',
    target: 3
  },
  {
    key: 'helpful_peer',
    name: 'Helpful Peer',
    icon: '🌟',
    description: 'Received 5 positive peer ratings (4+ stars)',
    category: 'reputation',
    target: 5
  }
];

module.exports = {
  calculateLevel,
  getLevelProgress,
  XP_RULES,
  BADGE_DEFINITIONS
};
