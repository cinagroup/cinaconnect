'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'cinacoin_demo_dismissed';

/**
 * Reusable simulated-badge for inline use next to mock values.
 */
export function SimulatedBadge({ size = 'sm' }: { size?: 'xs' | 'sm' }) {
  const cls =
    size === 'xs'
      ? 'text-[9px] px-1 py-0.5'
      : 'text-[10px] px-1.5 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded ${cls} bg-amber-500/15 text-amber-400 border border-amber-500/25 font-semibold uppercase tracking-wider`}
      title="Simulated value — not from a live API"
    >
      Simulated
    </span>
  );
}

/**
 * Top-of-page demo disclaimer banner.
 *
 * Dismissed state persisted in localStorage.
 * `compact` renders a smaller inline version (for pages that already
 * have their own header space).
 */
export function DemoDisclaimer({ compact = false }: { compact?: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === '1');
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch { /* ignore */ }
  };

  // During SSR / before hydration, render nothing to avoid mismatch
  if (!hydrated) return null;
  if (dismissed) return null;

  if (compact) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/25 px-4 py-2 text-xs text-amber-300">
          <span>⚠️</span>
          <span>
            <strong>Demo Environment</strong> — All wallet connections and transactions are simulated.
          </span>
          <button
            onClick={handleDismiss}
            className="ml-auto text-amber-400 hover:text-amber-200 transition-colors"
            aria-label="Dismiss demo disclaimer"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/25 px-5 py-4 text-sm text-amber-200 shadow-lg shadow-amber-500/5">
        <span className="text-xl leading-none mt-0.5">⚠️</span>
        <div className="flex-1">
          <p className="font-semibold text-amber-100">
            Demo Environment
          </p>
          <p className="text-amber-300/90 mt-0.5">
            All wallet connections, balances, and transactions are simulated.
            No real blockchain interaction occurs. Do not send real funds.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-amber-400 hover:text-amber-200 transition-colors p-1 rounded hover:bg-amber-500/10"
          aria-label="Dismiss demo disclaimer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
