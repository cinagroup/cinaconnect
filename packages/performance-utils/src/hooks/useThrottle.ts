/**
 * useThrottle — Hook that limits how often a value can update.
 * Unlike debounce, throttle guarantees updates happen at most once
 * per interval. Useful for scroll handlers, window resize, etc.
 *
 * Usage:
 *   function ScrollTracker() {
 *     const [scrollY, setScrollY] = useState(0);
 *     const throttledScrollY = useThrottle(scrollY, 100);
 *
 *     useEffect(() => {
 *       console.log('Scroll position (throttled):', throttledScrollY);
 *     }, [throttledScrollY]);
 *
 *     return <div onScroll={e => setScrollY(e.currentTarget.scrollTop)} />;
 *   }
 */

import { useState, useEffect, useRef } from 'react';

export function useThrottle<T>(value: T, intervalMs: number = 100): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdateRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;

    if (elapsed >= intervalMs) {
      lastUpdateRef.current = now;
      setThrottledValue(value);
    } else {
      // Schedule update for the remaining time
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        lastUpdateRef.current = Date.now();
        setThrottledValue(value);
      }, intervalMs - elapsed);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, intervalMs]);

  return throttledValue;
}
