import React from 'react';
import './Skeleton.css';

export const SkeletonText = ({ lines = 1, width = '100%' }) => {
  return (
    <div className="skeleton-text" style={{ width }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton-line" />
      ))}
    </div>
  );
};

export const SkeletonAvatar = ({ size = 50 }) => {
  return <div className="skeleton-avatar" style={{ width: size, height: size }} />;
};

export const SkeletonCard = () => {
  return (
    <div className="skeleton-card">
      <SkeletonAvatar size={40} />
      <SkeletonText lines={2} width="70%" />
    </div>
  );
};

export const SkeletonList = ({ count = 5 }) => {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};