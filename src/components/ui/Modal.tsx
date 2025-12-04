import React, { useEffect, useRef } from 'react';

export default function Modal({
  open,
  onClose,
  title,
  children,
  widthClass = 'w-[560px]',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  widthClass?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // 🔒 Lock background scroll when modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose(); // overlay click to close
      }}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={ref}
        className={[
          'bg-white rounded-2xl shadow-2xl overflow-hidden p-0',
          'flex flex-col',           // panel becomes flex column
          'max-w-[95vw]',            // safety on narrow screens
          widthClass || '',
        ].join(' ')}
      >
        {/* Sticky header so actions remain visible while body scrolls */}
        <div className="shrink-0 sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
          <div className="font-semibold text-slate-800">{title}</div>
          <button
            className="text-slate-500 hover:text-slate-700"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
