// ============================================
// Unit Tests: Rule-Based Insights Engine
// ============================================

// Transpile-free test of logic
const { generateStudyInsights } = require('../utils/insights');

describe('generateStudyInsights Unit Tests', () => {
  test('generates peak focus window insight when bestTimeOfDay exists', () => {
    const insights = generateStudyInsights({
      focusTrend: {
        bestTimeOfDay: {
          bucket: 'evening',
          label: 'Evening (6pm – 10pm)',
          avgFocus: 4.8,
          icon: '🌆'
        }
      }
    });

    const focusInsight = insights.find(i => i.id === 'focus-time');
    expect(focusInsight).toBeDefined();
    expect(focusInsight.text).toContain('evenings (6pm – 10pm)');
    expect(focusInsight.text).toContain('4.8 / 5');
  });

  test('generates positive study time delta insight', () => {
    const insights = generateStudyInsights({
      overview: {
        comparison: { studyMinutesDelta: 25 }
      }
    });

    const deltaInsight = insights.find(i => i.id === 'study-up');
    expect(deltaInsight).toBeDefined();
    expect(deltaInsight.text).toContain('up 25%');
  });

  test('generates near-milestone streak insight for 5-day streak approaching 7', () => {
    const insights = generateStudyInsights({
      overview: { currentStreak: 5 }
    });

    const streakInsight = insights.find(i => i.id === 'streak-milestone');
    expect(streakInsight).toBeDefined();
    expect(streakInsight.text).toContain('2 days away from hitting an impressive 7-day streak');
  });

  test('generates near level-up insight when progress >= 70%', () => {
    const insights = generateStudyInsights({
      gamification: {
        levelProgress: {
          currentLevel: 4,
          xpForNextLevel: 30,
          percent: 85
        }
      }
    });

    const levelInsight = insights.find(i => i.id === 'level-near');
    expect(levelInsight).toBeDefined();
    expect(levelInsight.text).toContain('30 XP away from Level 5');
  });
});
