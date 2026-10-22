// ============================================
// Unit Tests: Date Bucketing & Timezone Logic
// ============================================

const {
  formatDateInTimezone,
  getHourInTimezone,
  getTimeOfDayBucket,
  fillDailyGaps,
  fillWeeklyGaps,
  generateHeatmapDays,
  parseRangeDays
} = require('../utils/dateUtils');

describe('Date & Timezone Utilities', () => {
  describe('formatDateInTimezone', () => {
    test('formats UTC date correctly into Asia/Kolkata timezone', () => {
      // 2026-10-22 19:00 UTC is 2026-10-23 00:30 in Asia/Kolkata (+5:30)
      const utcDate = new Date('2026-10-22T19:00:00.000Z');
      const formatted = formatDateInTimezone(utcDate, 'Asia/Kolkata');
      expect(formatted).toBe('2026-10-23');
    });

    test('formats UTC date correctly into America/New_York timezone', () => {
      // 2026-10-22 02:00 UTC is 2026-10-21 22:00 in America/New_York (-4:00 EDT)
      const utcDate = new Date('2026-10-22T02:00:00.000Z');
      const formatted = formatDateInTimezone(utcDate, 'America/New_York');
      expect(formatted).toBe('2026-10-21');
    });
  });

  describe('getHourInTimezone & getTimeOfDayBucket', () => {
    test('identifies morning, afternoon, evening and night correctly', () => {
      expect(getTimeOfDayBucket(8)).toBe('morning');
      expect(getTimeOfDayBucket(14)).toBe('afternoon');
      expect(getTimeOfDayBucket(20)).toBe('evening');
      expect(getTimeOfDayBucket(23)).toBe('night');
      expect(getTimeOfDayBucket(3)).toBe('night');
    });
  });

  describe('parseRangeDays', () => {
    test('defaults to 7 days, supports 30d and 90d', () => {
      expect(parseRangeDays('7d')).toBe(7);
      expect(parseRangeDays('30d')).toBe(30);
      expect(parseRangeDays('90d')).toBe(90);
      expect(parseRangeDays('invalid')).toBe(7);
    });
  });

  describe('fillDailyGaps', () => {
    test('fills missing days with 0 minutes', () => {
      const start = new Date('2026-10-15T00:00:00Z');
      const end = new Date('2026-10-18T00:00:00Z');
      const sparseData = [
        { date: '2026-10-15', minutes: 45 },
        { date: '2026-10-18', minutes: 90 }
      ];

      const filled = fillDailyGaps(sparseData, start, end, 'UTC');

      expect(filled.length).toBe(4);
      expect(filled[0]).toEqual(expect.objectContaining({ date: '2026-10-15', minutes: 45 }));
      expect(filled[1]).toEqual(expect.objectContaining({ date: '2026-10-16', minutes: 0 }));
      expect(filled[2]).toEqual(expect.objectContaining({ date: '2026-10-17', minutes: 0 }));
      expect(filled[3]).toEqual(expect.objectContaining({ date: '2026-10-18', minutes: 90 }));
    });
  });

  describe('generateHeatmapDays', () => {
    test('generates 365 days for non-leap year (2025) and 366 days for leap year (2024)', () => {
      const nonLeap = generateHeatmapDays(2025, {});
      expect(nonLeap.days.length).toBe(365);

      const leap = generateHeatmapDays(2024, {});
      expect(leap.days.length).toBe(366);
    });

    test('computes quartile levels 0-4 properly', () => {
      const dataMap = {
        '2026-01-10': 15,
        '2026-01-11': 30,
        '2026-01-12': 60,
        '2026-01-13': 120
      };

      const heatmap = generateHeatmapDays(2026, dataMap);
      const day10 = heatmap.days.find(d => d.date === '2026-01-10');
      const day13 = heatmap.days.find(d => d.date === '2026-01-13');
      const emptyDay = heatmap.days.find(d => d.date === '2026-01-14');

      expect(emptyDay.level).toBe(0);
      expect(day10.level).toBeGreaterThanOrEqual(1);
      expect(day13.level).toBe(4);
    });
  });
});
