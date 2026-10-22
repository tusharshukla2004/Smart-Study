import React, { useEffect } from 'react';

const CelebrationModal = ({
  isOpen = false,
  onClose = () => {},
  levelUp = false,
  newLevel = null,
  newBadges = [],
  xpGained = 0
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ zIndex: 10000 }}
    >
      <div
        className="modal animate-fadeUp"
        style={{
          maxWidth: '460px',
          textAlign: 'center',
          padding: '32px 24px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* CSS Confetti elements (hidden if prefers-reduced-motion) */}
        <div className="confetti-container" aria-hidden="true">
          {[...Array(16)].map((_, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{
                left: `${(i * 6.25)}%`,
                animationDelay: `${(i % 5) * 0.15}s`,
                background: ['#6C63FF', '#10B981', '#F59E0B', '#06B6D4', '#EC4899'][i % 5]
              }}
            />
          ))}
        </div>

        <div style={{ fontSize: '3.5rem', marginBottom: '12px', lineHeight: 1 }}>
          {levelUp ? '🎉' : '🏆'}
        </div>

        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
          {levelUp ? `Level ${newLevel} Reached!` : 'Achievement Unlocked!'}
        </h2>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '20px' }}>
          {levelUp
            ? `Fantastic work! Your steady focus earned you a level promotion.`
            : `You've earned new study accolades!`}
        </p>

        {xpGained > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(108, 99, 255, 0.15)',
              color: 'var(--primary)',
              padding: '6px 16px',
              borderRadius: '999px',
              fontWeight: 700,
              fontSize: '0.9rem',
              marginBottom: '20px'
            }}
          >
            ⚡ +{xpGained} XP Earned
          </div>
        )}

        {/* Newly earned badges list */}
        {newBadges && newBadges.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {newBadges.map((b) => (
              <div
                key={b.key}
                style={{
                  background: 'var(--bg2)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: 'var(--radius)',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'left'
                }}
              >
                <span style={{ fontSize: '2rem' }}>{b.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>
                    {b.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {b.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={onClose}
        >
          Keep Crushing It! 🚀
        </button>
      </div>
    </div>
  );
};

export default CelebrationModal;
