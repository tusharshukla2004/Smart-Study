import React from 'react';

const StatCard = ({
  label,
  value,
  icon = '📊',
  delta = null,
  unit = '',
  color = 'purple',
  subtitle = ''
}) => {
  const hasDelta = typeof delta === 'number' && !isNaN(delta);
  const isPositive = hasDelta && delta > 0;
  const isNegative = hasDelta && delta < 0;

  return (
    <div className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div className="stat-info" style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
          <div className="stat-value">
            {value}
            {unit && <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '4px' }}>{unit}</span>}
          </div>

          {hasDelta && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                background: isPositive
                  ? 'rgba(16, 185, 129, 0.15)'
                  : isNegative
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(139, 139, 173, 0.15)',
                color: isPositive
                  ? 'var(--success)'
                  : isNegative
                  ? 'var(--danger)'
                  : 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}
              title={`${isPositive ? '+' : ''}${delta}% compared to the previous period`}
            >
              {isPositive ? '▲ +' : isNegative ? '▼ ' : ''}
              {delta}%
            </span>
          )}
        </div>
        <div className="stat-label">{label}</div>
        {subtitle && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
