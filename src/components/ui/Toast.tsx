import React, { useState } from 'react';

export type Toast = { id: number; title?: string; desc?: string; tone?: 'success' | 'error' | 'info' };

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (t: Omit<Toast, 'id'>) =>
    setToasts((prev) => [...prev, { id: Date.now() + Math.random(), ...t }]);
  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));
  return { toasts, push, remove };
}

export function Toasts({ items, onClose }: { items: Toast[]; onClose: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`rounded-xl shadow-lg px-4 py-3 w-80 text-sm border bg-white ${
            t.tone === 'success'
              ? 'border-emerald-200'
              : t.tone === 'error'
              ? 'border-rose-200'
              : 'border-slate-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 inline-block h-2.5 w-2.5 rounded-full ${
                t.tone === 'success' ? 'bg-emerald-500' : t.tone === 'error' ? 'bg-rose-500' : 'bg-slate-400'
              }`}
            />
            <div className="min-w-0">
              <div className="font-medium text-slate-900 truncate">{t.title ?? 'Notice'}</div>
              {t.desc && <div className="text-slate-600 mt-0.5">{t.desc}</div>}
            </div>
            <button
              className="ml-auto text-slate-400 hover:text-slate-600"
              onClick={() => onClose(t.id)}
              aria-label="Close toast"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
