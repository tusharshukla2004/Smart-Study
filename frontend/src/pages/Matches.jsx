import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { MatchAPI, GroupsAPI, Session } from '../api';
import { showToast } from '../utils';

const ENABLE_MATCHMAKING_V2 = import.meta.env.VITE_ENABLE_MATCHMAKING_V2 !== 'false';

const Matches = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('partners'); // 'partners' | 'groups' | 'requests'
  const [loading, setLoading] = useState(true);
  const [partnersData, setPartnersData] = useState({ matches: [], total: 0, page: 1, totalPages: 1, profileCompleteness: { completeness: 0, tips: [] } });
  const [groupsData, setGroupsData] = useState({ matchedGroups: [], total: 0 });
  const [requestsData, setRequestsData] = useState({ incoming: [], outgoing: [] });
  const [subjectFilter, setSubjectFilter] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState({});

  const fetchPartners = useCallback(async (targetPage = 1, skipCache = false) => {
    setLoading(true);
    try {
      const res = await MatchAPI.getPartnersV2({
        page: targetPage,
        limit: 8,
        subject: subjectFilter,
        skipCache
      });
      if (res.success && res.data) {
        setPartnersData(res.data);
      } else {
        showToast(res.message || 'Failed to load partner matches', 'error');
      }
    } catch {
      showToast('Error loading partner matches', 'error');
    } finally {
      setLoading(false);
    }
  }, [subjectFilter]);

  const fetchGroups = useCallback(async (skipCache = false) => {
    setLoading(true);
    try {
      const res = await MatchAPI.getGroupsV2(8);
      if (res.success && res.data) {
        setGroupsData(res.data);
      }
    } catch {
      showToast('Error loading group recommendations', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await MatchAPI.getRequests();
      if (res.success && res.data) {
        setRequestsData(res.data);
      }
    } catch {
      console.error('Failed to load requests');
    }
  }, []);

  useEffect(() => {
    if (!Session.isLoggedIn()) { navigate('/login'); return; }
    if (activeTab === 'partners') {
      fetchPartners(page);
    } else if (activeTab === 'groups') {
      fetchGroups();
    } else if (activeTab === 'requests') {
      fetchRequests();
    }
    // Also fetch requests count in background
    fetchRequests();
  }, [activeTab, page, fetchPartners, fetchGroups, fetchRequests, navigate]);

  const handleConnect = async (userId) => {
    setActionLoading(prev => ({ ...prev, [userId]: 'connecting' }));
    try {
      const res = await MatchAPI.connect(userId);
      if (res.success) {
        showToast('Connection request sent!', 'success');
        // Remove connected candidate from list optimistically
        setPartnersData(prev => ({
          ...prev,
          matches: prev.matches.filter(m => m._id !== userId),
          total: Math.max(0, prev.total - 1)
        }));
        fetchRequests();
      } else {
        showToast(res.message || 'Failed to send request', 'error');
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  const handleDismiss = async (userId) => {
    setActionLoading(prev => ({ ...prev, [userId]: 'dismissing' }));
    try {
      const res = await MatchAPI.dismiss(userId);
      if (res.success) {
        showToast('Candidate dismissed from recommendations', 'info');
        setPartnersData(prev => ({
          ...prev,
          matches: prev.matches.filter(m => m._id !== userId),
          total: Math.max(0, prev.total - 1)
        }));
      } else {
        showToast(res.message || 'Failed to dismiss candidate', 'error');
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  const handleRespond = async (userId, accept) => {
    setActionLoading(prev => ({ ...prev, [userId]: accept ? 'accepting' : 'declining' }));
    try {
      const res = await MatchAPI.respond(userId, accept);
      if (res.success) {
        showToast(accept ? 'Partner connected! Study pair created 🎉' : 'Request declined', accept ? 'success' : 'info');
        fetchRequests();
        if (accept && res.data?.group?._id) {
          setTimeout(() => navigate(`/groups/${res.data.group._id}`), 1500);
        }
      } else {
        showToast(res.message || 'Failed to respond', 'error');
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  const handleJoinGroup = async (groupId) => {
    setActionLoading(prev => ({ ...prev, [groupId]: 'joining' }));
    try {
      const res = await GroupsAPI.join(groupId);
      if (res.success) {
        showToast('Joined group successfully!', 'success');
        navigate(`/groups/${groupId}`);
      } else {
        showToast(res.message || 'Failed to join group', 'error');
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [groupId]: null }));
    }
  };

  const completeness = partnersData.profileCompleteness?.completeness || 0;
  const tips = partnersData.profileCompleteness?.tips || [];
  const incomingCount = requestsData.incoming?.length || 0;

  return (
    <div className="page-wrapper">
      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                🤝 Matchmaking Hub
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                Connect with compatible study partners and active study groups tailored to your goals.
              </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', background: 'var(--card2)', padding: '4px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <button
                onClick={() => { setActiveTab('partners'); setPage(1); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activeTab === 'partners' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'partners' ? '#fff' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                🎯 Partners
              </button>
              <button
                onClick={() => { setActiveTab('groups'); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activeTab === 'groups' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'groups' ? '#fff' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                👥 Groups
              </button>
              <button
                onClick={() => { setActiveTab('requests'); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activeTab === 'requests' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'requests' ? '#fff' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                📬 Requests
                {incomingCount > 0 && (
                  <span style={{ background: 'var(--accent)', color: '#000', borderRadius: '10px', padding: '1px 6px', fontSize: '0.72rem', fontWeight: 800 }}>
                    {incomingCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Profile Strength Notice */}
          {activeTab === 'partners' && completeness < 75 && (
            <div
              style={{
                marginBottom: '20px',
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(34,211,238,0.15) 100%)',
                border: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>
                  ⚡ Boost your match quality ({completeness}% profile strength)
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {tips[0] || 'Complete your study preferences to unlock accurate mentor and schedule matching.'}
                </div>
              </div>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => navigate('/profile')}
                style={{ fontSize: '0.8rem' }}
              >
                Update Profile →
              </button>
            </div>
          )}

          {/* Tab 1: Partners */}
          {activeTab === 'partners' && (
            <div>
              {/* Search / Filter Bar */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Filter by subject (e.g. Data Structures, ML)..."
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchPartners(1, true); }}
                  style={{
                    flex: '1 1 240px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--text)',
                    fontSize: '0.9rem'
                  }}
                />
                <button
                  className="btn btn-ghost"
                  onClick={() => fetchPartners(1, true)}
                  title="Refresh recommendations"
                  style={{ padding: '0 16px' }}
                >
                  🔄 Refresh
                </button>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
                  <div>Calculating optimal study partner matches...</div>
                </div>
              ) : partnersData.matches.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎯</div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>No Partner Matches Found</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 16px' }}>
                    Try broadening your subject filter or add more subjects and available study hours to your profile.
                  </p>
                  <button className="btn btn-primary" onClick={() => navigate('/profile')}>
                    Edit Profile Preferences
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  {partnersData.matches.map(partner => {
                    const initials = partner.name ? partner.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'SP';
                    const isConnecting = actionLoading[partner._id] === 'connecting';
                    const isDismissing = actionLoading[partner._id] === 'dismissing';

                    return (
                      <div
                        key={partner._id}
                        className="card animate-fadeUp"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          padding: '20px',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <div>
                          {/* Card Top: Avatar, Name, Score Ring */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <div className="avatar avatar-md" style={{ background: 'var(--primary)', color: '#fff' }}>
                                {partner.avatar || initials}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                                  {partner.name}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                                  {partner.university || 'Student'} · {partner.major || 'Learner'}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {partner.ratingCount > 0 ? (
                                    <span>⭐ {partner.ratingAvg.toFixed(1)} ({partner.ratingCount})</span>
                                  ) : (
                                    <span>⭐ New peer</span>
                                  )}
                                  <span>·</span>
                                  <span>🔥 {partner.streak || 0}d streak</span>
                                </div>
                              </div>
                            </div>

                            {/* Match Score Badge */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(6, 182, 212, 0.15)',
                                border: '1px solid var(--primary)'
                              }}
                            >
                              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                                {partner.matchScore}%
                              </span>
                              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', fontWeight: 600 }}>
                                MATCH
                              </span>
                            </div>
                          </div>

                          {/* Reasons */}
                          {partner.reasons?.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                              {partner.reasons.map((r, i) => (
                                <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: 'var(--accent)' }}>✦</span>
                                  <span>{r}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Common & Complementary Subjects */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                            {partner.commonSubjects?.map(s => (
                              <span
                                key={s}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: 'var(--card2)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--secondary)'
                                }}
                              >
                                📚 {s}
                              </span>
                            ))}
                            {partner.teachingMatches?.map(s => (
                              <span
                                key={s}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  border: '1px solid var(--success)',
                                  color: 'var(--success)'
                                }}
                              >
                                🎓 Mentors: {s}
                              </span>
                            ))}
                          </div>

                          {/* Mini Breakdown Indicators */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', padding: '8px', background: 'var(--bg3)', borderRadius: '6px', fontSize: '0.7rem', color: 'var(--text-dim)', textAlign: 'center', marginBottom: '14px' }}>
                            <div>
                              <div>Subjects</div>
                              <div style={{ fontWeight: 700, color: 'var(--text)' }}>{partner.scoreBreakdown?.subjectOverlap || 0}%</div>
                            </div>
                            <div>
                              <div>Schedule</div>
                              <div style={{ fontWeight: 700, color: 'var(--text)' }}>{partner.scoreBreakdown?.availabilityOverlap || 0}%</div>
                            </div>
                            <div>
                              <div>Mentorship</div>
                              <div style={{ fontWeight: 700, color: 'var(--text)' }}>{partner.scoreBreakdown?.complementarity || 0}%</div>
                            </div>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => handleDismiss(partner._id)}
                            disabled={isDismissing || isConnecting}
                            style={{ flex: 1, fontSize: '0.8rem', justifyContent: 'center' }}
                          >
                            {isDismissing ? '...' : 'Dismiss'}
                          </button>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleConnect(partner._id)}
                            disabled={isConnecting || isDismissing}
                            style={{ flex: 2, fontSize: '0.8rem', justifyContent: 'center' }}
                          >
                            {isConnecting ? 'Sending...' : '🤝 Connect'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {partnersData.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    ← Previous
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Page {page} of {partnersData.totalPages}
                  </span>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setPage(p => Math.min(partnersData.totalPages, p + 1))}
                    disabled={page >= partnersData.totalPages}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Groups */}
          {activeTab === 'groups' && (
            <div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
                  <div>Loading study group recommendations...</div>
                </div>
              ) : groupsData.matchedGroups.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>👥</div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>No Recommended Groups</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                    You have joined all relevant groups or none match your current enrolled subjects.
                  </p>
                  <button className="btn btn-primary" onClick={() => navigate('/groups')}>
                    Browse All Groups
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  {groupsData.matchedGroups.map(group => {
                    const isJoining = actionLoading[group._id] === 'joining';
                    return (
                      <div
                        key={group._id}
                        className="card animate-fadeUp"
                        style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px' }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <span style={{ fontSize: '1.8rem' }}>{group.avatar || '📚'}</span>
                              <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                                  {group.name}
                                </h3>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                                  {group.subject} {group.level && `· ${group.level}`}
                                </div>
                              </div>
                            </div>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', background: 'rgba(6,182,212,0.15)', padding: '4px 8px', borderRadius: '6px' }}>
                              {group.matchScore}%
                            </span>
                          </div>

                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '12px' }}>
                            {group.description || 'Collaborative peer study group.'}
                          </p>

                          {group.reasons?.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                              {group.reasons.map((r, i) => (
                                <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: 'var(--accent)' }}>✦</span>
                                  <span>{r}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '14px' }}>
                            <span>👥 {(group.members || []).length} / {group.maxMembers || 10} members</span>
                            {group.isActiveRecently && <span style={{ color: 'var(--success)' }}>🟢 Active this week</span>}
                          </div>
                        </div>

                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleJoinGroup(group._id)}
                          disabled={isJoining}
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          {isJoining ? 'Joining...' : '🚀 Join Group'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Requests */}
          {activeTab === 'requests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Incoming Requests */}
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text)' }}>
                  📥 Incoming Partner Requests ({requestsData.incoming?.length || 0})
                </h3>

                {requestsData.incoming?.length === 0 ? (
                  <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No pending connection requests. When students match with you, their requests will appear here.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                    {requestsData.incoming.map(req => {
                      const sender = req.user;
                      const isAccepting = actionLoading[sender._id] === 'accepting';
                      const isDeclining = actionLoading[sender._id] === 'declining';
                      return (
                        <div key={req._id} className="card" style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                            <div className="avatar avatar-md" style={{ background: 'var(--primary)', color: '#fff' }}>
                              {sender.avatar || sender.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text)' }}>{sender.name}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                                {sender.university || 'Student'} · {sender.major || 'Learner'}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => handleRespond(sender._id, false)}
                              disabled={isDeclining || isAccepting}
                              style={{ flex: 1, justifyContent: 'center' }}
                            >
                              {isDeclining ? '...' : 'Decline'}
                            </button>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleRespond(sender._id, true)}
                              disabled={isAccepting || isDeclining}
                              style={{ flex: 1, justifyContent: 'center' }}
                            >
                              {isAccepting ? 'Accepting...' : '✓ Accept & Pair'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Outgoing Requests */}
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text)' }}>
                  📤 Outgoing Requests Sent ({requestsData.outgoing?.length || 0})
                </h3>

                {requestsData.outgoing?.length === 0 ? (
                  <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No outgoing requests pending. Browse the Partners tab to find study peers!
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                    {requestsData.outgoing.map(req => {
                      const recipient = req.targetUser;
                      return (
                        <div key={req._id} className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div className="avatar avatar-md">
                              {recipient.avatar || recipient.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text)' }}>{recipient.name}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{recipient.university || recipient.major}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '12px', background: 'var(--card2)', color: 'var(--warning)', border: '1px solid var(--border)' }}>
                            Pending response
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Matches;
