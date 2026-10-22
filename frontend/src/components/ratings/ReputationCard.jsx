import React, { useState, useEffect } from 'react';
import StarRating from './StarRating';
import { RatingAPI } from '../../api';

const TAG_LABELS = {
  helpful: '🤝 Helpful',
  focused: '🎯 Focused',
  good_explainer: '💡 Great Explainer',
  punctual: '⏱️ Punctual',
  collaborative: '🚀 Collaborative'
};

const ReputationCard = ({ userId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchReputation = async () => {
      setLoading(true);
      const res = await RatingAPI.getReputation(userId);
      if (res.success) {
        setData(res);
      }
      setLoading(false);
    };
    fetchReputation();
  }, [userId]);

  if (loading) {
    return (
      <div className="card" style={{ padding: '20px', color: 'var(--text-muted)' }}>
        Loading reputation and peer feedback...
      </div>
    );
  }

  if (!data) return null;

  const { isNewMember, ratingAvg, ratingCount, topTags = [], comments = [] } = data;

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            ⭐ Peer Reputation &amp; Trust
          </h3>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Verified reviews from study session partners
          </div>
        </div>

        {isNewMember ? (
          <span
            style={{
              background: 'rgba(6, 182, 212, 0.15)',
              color: 'var(--accent)',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: 700
            }}
          >
            🌱 New Member
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#F59E0B' }}>
              {ratingAvg}
            </span>
            <StarRating rating={ratingAvg} readOnly size="sm" />
          </div>
        )}
      </div>

      {isNewMember ? (
        <div style={{ padding: '12px', background: 'var(--bg2)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Fewer than 3 session ratings received so far. Complete more group study sessions to establish your reputation score!
        </div>
      ) : (
        <>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Based on <strong>{ratingCount}</strong> peer evaluation{ratingCount !== 1 ? 's' : ''} across completed study rooms.
          </div>

          {/* Top Feedback Tags */}
          {topTags.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: '8px' }}>
                Top Peer Commendations
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {topTags.map((t) => (
                  <span
                    key={t.tag}
                    style={{
                      background: 'rgba(108, 99, 255, 0.12)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{TAG_LABELS[t.tag] || t.tag}</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 800 }}>+{t.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Anonymized Comments (Only visible if >= 3 reviews to protect anonymity) */}
          {comments.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: '8px' }}>
                Recent Anonymized Peer Feedback
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {comments.map((c) => (
                  <div
                    key={c._id}
                    style={{
                      background: 'var(--bg2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      fontSize: '0.82rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <StarRating rating={c.rating} readOnly size="sm" />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text)', lineHeight: 1.5, fontStyle: 'italic' }}>
                      "{c.comment}"
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReputationCard;
