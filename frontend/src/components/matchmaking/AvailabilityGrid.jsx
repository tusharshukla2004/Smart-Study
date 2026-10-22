import React from 'react';

const DAYS = [
  { dayIndex: 0, label: 'Sun', full: 'Sunday' },
  { dayIndex: 1, label: 'Mon', full: 'Monday' },
  { dayIndex: 2, label: 'Tue', full: 'Tuesday' },
  { dayIndex: 3, label: 'Wed', full: 'Wednesday' },
  { dayIndex: 4, label: 'Thu', full: 'Thursday' },
  { dayIndex: 5, label: 'Fri', full: 'Friday' },
  { dayIndex: 6, label: 'Sat', full: 'Saturday' }
];

const TIME_BLOCKS = [
  { id: 'morning', label: 'Morning', hours: '6am – 12pm', startMinute: 360, endMinute: 720, legacyLabel: 'Morning (6am – 12pm)' },
  { id: 'afternoon', label: 'Afternoon', hours: '12pm – 6pm', startMinute: 720, endMinute: 1080, legacyLabel: 'Afternoon (12pm – 6pm)' },
  { id: 'evening', label: 'Evening', hours: '6pm – 10pm', startMinute: 1080, endMinute: 1320, legacyLabel: 'Evening (6pm – 10pm)' },
  { id: 'night', label: 'Night', hours: '10pm – 12am', startMinute: 1320, endMinute: 1439, legacyLabel: 'Night (10pm+)' }
];

const COMMON_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)' },
  { value: 'UTC', label: 'UTC (Universal Coordinated Time)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+9)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' }
];

/**
 * Weekly availability grid allowing users to toggle study time blocks
 * while keeping legacy availability and timezone in sync.
 */
const AvailabilityGrid = ({
  availabilitySlots = [],
  availability = [],
  timezone = 'Asia/Kolkata',
  onSlotsChange,
  onAvailabilityChange,
  onTimezoneChange
}) => {
  const isSlotActive = (dayIndex, block) => {
    return availabilitySlots.some(
      s => s.day === dayIndex && s.startMinute === block.startMinute && s.endMinute === block.endMinute
    );
  };

  const toggleSlot = (dayIndex, block) => {
    let nextSlots;
    if (isSlotActive(dayIndex, block)) {
      nextSlots = availabilitySlots.filter(
        s => !(s.day === dayIndex && s.startMinute === block.startMinute && s.endMinute === block.endMinute)
      );
    } else {
      nextSlots = [
        ...availabilitySlots,
        { day: dayIndex, startMinute: block.startMinute, endMinute: block.endMinute }
      ];
    }

    if (onSlotsChange) onSlotsChange(nextSlots);

    // Sync legacy coarse labels
    if (onAvailabilityChange) {
      const activeBlocks = new Set();
      for (const slot of nextSlots) {
        const found = TIME_BLOCKS.find(b => b.startMinute === slot.startMinute && b.endMinute === slot.endMinute);
        if (found) activeBlocks.add(found.legacyLabel);
      }
      onAvailabilityChange(Array.from(activeBlocks));
    }
  };

  const toggleAllInBlock = (block) => {
    const allActive = DAYS.every(d => isSlotActive(d.dayIndex, block));
    let nextSlots;
    if (allActive) {
      // Remove this block from all days
      nextSlots = availabilitySlots.filter(
        s => !(s.startMinute === block.startMinute && s.endMinute === block.endMinute)
      );
    } else {
      // Add this block to all days
      const filtered = availabilitySlots.filter(
        s => !(s.startMinute === block.startMinute && s.endMinute === block.endMinute)
      );
      const added = DAYS.map(d => ({
        day: d.dayIndex,
        startMinute: block.startMinute,
        endMinute: block.endMinute
      }));
      nextSlots = [...filtered, ...added];
    }

    if (onSlotsChange) onSlotsChange(nextSlots);
    if (onAvailabilityChange) {
      const activeBlocks = new Set();
      for (const slot of nextSlots) {
        const found = TIME_BLOCKS.find(b => b.startMinute === slot.startMinute && b.endMinute === slot.endMinute);
        if (found) activeBlocks.add(found.legacyLabel);
      }
      onAvailabilityChange(Array.from(activeBlocks));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Timezone selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Your Primary Timezone:
        </label>
        <select
          value={timezone || 'Asia/Kolkata'}
          onChange={(e) => onTimezoneChange && onTimezoneChange(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'var(--card2)',
            color: 'var(--text)',
            fontSize: '0.85rem'
          }}
        >
          {COMMON_TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* Grid container */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--card2)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '10px 8px', textAlign: 'left', minWidth: '110px', color: 'var(--text-muted)' }}>
                Time Block
              </th>
              {DAYS.map(d => (
                <th key={d.dayIndex} style={{ padding: '10px 6px', color: 'var(--text)' }}>
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_BLOCKS.map(block => (
              <tr key={block.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 10px', textAlign: 'left' }}>
                  <button
                    type="button"
                    onClick={() => toggleAllInBlock(block)}
                    title="Click to toggle entire row"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div>{block.label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>{block.hours}</div>
                  </button>
                </td>
                {DAYS.map(d => {
                  const active = isSlotActive(d.dayIndex, block);
                  return (
                    <td key={d.dayIndex} style={{ padding: '6px' }}>
                      <button
                        type="button"
                        onClick={() => toggleSlot(d.dayIndex, block)}
                        style={{
                          width: '100%',
                          minHeight: '36px',
                          borderRadius: '6px',
                          border: active ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.06)',
                          background: active ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                          color: active ? '#fff' : 'var(--text-muted)',
                          fontWeight: active ? 600 : 400,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {active ? '✓' : ''}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        💡 Click any cell to toggle your available study time. Click a time block label to select the whole week.
      </div>
    </div>
  );
};

export default AvailabilityGrid;
