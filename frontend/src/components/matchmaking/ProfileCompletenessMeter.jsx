import React from 'react';

const ProfileCompletenessMeter = ({ completeness = 0, tips = [] }) => {
  const percentage = Math.min(100, Math.max(0, completeness));

  const getColor = () => {
    if (percentage >= 80) return 'var(--success)';
    if (percentage >= 50) return 'var(--accent)';
    return 'var(--warning)';
  };

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: 'var(--radius)',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
            Profile Match Strength
          </span>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Higher completeness unlocks more accurate study partner matching
          </div>
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: getColor() }}>
          {percentage}%
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '8px',
          borderRadius: '4px',
          background: 'var(--bg3)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: getColor(),
            transition: 'width 0.4s ease'
          }}
        />
      </div>

      {/* Actionable Tips */}
      {tips && tips.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--secondary)' }}>
            RECOMMENDED TO BOOST MATCHES:
          </div>
          {tips.map((tip, idx) => (
            <div
              key={idx}
              style={{
                fontSize: '0.8rem',
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ color: 'var(--accent)' }}>✦</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileCompletenessMeter;
