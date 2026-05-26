/**
 * usePerformanceMonitor — Hook for tracking render performance and
 * detecting slow components in development.
 *
 * Usage:
 *   function ExpensiveComponent() {
 *     usePerformanceMonitor({ thresholdMs: 16 });
 *     // ...
 *   }
 */

import { useRef, useEffect, useCallback } from 'react';

export interface PerformanceMonitorOptions {
  /** Warn if render takes longer than this (ms). Default: 16 (1 frame at 60fps). */
  thresholdMs?: number;
  /** Callback invoked when render exceeds threshold. */
  onSlowRender?: (durationMs: number, componentName: string) => void;
  /** Component name for reporting. Defaults to 'Unknown'. */
  componentName?: string;
  /** Whether to log to console. Default: true in dev, false in prod. */
  logToConsole?: boolean;
  /** Maximum number of slow render warnings to report. */
  maxWarnings?: number;
}

export interface PerformanceMetrics {
  renderCount: number;
  slowRenderCount: number;
  totalRenderTime: number;
  avgRenderTime: number;
  maxRenderTime: number;
  lastRenderTime: number;
}

export function usePerformanceMonitor(options: PerformanceMonitorOptions = {}): PerformanceMetrics {
  const {
    thresholdMs = 16,
    onSlowRender,
    componentName = 'Unknown',
    logToConsole = process.env.NODE_ENV !== 'production',
    maxWarnings = 10,
  } = options;

  const startTimeRef = useRef<number>(0);
  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    slowRenderCount: 0,
    totalRenderTime: 0,
    avgRenderTime: 0,
    maxRenderTime: 0,
    lastRenderTime: 0,
  });
  const warningCountRef = useRef(0);

  // Measure render start
  useEffect(() => {
    startTimeRef.current = performance.now();

    return () => {
      const duration = performance.now() - startTimeRef.current;
      const metrics = metricsRef.current;

      metrics.renderCount++;
      metrics.totalRenderTime += duration;
      metrics.avgRenderTime = metrics.totalRenderTime / metrics.renderCount;
      metrics.maxRenderTime = Math.max(metrics.maxRenderTime, duration);
      metrics.lastRenderTime = duration;

      if (duration > thresholdMs) {
        metrics.slowRenderCount++;

        if (warningCountRef.current < maxWarnings) {
          if (logToConsole) {
            console.warn(
              `[Performance] ${componentName} render took ${duration.toFixed(2)}ms ` +
              `(threshold: ${thresholdMs}ms) — render #${metrics.renderCount}`
            );
          }
          onSlowRender?.(duration, componentName);
          warningCountRef.current++;
        }
      }
    };
  });

  // Stable accessor
  const getMetrics = useCallback((): PerformanceMetrics => {
    return { ...metricsRef.current };
  }, []);

  return getMetrics();
}
