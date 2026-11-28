import React from 'react';

interface LoadingSkeletonProps {
  type?: 'card' | 'text' | 'image' | 'circle' | 'custom';
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'card',
  count = 1,
  className = '',
}) => {
  const items = Array.from({ length: count }, (_, i) => i);

  if (type === 'card') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
        {items.map(idx => (
          <div
            key={idx}
            className="rounded-xl border border-border bg-surface p-3 animate-pulse flex flex-col gap-3"
          >
            <div className="w-full aspect-square bg-slate-200 rounded-lg" />
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="mt-auto pt-2 flex items-center justify-between">
              <div className="h-5 bg-slate-200 rounded w-1/3" />
              <div className="h-8 bg-slate-200 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'image') {
    return (
      <div className={`w-full aspect-square bg-slate-200 rounded-xl animate-pulse ${className}`} />
    );
  }

  if (type === 'circle') {
    return (
      <div className={`rounded-full bg-slate-200 animate-pulse ${className}`} />
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {items.map(idx => (
        <div key={idx} className="h-4 bg-slate-200 rounded animate-pulse w-full" />
      ))}
    </div>
  );
};
