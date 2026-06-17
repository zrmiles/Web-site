import React from 'react';

export default function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="product-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="product-card product-card--skeleton">
          <div className="product-card__img-wrap" />
          <div className="product-card__body">
            <div className="skeleton-line skeleton-line--medium" />
            <div className="skeleton-line" style={{ marginTop: 8 }} />
            <div className="skeleton-line skeleton-line--short" style={{ marginTop: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
