import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const rating = payload[0].value;
    const sessionCount = payload[0].payload.sessionsCount || 1;
    return (
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 12px',
          boxShadow: 'var(--shadow)',
          color: 'var(--text)',
          fontSize: '0.85rem'
        }}
      >
        <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
          {label}
        </div>
        <div style={{ color: '#F59E0B', fontWeight: 700 }}>
          ⭐ Avg Focus: {rating} / 5
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
          {sessionCount} session{sessionCount > 1 ? 's' : ''}
        </div>
      </div>
    );
  }
  return null;
};

const FocusTrendLineChart = ({ data = {} }) => {
  const { hasEnoughData, weeklyTrend = [], bestTimeOfDay = null, timeOfDayBuckets = [] } = data;

  if (!hasEnoughData) {
    return (
      <div
        style={{
          height: 240,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '20px',
          color: 'var(--text-muted)'
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎯</div>
        <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Not Enough Data Yet</div>
        <div style={{ fontSize: '0.85rem' }}>
          Complete at least 5 study sessions with focus ratings to unlock weekly focus patterns and time-of-day analytics.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Weekly Trend Line Chart */}
      <div style={{ width: '100%', height: 200, marginBottom: '16px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
            <XAxis
              dataKey="label"
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="avgFocus"
              stroke="#F59E0B"
              strokeWidth={3}
              dot={{ fill: '#F59E0B', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Time of Day Grid */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: '10px' }}>
          Focus By Time of Day
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
          {timeOfDayBuckets.map((b) => {
            const isBest = bestTimeOfDay && bestTimeOfDay.bucket === b.bucket;
            return (
              <div
                key={b.bucket}
                style={{
                  background: isBest ? 'rgba(108, 99, 255, 0.12)' : 'var(--bg2)',
                  border: `1px solid ${isBest ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  position: 'relative'
                }}
              >
                {isBest && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      background: 'var(--primary)',
                      color: '#FFF',
                      padding: '1px 5px',
                      borderRadius: '4px'
                    }}
                  >
                    BEST
                  </span>
                )}
                <div style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{b.icon}</span>
                  <span style={{ color: 'var(--text)' }}>{b.label.split(' ')[0]}</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F59E0B' }}>
                  {b.avgFocus > 0 ? `⭐ ${b.avgFocus}` : '—'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  {b.sessionCount} session{b.sessionCount !== 1 ? 's' : ''} · {b.totalMinutes}m
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FocusTrendLineChart;
