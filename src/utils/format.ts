import dayjs from 'dayjs';

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

// NEW: date-only + 12-hour time
export function fmtDate(dt:any) {
  return dt ? dayjs(dt).format('YYYY-MM-DD') : '-';
}

export function fmtTime12(dt:any) {
  return dt ? dayjs(dt).format('hh:mm:ss A') : '-';
}

export function fmtLocal(dt: any) {
  if (!dt) return '-';
  return dayjs(dt).format('YYYY-MM-DD HH:mm:ss');
}
