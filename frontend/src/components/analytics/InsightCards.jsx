import React from 'react';

const InsightCards = ({ insights = [] }) => {
  if (!insights || insights.length === 0) return null;

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: '10px' }}>
        ⚡ Study Insights &amp; Milestones
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {insights.map((item) => (
          <div
            key={item.id}
            style={{
              background: 'var(--card2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '14px 16px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              boxShadow: 'var(--shadow)'
            }}
          >
            <div
              style={{
                fontSize: '1.4rem',
                lineHeight: 1,
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg2)',
                flexShrink: 0
              }}
            >
              {item.icon}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: '3px' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {item.text}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightCards;
