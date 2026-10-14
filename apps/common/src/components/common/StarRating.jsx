import React from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ rating = 0, max = 5, onRatingChange = null, size = 18, showNumber = false }) {
  const isInteractive = Boolean(onRatingChange);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
      {[...Array(max)].map((_, i) => {
        const starValue = i + 1;
        const isFilled = rating >= starValue;
        const isHalf = !isFilled && rating >= starValue - 0.5;

        return (
          <button
            key={i}
            type="button"
            disabled={!isInteractive}
            onClick={() => isInteractive && onRatingChange(starValue)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px',
              cursor: isInteractive ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isFilled ? '#FFB300' : isHalf ? '#FCD34D' : '#475569',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (isInteractive) e.currentTarget.style.transform = 'scale(1.25)';
            }}
            onMouseLeave={(e) => {
              if (isInteractive) e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Star
              size={size}
              fill={isFilled || isHalf ? '#FFB300' : 'none'}
              strokeWidth={isFilled ? 0 : 2}
            />
          </button>
        );
      })}
      {showNumber && (
        <span style={{ marginLeft: '6px', fontWeight: 700, fontSize: `${size * 0.9}px`, color: '#F8FAFC' }}>
          {rating ? Number(rating).toFixed(1) : 'New'}
        </span>
      )}
    </div>
  );
}
