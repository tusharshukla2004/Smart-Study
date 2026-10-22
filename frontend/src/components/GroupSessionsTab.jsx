// ============================================
// Group Sessions Tab - Sessions list & Scheduler
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ScheduleSessionModal from './ScheduleSessionModal';
import { SessionAPI, Session } from '../api';
import { showToast } from '../utils';

const GroupSessionsTab = ({ group }) => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const currentUser = Session.getUser();
  const currentUserId = currentUser?._id || currentUser?.id;

  const loadSessions = async () => {
    setLoading(true);
    const res = await SessionAPI.getAll(`groupId=${group._id}`);
    if (res.success) {
      setSessions(res.sessions || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSessions();
  }, [group._id]);

  const handleRsvp = async (sessionId, status, e) => {
    e.stopPropagation();
    const res = await SessionAPI.rsvp(sessionId, status);
    if (res.success) {
      showToast(`RSVP set to ${status}`, 'success');
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

  const getUserRsvp = (rsvps = []) => {
    const item = rsvps.find(r => String(r.user?._id || r.user) === String(currentUserId));
    return item?.status || null;
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
          Study Sessions ({sessions.length})
        </h3>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setShowScheduleModal(true)}
        >
          ➕ Schedule Session
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>⏳ Loading sessions...</p>
      ) : sessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>⏱️</div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>
            No study sessions scheduled for this group yet.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowScheduleModal(true)}
          >
            Schedule the First Pomodoro Session
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sessions.map(s => {
            const isLive = s.status === 'live';
            const userRsvp = getUserRsvp(s.rsvps);
            const goingCount = (s.rsvps || []).filter(r => r.status === 'going').length;

            return (
              <div
                key={s._id}
                style={{
                  background: isLive ? 'rgba(16,185,129,0.08)' : 'var(--card)',
                  border: isLive ? '1px solid var(--success)' : '1px solid var(--border)',
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
                    <span className={`badge ${isLive ? 'badge-success' : s.status === 'completed' ? 'badge-primary' : 'badge-warning'}`}>
                      {isLive ? '🔴 LIVE NOW' : s.status.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      {new Date(s.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {s.totalCycles} cycles ({s.focusMinutes}m focus / {s.breakMinutes}m break) · Host: {s.host?.name} · 👥 {goingCount} going
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {s.status === 'scheduled' && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${userRsvp === 'going' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        onClick={(e) => handleRsvp(s._id, 'going', e)}
                      >
                        Going
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${userRsvp === 'maybe' ? 'btn-secondary' : 'btn-ghost'}`}
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        onClick={(e) => handleRsvp(s._id, 'maybe', e)}
                      >
                        Maybe
                      </button>
                    </div>
                  )}

                  <a
                    href={SessionAPI.getIcsDownloadUrl(s._id)}
                    className="btn btn-ghost btn-sm"
                    title="Export Calendar (.ics)"
                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                  >
                    📅 .ics
                  </a>

                  <button
                    type="button"
                    className={`btn btn-sm ${isLive ? 'btn-success' : 'btn-primary'}`}
                    onClick={() => navigate(`/sessions/${s._id}`)}
                  >
                    {isLive ? 'Join Live Room →' : 'Enter Room →'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showScheduleModal && (
        <ScheduleSessionModal
          group={group}
          onClose={() => setShowScheduleModal(false)}
          onCreated={(newSession) => {
            setSessions(prev => [newSession, ...prev]);
          }}
        />
      )}
    </div>
  );
};

export default GroupSessionsTab;
