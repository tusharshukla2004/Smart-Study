import React from 'react';

const TaskStatsCard = ({ data = {} }) => {
  const {
    totalTasks = 0,
    overdueCount = 0,
    completionRate = 0,
    byStatus = [],
    byPriority = []
  } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Overview Numbers */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
            {completionRate}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Overall Completion Rate
          </div>
        </div>

        {overdueCount > 0 ? (
          <div
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--danger)',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ⚠️ {overdueCount} Overdue Task{overdueCount > 1 ? 's' : ''}
          </div>
        ) : (
          <div style={{ fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600 }}>
            ✅ All tasks on schedule
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '8px', background: 'var(--bg3)', borderRadius: '4px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${completionRate}%`,
            height: '100%',
            background: 'var(--gradient)',
            borderRadius: '4px',
            transition: 'width 0.6s ease'
          }}
        />
      </div>

      {/* Breakdown by Status */}
      <div>
        <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: '8px' }}>
          By Status
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {byStatus.map((s) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: s.color }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown by Priority */}
      <div>
        <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: '8px' }}>
          By Priority
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {byPriority.map((p) => (
            <div
              key={p.label}
              style={{
                flex: 1,
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: p.color }}>
                {p.value}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {p.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskStatsCard;
