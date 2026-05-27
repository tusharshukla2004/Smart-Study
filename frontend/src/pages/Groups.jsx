import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const ALL_GROUPS = [
  { id: 1, name: 'Advanced Algorithms', subject: 'Computer Science', members: 8, maxMembers: 10, time: 'Mon & Wed 6pm', level: 'Advanced', tags: ['DSA', 'LeetCode', 'Competitive'], avatar: '⚙️', match: 95, joined: true },
  { id: 2, name: 'Calculus Masters', subject: 'Mathematics', members: 5, maxMembers: 8, time: 'Tue & Thu 4pm', level: 'Intermediate', tags: ['Calculus', 'Linear Algebra'], avatar: '📐', match: 87, joined: true },
  { id: 3, name: 'ML Research Club', subject: 'Machine Learning', members: 12, maxMembers: 15, time: 'Sat 10am', level: 'Advanced', tags: ['Neural Networks', 'Python'], avatar: '🤖', match: 92, joined: false },
  { id: 4, name: 'Physics Fundamentals', subject: 'Physics', members: 6, maxMembers: 10, time: 'Wed & Fri 5pm', level: 'Beginner', tags: ['Mechanics', 'Thermodynamics'], avatar: '⚛️', match: 78, joined: false },
  { id: 5, name: 'Web Dev Squad', subject: 'Web Development', members: 9, maxMembers: 12, time: 'Daily 8pm', level: 'Intermediate', tags: ['React', 'Node.js', 'CSS'], avatar: '🌐', match: 83, joined: false },
  { id: 6, name: 'Chemistry Lab', subject: 'Chemistry', members: 4, maxMembers: 8, time: 'Mon 7pm', level: 'Intermediate', tags: ['Organic', 'Lab Reports'], avatar: '🧪', match: 70, joined: false },
];

const levelBadge = { Advanced: 'badge-danger', Intermediate: 'badge-warning', Beginner: 'badge-success' };

const GroupCard = ({ g, onJoin }) => (
  <div className="group-card">
    <div className="group-card-header">
      <div className="group-emoji">{g.avatar}</div>
      <div>
        <div className="group-name">{g.name}</div>
        <div className="group-subject">{g.subject}</div>
      </div>
    </div>
    <div className="group-meta">
      <span>👥 {g.members}/{g.maxMembers} members</span>
      <span>📅 {g.time}</span>
    </div>
    <div className="group-tags">
      {g.tags.map(t => <span key={t} className="group-tag">{t}</span>)}
    </div>
    <div className="match-score" style={{ marginBottom: '12px' }}>
      <span className="match-dot"></span>
      <strong>{g.match}%</strong> match
      <span className={`badge ${levelBadge[g.level]}`} style={{ marginLeft: 'auto' }}>{g.level}</span>
    </div>
    <button
      className={`btn ${g.joined ? 'btn-ghost' : 'btn-primary'}`}
      style={{ width: '100%', justifyContent: 'center' }}
      onClick={() => onJoin(g.id)}
    >
      {g.joined ? '✓ Joined' : '+ Join Group'}
    </button>
  </div>
);

const Groups = () => {
  const [groups, setGroups] = useState(ALL_GROUPS);
  const [activeTab, setActiveTab] = useState('my');
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const handleJoin = (id) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, joined: !g.joined } : g));
  };

  const myGroups = groups.filter(g => g.joined);
  const recommended = [...groups].sort((a, b) => b.match - a.match).slice(0, 3);
  const allFiltered = search
    ? groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || g.subject.toLowerCase().includes(search.toLowerCase()))
    : groups;

  const displayGroups = activeTab === 'my' ? myGroups : activeTab === 'recommended' ? recommended : allFiltered;

  return (
    <div className="page-wrapper">
      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <h1 className="section-title" style={{ fontSize: '1.8rem' }}>Study <span>Groups</span></h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
                Find and join groups that match your subjects and schedule
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Create Group</button>
          </div>

          {/* Search (for All tab) */}
          {activeTab === 'all' && (
            <div className="input-wrapper" style={{ marginBottom: '1.5rem' }}>
              <span className="input-icon">🔍</span>
              <input
                type="text" className="form-input"
                placeholder="Search groups by name or subject..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}

          {/* Tabs */}
          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`} onClick={() => setActiveTab('my')}>
              My Groups ({myGroups.length})
            </button>
            <button className={`tab-btn ${activeTab === 'recommended' ? 'active' : ''}`} onClick={() => setActiveTab('recommended')}>
              🤖 Recommended
            </button>
            <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
              All Groups
            </button>
          </div>

          {/* Groups Grid */}
          {displayGroups.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
              <p style={{ color: 'var(--text-muted)' }}>
                {activeTab === 'my'
                  ? "You haven't joined any groups yet."
                  : "No groups found."}
              </p>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setActiveTab('all')}>
                Browse All Groups
              </button>
            </div>
          ) : (
            <div className="groups-page-grid">
              {displayGroups.map(g => <GroupCard key={g.id} g={g} onJoin={handleJoin} />)}
            </div>
          )}
        </main>
      </div>

      {/* Create Group Modal */}
      {showModal && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">➕ Create Study Group</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Group Name</label>
              <input type="text" className="form-input" placeholder="e.g. Advanced Algorithms Study Group" />
            </div>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input type="text" className="form-input" placeholder="e.g. Computer Science" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Max Members</label>
                <input type="number" className="form-input" placeholder="10" min="2" max="50" />
              </div>
              <div className="form-group">
                <label className="form-label">Level</label>
                <select className="form-select">
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Meeting Schedule</label>
              <input type="text" className="form-input" placeholder="e.g. Mon & Wed 6pm" />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowModal(false)}>
              🚀 Create Group
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
