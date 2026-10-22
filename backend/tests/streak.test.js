// ============================================
// Unit Tests: Study Streak Calculation Logic
// ============================================

const { calculateStreak } = require('../utils/streak');

describe('calculateStreak Unit Tests', () => {
  test('initializes streak to 1 when user has no prior study history', () => {
    const today = new Date('2026-10-22T10:00:00.000Z');
    const result = calculateStreak(0, null, today);

    expect(result.streak).toBe(1);
    expect(result.lastStudyDate).toEqual(today);
  });

  test('keeps streak unchanged when another session is logged on the same UTC day', () => {
    const firstSession = new Date('2026-10-22T08:00:00.000Z');
    const secondSession = new Date('2026-10-22T20:30:00.000Z');

    const result = calculateStreak(3, firstSession, secondSession);

    expect(result.streak).toBe(3);
    expect(result.lastStudyDate).toEqual(secondSession);
  });

  test('increments streak by 1 when session is logged on the next calendar day', () => {
    const yesterday = new Date('2026-10-21T18:00:00.000Z');
    const today = new Date('2026-10-22T09:15:00.000Z');

    const result = calculateStreak(4, yesterday, today);

    expect(result.streak).toBe(5);
    expect(result.lastStudyDate).toEqual(today);
  });

  test('resets streak to 1 when there is a gap of 2 or more days', () => {
    const twoDaysAgo = new Date('2026-10-20T12:00:00.000Z');
    const today = new Date('2026-10-22T10:00:00.000Z');

    const result = calculateStreak(10, twoDaysAgo, today);

    expect(result.streak).toBe(1);
    expect(result.lastStudyDate).toEqual(today);
  });

  test('resets streak to 1 on a long gap', () => {
    const lastMonth = new Date('2026-09-01T10:00:00.000Z');
    const today = new Date('2026-10-22T10:00:00.000Z');

    const result = calculateStreak(25, lastMonth, today);

    expect(result.streak).toBe(1);
  });

  test('handles date boundaries across month and year transitions', () => {
    // Dec 31 to Jan 1
    const newYearsEve = new Date('2025-12-31T23:30:00.000Z');
    const newYearsDay = new Date('2026-01-01T01:15:00.000Z');

    const result = calculateStreak(7, newYearsEve, newYearsDay);

    expect(result.streak).toBe(8);
  });
});
