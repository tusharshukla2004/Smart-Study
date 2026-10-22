// ============================================
// Schedule Session Modal
// ============================================

import React, { useState } from 'react';
import { SessionAPI } from '../api';
import { showToast } from '../utils';

const ScheduleSessionModal = ({ group, onClose, onCreated }) => {
  // Default to 1 hour from now formatted for datetime-local: YYYY-MM-DDTHH:mm
  const defaultDate = new Date(Date.now() + 60 * 60 * 1000);
  const tzOffset = defaultDate.getTimezoneOffset() * 60000;
  const localISOTime = new Date(defaultDate.getTime() - tzOffset).toISOString().slice(0, 16);

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(group?.subject || '');
  const [scheduledAt, setScheduledAt] = useState(localISOTime);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [totalCycles, setTotalCycles] = useState(4);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a session title.');
      return;
    }

    setSubmitting(true);
    setError('');

    const res = await SessionAPI.create({
      groupId: group._id,
      title: title.trim(),
      subject: subject.trim(),
      scheduledAt: new Date(scheduledAt).toISOString(),
      focusMinutes: Number(focusMinutes),
      breakMinutes: Number(breakMinutes),
      totalCycles: Number(totalCycles),
      description: description.trim()
    });

    if (res.success) {
      showToast('🎉 Study session scheduled successfully!', 'success');
      onCreated?.(res.session);
      onClose();
    } else {
      setError(res.message || 'Failed to schedule session.');
    }
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <h3 className="modal-title">📅 Schedule Study Session</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Schedule a synchronized Pomodoro session for <strong>{group?.name}</strong>.
        </p>

        {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Session Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Chapter 4 Practice Sprint"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                type="text"
                className="form-input"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date &amp; Start Time</label>
              <input
                type="datetime-local"
                className="form-input"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Focus (min)</label>
              <input
                type="number"
                min="5"
                max="120"
                className="form-input"
                value={focusMinutes}
                onChange={(e) => setFocusMinutes(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Break (min)</label>
              <input
                type="number"
                min="1"
                max="60"
                className="form-input"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Cycles</label>
              <input
                type="number"
                min="1"
                max="12"
                className="form-input"
                value={totalCycles}
                onChange={(e) => setTotalCycles(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Goal (optional)</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="What will the group work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '⏳ Scheduling...' : '📅 Schedule Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleSessionModal;
