import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { UserAPI, GroupsAPI, TasksAPI, MatchAPI } from '../api';

const REC_GROUPS = [
  { id: 1, name: 'Advanced Algorithms', subject: 'Computer Science', members: 8, maxMembers: 10, avatar: '⚙️', tags: ['DSA', 'LeetCode'], matchScore: 95, level: 'Advanced', schedule: 'Mon & Wed 6pm' },
  { id: 2, name: 'Calculus Masters', subject: 'Mathematics', members: 5, maxMembers: 8, avatar: '📐', tags: ['Calculus', 'Algebra'], matchScore: 87, level: 'Intermediate', schedule: 'Tue & Thu 4pm' },
  { id: 3, name: 'ML Research Club', subject: 'Machine Learning', members: 12, maxMembers: 15, avatar: '🤖', tags: ['Neural Networks'], matchScore: 92, level: 'Advanced', schedule: 'Sat 10am' },
];

const ACTIVITIES = [
  { icon: '👤', color: 'rgba(108,99,255,0.15)', title: 'Account created on Smart Study', time: 'Recently' },
  { icon: '🎯', color: 'rgba(245,158,11,0.15)', title: 'Set study goals and track tasks', time: 'Get started →' },
  { icon: '👥', color: 'rgba(6,182,212,0.15)', title: 'Join a study group to collaborate', time: 'Explore →' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({
    name: 'Alex Jordan',
    avatar: 'AJ',
    studyHours: 24,
    groupsJoined: 6,
    tasksCompleted: 18,
    streak: 12,
    subjects: ['Mathematics', 'Computer Science', 'Machine Learning', 'Physics'],
  });
  const [greeting, setGreeting] = useState('');
  const [showFindModal, setShowFindModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem('ss_user');
    if (cached) setUser(prev => ({ ...prev, ...JSON.parse(cached) }));
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning ☀️' : h < 18 ? 'Good afternoon 🌤️' : 'Good evening 🌙');
  }, []);

  const subjects = (user.subjects || ['Mathematics', 'Computer Science']).slice(0, 4).map((s, i) => {
    const icons = ['⚙️', '📐', '🤖', '⚛️'];
    const pct = [75, 60, 85, 50][i] || 65;
    return { name: icons[i % icons.length] + ' ' + s, pct };
  });

  return (
    <div className="page-wrapper">
      <div className="app-layout">
        <Sidebar onFindGroup={() => setShowFindModal(true)} onAIMatch={() => setShowAIModal(true)} />

        <main className="main-content">
          {/* Welcome Banner */}
          <div className="welcome-banner animate-fadeUp">
            <div className="welcome-text">
              <div className="welcome-greeting">{greeting}</div>
              <div className="welcome-name">Welcome back, {user.name ? user.name.split(' ')[0] : 'Student'}!</div>
              <div className="welcome-streak">🔥 {user.streak} day streak – keep it up!</div>
            </div>
            <div className="welcome-emoji">📚</div>
          </div>

          {/* Stats */}
          <div className="stats-grid animate-fadeUp delay-1">
            <div className="stat-card">
              <div className="stat-icon purple">⏱️</div>
              <div className="stat-info">
                <div className="stat-value">{user.studyHours}h</div>
                <div className="stat-label">Study Hours this Week</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon cyan">👥</div>
              <div className="stat-info">
                <div className="stat-value">{user.groupsJoined}</div>
                <div className="stat-label">Groups Joined</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">✅</div>
              <div className="stat-info">
                <div className="stat-value">{user.tasksCompleted}</div>
                <div className="stat-label">Tasks Completed</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber">🔥</div>
              <div className="stat-info">
                <div className="stat-value">{user.streak}</div>
                <div className="stat-label">Day Streak</div>
              </div>
            </div>
          </div>

          {/* Recommended Groups + Sidebar panels */}
          <div className="three-col">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.2rem', fontWeight: 700 }}>🤖 Recommended Groups</h2>
                <Link to="/groups" className="btn btn-ghost btn-sm">View All</Link>
              </div>
              <div className="groups-grid">
                {REC_GROUPS.map(g => (
                  <div key={g.id} className="group-card" onClick={() => navigate('/groups')}>
                    <div className="group-card-header">
                      <div className="group-emoji">{g.avatar}</div>
                      <div>
                        <div className="group-name">{g.name}</div>
                        <div className="group-subject">{g.subject}</div>
                      </div>
                    </div>
                    <div className="group-meta">
                      <span>👥 {g.members}/{g.maxMembers}</span>
                      <span>📅 {g.schedule}</span>
                    </div>
                    <div className="group-tags">
                      {g.tags.map(t => <span key={t} className="group-tag">{t}</span>)}
                    </div>
                    <div className="match-score">
                      <span className="match-dot"></span>
                      <strong>{g.matchScore}%</strong> match
                      <span className="badge badge-success" style={{ marginLeft: 'auto' }}>{g.level}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              {/* Study Progress */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>📈 Study Progress</h2>
                <div className="card">
                  <div className="progress-list">
                    {subjects.map((s, i) => (
                      <div key={i}>
                        <div className="progress-item-label">
                          <span>{s.name}</span>
                          <span className="progress-pct">{s.pct}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${s.pct}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>⚡ Recent Activity</h2>
                <div className="card">
                  <div className="activity-list">
                    {ACTIVITIES.map((a, i) => (
                      <div key={i} className="activity-item">
                        <div className="activity-icon" style={{ background: a.color }}>{a.icon}</div>
                        <div className="activity-text">
                          <div className="activity-title">{a.title}</div>
                          <div className="activity-time">{a.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Find Group Modal */}
      {showFindModal && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowFindModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">🔍 Find a Study Group</h3>
              <button className="modal-close" onClick={() => setShowFindModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input type="text" className="form-input" placeholder="e.g. Calculus, Machine Learning..." />
            </div>
            <div className="form-group">
              <label className="form-label">Level</label>
              <select className="form-select">
                <option>Any Level</option>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => { setShowFindModal(false); navigate('/groups'); }}
            >
              🔍 Search Groups
            </button>
          </div>
        </div>
      )}

      {/* AI Match Modal */}
      {showAIModal && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowAIModal(false); }}>
          <div className="modal" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 className="modal-title">🤖 AI Study Match</h3>
              <button className="modal-close" onClick={() => setShowAIModal(false)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Students matched to your subjects and availability.
            </p>
            {[
              { name: 'Sarah Kim', university: 'Stanford', subjects: ['Algorithms', 'CS'], score: 95, av: 'SK' },
              { name: 'Marcus Rivera', university: 'MIT', subjects: ['Physics', 'Math'], score: 88, av: 'MR' },
              { name: 'Priya Mehta', university: 'IIT Delhi', subjects: ['ML', 'Algorithms'], score: 91, av: 'PM' },
            ].map((u, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
                <div className="avatar avatar-md">{u.av}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{u.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{u.university}</div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {u.subjects.map(s => (
                      <span key={s} className="badge badge-primary" style={{ fontSize: '0.68rem' }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.2rem', fontWeight: 800, background: 'var(--gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {u.score}%
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>match</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
