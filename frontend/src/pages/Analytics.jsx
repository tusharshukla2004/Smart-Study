import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/analytics/StatCard';
import StudyTimeBarChart from '../components/analytics/StudyTimeBarChart';
import SubjectDonutChart from '../components/analytics/SubjectDonutChart';
import FocusTrendLineChart from '../components/analytics/FocusTrendLineChart';
import StreakHeatmap from '../components/analytics/StreakHeatmap';
import TaskStatsCard from '../components/analytics/TaskStatsCard';
import InsightCards from '../components/analytics/InsightCards';
import { AnalyticsAPI, GamificationAPI, Session } from '../api';
import { generateStudyInsights } from '../utils/insights';

const Analytics = () => {
  const [range, setRange] = useState('30d');
  const [year, setYear] = useState(new Date().getFullYear());
  const [groupBy, setGroupBy] = useState('day');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Analytics data state
  const [overview, setOverview] = useState(null);
  const [studyTime, setStudyTime] = useState(null);
  const [subjectsData, setSubjectsData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [focusTrend, setFocusTrend] = useState(null);
  const [tasksData, setTasksData] = useState(null);
  const [gamification, setGamification] = useState(null);

  const fetchAnalytics = async (selectedRange, selectedYear) => {
    setLoading(true);
    setError('');

    try {
      const [
        overviewRes,
        studyTimeRes,
        subjectsRes,
        heatmapRes,
        focusTrendRes,
        tasksRes,
        gamificationRes
      ] = await Promise.all([
        AnalyticsAPI.getOverview(selectedRange),
        AnalyticsAPI.getStudyTime(selectedRange, groupBy),
        AnalyticsAPI.getSubjects(selectedRange),
        AnalyticsAPI.getHeatmap(selectedYear),
        AnalyticsAPI.getFocusTrend(selectedRange),
        AnalyticsAPI.getTasks(selectedRange),
        GamificationAPI.getMe()
      ]);

      if (overviewRes.success) setOverview(overviewRes);
      if (studyTimeRes.success) setStudyTime(studyTimeRes);
      if (subjectsRes.success) setSubjectsData(subjectsRes);
      if (heatmapRes.success) setHeatmapData(heatmapRes);
      if (focusTrendRes.success) setFocusTrend(focusTrendRes);
      if (tasksRes.success) setTasksData(tasksRes);
      if (gamificationRes.success) setGamification(gamificationRes);

      if (!overviewRes.success && !studyTimeRes.success) {
        setError(overviewRes.message || 'Failed to load analytics data.');
      }
    } catch (err) {
      setError('Could not load analytics. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Session.isLoggedIn()) {
      window.location.href = '/login';
      return;
    }
    fetchAnalytics(range, year);
  }, [range, year, groupBy]);

  // Generate pure rule-based insights
  const insights = generateStudyInsights({
    overview,
    focusTrend,
    subjects: subjectsData?.subjects || [],
    gamification
  });

  const totalMinutes = overview?.totalStudyMinutes || 0;
  const hours = (totalMinutes / 60).toFixed(1);
  const isZeroState = !loading && totalMinutes === 0 && (overview?.sessionsAttended || 0) === 0;

  return (
    <div className="page-wrapper">
      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          {/* Header & Range Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 className="section-title" style={{ fontSize: '1.8rem', margin: 0 }}>
                Study <span>Analytics</span>
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
                Track your study velocity, focus consistency, and subject distribution
              </p>
            </div>

            {/* Range Switcher */}
            <div style={{ display: 'flex', background: 'var(--bg2)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', gap: '4px' }}>
              {['7d', '30d', '90d'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: range === r ? 'var(--primary)' : 'transparent',
                    color: range === r ? '#FFF' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  {r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner with Retry */}
          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius)',
                padding: '16px',
                color: 'var(--danger)',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>❌ {error}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fetchAnalytics(range, year)}
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {isZeroState ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                marginBottom: '24px'
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📊</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>
                Complete your first study session to see analytics
              </h2>
              <p style={{ color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 24px auto', fontSize: '0.9rem' }}>
                Join a group study room or log a focus sprint to start tracking your study trends, streaks, and subject mastery.
              </p>
              <a href="/groups" className="btn btn-primary">
                Browse Study Groups
              </a>
            </div>
          ) : (
            <>
              {/* Stat Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  marginBottom: '24px'
                }}
              >
                <StatCard
                  icon="⏱️"
                  color="purple"
                  label="Total Study Time"
                  value={loading ? '...' : `${hours}h`}
                  unit={`(${totalMinutes}m)`}
                  delta={overview?.comparison?.studyMinutesDelta}
                />
                <StatCard
                  icon="🎯"
                  color="cyan"
                  label="Sessions Logged"
                  value={loading ? '...' : overview?.sessionsAttended || 0}
                  delta={overview?.comparison?.sessionsDelta}
                />
                <StatCard
                  icon="⭐"
                  color="amber"
                  label="Avg Focus Rating"
                  value={loading ? '...' : overview?.avgFocusRating ? `${overview.avgFocusRating}` : '—'}
                  unit="/ 5"
                />
                <StatCard
                  icon="🔥"
                  color="orange"
                  label="Streak Status"
                  value={loading ? '...' : `${overview?.currentStreak || 0}d`}
                  subtitle={`Longest: ${overview?.longestStreak || 0} days`}
                />
                <StatCard
                  icon="✅"
                  color="green"
                  label="Tasks Completed"
                  value={loading ? '...' : overview?.tasksCompleted || 0}
                  subtitle={overview?.tasksCreated ? `${overview.taskCompletionRate}% rate` : ''}
                />
              </div>

              {/* Insights Strip */}
              {!loading && insights.length > 0 && <InsightCards insights={insights} />}

              {/* Charts Grid Row 1: Study Time & Subject Donut */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                  gap: '20px',
                  marginBottom: '24px'
                }}
              >
                {/* Study Time Bar Chart */}
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                        ⏱️ Study Time Over Time
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {range === '7d' ? 'Daily breakdown' : range === '30d' ? 'Daily study pattern' : 'Weekly study pattern'}
                      </div>
                    </div>

                    {range !== '7d' && (
                      <div style={{ display: 'flex', background: 'var(--bg2)', padding: '2px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        <button
                          type="button"
                          onClick={() => setGroupBy('day')}
                          style={{
                            padding: '3px 8px',
                            border: 'none',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            borderRadius: '3px',
                            background: groupBy === 'day' ? 'var(--primary)' : 'transparent',
                            color: groupBy === 'day' ? '#FFF' : 'var(--text-muted)',
                            cursor: 'pointer'
                          }}
                        >
                          Days
                        </button>
                        <button
                          type="button"
                          onClick={() => setGroupBy('week')}
                          style={{
                            padding: '3px 8px',
                            border: 'none',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            borderRadius: '3px',
                            background: groupBy === 'week' ? 'var(--primary)' : 'transparent',
                            color: groupBy === 'week' ? '#FFF' : 'var(--text-muted)',
                            cursor: 'pointer'
                          }}
                        >
                          Weeks
                        </button>
                      </div>
                    )}
                  </div>
                  <StudyTimeBarChart data={studyTime?.series} groupBy={groupBy} />
                </div>

                {/* Subject Distribution Donut */}
                <div className="card">
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                      📚 Subject Mastery Distribution
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Top 8 subjects studied during this period
                    </div>
                  </div>
                  <SubjectDonutChart subjects={subjectsData?.subjects} />
                </div>
              </div>

              {/* Charts Grid Row 2: Focus Trend & Task Analytics */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                  gap: '20px',
                  marginBottom: '24px'
                }}
              >
                {/* Focus Trend */}
                <div className="card">
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                      🧠 Focus Rating &amp; Peak Hours
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Weekly focus score trend and optimal study times
                    </div>
                  </div>
                  <FocusTrendLineChart data={focusTrend || {}} />
                </div>

                {/* Task Stats */}
                <div className="card">
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                      ✅ Task Velocity &amp; Priorities
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Current backlog, execution rates, and overdue alerts
                    </div>
                  </div>
                  <TaskStatsCard data={tasksData || {}} />
                </div>
              </div>

              {/* Activity Heatmap */}
              <StreakHeatmap
                data={heatmapData || {}}
                year={year}
                onYearChange={(newYear) => setYear(newYear)}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Analytics;
