// ============================================
// Groups Page with Sessions, Notes & Resources Tabs
// ============================================

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import GroupSessionsTab from '../components/GroupSessionsTab';
import GroupNotesTab from '../components/GroupNotesTab';
import GroupResourcesTab from '../components/GroupResourcesTab';
import LeaderboardTab from '../components/gamification/LeaderboardTab';
import { Session } from '../api';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchGroups, joinGroup, leaveGroup, createGroup } from '../store/slices/groupsSlice';

const levelBadge = { Advanced: 'badge-danger', Intermediate: 'badge-warning', Beginner: 'badge-success' };

const GroupCard = ({ g, onJoin, onLeave, onView, currentUserId }) => {
  const isMember = (g.members || []).some(m => String(m._id || m) === String(currentUserId));
  const isCreator = String(g.createdBy?._id || g.createdBy) === String(currentUserId);
  const isFull = (g.members || []).length >= (g.maxMembers || 10);

  return (
    <div className="group-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="group-card-header" style={{ cursor: isMember ? 'pointer' : 'default' }} onClick={() => isMember && onView(g)}>
        <div className="group-emoji">{g.avatar || '📚'}</div>
        <div>
          <div className="group-name">{g.name}</div>
          <div className="group-subject">{g.subject}</div>
        </div>
      </div>
      <div className="group-meta">
        <span>👥 {(g.members || []).length}/{g.maxMembers || 10} members</span>
        <span>📅 {g.schedule || 'Flexible'}</span>
      </div>
      <div className="group-tags">
        {(g.tags || []).map(t => <span key={t} className="group-tag">{t}</span>)}
      </div>
      <div className="match-score" style={{ marginBottom: '12px' }}>
        <span className="match-dot"></span>
        <span className={`badge ${levelBadge[g.level] || 'badge-primary'}`} style={{ marginLeft: 'auto' }}>{g.level || 'Open'}</span>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
        {isMember && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => onView(g)}
          >
            📂 Open Hub
          </button>
        )}
        <button
          type="button"
          className={`btn btn-sm ${isMember ? 'btn-ghost' : 'btn-primary'}`}
          style={{ flex: isMember ? 1 : 2, justifyContent: 'center' }}
          disabled={isCreator || (!isMember && isFull)}
          onClick={() => isMember ? onLeave(g._id) : onJoin(g._id)}
        >
          {isCreator ? 'Group Creator' : isMember ? 'Leave' : isFull ? 'Group Full' : '+ Join Group'}
        </button>
      </div>
    </div>
  );
};

const Groups = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { items: groups, loading } = useAppSelector((state) => state.groups);
  const authUser = useAppSelector((state) => state.auth.user);

  const [activeTab, setActiveTab] = useState(
    searchParams.has('search') || searchParams.has('level') ? 'all' : 'my'
  );
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupSubTab, setGroupSubTab] = useState('sessions'); // 'sessions' | 'notes' | 'resources'

  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [levelFilter, setLevelFilter] = useState(searchParams.get('level') || '');
  const [newGroup, setNewGroup] = useState({ name: '', subject: '', maxMembers: 10, level: 'Beginner', schedule: '', tags: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const currentUser = authUser || Session.getUser();
  const currentUserId = currentUser?._id || currentUser?.id;

  useEffect(() => {
    if (!Session.isLoggedIn()) { window.location.href = '/login'; return; }
    dispatch(fetchGroups());
  }, [dispatch]);

  const handleJoin = async (groupId) => {
    const result = await dispatch(joinGroup(groupId));
    if (joinGroup.rejected.match(result)) {
      setError(result.payload || 'Could not join this group.');
    }
  };

  const handleLeave = async (groupId) => {
    const result = await dispatch(leaveGroup(groupId));
    if (leaveGroup.rejected.match(result)) {
      setError(result.payload || 'Could not leave this group.');
    } else if (selectedGroup?._id === groupId) {
      setSelectedGroup(null);
    }
  };

  const handleCreate = async () => {
    if (!newGroup.name.trim() || !newGroup.subject.trim()) {
      setError('Group name and subject are required.');
      return;
    }
    setCreating(true);
    setError('');

    const groupPayload = {
      name: newGroup.name,
      subject: newGroup.subject,
      maxMembers: parseInt(newGroup.maxMembers) || 10,
      level: newGroup.level,
      schedule: newGroup.schedule,
      tags: newGroup.tags.split(',').map(t => t.trim()).filter(Boolean)
    };

    const result = await dispatch(createGroup(groupPayload));
    if (createGroup.fulfilled.match(result)) {
      setShowModal(false);
      setNewGroup({ name: '', subject: '', maxMembers: 10, level: 'Beginner', schedule: '', tags: '' });
    } else {
      setError(result.payload || 'Could not create this study group.');
    }
    setCreating(false);
  };

  const myGroups = groups.filter(g =>
    (g.members || []).some(member => String(member._id || member) === String(currentUserId))
  );

  const allFiltered = search
    ? groups.filter(g =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.subject.toLowerCase().includes(search.toLowerCase()) ||
      (g.tags || []).some(tag => tag.toLowerCase().includes(search.toLowerCase()))
    )
    : groups;

  const levelFiltered = levelFilter ? allFiltered.filter(group => group.level === levelFilter) : allFiltered;
  const displayGroups = activeTab === 'my' ? myGroups : levelFiltered;

  return (
    <div className="page-wrapper">
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          {/* Detail View for Selected Group */}
          {selectedGroup ? (
            <div className="animate-fadeUp">
              {/* Back to list & Group Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedGroup(null)}
                >
                  ← Back to Groups
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.8rem' }}>{selectedGroup.avatar || '📚'}</span>
                  <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                      {selectedGroup.name}
                    </h1>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {selectedGroup.subject} · {selectedGroup.level || 'Open Level'} · {(selectedGroup.members || []).length} members
                    </div>
                  </div>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate('/chat')}
                  >
                    💬 Open Chat
                  </button>
                </div>
              </div>

              {/* Group Workspace Tabs */}
              <div className="tabs" style={{ marginBottom: '1.5rem' }}>
                <button
                  className={`tab-btn ${groupSubTab === 'sessions' ? 'active' : ''}`}
                  onClick={() => setGroupSubTab('sessions')}
                >
                  ⏱️ Study Sessions
                </button>
                <button
                  className={`tab-btn ${groupSubTab === 'notes' ? 'active' : ''}`}
                  onClick={() => setGroupSubTab('notes')}
                >
                  📝 Shared Notes
                </button>
                <button
                  className={`tab-btn ${groupSubTab === 'resources' ? 'active' : ''}`}
                  onClick={() => setGroupSubTab('resources')}
                >
                  📁 Files &amp; Resources
                </button>
                <button
                  className={`tab-btn ${groupSubTab === 'leaderboard' ? 'active' : ''}`}
                  onClick={() => setGroupSubTab('leaderboard')}
                >
                  🏆 Leaderboard
                </button>
              </div>

              {/* Tab Contents */}
              {groupSubTab === 'sessions' && <GroupSessionsTab group={selectedGroup} />}
              {groupSubTab === 'notes' && <GroupNotesTab group={selectedGroup} />}
              {groupSubTab === 'resources' && <GroupResourcesTab group={selectedGroup} />}
              {groupSubTab === 'leaderboard' && <LeaderboardTab defaultScope="group" groupId={selectedGroup._id} showScopeSwitch={true} />}
            </div>
          ) : (
            /* Groups Overview List */
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                  <h1 className="section-title" style={{ fontSize: '1.8rem' }}>Study <span>Groups</span></h1>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
                    Find and join groups that match your subjects and schedule
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Create Group</button>
              </div>
              {error && <p role="alert" style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}

              {/* Search & Level Filter */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div className="input-wrapper" style={{ flex: 1, minWidth: '240px' }}>
                  <span className="input-icon">🔍</span>
                  <input
                    type="text" className="form-input"
                    placeholder="Search groups by name or subject..."
                    value={search} onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ minWidth: '180px', margin: 0 }}>
                  <select
                    id="group-level-filter"
                    className="form-select"
                    value={levelFilter}
                    onChange={event => setLevelFilter(event.target.value)}
                  >
                    <option value="">Any level</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Tabs */}
              <div className="tabs">
                <button className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`} onClick={() => setActiveTab('my')}>
                  My Groups ({myGroups.length})
                </button>
                <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
                  All Groups ({groups.length})
                </button>
              </div>

              {/* Groups Grid */}
              {loading && groups.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>⏳ Loading groups...</p>
              ) : displayGroups.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                  <p style={{ color: 'var(--text-muted)' }}>
                    {activeTab === 'my' ? "You haven't joined any groups yet." : "No groups found."}
                  </p>
                  <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setActiveTab('all')}>
                    Browse All Groups
                  </button>
                </div>
              ) : (
                <div className="groups-page-grid">
                  {displayGroups.map(g => (
                    <GroupCard
                      key={g._id}
                      g={g}
                      onJoin={handleJoin}
                      onLeave={handleLeave}
                      onView={(selected) => setSelectedGroup(selected)}
                      currentUserId={currentUserId}
                    />
                  ))}
                </div>
              )}
            </>
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
              <input type="text" className="form-input" placeholder="e.g. Advanced Algorithms Study Group"
                value={newGroup.name} onChange={e => setNewGroup(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input type="text" className="form-input" placeholder="e.g. Computer Science"
                value={newGroup.subject} onChange={e => setNewGroup(p => ({ ...p, subject: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Max Members</label>
                <input type="number" className="form-input" placeholder="10" min="2" max="50"
                  value={newGroup.maxMembers} onChange={e => setNewGroup(p => ({ ...p, maxMembers: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Level</label>
                <select className="form-select" value={newGroup.level} onChange={e => setNewGroup(p => ({ ...p, level: e.target.value }))}>
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Meeting Schedule</label>
              <input type="text" className="form-input" placeholder="e.g. Mon & Wed 6pm"
                value={newGroup.schedule} onChange={e => setNewGroup(p => ({ ...p, schedule: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Tags (comma separated)</label>
              <input type="text" className="form-input" placeholder="e.g. DSA, LeetCode, Python"
                value={newGroup.tags} onChange={e => setNewGroup(p => ({ ...p, tags: e.target.value }))} />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleCreate} disabled={creating}>
              {creating ? '⏳ Creating...' : '🚀 Create Group'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
