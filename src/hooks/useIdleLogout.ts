import { useEffect, useRef } from 'react';
import { useAuth } from '../state/auth';

export function useIdleLogout(idleMs: number) {
  const { isAuthed, logout } = useAuth();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthed) return;

    const reset = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        logout();
      }, idleMs);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, reset));

    reset();

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      events.forEach((evt) => window.removeEventListener(evt, reset));
    };
  }, [isAuthed, idleMs, logout]);
}
