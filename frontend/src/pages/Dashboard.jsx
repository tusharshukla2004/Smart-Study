import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { UserAPI, GroupsAPI, TasksAPI, MatchAPI, Session } from '../api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: '', avatar: '', subjects: [] });
  const [groups, setGroups] = useState([]);
  const [groupsJoined, setGroupsJoined] = useState(0);
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0 });
  const [tasks, setTasks] = useState([]);
  const [matches, setMatches] = useState([]);
  const [greeting, setGreeting] = useState('');
  const [showFindModal, setShowFindModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [findSubject, setFindSubject] = useState('');
  const [findLevel, setFindLevel] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Session.isLoggedIn()) { navigate('/login'); return; }
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning ☀️' : h < 18 ? 'Good afternoon 🌤️' : 'Good evening 🌙');

    // Fetch all real data from MongoDB
    const loadData = async () => {
      const [profileRes, groupsRes, tasksRes, matchRes] = await Promise.all([
        UserAPI.getProfile(),
        GroupsAPI.getAll(),
        TasksAPI.getAll(),
        MatchAPI.getMatches()
      ]);
      const currentUserId = Session.getUser()?._id || Session.getUser()?.id;

      if (profileRes.success) {
        setUser(profileRes.user);
        Session.updateUser(profileRes.user);
      }
      if (groupsRes.success) {
        setGroupsJoined((groupsRes.groups || []).filter(group =>
          (group.members || []).some(member => String(member._id || member) === String(currentUserId))
        ).length);
      }
      if (tasksRes.success) {
        setTaskStats({ total: tasksRes.stats.total, completed: tasksRes.stats.completed });
        setTasks(tasksRes.tasks || []);
      }
      if (matchRes.success) {
        setGroups((matchRes.data?.matchedGroups || []).slice(0, 3));
        setMatches((matchRes.data?.matchedUsers || []).slice(0, 3));
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const pendingTasks = taskStats.total - taskStats.completed;
  const taskProgress = taskStats.total ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

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
              <div className="welcome-streak">{user.subjects?.length || 0} study subjects in your profile</div>
            </div>
            <div className="welcome-emoji">📚</div>
          </div>

          {/* Stats */}
          <div className="stats-grid animate-fadeUp delay-1">
            <div className="stat-card">
              <div className="stat-icon purple">⏱️</div>
              <div className="stat-info">
                <div className="stat-value">{groupsJoined}</div>
                <div className="stat-label">Groups Joined</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon cyan">👥</div>
              <div className="stat-info">
                <div className="stat-value">{pendingTasks}</div>
                <div className="stat-label">Tasks Remaining</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">✅</div>
              <div className="stat-info">
                <div className="stat-value">{matches.length}</div>
                <div className="stat-label">Top Study Matches</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber">🔥</div>
              <div className="stat-info">
                <div className="stat-value">{taskStats.completed}</div>
                <div className="stat-label">Tasks Completed</div>
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
                {!loading && groups.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', padding: '1rem 0', fontSize: '0.875rem' }}>No group recommendations yet. <Link to="/groups">Explore groups</Link></p>
                ) : groups.map(g => (
                  <div key={g._id} className="group-card" onClick={() => navigate('/groups')}>
                    <div className="group-card-header">
                      <div className="group-emoji">{g.avatar || '📚'}</div>
                      <div>
                        <div className="group-name">{g.name}</div>
                        <div className="group-subject">{g.subject}</div>
                      </div>
                    </div>
                    <div className="group-meta">
                      <span>👥 {(g.members || []).length}/{g.maxMembers || 10}</span>
                      <span>📅 {g.schedule || 'Flexible'}</span>
                    </div>
                    <div className="group-tags">
                      {(g.tags || []).map(t => <span key={t} className="group-tag">{t}</span>)}
                    </div>
                    <div className="match-score">
                      <span className="badge badge-primary">{g.matchScore || 0}% match</span>
                      <span className="badge badge-success" style={{ marginLeft: 'auto' }}>{g.level || 'Open'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              {/* Task Progress */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>📈 Task Progress</h2>
                <div className="card">
                  <div className="progress-item-label">
                    <span>{taskStats.completed} of {taskStats.total} tasks completed</span>
                    <span className="progress-pct">{taskProgress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${taskProgress}%` }}></div>
                  </div>
                  <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.85rem' }}>
                    {user.subjects?.length ? `Studying: ${user.subjects.join(', ')}` : 'Add subjects to your profile to improve your matches.'}
                  </p>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>⚡ Recent Activity</h2>
                <div className="card">
                  <div className="activity-list">
                    {recentTasks.length ? recentTasks.map(task => (
                      <div key={task._id} className="activity-item">
                        <div className="activity-icon" style={{ background: 'rgba(108,99,255,0.15)' }}>
                          {task.status === 'completed' ? '✅' : '🎯'}
                        </div>
                        <div className="activity-text">
                          <div className="activity-title">{task.title}</div>
                          <div className="activity-time">
                            {task.status === 'completed' ? 'Completed' : 'In your task list'}
                            {task.createdAt ? ` · ${new Date(task.createdAt).toLocaleDateString()}` : ''}
                          </div>
                        </div>
                      </div>
                    )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Your recent tasks will appear here.</p>}
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
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Calculus, Machine Learning..."
                value={findSubject}
                onChange={event => setFindSubject(event.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Level</label>
              <select className="form-select" value={findLevel} onChange={event => setFindLevel(event.target.value)}>
                <option value="">Any Level</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                const params = new URLSearchParams();
                if (findSubject.trim()) params.set('search', findSubject.trim());
                if (findLevel) params.set('level', findLevel);
                setShowFindModal(false);
                navigate(`/groups${params.toString() ? `?${params.toString()}` : ''}`);
              }}
            >
              🔍 Search Groups
            </button>
          </div>
        </div>
      )}

      {/* Study partner matches */}
      {showAIModal && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowAIModal(false); }}>
          <div className="modal" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 className="modal-title">🤝 Study Partner Matches</h3>
              <button className="modal-close" onClick={() => setShowAIModal(false)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Students matched to your subjects and availability.
            </p>
            {matches.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No matches yet. Add your subjects and availability in your profile.</p>}
            {matches.map(match => (
              <div key={match._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
                <div className="avatar avatar-md">{match.avatar || match.name?.slice(0, 2).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{match.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{match.university || match.major || 'Study partner'}</div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {(match.commonSubjects || []).map(s => (
                      <span key={s} className="badge badge-primary" style={{ fontSize: '0.68rem' }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.2rem', fontWeight: 800, background: 'var(--gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {match.matchScore}%
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
