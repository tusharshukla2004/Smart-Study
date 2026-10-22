import React from 'react';

const StarRating = ({
  rating = 0,
  onChange = () => {},
  readOnly = false,
  size = 'md',
  name = 'rating'
}) => {
  const fontSizes = { sm: '1rem', md: '1.4rem', lg: '1.8rem' };
  const currentSize = fontSizes[size] || fontSizes.md;

  const handleKeyDown = (e, star) => {
    if (readOnly) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(star);
    } else if (e.key === 'ArrowRight' && star < 5) {
      e.preventDefault();
      onChange(star + 1);
    } else if (e.key === 'ArrowLeft' && star > 1) {
      e.preventDefault();
      onChange(star - 1);
    }
  };

  return (
    <div
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={`Rating: ${rating} out of 5 stars`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= Math.round(rating);

        if (readOnly) {
          return (
            <span
              key={star}
              style={{
                fontSize: currentSize,
                color: isFilled ? '#F59E0B' : 'var(--text-dim)',
                lineHeight: 1
              }}
            >
              ★
            </span>
          );
        }

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            tabIndex={0}
            onClick={() => onChange(star)}
            onKeyDown={(e) => handleKeyDown(e, star)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: currentSize,
              color: isFilled ? '#F59E0B' : 'var(--text-dim)',
              lineHeight: 1,
              padding: '2px',
              transition: 'transform 0.15s ease',
              outline: 'none'
            }}
          >
            ★
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
