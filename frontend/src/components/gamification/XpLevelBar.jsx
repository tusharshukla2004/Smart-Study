import React from 'react';

const XpLevelBar = ({ xp = 0, level = 1, levelProgress = null, compact = false }) => {
  const progress = levelProgress || {
    currentLevel: level,
    xpIntoLevel: 0,
    xpForNextLevel: 50,
    percent: 0
  };

  if (compact) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: '999px',
          padding: '3px 10px',
          fontSize: '0.78rem',
          fontWeight: 600,
          color: 'var(--text)'
        }}
        title={`${xp} total XP · ${progress.xpForNextLevel} XP needed for Level ${progress.currentLevel + 1}`}
      >
        <span
          style={{
            background: 'var(--gradient)',
            color: '#FFF',
            padding: '1px 6px',
            borderRadius: '999px',
            fontSize: '0.7rem',
            fontWeight: 800
          }}
        >
          Lv.{progress.currentLevel}
        </span>
        <div style={{ width: '50px', height: '6px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${progress.percent}%`,
              height: '100%',
              background: 'var(--gradient)',
              borderRadius: '3px'
            }}
          />
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
          {progress.percent}%
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--card2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '16px',
        boxShadow: 'var(--shadow)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              background: 'var(--gradient)',
              color: '#FFF',
              padding: '2px 10px',
              borderRadius: '999px',
              fontSize: '0.85rem',
              fontWeight: 800
            }}
          >
            Level {progress.currentLevel}
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
            Scholar Status
          </span>
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          {xp} XP Total
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '10px', background: 'var(--bg3)', borderRadius: '5px', overflow: 'hidden', marginBottom: '8px' }}>
        <div
          style={{
            width: `${progress.percent}%`,
            height: '100%',
            background: 'var(--gradient)',
            borderRadius: '5px',
            transition: 'width 0.8s ease'
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
        <span>{progress.xpIntoLevel} XP earned in this level</span>
        <span>{progress.xpForNextLevel} XP to Level {progress.currentLevel + 1} ({progress.percent}%)</span>
      </div>
    </div>
  );
};

export default XpLevelBar;
