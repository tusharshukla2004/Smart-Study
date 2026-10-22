import React from 'react';

const GOALS = [
  { id: 'exam_prep', label: 'Exam Preparation', icon: '📝', desc: 'Focusing on upcoming university or competitive exams' },
  { id: 'concept_clarity', label: 'Concept Clarity', icon: '💡', desc: 'Building intuition and deep subject understanding' },
  { id: 'projects', label: 'Hands-on Projects', icon: '🚀', desc: 'Building software or applied academic projects' },
  { id: 'revision', label: 'Quick Revision', icon: '🔄', desc: 'Refreshing core topics and active recall' },
  { id: 'interview_prep', label: 'Interview Prep', icon: '💼', desc: 'Cracking technical and coding interviews' }
];

const LearningGoalPicker = ({ selectedGoals = [], onChange }) => {
  const toggleGoal = (id) => {
    let next;
    if (selectedGoals.includes(id)) {
      next = selectedGoals.filter(g => g !== id);
    } else {
      if (selectedGoals.length >= 2) {
        // Replace oldest or cap at 2
        next = [selectedGoals[1], id];
      } else {
        next = [...selectedGoals, id];
      }
    }
    onChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
        {GOALS.map(g => {
          const isSelected = selectedGoals.includes(g.id);
          return (
            <div
              key={g.id}
              onClick={() => toggleGoal(g.id)}
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'var(--card2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.1rem' }}>{g.icon}</span>
                {isSelected && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>✓ SELECTED</span>
                )}
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>
                {g.label}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                {g.desc}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Select up to 2 primary learning goals.
      </div>
    </div>
  );
};

export default LearningGoalPicker;
