// ============================================
// Unit Tests: Gamification XP Rules & Level Formulas
// ============================================

const {
  calculateLevel,
  getLevelProgress,
  XP_RULES,
  BADGE_DEFINITIONS
} = require('../config/gamification');

describe('Gamification Formula & Rules', () => {
  describe('calculateLevel: floor(sqrt(xp / 50)) + 1', () => {
    test('calculates correct level based on XP thresholds', () => {
      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(49)).toBe(1);
      expect(calculateLevel(50)).toBe(2);
      expect(calculateLevel(199)).toBe(2);
      expect(calculateLevel(200)).toBe(3);
      expect(calculateLevel(450)).toBe(4);
    });

    test('handles negative and non-numeric XP safely', () => {
      expect(calculateLevel(-20)).toBe(1);
      expect(calculateLevel(null)).toBe(1);
      expect(calculateLevel(undefined)).toBe(1);
    });
  });

  describe('getLevelProgress helper', () => {
    test('computes exact progress percentage and remaining XP', () => {
      // Level 1: 0 to 50 XP
      const p0 = getLevelProgress(0);
      expect(p0.currentLevel).toBe(1);
      expect(p0.xpIntoLevel).toBe(0);
      expect(p0.xpForNextLevel).toBe(50);
      expect(p0.percent).toBe(0);

      const p25 = getLevelProgress(25);
      expect(p25.currentLevel).toBe(1);
      expect(p25.xpIntoLevel).toBe(25);
      expect(p25.xpForNextLevel).toBe(25);
      expect(p25.percent).toBe(50);

      // Level 2: 50 to 200 XP (span = 150)
      const p50 = getLevelProgress(50);
      expect(p50.currentLevel).toBe(2);
      expect(p50.xpIntoLevel).toBe(0);
      expect(p50.xpForNextLevel).toBe(150);
      expect(p50.percent).toBe(0);

      const p125 = getLevelProgress(125);
      expect(p125.currentLevel).toBe(2);
      expect(p125.xpIntoLevel).toBe(75);
      expect(p125.xpForNextLevel).toBe(75);
      expect(p125.percent).toBe(50);
    });
  });

  describe('XP_RULES', () => {
    test('calculateSessionLogXp: base 10 + 1 per 5 min (cap 30) + 5 if focus >= 4', () => {
      // 25 mins, focus 3: 10 + 5 + 0 = 15
      expect(XP_RULES.calculateSessionLogXp(25, 3)).toBe(15);

      // 25 mins, focus 4: 10 + 5 + 5 = 20
      expect(XP_RULES.calculateSessionLogXp(25, 4)).toBe(20);

      // 150 mins, focus 5: 10 + min(30, 30) + 5 = 45 (capped time XP)
      expect(XP_RULES.calculateSessionLogXp(150, 5)).toBe(45);

      // 0 mins, focus 1: 10 + 0 + 0 = 10
      expect(XP_RULES.calculateSessionLogXp(0, 1)).toBe(10);
    });

    test('calculateTaskXp: +5 base, +3 extra for high priority', () => {
      expect(XP_RULES.calculateTaskXp('low')).toBe(5);
      expect(XP_RULES.calculateTaskXp('medium')).toBe(5);
      expect(XP_RULES.calculateTaskXp('high')).toBe(8);
    });
  });

  describe('BADGE_DEFINITIONS', () => {
    test('contains all required Phase 2 badges with unique keys', () => {
      const requiredKeys = [
        'first_session', 'streak_3', 'streak_7', 'streak_30',
        'hours_10', 'hours_50', 'hours_100', 'tasks_10', 'tasks_50',
        'night_owl', 'early_bird', 'team_player', 'helpful_peer'
      ];

      const keys = BADGE_DEFINITIONS.map(b => b.key);
      for (const reqKey of requiredKeys) {
        expect(keys).toContain(reqKey);
      }

      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });
  });
});
