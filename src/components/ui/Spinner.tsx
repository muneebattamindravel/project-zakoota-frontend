import React from 'react';

export default function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      aria-label="Loading"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent ${className}`}
    />
  );
}
