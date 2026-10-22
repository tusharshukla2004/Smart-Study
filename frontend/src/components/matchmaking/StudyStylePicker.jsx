import React from 'react';

const STYLES = [
  {
    id: 'silent_focus',
    label: 'Silent Focus',
    icon: '🤫',
    subtitle: 'Quiet Co-working',
    desc: 'Muted microphones, shared Pomodoro timers, and distraction-free deep work.'
  },
  {
    id: 'discussion_heavy',
    label: 'Discussion Heavy',
    icon: '🗣️',
    subtitle: 'Active Collaboration',
    desc: 'Lively debates, talking through complex logic, and interactive brainstorming.'
  },
  {
    id: 'mixed',
    label: 'Mixed / Flexible',
    icon: '⚖️',
    subtitle: 'Best of Both Worlds',
    desc: 'Quiet focus sprints followed by open discussion and Q&A breaks.'
  }
];

const StudyStylePicker = ({ selectedStyle = 'mixed', onChange }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
      {STYLES.map(s => {
        const isSelected = selectedStyle === s.id;
        return (
          <div
            key={s.id}
            onClick={() => onChange(s.id)}
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-sm)',
              border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
              background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'var(--card2)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
              {isSelected && (
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>✓ ACTIVE</span>
              )}
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>
              {s.label}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 500 }}>
              {s.subtitle}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
              {s.desc}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StudyStylePicker;
