// ============================================
// Analytics Controller (Phase 2 Feature A)
// High-performance MongoDB aggregation pipelines
// Unified timezone-aware bucketing & in-memory caching
// ============================================

const mongoose = require('mongoose');
const SessionLog = require('../models/SessionLog');
const StudySession = require('../models/StudySession');
const StudyGroup = require('../models/StudyGroup');
const Task = require('../models/Task');
const User = require('../models/User');
const { analyticsCache } = require('../utils/cache');
const {
  DEFAULT_TIMEZONE,
  normalizeTimezone,
  parseRangeDays,
  getDateRange,
  fillDailyGaps,
  fillWeeklyGaps,
  generateHeatmapDays,
  getStartOfWeek
} = require('../utils/dateUtils');
const { asyncHandler } = require('../utils/helpers');

/**
 * Calculates percentage change between current and previous periods
 */
function calculateDelta(current, previous) {
  const curr = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

/**
 * @desc    High-level study overview stats with comparison to previous period
 * @route   GET /api/analytics/overview?range=7d|30d|90d&tz=...
 * @access  Private
 */
const getOverview = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const rangeStr = req.query.range || '7d';
  const tz = normalizeTimezone(req.query.tz);
  const cacheKey = analyticsCache.makeKey(userId, 'overview', { range: rangeStr, tz });

  const cached = analyticsCache.get(cacheKey);
  if (cached) {
    return res.status(200).json({ success: true, ...cached, cached: true });
  }

  const rangeDays = parseRangeDays(rangeStr);
  const { current, previous } = getDateRange(rangeDays);

  // Run aggregations concurrently
  const [currentLogsAgg, prevLogsAgg, tasksAgg, userDoc] = await Promise.all([
    // Current period session logs
    SessionLog.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: current.start, $lte: current.end }
        }
      },
      {
        $group: {
          _id: null,
          totalMinutes: { $sum: '$minutesStudied' },
          sessionsCount: { $sum: 1 },
          avgFocus: { $avg: '$focusRating' }
        }
      }
    ]),

    // Previous period session logs (for delta calculation)
    SessionLog.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: previous.start, $lte: previous.end }
        }
      },
      {
        $group: {
          _id: null,
          totalMinutes: { $sum: '$minutesStudied' },
          sessionsCount: { $sum: 1 }
        }
      }
    ]),

    // Tasks created & completed in current period
    Task.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: current.start, $lte: current.end }
        }
      },
      {
        $group: {
          _id: null,
          totalCreated: { $sum: 1 },
          totalCompleted: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]),

    User.findById(userId).select('streak longestStreak studyHours tasksCompleted')
  ]);

  const currStats = currentLogsAgg[0] || { totalMinutes: 0, sessionsCount: 0, avgFocus: 0 };
  const prevStats = prevLogsAgg[0] || { totalMinutes: 0, sessionsCount: 0 };
  const taskStats = tasksAgg[0] || { totalCreated: 0, totalCompleted: 0 };

  const taskCompletionRate = taskStats.totalCreated > 0
    ? Math.round((taskStats.totalCompleted / taskStats.totalCreated) * 100)
    : 0;

  const responseData = {
    range: rangeStr,
    timezone: tz,
    totalStudyMinutes: currStats.totalMinutes,
    sessionsAttended: currStats.sessionsCount,
    avgFocusRating: Math.round((currStats.avgFocus || 0) * 10) / 10,
    currentStreak: userDoc?.streak || 0,
    longestStreak: Math.max(userDoc?.longestStreak || 0, userDoc?.streak || 0),
    tasksCompleted: taskStats.totalCompleted,
    tasksCreated: taskStats.totalCreated,
    taskCompletionRate,
    comparison: {
      studyMinutesDelta: calculateDelta(currStats.totalMinutes, prevStats.totalMinutes),
      sessionsDelta: calculateDelta(currStats.sessionsCount, prevStats.sessionsCount),
      previousMinutes: prevStats.totalMinutes,
      previousSessions: prevStats.sessionsCount
    }
  };

  analyticsCache.set(cacheKey, responseData, 60);

  return res.status(200).json({
    success: true,
    ...responseData
  });
});

/**
 * @desc    Gap-filled study time series (per day or week)
 * @route   GET /api/analytics/study-time?range=7d|30d|90d&groupBy=day|week&tz=...
 * @access  Private
 */
const getStudyTime = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const rangeStr = req.query.range || '7d';
  const groupBy = req.query.groupBy === 'week' ? 'week' : 'day';
  const tz = normalizeTimezone(req.query.tz);
  const cacheKey = analyticsCache.makeKey(userId, 'study-time', { range: rangeStr, groupBy, tz });

  const cached = analyticsCache.get(cacheKey);
  if (cached) {
    return res.status(200).json({ success: true, ...cached, cached: true });
  }

  const rangeDays = parseRangeDays(rangeStr);
  const { current } = getDateRange(rangeDays);

  // Timezone-aware date aggregation pipeline using $dateToString with timezone param
  const rawData = await SessionLog.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: current.start, $lte: current.end }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt',
            timezone: tz
          }
        },
        minutes: { $sum: '$minutesStudied' },
        sessionCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const formattedData = rawData.map(d => ({ date: d._id, minutes: d.minutes }));
  let series;

  if (groupBy === 'week' && rangeDays >= 30) {
    series = fillWeeklyGaps(
      formattedData.map(d => ({ week: d.date, minutes: d.minutes })),
      current.start,
      current.end
    );
  } else {
    series = fillDailyGaps(formattedData, current.start, current.end, tz);
  }

  const responseData = {
    range: rangeStr,
    groupBy,
    timezone: tz,
    totalMinutes: series.reduce((acc, curr) => acc + curr.minutes, 0),
    series
  };

  analyticsCache.set(cacheKey, responseData, 60);

  return res.status(200).json({
    success: true,
    ...responseData
  });
});

/**
 * @desc    Minutes studied per subject (Top 8 + 'Other')
 * @route   GET /api/analytics/subjects?range=7d|30d|90d&tz=...
 * @access  Private
 */
const getSubjects = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const rangeStr = req.query.range || '30d';
  const tz = normalizeTimezone(req.query.tz);
  const cacheKey = analyticsCache.makeKey(userId, 'subjects', { range: rangeStr, tz });

  const cached = analyticsCache.get(cacheKey);
  if (cached) {
    return res.status(200).json({ success: true, ...cached, cached: true });
  }

  const rangeDays = parseRangeDays(rangeStr);
  const { current } = getDateRange(rangeDays);

  const rawSubjects = await SessionLog.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: current.start, $lte: current.end }
      }
    },
    {
      $lookup: {
        from: 'studysessions',
        localField: 'session',
        foreignField: '_id',
        as: 'sessionData'
      }
    },
    {
      $unwind: {
        path: '$sessionData',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        minutesStudied: 1,
        // Priority: session subject -> first topic studied -> 'General'
        derivedSubject: {
          $cond: [
            {
              $and: [
                { $gt: [{ $strLenCP: { $ifNull: ['$sessionData.subject', ''] } }, 0] },
                { $ne: ['$sessionData.subject', ''] }
              ]
            },
            '$sessionData.subject',
            {
              $cond: [
                { $gt: [{ $size: { $ifNull: ['$topicsStudied', []] } }, 0] },
                { $arrayElemAt: ['$topicsStudied', 0] },
                'General'
              ]
            }
          ]
        }
      }
    },
    {
      $group: {
        _id: '$derivedSubject',
        minutes: { $sum: '$minutesStudied' }
      }
    },
    { $sort: { minutes: -1 } }
  ]);

  const totalMinutes = rawSubjects.reduce((acc, curr) => acc + curr.minutes, 0);

  // Top 8 + Other
  const top8 = rawSubjects.slice(0, 8);
  const otherMinutes = rawSubjects.slice(8).reduce((acc, curr) => acc + curr.minutes, 0);

  const subjects = top8.map(s => ({
    subject: s._id || 'General',
    minutes: s.minutes,
    percentage: totalMinutes > 0 ? Math.round((s.minutes / totalMinutes) * 100) : 0
  }));

  if (otherMinutes > 0) {
    subjects.push({
      subject: 'Other',
      minutes: otherMinutes,
      percentage: totalMinutes > 0 ? Math.round((otherMinutes / totalMinutes) * 100) : 0
    });
  }

  const responseData = {
    range: rangeStr,
    totalMinutes,
    subjects
  };

  analyticsCache.set(cacheKey, responseData, 60);

  return res.status(200).json({
    success: true,
    ...responseData
  });
});

/**
 * @desc    Yearly activity heatmap (GitHub contribution style)
 * @route   GET /api/analytics/heatmap?year=YYYY&tz=...
 * @access  Private
 */
const getHeatmap = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const currentYear = new Date().getFullYear();
  const year = parseInt(req.query.year, 10) || currentYear;
  const tz = normalizeTimezone(req.query.tz);
  const cacheKey = analyticsCache.makeKey(userId, 'heatmap', { year, tz });

  const cached = analyticsCache.get(cacheKey);
  if (cached) {
    return res.status(200).json({ success: true, ...cached, cached: true });
  }

  const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  // Aggregate user's daily study minutes within the year
  const rawDays = await SessionLog.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: yearStart, $lte: yearEnd }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt',
            timezone: tz
          }
        },
        minutes: { $sum: '$minutesStudied' },
        count: { $sum: 1 }
      }
    }
  ]);

  const map = new Map();
  let totalMinutes = 0;
  for (const d of rawDays) {
    map.set(d._id, d.minutes);
    totalMinutes += d.minutes;
  }

  const heatmapResult = generateHeatmapDays(year, map, tz);

  const responseData = {
    year,
    totalMinutes,
    activeDays: map.size,
    thresholds: heatmapResult.thresholds,
    days: heatmapResult.days
  };

  analyticsCache.set(cacheKey, responseData, 60);

  return res.status(200).json({
    success: true,
    ...responseData
  });
});

/**
 * @desc    Focus trend: weekly focus ratings and best time-of-day bucket
 * @route   GET /api/analytics/focus-trend?range=7d|30d|90d&tz=...
 * @access  Private
 */
const getFocusTrend = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const rangeStr = req.query.range || '30d';
  const tz = normalizeTimezone(req.query.tz);
  const cacheKey = analyticsCache.makeKey(userId, 'focus-trend', { range: rangeStr, tz });

  const cached = analyticsCache.get(cacheKey);
  if (cached) {
    return res.status(200).json({ success: true, ...cached, cached: true });
  }

  const totalLogsCount = await SessionLog.countDocuments({ user: userId });
  if (totalLogsCount < 5) {
    return res.status(200).json({
      success: true,
      hasEnoughData: false,
      message: 'Need at least 5 study logs to generate focus pattern insights',
      totalLogsCount,
      weeklyTrend: [],
      bestTimeOfDay: null,
      timeOfDayBuckets: []
    });
  }

  const rangeDays = parseRangeDays(rangeStr);
  const { current } = getDateRange(rangeDays);

  // Group by week to compute average focus rating
  const [weeklyTrendRaw, timeOfDayRaw] = await Promise.all([
    SessionLog.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: current.start, $lte: current.end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-W%V',
              date: '$createdAt',
              timezone: tz
            }
          },
          avgFocus: { $avg: '$focusRating' },
          sessionsCount: { $sum: 1 },
          firstDate: { $min: '$createdAt' }
        }
      },
      { $sort: { _id: 1 } }
    ]),

    // Extract hour in user's timezone to assign morning/afternoon/evening/night
    SessionLog.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId)
        }
      },
      {
        $project: {
          focusRating: 1,
          minutesStudied: 1,
          hour: {
            $hour: {
              date: '$createdAt',
              timezone: tz
            }
          }
        }
      },
      {
        $project: {
          focusRating: 1,
          minutesStudied: 1,
          bucket: {
            $switch: {
              branches: [
                {
                  case: { $and: [{ $gte: ['$hour', 6] }, { $lt: ['$hour', 12] }] },
                  then: 'morning'
                },
                {
                  case: { $and: [{ $gte: ['$hour', 12] }, { $lt: ['$hour', 18] }] },
                  then: 'afternoon'
                },
                {
                  case: { $and: [{ $gte: ['$hour', 18] }, { $lt: ['$hour', 22] }] },
                  then: 'evening'
                }
              ],
              default: 'night'
            }
          }
        }
      },
      {
        $group: {
          _id: '$bucket',
          avgFocus: { $avg: '$focusRating' },
          totalMinutes: { $sum: '$minutesStudied' },
          sessionCount: { $sum: 1 }
        }
      }
    ])
  ]);

  const weeklyTrend = weeklyTrendRaw.map(w => ({
    week: w._id,
    label: w._id,
    avgFocus: Math.round(w.avgFocus * 10) / 10,
    sessionsCount: w.sessionsCount
  }));

  const bucketMetadata = {
    morning: { label: 'Morning (6am – 12pm)', icon: '🌅' },
    afternoon: { label: 'Afternoon (12pm – 6pm)', icon: '☀️' },
    evening: { label: 'Evening (6pm – 10pm)', icon: '🌆' },
    night: { label: 'Night (10pm – 6am)', icon: '🌙' }
  };

  const buckets = ['morning', 'afternoon', 'evening', 'night'].map(key => {
    const found = timeOfDayRaw.find(b => b._id === key);
    return {
      bucket: key,
      label: bucketMetadata[key].label,
      icon: bucketMetadata[key].icon,
      avgFocus: found ? Math.round(found.avgFocus * 10) / 10 : 0,
      totalMinutes: found ? found.totalMinutes : 0,
      sessionCount: found ? found.sessionCount : 0
    };
  });

  // Best bucket: highest avgFocus among buckets with at least 1 session
  const activeBuckets = buckets.filter(b => b.sessionCount > 0);
  activeBuckets.sort((a, b) => b.avgFocus - a.avgFocus || b.totalMinutes - a.totalMinutes);
  const bestTimeOfDay = activeBuckets[0] || null;

  const responseData = {
    hasEnoughData: true,
    range: rangeStr,
    weeklyTrend,
    bestTimeOfDay,
    timeOfDayBuckets: buckets
  };

  analyticsCache.set(cacheKey, responseData, 60);

  return res.status(200).json({
    success: true,
    ...responseData
  });
});

/**
 * @desc    Task statistics by status & priority, overdue count
 * @route   GET /api/analytics/tasks?range=7d|30d|90d
 * @access  Private
 */
const getTaskAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const rangeStr = req.query.range || '30d';
  const cacheKey = analyticsCache.makeKey(userId, 'tasks', { range: rangeStr });

  const cached = analyticsCache.get(cacheKey);
  if (cached) {
    return res.status(200).json({ success: true, ...cached, cached: true });
  }

  const rangeDays = parseRangeDays(rangeStr);
  const { current } = getDateRange(rangeDays);
  const now = new Date();

  const [statusAgg, priorityAgg, overdueCount, totalRangeCreated] = await Promise.all([
    Task.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),

    Task.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]),

    Task.countDocuments({
      userId,
      status: { $ne: 'completed' },
      deadline: { $lt: now, $ne: null }
    }),

    Task.countDocuments({
      userId,
      createdAt: { $gte: current.start, $lte: current.end }
    })
  ]);

  const byStatus = { pending: 0, 'in-progress': 0, completed: 0 };
  for (const s of statusAgg) {
    if (byStatus[s._id] !== undefined) byStatus[s._id] = s.count;
  }

  const byPriority = { low: 0, medium: 0, high: 0 };
  for (const p of priorityAgg) {
    if (byPriority[p._id] !== undefined) byPriority[p._id] = p.count;
  }

  const totalTasks = byStatus.pending + byStatus['in-progress'] + byStatus.completed;
  const completionRate = totalTasks > 0 ? Math.round((byStatus.completed / totalTasks) * 100) : 0;

  const responseData = {
    range: rangeStr,
    totalTasks,
    overdueCount,
    completionRate,
    tasksCreatedInRange: totalRangeCreated,
    byStatus: [
      { label: 'Completed', value: byStatus.completed, color: '#10B981' },
      { label: 'In Progress', value: byStatus['in-progress'], color: '#F59E0B' },
      { label: 'Pending', value: byStatus.pending, color: '#6C63FF' }
    ],
    byPriority: [
      { label: 'High', value: byPriority.high, color: '#EF4444' },
      { label: 'Medium', value: byPriority.medium, color: '#F59E0B' },
      { label: 'Low', value: byPriority.low, color: '#06B6D4' }
    ]
  };

  analyticsCache.set(cacheKey, responseData, 60);

  return res.status(200).json({
    success: true,
    ...responseData
  });
});

/**
 * @desc    Group-level analytics (members only)
 * @route   GET /api/analytics/groups/:groupId
 * @access  Private (Group member)
 */
const getGroupAnalytics = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  const group = await StudyGroup.findById(groupId);
  if (!group) {
    return res.status(404).json({ success: false, message: 'Study group not found.' });
  }

  const isMember = (group.members || []).some(m => String(m) === String(userId));
  if (!isMember) {
    return res.status(403).json({ success: false, message: 'You must be a member of this group to view its analytics.' });
  }

  const cacheKey = `group:${groupId}:analytics`;
  const cached = analyticsCache.get(cacheKey);
  if (cached) {
    return res.status(200).json({ success: true, ...cached, cached: true });
  }

  const mondayStart = getStartOfWeek(new Date());
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [weekMinutesAgg, activeMembersAgg, subjectsAgg, totalCompletedSessions, memberLogsCount, topContributorsAgg] = await Promise.all([
    // Group minutes this week (since Monday)
    SessionLog.aggregate([
      {
        $match: {
          group: new mongoose.Types.ObjectId(groupId),
          createdAt: { $gte: mondayStart }
        }
      },
      {
        $group: {
          _id: null,
          totalMinutes: { $sum: '$minutesStudied' }
        }
      }
    ]),

    // Active members in the last 7 days
    SessionLog.distinct('user', {
      group: new mongoose.Types.ObjectId(groupId),
      createdAt: { $gte: sevenDaysAgo }
    }),

    // Most studied subjects in this group
    SessionLog.aggregate([
      { $match: { group: new mongoose.Types.ObjectId(groupId) } },
      {
        $lookup: {
          from: 'studysessions',
          localField: 'session',
          foreignField: '_id',
          as: 'sessionData'
        }
      },
      { $unwind: { path: '$sessionData', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          minutesStudied: 1,
          subject: {
            $cond: [
              { $gt: [{ $strLenCP: { $ifNull: ['$sessionData.subject', ''] } }, 0] },
              '$sessionData.subject',
              group.subject || 'General'
            ]
          }
        }
      },
      {
        $group: {
          _id: '$subject',
          minutes: { $sum: '$minutesStudied' }
        }
      },
      { $sort: { minutes: -1 } },
      { $limit: 5 }
    ]),

    // Total completed sessions in this group
    StudySession.countDocuments({
      group: groupId,
      status: 'completed'
    }),

    // Total logs submitted for this group
    SessionLog.countDocuments({ group: groupId }),

    // Top contributors (who have NOT opted out of leaderboard)
    SessionLog.aggregate([
      { $match: { group: new mongoose.Types.ObjectId(groupId) } },
      {
        $group: {
          _id: '$user',
          totalMinutes: { $sum: '$minutesStudied' },
          sessionCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userData'
        }
      },
      { $unwind: '$userData' },
      {
        $match: {
          'userData.leaderboardOptIn': { $ne: false }
        }
      },
      { $sort: { totalMinutes: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 1,
          minutes: '$totalMinutes',
          sessionCount: 1,
          user: {
            _id: '$userData._id',
            name: '$userData.name',
            avatar: '$userData.avatar'
          }
        }
      }
    ])
  ]);

  const totalMembers = (group.members || []).length;
  const attendancePotential = totalCompletedSessions * Math.max(1, totalMembers);
  const attendanceRate = attendancePotential > 0
    ? Math.min(100, Math.round((memberLogsCount / attendancePotential) * 100))
    : 100;

  const responseData = {
    groupId,
    groupName: group.name,
    totalMinutesThisWeek: weekMinutesAgg[0]?.totalMinutes || 0,
    activeMembersCount: activeMembersAgg.length,
    totalMembers,
    sessionAttendanceRate: attendanceRate,
    mostStudiedSubjects: subjectsAgg.map(s => ({
      subject: s._id,
      minutes: s.minutes
    })),
    topContributors: topContributorsAgg
  };

  analyticsCache.set(cacheKey, responseData, 60);

  return res.status(200).json({
    success: true,
    ...responseData
  });
});

module.exports = {
  getOverview,
  getStudyTime,
  getSubjects,
  getHeatmap,
  getFocusTrend,
  getTaskAnalytics,
  getGroupAnalytics
};
