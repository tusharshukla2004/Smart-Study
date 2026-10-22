import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const PALETTE = [
  '#6C63FF', // Primary purple
  '#06B6D4', // Accent cyan
  '#10B981', // Success green
  '#F59E0B', // Warning amber
  '#A78BFA', // Secondary violet
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#F97316', // Orange
  '#64748B'  // Muted slate (Other)
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
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
        <div style={{ fontWeight: 600, marginBottom: '2px' }}>{data.subject}</div>
        <div style={{ color: 'var(--primary)', fontWeight: 700 }}>
          {data.minutes} mins ({data.percentage}%)
        </div>
      </div>
    );
  }
  return null;
};

const SubjectDonutChart = ({ subjects = [] }) => {
  if (!subjects || subjects.length === 0) {
    return (
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No subject distribution data available.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
      <div style={{ width: 180, height: 220, margin: '0 auto' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={subjects}
              dataKey="minutes"
              nameKey="subject"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
            >
              {subjects.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} stroke="var(--card)" strokeWidth={2} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {subjects.map((s, idx) => (
          <div
            key={s.subject}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              padding: '2px 0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '3px',
                  background: PALETTE[idx % PALETTE.length],
                  display: 'inline-block',
                  flexShrink: 0
                }}
              />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>
                {s.subject}
              </span>
            </div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, marginLeft: '8px' }}>
              {s.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubjectDonutChart;
