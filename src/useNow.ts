import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Dev-only: open the web build with `?at=14:30` to preview the sky at another time of day.
 * Shifts the clock that drives the sky; task dates are unaffected.
 */
const OFFSET_MS = (() => {
  if (!__DEV__ || Platform.OS !== 'web') return 0;
  const m = /[?&]at=(\d{1,2}):(\d{2})/.exec((globalThis as { location?: { search: string } }).location?.search ?? '');
  if (!m) return 0;
  const target = new Date();
  target.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return target.getTime() - Date.now();
})();

/** The app's clock. Use this rather than `new Date()` so every part of the app agrees on "now". */
export const clockNow = () => new Date(Date.now() + OFFSET_MS);

/** The current time, refreshed every `intervalMs` (aligned to the clock). */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(clockNow);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const tick = () => setNow(clockNow());
    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, intervalMs);
    }, intervalMs - (Date.now() % intervalMs));
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [intervalMs]);
  return now;
}

/** Eases a number toward `target` on the JS thread. Used for SVG rings, which can't take native animated props on every platform. */
export function useTween(target: number, duration = 700) {
  const [value, setValue] = useState(target);
  useEffect(() => {
    const from = value;
    if (from === target) return;
    const start = Date.now();
    let raf = 0;
    const step = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);
  return value;
}
