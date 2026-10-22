// ============================================
// Upcoming Sessions Widget (for Dashboard)
// ============================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SessionAPI, Session } from '../api';
import { showToast } from '../utils';

const UpcomingSessionsWidget = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = Session.getUser()?._id || Session.getUser()?.id;

  const loadUpcoming = async () => {
    setLoading(true);
    const res = await SessionAPI.getUpcoming();
    if (res.success) {
      setSessions(res.sessions || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUpcoming();
  }, []);

  const handleRsvp = async (sessionId, status, e) => {
    e.stopPropagation();
    const res = await SessionAPI.rsvp(sessionId, status);
    if (res.success) {
      showToast(`RSVP updated to ${status}`, 'success');
      setSessions(prev => prev.map(s => {
        if (s._id === sessionId) {
          const rsvps = [...(s.rsvps || [])];
          const idx = rsvps.findIndex(r => String(r.user?._id || r.user) === String(currentUserId));
          if (idx > -1) {
            rsvps[idx] = { ...rsvps[idx], status };
          } else {
            rsvps.push({ user: currentUserId, status });
          }
          return { ...s, rsvps };
        }
        return s;
      }));
    } else {
      showToast(res.message || 'Failed to update RSVP', 'error');
    }
  };

  const getRsvpCounts = (rsvps = []) => {
    return {
      going: rsvps.filter(r => r.status === 'going').length,
      maybe: rsvps.filter(r => r.status === 'maybe').length
    };
  };

  const getUserRsvp = (rsvps = []) => {
    const item = rsvps.find(r => String(r.user?._id || r.user) === String(currentUserId));
    return item?.status || null;
  };

  return (
    <div className="card animate-fadeUp" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
          ⏱️ Upcoming Study Sessions
        </h2>
        <Link to="/groups" className="btn btn-ghost btn-sm">Browse Groups</Link>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1rem 0' }}>⏳ Loading upcoming sessions...</p>
      ) : sessions.length === 0 ? (
        <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>No upcoming study sessions scheduled yet.</p>
          <Link to="/groups" className="btn btn-primary btn-sm">Schedule one in your group</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sessions.map((s) => {
            const counts = getRsvpCounts(s.rsvps);
            const userRsvp = getUserRsvp(s.rsvps);
            const isLive = s.status === 'live';
            const startTimeStr = new Date(s.scheduledAt).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={s._id}
                style={{
                  background: isLive ? 'rgba(16,185,129,0.08)' : 'var(--bg3)',
                  border: isLive ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    {isLive ? (
                      <span className="badge badge-success" style={{ animation: 'pulse 2s infinite' }}>🔴 Live Now</span>
                    ) : (
                      <span className="badge badge-primary">{s.group?.name || 'Study Group'}</span>
                    )}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{startTimeStr}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {s.subject} · {s.totalCycles} cycles ({s.focusMinutes}m / {s.breakMinutes}m) · 👥 {counts.going} going
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {/* RSVP Buttons */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${userRsvp === 'going' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={(e) => handleRsvp(s._id, 'going', e)}
                    >
                      Going
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${userRsvp === 'maybe' ? 'btn-secondary' : 'btn-ghost'}`}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={(e) => handleRsvp(s._id, 'maybe', e)}
                    >
                      Maybe
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${userRsvp === 'not_going' ? 'btn-danger' : 'btn-ghost'}`}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={(e) => handleRsvp(s._id, 'not_going', e)}
                    >
                      Can't
                    </button>
                  </div>

                  {/* Add to Calendar (.ics) */}
                  <a
                    href={SessionAPI.getIcsDownloadUrl(s._id)}
                    className="btn btn-ghost btn-sm"
                    title="Export to Calendar (.ics)"
                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                  >
                    📅 .ics
                  </a>

                  {/* Enter Session Room */}
                  <button
                    type="button"
                    className={`btn btn-sm ${isLive ? 'btn-success' : 'btn-primary'}`}
                    onClick={() => navigate(`/sessions/${s._id}`)}
                    style={{ padding: '6px 14px' }}
                  >
                    {isLive ? 'Join Room →' : 'Enter Room →'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UpcomingSessionsWidget;
