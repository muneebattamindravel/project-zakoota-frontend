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

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

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
        className={`bg-white rounded-2xl shadow-2xl ${widthClass} max-w-[95vw] p-0 overflow-hidden`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50">
          <div className="font-semibold text-slate-800">{title}</div>
          <button className="text-slate-500 hover:text-slate-700" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
