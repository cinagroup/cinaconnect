/**
 * Memory Leak Detection Utilities
 *
 * Tools for detecting memory leaks in browser environments:
 * - Snapshot-based comparison
 * - Object tracking
 * - WeakRef-based leak detection
 * - Event listener counting
 *
 * Usage:
 *   import { createMemoryTracker, detectLeaks } from '@cinacoin/performance-utils/memory-leak';
 */

export interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface LeakReport {
  snapshots: MemorySnapshot[];
  heapGrowth: number;
  leakSuspected: boolean;
  growthRate: number; // bytes per second
  recommendations: string[];
}

/**
 * Take a memory snapshot using the Performance API.
 * Returns null if the API is not available (Node.js).
 */
export function takeSnapshot(): MemorySnapshot | null {
  if (typeof performance === 'undefined') return null;
  const perf = performance as Performance & { memory?: MemoryInfo };
  if (!perf.memory) return null;

  return {
    timestamp: Date.now(),
    usedJSHeapSize: perf.memory.usedJSHeapSize,
    totalJSHeapSize: perf.memory.totalJSHeapSize,
    jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
  };
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

/**
 * Track memory over time and detect potential leaks.
 */
export function createMemoryTracker(options?: {
  /** Interval between snapshots in ms. Default: 1000. */
  intervalMs?: number;
  /** Number of snapshots to keep. Default: 60. */
  maxSnapshots?: number;
  /** Growth rate (bytes/sec) above which to suspect a leak. Default: 100KB/s. */
  leakThresholdBytesPerSec?: number;
}) {
  const intervalMs = options?.intervalMs ?? 1000;
  const maxSnapshots = options?.maxSnapshots ?? 60;
  const leakThreshold = options?.leakThresholdBytesPerSec ?? 100_000;

  const snapshots: MemorySnapshot[] = [];
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let onLeakDetected: ((report: LeakReport) => void) | null = null;

  function captureSnapshot(): void {
    const snapshot = takeSnapshot();
    if (!snapshot) return;

    snapshots.push(snapshot);
    if (snapshots.length > maxSnapshots) {
      snapshots.shift();
    }
  }

  function start(): void {
    if (intervalId) return;
    captureSnapshot();
    intervalId = setInterval(captureSnapshot, intervalMs);
  }

  function stop(): void {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function analyze(): LeakReport | null {
    if (snapshots.length < 2) return null;

    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const timeDiff = (last.timestamp - first.timestamp) / 1000; // seconds

    if (timeDiff <= 0) return null;

    const heapGrowth = last.usedJSHeapSize - first.usedJSHeapSize;
    const growthRate = heapGrowth / timeDiff;
    const leakSuspected = growthRate > leakThreshold;

    const recommendations: string[] = [];
    if (leakSuspected) {
      recommendations.push(
        `Memory growing at ${formatBytes(growthRate)}/s — possible leak detected`
      );
      recommendations.push('Check for:');
      recommendations.push('  - Uncleared intervals or timeouts');
      recommendations.push('  - Event listeners not removed on unmount');
      recommendations.push('  - Closures holding references to large objects');
      recommendations.push('  - DOM nodes detached but still referenced');
      recommendations.push('  - Growing arrays/maps without eviction');
    }

    return {
      snapshots: [...snapshots],
      heapGrowth,
      leakSuspected,
      growthRate,
      recommendations,
    };
  }

  function onLeak(callback: (report: LeakReport) => void): void {
    onLeakDetected = callback;
  }

  function monitor(callback: (report: LeakReport) => void): void {
    onLeak(callback);
    start();
  }

  // Periodically check for leaks
  const checkInterval = setInterval(() => {
    const report = analyze();
    if (report?.leakSuspected && onLeakDetected) {
      onLeakDetected(report);
    }
  }, intervalMs * 10);

  // Cleanup
  function destroy(): void {
    stop();
    clearInterval(checkInterval);
    onLeakDetected = null;
  }

  return {
    start,
    stop,
    analyze,
    onLeak,
    monitor,
    destroy,
    getSnapshots: () => [...snapshots],
  };
}

/**
 * Track object instances to detect leaks via WeakRef.
 *
 * Usage:
 *   const tracker = createObjectTracker('MyClass');
 *   const instance = new MyClass();
 *   tracker.track(instance);
 *   // Later: check how many are still alive
 *   console.log(tracker.count());
 */
export function createObjectTracker(label: string = 'object') {
  const tracked = new Set<WeakRef<object>>();

  function track(obj: object): void {
    tracked.add(new WeakRef(obj));
  }

  function count(): number {
    // Clean up dead refs while counting
    const alive: WeakRef<object>[] = [];
    for (const ref of tracked) {
      if (ref.deref() !== undefined) {
        alive.push(ref);
      }
    }
    tracked.clear();
    for (const ref of alive) {
      tracked.add(ref);
    }
    return alive.length;
  }

  function collectDead(): number {
    const before = tracked.size;
    const alive: WeakRef<object>[] = [];
    for (const ref of tracked) {
      if (ref.deref() !== undefined) {
        alive.push(ref);
      }
    }
    tracked.clear();
    for (const ref of alive) {
      tracked.add(ref);
    }
    return before - alive.length;
  }

  return { track, count, collectDead, label };
}

/**
 * Detect orphaned event listeners on a DOM element.
 * Useful for finding listeners that weren't cleaned up on unmount.
 *
 * Note: getEventListeners is a DevTools API, not available in production.
 * This is a development-only utility.
 */
export function detectOrphanedListeners(): { element: string; type: string; count: number }[] | null {
  if (typeof window === 'undefined') return null;
  if (typeof (window as any).getEventListeners !== 'function') {
    return null; // DevTools API not available
  }

  const results: { element: string; type: string; count: number }[] = [];
  const allElements = document.querySelectorAll('*');

  for (const el of Array.from(allElements)) {
    try {
      const listeners = (window as any).getEventListeners(el);
      for (const [type, listenersList] of Object.entries(listeners)) {
        if (Array.isArray(listenersList) && listenersList.length > 0) {
          results.push({
            element: el.tagName + (el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : ''),
            type,
            count: listenersList.length,
          });
        }
      }
    } catch {
      // Skip elements that throw (shadow DOM, cross-origin iframes, etc.)
    }
  }

  return results.sort((a, b) => b.count - a.count);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
