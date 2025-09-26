import React from 'react';

export default function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-800 mb-3">{title}</div>
      {children}
    </div>
  );
}
