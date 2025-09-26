import React from 'react';

export default function Badge({
  tone = 'gray',
  children,
}: {
  tone?: 'green' | 'amber' | 'red' | 'gray';
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    red: 'bg-rose-50 text-rose-700 ring-rose-200',
    gray: 'bg-slate-50 text-slate-700 ring-slate-200',
  };
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs ring-1 ${map[tone]}`}>{children}</span>;
}
