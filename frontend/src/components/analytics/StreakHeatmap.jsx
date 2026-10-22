import React, { useState } from 'react';

const LEVEL_COLORS_DARK = [
  'var(--bg3)',               // Level 0 (inactive)
  'rgba(16, 185, 129, 0.35)', // Level 1
  'rgba(16, 185, 129, 0.60)', // Level 2
  'rgba(16, 185, 129, 0.85)', // Level 3
  '#10B981'                   // Level 4 (peak)
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const StreakHeatmap = ({ data = {}, year = new Date().getFullYear(), onYearChange = () => {} }) => {
  const [hoveredDay, setHoveredDay] = useState(null);
  const { days = [], totalMinutes = 0, activeDays = 0 } = data;

  // Group days into 53 weeks (columns) x 7 days (rows)
  const weeks = [];
  let currentWeek = [];

  // Align start of year to day of week (0=Sun, 6=Sat)
  if (days.length > 0) {
    const firstDate = new Date(days[0].date);
    const leadingEmptyDays = firstDate.getUTCDay();

    for (let i = 0; i < leadingEmptyDays; i++) {
      currentWeek.push(null);
    }

    for (const day of days) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }
  }

  // Month label positions (find which week index each month starts in)
  const monthHeaders = [];
  let lastSeenMonth = -1;
  weeks.forEach((week, wIdx) => {
    const validDay = week.find(d => d !== null);
    if (validDay) {
      const m = new Date(validDay.date).getUTCMonth();
      if (m !== lastSeenMonth) {
        monthHeaders.push({ month: MONTH_NAMES[m], colIndex: wIdx });
        lastSeenMonth = m;
      }
    }
  });

  const hoursStudied = (totalMinutes / 60).toFixed(1);

  return (
    <div className="card" style={{ padding: '20px', overflowX: 'auto' }}>
      {/* Header & Year Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            🔥 Activity Heatmap
          </h3>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {activeDays} active study days · {totalMinutes} minutes ({hoursStudied} hrs) in {year}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onYearChange(year - 1)}
            title="Previous year"
          >
            ← {year - 1}
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>{year}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onYearChange(year + 1)}
            disabled={year >= new Date().getFullYear()}
            title="Next year"
          >
            {year + 1} →
          </button>
        </div>
      </div>

      {/* Heatmap Grid Container */}
      <div style={{ minWidth: '760px', position: 'relative' }}>
        {/* Month labels row */}
        <div style={{ display: 'flex', marginLeft: '32px', marginBottom: '6px', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          {monthHeaders.map((mh, idx) => (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: `calc(32px + ${mh.colIndex * 14}px)`
              }}
            >
              {mh.month}
            </div>
          ))}
        </div>

        {/* Grid: 7 rows x 53 columns */}
        <div style={{ display: 'flex', gap: '3px', marginTop: '22px' }}>
          {/* Day of week labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginRight: '6px', fontSize: '0.65rem', color: 'var(--text-dim)', textAlign: 'right' }}>
            {DAY_LABELS.map((day, dIdx) => (
              <div key={day} style={{ height: '11px', lineHeight: '11px' }}>
                {dIdx % 2 === 1 ? day : ''}
              </div>
            ))}
          </div>

          {/* Week columns */}
          {weeks.map((week, wIdx) => (
            <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {week.map((day, dIdx) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${dIdx}`}
                      style={{
                        width: '11px',
                        height: '11px',
                        borderRadius: '2px',
                        background: 'transparent'
                      }}
                    />
                  );
                }

                const color = LEVEL_COLORS_DARK[day.level] || LEVEL_COLORS_DARK[0];

                return (
                  <div
                    key={day.date}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredDay({
                        date: day.date,
                        minutes: day.minutes,
                        level: day.level,
                        x: rect.left + rect.width / 2,
                        y: rect.top
                      });
                    }}
                    onMouseLeave={() => setHoveredDay(null)}
                    style={{
                      width: '11px',
                      height: '11px',
                      borderRadius: '2px',
                      background: color,
                      cursor: 'pointer',
                      border: day.level > 0 ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
                      transition: 'transform 0.15s ease'
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginTop: '14px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span>Less</span>
          {LEVEL_COLORS_DARK.map((c, i) => (
            <span
              key={i}
              style={{
                width: '11px',
                height: '11px',
                borderRadius: '2px',
                background: c,
                display: 'inline-block'
              }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Floating Tooltip */}
      {hoveredDay && (
        <div
          style={{
            position: 'fixed',
            left: `${hoveredDay.x}px`,
            top: `${hoveredDay.y - 45}px`,
            transform: 'translateX(-50%)',
            background: 'var(--card2)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '5px 9px',
            fontSize: '0.75rem',
            color: 'var(--text)',
            pointerEvents: 'none',
            zIndex: 9999,
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow)'
          }}
        >
          <strong>{hoveredDay.minutes} min{hoveredDay.minutes !== 1 ? 's' : ''}</strong> on {hoveredDay.date}
        </div>
      )}
    </div>
  );
};

export default StreakHeatmap;
