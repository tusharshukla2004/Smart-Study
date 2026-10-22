// ============================================
// Session Log Modal - End of Session Reflection
// ============================================

import React, { useState } from 'react';
import { SessionAPI } from '../api';
import { showToast } from '../utils';

const SessionLogModal = ({ session, defaultMinutes = 25, onClose, onLogged }) => {
  const [topics, setTopics] = useState([]);
  const [topicInput, setTopicInput] = useState('');
  const [summary, setSummary] = useState('');
  const [focusRating, setFocusRating] = useState(5);
  const [minutesStudied, setMinutesStudied] = useState(defaultMinutes);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAddTopic = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = topicInput.trim().replace(/^,+|,+$/g, '');
      if (trimmed && !topics.includes(trimmed)) {
        setTopics(prev => [...prev, trimmed]);
        setTopicInput('');
      }
    }
  };

  const removeTopic = (indexToRemove) => {
    setTopics(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!focusRating) {
      setError('Please provide a focus rating (1 to 5).');
      return;
    }

    setSubmitting(true);
    setError('');

    const res = await SessionAPI.submitLog(session._id, {
      topicsStudied: topics,
      summary: summary.trim(),
      focusRating: Number(focusRating),
      minutesStudied: Number(minutesStudied) || defaultMinutes
    });

    if (res.success) {
      showToast('🎉 Study session logged! Streak updated.', 'success');
      onLogged?.(res);
      onClose();
    } else {
      setError(res.message || 'Failed to submit study log.');
    }
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <h3 className="modal-title">🎉 Session Log &amp; Reflection</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Reflect on your progress to update your study streak and tracking stats.
        </p>

        {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          {/* Minutes Studied */}
          <div className="form-group">
            <label className="form-label">Minutes Studied</label>
            <input
              type="number"
              min="1"
              max="600"
              className="form-input"
              value={minutesStudied}
              onChange={(e) => setMinutesStudied(e.target.value)}
              required
            />
          </div>

          {/* Focus Rating (1-5) */}
          <div className="form-group">
            <label className="form-label">Focus Rating (1 - Distracted, 5 - Laser Focused)</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${focusRating === star ? 'var(--primary)' : 'var(--border)'}`,
                    background: focusRating === star ? 'rgba(6,182,212,0.2)' : 'var(--bg3)',
                    color: focusRating === star ? 'var(--primary)' : 'var(--text-muted)',
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                  onClick={() => setFocusRating(star)}
                >
                  {star} ⭐
                </button>
              ))}
            </div>
          </div>

          {/* Topics Studied Chips */}
          <div className="form-group">
            <label className="form-label">
              Topics Covered <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(type and hit Enter or comma)</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {topics.map((t, idx) => (
                <span
                  key={idx}
                  className="badge badge-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', fontSize: '0.8rem' }}
                >
                  {t}
                  <span
                    style={{ cursor: 'pointer', fontWeight: 'bold' }}
                    onClick={() => removeTopic(idx)}
                  >
                    ×
                  </span>
                </span>
              ))}
            </div>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Dynamic Programming, Graph Traversal..."
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={handleAddTopic}
            />
          </div>

          {/* Short Summary */}
          <div className="form-group">
            <label className="form-label">
              Session Summary <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(max 500 chars)</span>
            </label>
            <textarea
              className="form-input"
              rows={3}
              maxLength={500}
              placeholder="What did you accomplish during this session?"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Skip for Now
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '⏳ Saving Log...' : '💾 Save Reflection & Update Streak'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionLogModal;
