import React from 'react';

const BadgesGrid = ({ badges = [], summary = { total: 13, unlocked: 0 } }) => {
  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            🏆 Badges &amp; Achievements
          </h3>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {summary.unlocked} of {summary.total || badges.length} badges unlocked
          </div>
        </div>

        <div
          style={{
            background: 'rgba(108, 99, 255, 0.12)',
            color: 'var(--primary)',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '0.78rem',
            fontWeight: 700
          }}
        >
          {Math.round(((summary.unlocked || 0) / (summary.total || badges.length || 1)) * 100)}% Complete
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
          gap: '12px'
        }}
      >
        {badges.map((b) => {
          const isUnlocked = b.unlocked;

          return (
            <div
              key={b.key}
              style={{
                background: isUnlocked ? 'var(--card2)' : 'var(--bg2)',
                border: isUnlocked ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                opacity: isUnlocked ? 1 : 0.65,
                transition: 'var(--transition)',
                boxShadow: isUnlocked ? '0 4px 16px rgba(245, 158, 11, 0.08)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    fontSize: '1.8rem',
                    filter: isUnlocked ? 'none' : 'grayscale(100%)',
                    lineHeight: 1
                  }}
                >
                  {b.icon}
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isUnlocked ? 'var(--text)' : 'var(--text-muted)' }}>
                    {b.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: isUnlocked ? 'var(--warning)' : 'var(--text-dim)', fontWeight: 600 }}>
                    {isUnlocked
                      ? `Unlocked ${b.earnedAt ? new Date(b.earnedAt).toLocaleDateString() : '✓'}`
                      : 'Locked'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {b.description}
              </div>

              {/* Progress Bar for Locked Badges */}
              {!isUnlocked && b.progress && (
                <div style={{ marginTop: 'auto', paddingTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '3px' }}>
                    <span>Progress</span>
                    <span>{b.progress.hint}</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'var(--bg3)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${b.progress.percent}%`,
                        height: '100%',
                        background: 'var(--primary)',
                        borderRadius: '2px'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BadgesGrid;
