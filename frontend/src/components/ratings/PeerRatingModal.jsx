import React, { useState, useEffect } from 'react';
import StarRating from './StarRating';
import { RatingAPI } from '../../api';
import { showToast } from '../../utils';

const TAG_OPTIONS = [
  { key: 'helpful', label: '🤝 Helpful' },
  { key: 'focused', label: '🎯 Focused' },
  { key: 'good_explainer', label: '💡 Great Explainer' },
  { key: 'punctual', label: '⏱️ Punctual' },
  { key: 'collaborative', label: '🚀 Collaborative' }
];

const PeerRatingModal = ({ sessionId, isOpen = false, onClose = () => {}, onSubmitted = () => {} }) => {
  const [rateable, setRateable] = useState([]);
  const [ratingsState, setRatingsState] = useState({}); // { [rateeId]: { rating: 5, tags: [], comment: '' } }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !sessionId) return;

    const fetchRateable = async () => {
      setLoading(true);
      const res = await RatingAPI.getRateable(sessionId);
      if (res.success && res.rateable && res.rateable.length > 0) {
        setRateable(res.rateable);
        // Initialize default rating state for each participant
        const initial = {};
        for (const p of res.rateable) {
          initial[p._id] = { rating: 5, tags: ['focused'], comment: '' };
        }
        setRatingsState(initial);
      } else {
        // No peers to rate
        setRateable([]);
        onClose();
      }
      setLoading(false);
    };

    fetchRateable();
  }, [isOpen, sessionId]);

  if (!isOpen || rateable.length === 0) return null;

  const handleRatingChange = (rateeId, star) => {
    setRatingsState(prev => ({
      ...prev,
      [rateeId]: { ...prev[rateeId], rating: star }
    }));
  };

  const toggleTag = (rateeId, tagKey) => {
    setRatingsState(prev => {
      const currentTags = prev[rateeId]?.tags || [];
      const nextTags = currentTags.includes(tagKey)
        ? currentTags.filter(t => t !== tagKey)
        : [...currentTags, tagKey];
      return {
        ...prev,
        [rateeId]: { ...prev[rateeId], tags: nextTags }
      };
    });
  };

  const handleCommentChange = (rateeId, comment) => {
    setRatingsState(prev => ({
      ...prev,
      [rateeId]: { ...prev[rateeId], comment }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = rateable.map(p => ({
      ratee: p._id,
      rating: ratingsState[p._id]?.rating || 5,
      tags: ratingsState[p._id]?.tags || [],
      comment: ratingsState[p._id]?.comment || ''
    }));

    const res = await RatingAPI.submitRatings(sessionId, payload);
    if (res.success) {
      showToast('⭐ Peer feedback submitted! Thank you.', 'success');
      onSubmitted?.();
      onClose();
    } else {
      showToast(res.message || 'Failed to submit ratings.', 'error');
    }
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <h3 className="modal-title">⭐ Rate Your Study Partners</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
          Leave quick anonymous feedback to help fellow students build their reputation and unlock badges.
        </p>

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading study partners...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {rateable.map(peer => {
                const state = ratingsState[peer._id] || { rating: 5, tags: [], comment: '' };

                return (
                  <div
                    key={peer._id}
                    style={{
                      background: 'var(--card2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: '14px'
                    }}
                  >
                    {/* Peer info & stars */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar avatar-sm">{peer.avatar || 'SP'}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
                          {peer.name}
                        </div>
                      </div>

                      <StarRating
                        rating={state.rating}
                        onChange={(star) => handleRatingChange(peer._id, star)}
                        size="md"
                      />
                    </div>

                    {/* Tag chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                      {TAG_OPTIONS.map(opt => {
                        const isSelected = state.tags.includes(opt.key);
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => toggleTag(peer._id, opt.key)}
                            style={{
                              background: isSelected ? 'var(--primary)' : 'var(--bg2)',
                              color: isSelected ? '#FFF' : 'var(--text-muted)',
                              border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                              borderRadius: '999px',
                              padding: '3px 10px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'var(--transition)'
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Optional Comment */}
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Optional constructive note (max 300 chars)..."
                      maxLength={300}
                      value={state.comment}
                      onChange={(e) => handleCommentChange(peer._id, e.target.value)}
                      style={{ fontSize: '0.82rem', padding: '6px 10px' }}
                    />
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onClose}
                disabled={submitting}
              >
                Skip
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PeerRatingModal;
