// ============================================
// Session Room Page - Synced Pomodoro & Live Presence
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import SessionLogModal from '../components/SessionLogModal';
import PeerRatingModal from '../components/ratings/PeerRatingModal';
import { SessionAPI, Session } from '../api';
import { useSocket } from '../hooks/useSocket';
import { showToast } from '../utils';

// Web Audio API soft chime for phase transitions
const playChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (err) {
    // Audio might be blocked by browser autoplay policy until interaction
  }
};

const formatSeconds = (totalSec) => {
  const safe = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const SessionRoom = () => {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timerState, setTimerState] = useState(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [remainingSec, setRemainingSec] = useState(0);
  const [participants, setParticipants] = useState([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [rsvpStatus, setRsvpStatus] = useState(null);

  const currentUser = Session.getUser();
  const currentUserId = currentUser?._id || currentUser?.id;
  const isHost = session && String(session.host?._id || session.host) === String(currentUserId);

  // Fetch initial session REST state
  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      setLoading(true);
      const res = await SessionAPI.getById(sessionId);
      if (!active) return;
      if (res.success) {
        setSession(res.session);
        setRsvpStatus(res.userRsvp);
        setParticipants(res.session.participants || []);
        if (res.session.timer) {
          setTimerState(res.session.timer);
        }
        if (res.serverTime) {
          const clientNow = Date.now();
          const serverNow = new Date(res.serverTime).getTime();
          setServerOffsetMs(serverNow - clientNow);
        }
      } else {
        setError(res.message || 'Could not load session.');
      }
      setLoading(false);
    };

    loadSession();
    return () => { active = false; };
  }, [sessionId]);

  // Join Socket Room and listen for events
  useEffect(() => {
    if (!socket || !sessionId) return;

    // Join room
    socket.emit('session:join', { sessionId }, (res) => {
      if (!res?.success) {
        setError(res?.message || 'Access to session denied.');
      } else if (res.state) {
        setTimerState(res.state.timer);
        setParticipants(res.state.participants || []);
      }
    });

    const handleState = (state) => {
      if (state.sessionId && state.sessionId !== sessionId) return;
      setTimerState(state.timer);
      setParticipants(state.participants || []);
      if (state.status) {
        setSession(prev => prev ? { ...prev, status: state.status } : prev);
      }
      if (state.serverTime) {
        const clientNow = Date.now();
        const serverNow = new Date(state.serverTime).getTime();
        setServerOffsetMs(serverNow - clientNow);
      }
    };

    const handlePhaseChanged = (data) => {
      if (soundEnabled) playChime();
      showToast(`Phase changed: ${data.phase.toUpperCase()} (Cycle ${data.cycle})`, 'info');
    };

    const handleSessionEnded = (data) => {
      if (soundEnabled) playChime();
      showToast('Study session completed! Great job! 🎉', 'success');
      setSession(prev => prev ? { ...prev, status: 'completed' } : prev);
      setShowLogModal(true);
    };

    const handleParticipantJoined = (data) => {
      showToast(`${data.user?.name || 'Someone'} joined the study room`, 'info');
      setParticipants(prev => {
        if (prev.some(p => String(p.user?._id || p.user) === String(data.user?._id))) return prev;
        return [...prev, { user: data.user, joinedAt: new Date() }];
      });
    };

    const handleParticipantLeft = (data) => {
      setParticipants(prev => prev.filter(p => String(p.user?._id || p.user) !== String(data.user?._id)));
    };

    const handleError = (data) => {
      if (data?.message) showToast(data.message, 'error');
    };

    socket.on('session:state', handleState);
    socket.on('session:phaseChanged', handlePhaseChanged);
    socket.on('session:ended', handleSessionEnded);
    socket.on('session:participantJoined', handleParticipantJoined);
    socket.on('session:participantLeft', handleParticipantLeft);
    socket.on('session:error', handleError);

    return () => {
      socket.emit('session:leave', { sessionId });
      socket.off('session:state', handleState);
      socket.off('session:phaseChanged', handlePhaseChanged);
      socket.off('session:ended', handleSessionEnded);
      socket.off('session:participantJoined', handleParticipantJoined);
      socket.off('session:participantLeft', handleParticipantLeft);
      socket.off('session:error', handleError);
    };
  }, [socket, sessionId, soundEnabled]);

  // Client-side 1-second interval to compute remaining time from server authoritative timestamp
  useEffect(() => {
    if (!timerState || timerState.phase === 'idle' || session?.status !== 'live') {
      if (session?.status === 'scheduled') {
        const defaultFocusSec = (session.focusMinutes || 25) * 60;
        setRemainingSec(defaultFocusSec);
      } else {
        setRemainingSec(0);
      }
      return;
    }

    const updateRemaining = () => {
      if (timerState.paused) {
        setRemainingSec(timerState.remainingSecWhenPaused || 0);
        return;
      }

      const clientNow = Date.now();
      const serverNow = clientNow + serverOffsetMs;
      const startedAtMs = new Date(timerState.phaseStartedAt).getTime();
      const elapsedSec = Math.floor((serverNow - startedAtMs) / 1000);
      const remaining = Math.max(0, timerState.phaseDurationSec - elapsedSec);
      setRemainingSec(remaining);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [timerState, serverOffsetMs, session?.status, session?.focusMinutes]);

  // Sync tab title with remaining countdown
  useEffect(() => {
    const originalTitle = document.title;
    if (session?.status === 'live' && timerState && timerState.phase !== 'idle') {
      const phaseLabel = timerState.phase === 'focus' ? 'Focus' : 'Break';
      document.title = `${formatSeconds(remainingSec)} ${phaseLabel} | Smart Study`;
    } else {
      document.title = 'Smart Study Session';
    }
    return () => {
      document.title = originalTitle;
    };
  }, [remainingSec, session?.status, timerState]);

  // Socket controls
  const handleStart = () => {
    socket?.emit('session:start', { sessionId });
  };

  const handlePause = () => {
    socket?.emit('session:pause', { sessionId });
  };

  const handleResume = () => {
    socket?.emit('session:resume', { sessionId });
  };

  const handleSkip = () => {
    socket?.emit('session:skipPhase', { sessionId });
  };

  const handleEnd = () => {
    if (window.confirm('Are you sure you want to end this study session for everyone?')) {
      socket?.emit('session:end', { sessionId });
    }
  };

  // Timer ring percentage calculation
  const totalPhaseSec = timerState?.phaseDurationSec || (session?.focusMinutes || 25) * 60;
  const progressRatio = totalPhaseSec > 0 ? remainingSec / totalPhaseSec : 0;
  const strokeDashoffset = 565 - 565 * Math.min(1, Math.max(0, progressRatio));

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="app-layout">
          <Sidebar />
          <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>⏳ Loading session room...</p>
          </main>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="page-wrapper">
        <div className="app-layout">
          <Sidebar />
          <main className="main-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
            <h2 style={{ marginBottom: '8px' }}>Access Restricted</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || 'Session not found.'}</p>
            <Link to="/groups" className="btn btn-primary">Return to Groups</Link>
          </main>
        </div>
      </div>
    );
  }

  const currentPhase = timerState?.phase || 'idle';
  const currentCycle = timerState?.cycle || 1;
  const isPaused = !!timerState?.paused;

  return (
    <div className="page-wrapper">
      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          {/* Reconnecting Banner */}
          {!connected && (
            <div style={{
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid var(--warning)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 16px',
              color: 'var(--warning)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.875rem'
            }}>
              <span>⚠️</span> Reconnecting to live study server... Your session state will resume automatically.
            </div>
          )}

          {/* Session Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Link to="/groups" style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>← Groups</Link>
                <span style={{ color: 'var(--text-dim)' }}>/</span>
                <span style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>{session.group?.name}</span>
                <span className={`badge ${session.status === 'live' ? 'badge-success' : session.status === 'completed' ? 'badge-primary' : 'badge-warning'}`}>
                  {session.status.toUpperCase()}
                </span>
              </div>
              <h1 className="section-title" style={{ fontSize: '1.8rem', margin: 0 }}>
                {session.title}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
                Subject: <strong>{session.subject || 'General'}</strong> · Host: {session.host?.name}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'Mute phase sound' : 'Enable phase sound'}
              >
                {soundEnabled ? '🔔 Sound On' : '🔕 Sound Muted'}
              </button>
              <a
                href={SessionAPI.getIcsDownloadUrl(session._id)}
                className="btn btn-ghost btn-sm"
                title="Download .ics Calendar Invite"
              >
                📅 Calendar
              </a>
              {session.status === 'completed' && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowLogModal(true)}
                >
                  📝 Complete Study Reflection
                </button>
              )}
            </div>
          </div>

          <div className="session-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 300px', gap: '24px' }}>
            {/* Center Pomodoro Ring Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', textAlign: 'center' }}>
              {/* Phase and Cycle Badges */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
                <span
                  className="badge"
                  style={{
                    background: currentPhase === 'focus' ? 'var(--primary)' : currentPhase === 'break' ? 'var(--accent)' : 'var(--bg3)',
                    color: '#fff',
                    padding: '6px 14px',
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  {currentPhase === 'idle' ? 'Ready to Start' : currentPhase === 'focus' ? '🎯 Focus Sprint' : '☕ Rest Break'}
                </span>
                <span className="badge badge-primary" style={{ padding: '6px 14px', fontSize: '0.9rem' }}>
                  Cycle {currentCycle} of {session.totalCycles}
                </span>
              </div>

              {/* Circular SVG Timer Ring */}
              <div style={{ position: 'relative', width: '220px', height: '220px', marginBottom: '2rem' }}>
                <svg width="220" height="220" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
                  {/* Background Track */}
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="var(--bg3)"
                    strokeWidth="10"
                  />
                  {/* Active Progress */}
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke={currentPhase === 'break' ? 'var(--accent)' : 'var(--primary)'}
                    strokeWidth="10"
                    strokeDasharray="565"
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>

                {/* Inner Text Center */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '3rem',
                    fontWeight: 800,
                    color: 'var(--text)',
                    lineHeight: 1
                  }}>
                    {formatSeconds(remainingSec)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: isPaused ? 'var(--warning)' : 'var(--text-muted)', marginTop: '6px' }}>
                    {isPaused ? '⏸️ PAUSED' : currentPhase === 'focus' ? 'Keep Going!' : currentPhase === 'break' ? 'Relax & Recharge' : 'Standby'}
                  </div>
                </div>
              </div>

              {/* Timer Controls */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {session.status === 'scheduled' && (
                  isHost ? (
                    <button type="button" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '1rem' }} onClick={handleStart}>
                      🚀 Start Session Now
                    </button>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      ⏳ Waiting for host <strong>{session.host?.name}</strong> to start the session.
                    </div>
                  )
                )}

                {session.status === 'live' && (
                  <>
                    {isPaused ? (
                      <button type="button" className="btn btn-primary" onClick={handleResume}>
                        ▶️ Resume
                      </button>
                    ) : (
                      <button type="button" className="btn btn-secondary" onClick={handlePause}>
                        ⏸️ Pause
                      </button>
                    )}

                    <button type="button" className="btn btn-ghost" onClick={handleSkip} title="Skip to next phase">
                      ⏭️ Skip Phase
                    </button>

                    {isHost && (
                      <button type="button" className="btn btn-danger" onClick={handleEnd}>
                        ⏹️ End Session
                      </button>
                    )}
                  </>
                )}

                {session.status === 'completed' && (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: '8px' }}>
                      ✓ This session has concluded.
                    </p>
                    <button type="button" className="btn btn-primary" onClick={() => setShowLogModal(true)}>
                      📝 Fill Reflection &amp; Log Minutes
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar: Live Participants & Session Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Active Participants Presence */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                    👥 Live In Room ({participants.length})
                  </h3>
                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Sync Active</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {participants.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No other participants yet.</p>
                  ) : (
                    participants.map((p, idx) => {
                      const userObj = p.user || {};
                      const isMe = String(userObj._id || userObj) === String(currentUserId);
                      return (
                        <div
                          key={userObj._id || idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '6px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: isMe ? 'rgba(6,182,212,0.12)' : 'transparent'
                          }}
                        >
                          <div className="avatar avatar-sm">
                            {userObj.avatar || (userObj.name ? userObj.name.slice(0, 2).toUpperCase() : 'AJ')}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                              {userObj.name || 'Student'} {isMe && '(You)'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                              Joined {new Date(p.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }}></span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Session Blueprint Card */}
              <div className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>
                  📋 Session Plan
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Focus Intervals</span>
                    <span style={{ fontWeight: 600 }}>{session.focusMinutes} minutes</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Break Intervals</span>
                    <span style={{ fontWeight: 600 }}>{session.breakMinutes} minutes</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Total Cycles</span>
                    <span style={{ fontWeight: 600 }}>{session.totalCycles} cycles</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Estimated Total</span>
                    <span style={{ fontWeight: 600 }}>
                      {session.totalCycles * (session.focusMinutes + session.breakMinutes)} minutes
                    </span>
                  </div>
                </div>

                {session.description && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {session.description}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Session Log Reflection Modal */}
      {showLogModal && (
        <SessionLogModal
          session={session}
          defaultMinutes={session.focusMinutes * (timerState?.cycle || 1)}
          onClose={() => setShowLogModal(false)}
          onLogged={(data) => {
            setShowLogModal(false);
            setShowRatingModal(true);
          }}
        />
      )}

      {/* Peer Rating Modal (Step 2 after SessionLog) */}
      <PeerRatingModal
        sessionId={session?._id}
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmitted={() => {
          setShowRatingModal(false);
        }}
      />
    </div>
  );
};

export default SessionRoom;
