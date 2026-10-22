// ============================================
// Rule-Based Study Insights Generator (Pure Function)
// Generates personalized tips & milestones without AI
// ============================================

/**
 * Generates an array of insightful highlights based on user analytics & gamification stats.
 *
 * @param {object} params
 * @param {object} [params.overview] - Overview stats (studyMinutesDelta, currentStreak, tasksCompleted, taskCompletionRate)
 * @param {object} [params.focusTrend] - Focus stats (bestTimeOfDay, weeklyTrend)
 * @param {object} [params.subjects] - Top studied subjects
 * @param {object} [params.gamification] - Gamification stats (level, levelProgress, xp)
 * @returns {Array<{ id: string, icon: string, title: string, text: string, type: 'trend'|'streak'|'focus'|'level'|'subject' }>}
 */
function generateStudyInsights({ overview = {}, focusTrend = {}, subjects = [], gamification = {} } = {}) {
  const insights = [];

  // 1. Focus Time of Day Insight
  if (focusTrend?.bestTimeOfDay && focusTrend.bestTimeOfDay.avgFocus >= 3.5) {
    const bucket = focusTrend.bestTimeOfDay;
    const bucketLabels = {
      morning: 'morning hours (6am – 12pm)',
      afternoon: 'afternoons (12pm – 6pm)',
      evening: 'evenings (6pm – 10pm)',
      night: 'late nights (10pm – 6am)'
    };
    insights.push({
      id: 'focus-time',
      icon: bucket.icon || '🧠',
      title: 'Peak Focus Window',
      text: `You achieve your highest focus rating (${bucket.avgFocus} / 5) during ${bucketLabels[bucket.bucket] || bucket.label}. Schedule hard subjects here!`,
      type: 'focus'
    });
  }

  // 2. Study Time Trend Delta Insight
  const delta = overview?.comparison?.studyMinutesDelta;
  if (typeof delta === 'number' && delta !== 0) {
    if (delta > 0) {
      insights.push({
        id: 'study-up',
        icon: '📈',
        title: 'Study Time Surging',
        text: `Your study time is up ${delta}% compared to the previous period. Fantastic consistency!`,
        type: 'trend'
      });
    } else if (delta <= -20) {
      insights.push({
        id: 'study-down',
        icon: '⚡',
        title: 'Momentum Check',
        text: `Study time dropped ${Math.abs(delta)}% vs previous period. A quick 25-minute Pomodoro can reboot your momentum!`,
        type: 'trend'
      });
    }
  }

  // 3. Streak Milestones Insight
  const streak = overview?.currentStreak || gamification?.longestStreak || 0;
  if (streak > 0) {
    const milestones = [3, 7, 14, 30, 50, 100];
    const nextMilestone = milestones.find(m => m > streak);
    if (nextMilestone) {
      const remaining = nextMilestone - streak;
      insights.push({
        id: 'streak-milestone',
        icon: '🔥',
        title: 'Streak Milestone Near',
        text: remaining === 1
          ? `You're just 1 day away from a ${nextMilestone}-day streak! Keep the flame alive tomorrow.`
          : `You're ${remaining} days away from hitting an impressive ${nextMilestone}-day streak.`,
        type: 'streak'
      });
    } else {
      insights.push({
        id: 'streak-champion',
        icon: '🏆',
        title: 'Master of Consistency',
        text: `Incredible ${streak}-day study streak! You are in the top tier of consistent learners.`,
        type: 'streak'
      });
    }
  } else {
    insights.push({
      id: 'streak-start',
      icon: '🌱',
      title: 'Start a Streak Today',
      text: 'Complete your first study sprint today to ignite your daily learning streak.',
      type: 'streak'
    });
  }

  // 4. Level Progress Milestone
  if (gamification?.levelProgress) {
    const { currentLevel, xpForNextLevel, percent } = gamification.levelProgress;
    if (percent >= 70) {
      insights.push({
        id: 'level-near',
        icon: '🎯',
        title: 'Level Up Incoming',
        text: `You're only ${xpForNextLevel} XP away from Level ${currentLevel + 1}! (${percent}% progress)`,
        type: 'level'
      });
    }
  }

  // 5. Subject Specialization Insight
  if (Array.isArray(subjects) && subjects.length > 0 && subjects[0].percentage >= 30) {
    const top = subjects[0];
    insights.push({
      id: 'top-subject',
      icon: '📚',
      title: 'Primary Focus',
      text: `${top.subject} takes the lion's share with ${top.percentage}% (${top.minutes} mins) of your study investment.`,
      type: 'subject'
    });
  }

  // 6. Task Completion Rate
  if (typeof overview?.taskCompletionRate === 'number' && overview.tasksCreated > 0) {
    if (overview.taskCompletionRate >= 80) {
      insights.push({
        id: 'task-finisher',
        icon: '✅',
        title: 'High Task Execution',
        text: `You have completed ${overview.taskCompletionRate}% of tasks created in this period. Great execution speed!`,
        type: 'trend'
      });
    }
  }

  return insights;
}

module.exports = {
  generateStudyInsights
};
