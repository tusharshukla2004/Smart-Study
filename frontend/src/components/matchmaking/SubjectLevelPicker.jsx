import React, { useState } from 'react';

const COMMON_SUBJECT_SUGGESTIONS = [
  'Data Structures',
  'Algorithms',
  'Machine Learning',
  'Database Management',
  'Operating Systems',
  'Computer Networks',
  'Web Development',
  'Mathematics',
  'Physics',
  'System Design'
];

/**
 * SubjectLevelPicker allows users to select subject, proficiency level,
 * and toggle whether they want to learn or can teach/mentor.
 */
const SubjectLevelPicker = ({ subjectProfiles = [], onChange }) => {
  const [newSubject, setNewSubject] = useState('');
  const [newLevel, setNewLevel] = useState('intermediate');
  const [newWantsLearn, setNewWantsLearn] = useState(true);
  const [newCanTeach, setNewCanTeach] = useState(false);

  const handleAdd = () => {
    const trimmed = newSubject.trim();
    if (!trimmed) return;

    // Check if already added
    if (subjectProfiles.some(p => p.displayName?.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }

    const updated = [
      ...subjectProfiles,
      {
        name: trimmed.toLowerCase(),
        displayName: trimmed,
        level: newLevel,
        wantsToLearn: newWantsLearn,
        canTeach: newCanTeach
      }
    ];

    onChange(updated);
    setNewSubject('');
    setNewLevel('intermediate');
    setNewWantsLearn(true);
    setNewCanTeach(false);
  };

  const handleRemove = (index) => {
    const updated = subjectProfiles.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdate = (index, field, value) => {
    const updated = subjectProfiles.map((p, i) => {
      if (i !== index) return p;
      return { ...p, [field]: value };
    });
    onChange(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="e.g. Data Structures, Machine Learning"
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          style={{
            flex: '1 1 200px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'var(--card2)',
            color: 'var(--text)',
            fontSize: '0.9rem'
          }}
        />

        <select
          value={newLevel}
          onChange={(e) => setNewLevel(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'var(--card2)',
            color: 'var(--text)',
            fontSize: '0.9rem'
          }}
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={newWantsLearn}
            onChange={(e) => setNewWantsLearn(e.target.checked)}
          />
          Learn
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={newCanTeach}
            onChange={(e) => setNewCanTeach(e.target.checked)}
          />
          Teach
        </label>

        <button
          type="button"
          onClick={handleAdd}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          + Add
        </button>
      </div>

      {/* Quick Suggestion Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.8rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>Suggestions:</span>
        {COMMON_SUBJECT_SUGGESTIONS.map(s => {
          const already = subjectProfiles.some(p => p.displayName?.toLowerCase() === s.toLowerCase());
          if (already) return null;
          return (
            <button
              key={s}
              type="button"
              onClick={() => { setNewSubject(s); }}
              style={{
                background: 'transparent',
                border: '1px dashed var(--border)',
                color: 'var(--secondary)',
                borderRadius: '12px',
                padding: '2px 8px',
                cursor: 'pointer',
                fontSize: '0.78rem'
              }}
            >
              + {s}
            </button>
          );
        })}
      </div>

      {/* Selected Subject Profiles List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {subjectProfiles.map((p, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--card2)',
              border: '1px solid var(--border)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                {p.displayName || p.name}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background:
                    p.level === 'advanced'
                      ? 'rgba(16, 185, 129, 0.2)'
                      : p.level === 'intermediate'
                      ? 'rgba(6, 182, 212, 0.2)'
                      : 'rgba(245, 158, 11, 0.2)',
                  color:
                    p.level === 'advanced'
                      ? 'var(--success)'
                      : p.level === 'intermediate'
                      ? 'var(--accent)'
                      : 'var(--warning)'
                }}
              >
                {p.level}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.85rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!p.wantsToLearn}
                  onChange={(e) => handleUpdate(idx, 'wantsToLearn', e.target.checked)}
                />
                Wants to Learn
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!p.canTeach}
                  onChange={(e) => handleUpdate(idx, 'canTeach', e.target.checked)}
                />
                Can Mentor
              </label>

              <select
                value={p.level || 'intermediate'}
                onChange={(e) => handleUpdate(idx, 'level', e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--text)',
                  fontSize: '0.8rem'
                }}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>

              <button
                type="button"
                onClick={() => handleRemove(idx)}
                title="Remove subject"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {subjectProfiles.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '8px 0' }}>
            No subjects added yet. Add subjects and indicate what you want to learn or teach!
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectLevelPicker;
