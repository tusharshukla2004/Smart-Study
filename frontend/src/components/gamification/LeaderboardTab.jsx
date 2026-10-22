import React, { useState, useEffect } from 'react';
import { GamificationAPI } from '../../api';

const LeaderboardTab = ({ defaultScope = 'global', groupId = '', showScopeSwitch = true }) => {
  const [scope, setScope] = useState(defaultScope);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ leaderboard: [], userRank: null, totalEntries: 0 });
  const [error, setError] = useState('');

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError('');
    const res = await GamificationAPI.getLeaderboard(scope, groupId, period);
    if (res.success) {
      setData(res);
    } else {
      setError(res.message || 'Failed to load leaderboard.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [scope, period, groupId]);

  const getRankBadge = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="card" style={{ padding: '20px' }}>
      {/* Controls & Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
            🏆 Leaderboard
          </h3>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {period === 'week' ? 'XP gained this week (resets Mondays)' : 'All-time XP rankings'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {showScopeSwitch && groupId && (
            <div style={{ display: 'flex', background: 'var(--bg2)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => setScope('group')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  background: scope === 'group' ? 'var(--primary)' : 'transparent',
                  color: scope === 'group' ? '#FFF' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                This Group
              </button>
              <button
                type="button"
                onClick={() => setScope('global')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  background: scope === 'global' ? 'var(--primary)' : 'transparent',
                  color: scope === 'global' ? '#FFF' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                Global
              </button>
            </div>
          )}

          {/* Period switch */}
          <div style={{ display: 'flex', background: 'var(--bg2)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setPeriod('week')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 600,
                background: period === 'week' ? 'var(--primary)' : 'transparent',
                color: period === 'week' ? '#FFF' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setPeriod('all')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 600,
                background: period === 'all' ? 'var(--primary)' : 'transparent',
                color: period === 'all' ? '#FFF' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      {/* Pinned Card: User's Own Rank */}
      {data.userRank && (
        <div
          style={{
            background: 'var(--card2)',
            border: '2px solid var(--primary)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
              {data.userRank.rank ? `#${data.userRank.rank}` : 'Unranked'}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                Your Standing
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {data.userRank.optedIn ? 'Visible on leaderboards' : 'Opted out (only visible to you)'}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
              {data.userRank.xp} XP
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              {period === 'week' ? 'this week' : 'total'}
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '12px' }}>{error}</div>}

      {/* Leaderboard Entries List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
          Loading leaderboard rankings...
        </div>
      ) : data.leaderboard.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
          No study activity recorded for this period yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {data.leaderboard.map((entry) => {
            const isTop3 = entry.rank <= 3;
            return (
              <div
                key={entry.user._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: isTop3 ? 'rgba(108, 99, 255, 0.05)' : 'var(--bg2)',
                  border: isTop3 ? '1px solid rgba(108, 99, 255, 0.2)' : '1px solid transparent',
                  transition: 'var(--transition)'
                }}
              >
                {/* Rank number / medal */}
                <div style={{ width: '32px', textAlign: 'center', fontSize: isTop3 ? '1.25rem' : '0.85rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                  {getRankBadge(entry.rank)}
                </div>

                {/* Avatar */}
                <div className="avatar avatar-sm" style={{ width: '34px', height: '34px', fontSize: '0.8rem' }}>
                  {entry.user.avatar || 'SP'}
                </div>

                {/* Name & Details */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>
                    {entry.user.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                    <span>Lv.{entry.user.level || 1}</span>
                    {entry.user.streak > 0 && <span>🔥 {entry.user.streak}d streak</span>}
                  </div>
                </div>

                {/* XP */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary)' }}>
                    {entry.xp} XP
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LeaderboardTab;
