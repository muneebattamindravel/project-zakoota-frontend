// src/utils/format.ts
import dayjs from 'dayjs';

// --- You already had these ---
/** All durations from backend are in SECONDS. */
export function fmtHMS(seconds: number) {
  const s = Math.max(0, Math.floor(seconds || 0));
  if (s < 60) return `${s}s`;

  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  // < 1 hour → "MMm SSs"
  if (h === 0) return `${pad(m)}m ${pad(ss)}s`;

  // ≥ 1 hour → "HHh MMm SSs"
  return `${pad(h)}h ${pad(m)}m ${pad(ss)}s`;
}

// date-only + 12-hour time (kept from your file)
export function fmtDate(dt: any) {
  return dt ? dayjs(dt).format('YYYY-MM-DD') : '-';
}

export function fmtTime12(dt: any) {
  return dt ? dayjs(dt).format('hh:mm:ss A') : '-';
}

export function fmtLocal(dt: any) {
  if (!dt) return '-';
  return dayjs(dt).format('YYYY-MM-DD HH:mm:ss');
}

// --- NEW helpers ---

/** Full friendly timestamp with 12h clock. Safe if dt is falsy/invalid. */
export function fmtFull12(dt: any) {
  if (!dt) return '-';
  const d = dayjs(dt);
  return d.isValid() ? d.format('YYYY-MM-DD hh:mm:ss A') : '-';
}

/**
 * Compact "time-ago" helper:
 *  - <60s  → "Xs"
 *  - <60m  → "Xm"
 *  - <24h  → "Xh"
 *  - else  → "Xd"
 * (Does NOT append "ago" so you can add it in UI if desired.)
 */
export function fmtAgo(dt: any) {
  if (!dt) return '—';
  const t = dayjs(dt);
  if (!t.isValid()) return '—';

  const seconds = Math.max(0, dayjs().diff(t, 'second'));
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
}
