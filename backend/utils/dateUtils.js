// ============================================
// Timezone and Date Bucketing Utilities
// Pure functions for gap-filling & date boundaries
// ============================================

const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Validates whether an IANA timezone string is recognized.
 * Falls back to default if invalid.
 */
function normalizeTimezone(tz) {
  if (!tz || typeof tz !== 'string') return DEFAULT_TIMEZONE;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Parses range string into days
 * @param {string} rangeStr - '7d' | '30d' | '90d'
 * @returns {number}
 */
function parseRangeDays(rangeStr) {
  if (rangeStr === '30d') return 30;
  if (rangeStr === '90d') return 90;
  return 7; // Default 7d
}

/**
 * Returns formatted 'YYYY-MM-DD' string for a Date in a given timezone
 */
function formatDateInTimezone(date, timeZone = DEFAULT_TIMEZONE) {
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: normalizeTimezone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d); // en-CA gives YYYY-MM-DD
}

/**
 * Returns the hour (0-23) of a date in the given timezone
 */
function getHourInTimezone(date, timeZone = DEFAULT_TIMEZONE) {
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: normalizeTimezone(timeZone),
    hour: 'numeric',
    hour12: false
  });
  return parseInt(formatter.format(d), 10) % 24;
}

/**
 * Maps hour (0-23) to time-of-day bucket:
 * Morning: 06:00 - 11:59
 * Afternoon: 12:00 - 17:59
 * Evening: 18:00 - 21:59
 * Night: 22:00 - 05:59
 */
function getTimeOfDayBucket(hour) {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Returns start of current week (Monday 00:00:00) in UTC for queries
 */
function getStartOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff, 0, 0, 0, 0));
  return monday;
}

/**
 * Returns date range objects for current and previous periods
 */
function getDateRange(rangeDays = 7, endDate = new Date()) {
  const end = new Date(endDate);
  const start = new Date(end.getTime() - (rangeDays * 24 * 60 * 60 * 1000));

  const prevEnd = new Date(start.getTime());
  const prevStart = new Date(prevEnd.getTime() - (rangeDays * 24 * 60 * 60 * 1000));

  return {
    current: { start, end },
    previous: { start: prevStart, end: prevEnd },
    rangeDays
  };
}

/**
 * Fills missing daily intervals with 0 minutes between start and end date
 * @param {Array<{ date: string, minutes: number }>} data - Sparse data keyed by 'YYYY-MM-DD'
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {string} timeZone
 * @returns {Array<{ date: string, label: string, minutes: number }>}
 */
function fillDailyGaps(data, startDate, endDate, timeZone = DEFAULT_TIMEZONE) {
  const tz = normalizeTimezone(timeZone);
  const dataMap = new Map();
  for (const item of data) {
    dataMap.set(item.date, Number(item.minutes) || 0);
  }

  const result = [];
  const curr = new Date(startDate);
  const end = new Date(endDate);

  // Day label formatter (e.g., 'Mon, Oct 22')
  const labelFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  // Increment day-by-day in 24h increments
  while (curr <= end) {
    const dateKey = formatDateInTimezone(curr, tz);
    const label = labelFormatter.format(curr);

    // Only add if not already added in this series (handle DST/slight overlaps)
    if (!result.some(r => r.date === dateKey)) {
      result.push({
        date: dateKey,
        label,
        minutes: dataMap.get(dateKey) || 0
      });
    }

    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return result;
}

/**
 * Fills weekly gaps for multi-week ranges
 * @param {Array<{ week: string, minutes: number }>} data
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Array<{ week: string, label: string, minutes: number }>}
 */
function fillWeeklyGaps(data, startDate, endDate) {
  const dataMap = new Map();
  for (const item of data) {
    dataMap.set(item.week, Number(item.minutes) || 0);
  }

  const result = [];
  const curr = new Date(startDate);
  const end = new Date(endDate);

  let weekIndex = 1;
  while (curr <= end) {
    const weekStartKey = curr.toISOString().slice(0, 10);
    const nextWeek = new Date(curr.getTime() + 7 * 24 * 60 * 60 * 1000);
    const label = `Week ${weekIndex} (${curr.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;

    result.push({
      week: weekStartKey,
      label,
      minutes: dataMap.get(weekStartKey) || 0
    });

    curr.setTime(nextWeek.getTime());
    weekIndex++;
  }

  return result;
}

/**
 * Computes quartile levels 0-4 for daily study minutes across a full year.
 * Non-zero days are divided into 4 quartiles:
 * 0 min -> 0
 * <= Q1 -> 1
 * <= Q2 -> 2
 * <= Q3 -> 3
 * > Q3  -> 4
 *
 * @param {number} year - YYYY
 * @param {Map<string, number>|Object} dailyMinutesMap - map of 'YYYY-MM-DD' => minutes
 * @param {string} timeZone
 * @returns {Array<{ date: string, minutes: number, level: number }>}
 */
function generateHeatmapDays(year, dailyMinutesMap, timeZone = DEFAULT_TIMEZONE) {
  const tz = normalizeTimezone(timeZone);
  const map = dailyMinutesMap instanceof Map ? dailyMinutesMap : new Map(Object.entries(dailyMinutesMap || {}));

  // Collect non-zero values to compute quartiles
  const nonZeroValues = [];
  for (const val of map.values()) {
    if (val > 0) nonZeroValues.push(val);
  }
  nonZeroValues.sort((a, b) => a - b);

  let q1 = 15;
  let q2 = 30;
  let q3 = 60;

  if (nonZeroValues.length >= 4) {
    const n = nonZeroValues.length - 1;
    q1 = nonZeroValues[Math.floor(n * 0.25)];
    q2 = nonZeroValues[Math.floor(n * 0.50)];
    q3 = nonZeroValues[Math.floor(n * 0.75)];
  } else if (nonZeroValues.length > 0) {
    const maxVal = nonZeroValues[nonZeroValues.length - 1];
    q1 = Math.max(1, Math.round(maxVal * 0.25));
    q2 = Math.max(2, Math.round(maxVal * 0.50));
    q3 = Math.max(3, Math.round(maxVal * 0.75));
  }

  const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const totalDays = isLeap ? 366 : 365;

  const result = [];
  const d = new Date(Date.UTC(year, 0, 1, 0, 0, 0));

  for (let i = 0; i < totalDays; i++) {
    const dateStr = d.toISOString().slice(0, 10);
    const minutes = map.get(dateStr) || 0;

    let level = 0;
    if (minutes > 0) {
      if (minutes <= q1) level = 1;
      else if (minutes <= q2) level = 2;
      else if (minutes <= q3) level = 3;
      else level = 4;
    }

    result.push({
      date: dateStr,
      minutes,
      level
    });

    d.setUTCDate(d.getUTCDate() + 1);
  }

  return {
    year,
    thresholds: { q1, q2, q3 },
    days: result
  };
}

module.exports = {
  DEFAULT_TIMEZONE,
  normalizeTimezone,
  parseRangeDays,
  formatDateInTimezone,
  getHourInTimezone,
  getTimeOfDayBucket,
  getStartOfWeek,
  getDateRange,
  fillDailyGaps,
  fillWeeklyGaps,
  generateHeatmapDays
};
