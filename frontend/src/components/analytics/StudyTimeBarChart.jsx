import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const minutes = payload[0].value;
    const hours = (minutes / 60).toFixed(1);
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
        <div style={{ color: 'var(--primary)', fontWeight: 700 }}>
          ⏱️ {minutes} mins {minutes >= 60 ? `(${hours} hrs)` : ''}
        </div>
      </div>
    );
  }
  return null;
};

const StudyTimeBarChart = ({ data = [], groupBy = 'day' }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No study time data for this range.
      </div>
    );
  }

  // Format labels for XAxis
  const chartData = data.map(item => ({
    ...item,
    displayLabel: item.label ? item.label.split(',')[0] : (item.date || item.week)
  }));

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
          <XAxis
            dataKey="displayLabel"
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            unit="m"
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(108, 99, 255, 0.08)' }} />
          <Bar
            dataKey="minutes"
            fill="var(--primary)"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StudyTimeBarChart;
