/**
 * @cinacoin/next/hooks — SSR-safe React hooks.
 *
 * Hooks designed for Next.js App Router and Pages Router that handle
 * SSR/hydration correctly:
 * - `useAppKitState` — SSR-safe initial values, no hydration mismatch
 * - `useHydratedAppKit` — only activates after client hydration
 *
 * These hooks avoid the common SSR pitfall of reading wallet state
 * during server rendering, which causes hydration mismatches.
 *
 * ```tsx
 * 'use client';
 * import { useAppKitState } from '@cinacoin/next/hooks';
 *
 * export default function Profile() {
 *   const { address, isConnected } = useAppKitState({
 *     address: null,
 *     isConnected: false,
 *   });
 *
 *   if (!isConnected) return <LoginButton />;
 *   return <Dashboard address={address} />;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// useAppKitState
// ---------------------------------------------------------------------------

/** Initial state shape for useAppKitState. */
export interface AppKitInitialState {
  /** Wallet address (null when disconnected). */
  address?: string | null;
  /** Whether a wallet is connected. */
  isConnected?: boolean;
  /** Current chain ID. */
  chainId?: number | null;
  /** Account balance string. */
  balance?: string;
  /** ENS name if resolved. */
  ensName?: string | null;
  /** Connection status string. */
  status?: 'disconnected' | 'connecting' | 'connected' | 'error';
}

/** Return value for useAppKitState. */
export interface UseAppKitStateReturn {
  /** Current wallet address. */
  address: string | null;
  /** Whether connected. */
  isConnected: boolean;
  /** Current chain ID. */
  chainId: number | null;
  /** Account balance. */
  balance: string;
  /** ENS name. */
  ensName: string | null;
  /** Connection status. */
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  /** Whether the component has hydrated on the client. */
  isHydrated: boolean;
  /** Update state manually (e.g. after a server-side fetch). */
  update: (patch: Partial<AppKitInitialState>) => void;
}

/**
 * SSR-safe hook for AppKit state that avoids hydration mismatches.
 *
 * During SSR, returns the provided `initialState`. After hydration on
 * the client, returns the live values from the Cinacoin context.
 *
 * This prevents the classic SSR issue where the server renders
 * `address: null` but the client immediately renders
 * `address: '0x1234...'`, causing a hydration mismatch error.
 *
 * ```tsx
 * 'use client';
 *
 * const { address, isConnected, isHydrated } = useAppKitState({
 *   address: null,
 *   isConnected: false,
 * });
 *
 * // During SSR: address = null, isConnected = false
 * // After hydration: address = '0x...', isConnected = true
 * ```
 *
 * @param initialState - Values to return during SSR (before hydration).
 * @returns Current AppKit state with hydration awareness.
 */
export function useAppKitState(
  initialState: AppKitInitialState = {},
): UseAppKitStateReturn {
  const [isHydrated, setIsHydrated] = useState(false);
  const [clientState, setClientState] = useState<AppKitInitialState>({});

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Read from context only after hydration
  useEffect(() => {
    if (!isHydrated) return;

    try {
      // Try to read from the global EIP-5792 context (set by CinacoinProvider)
      const win = window as unknown as Record<string, unknown>;
      const getter = win.__ocx_eip5792_context as (() => unknown) | undefined;
      if (getter) {
        const ctx = getter() as {
          address?: string | null;
          isConnected?: boolean;
          chainIdHex?: string | null;
          status?: string;
        } | null;
        if (ctx) {
          setClientState({
            address: ctx.address ?? null,
            isConnected: ctx.isConnected ?? false,
            chainId: ctx.chainIdHex ? parseInt(ctx.chainIdHex, 16) : null,
            status: (ctx.status as AppKitInitialState['status']) ?? 'disconnected',
          });
        }
      }
    } catch {
      // Context not available — use initial state
    }
  }, [isHydrated]);

  const update = useCallback((patch: Partial<AppKitInitialState>) => {
    setClientState((prev) => ({ ...prev, ...patch }));
  }, []);

  const state = isHydrated ? clientState : initialState;

  return {
    address: state.address ?? initialState.address ?? null,
    isConnected: state.isConnected ?? initialState.isConnected ?? false,
    chainId: state.chainId ?? initialState.chainId ?? null,
    balance: state.balance ?? initialState.balance ?? '',
    ensName: state.ensName ?? initialState.ensName ?? null,
    status: state.status ?? initialState.status ?? 'disconnected',
    isHydrated,
    update,
  };
}

// ---------------------------------------------------------------------------
// useHydratedAppKit
// ---------------------------------------------------------------------------

/** Return value for useHydratedAppKit. */
export interface UseHydratedAppKitReturn {
  /** Whether the component has mounted on the client. */
  isHydrated: boolean;
  /** Render this during SSR / before hydration. */
  renderFallback: () => boolean;
}

/**
 * Hook that tells you whether the component has hydrated.
 *
 * Use this to conditionally render client-only content:
 *
 * ```tsx
 * 'use client';
 * import { useHydratedAppKit } from '@cinacoin/next/hooks';
 *
 * export function WalletButton() {
 *   const { isHydrated, renderFallback } = useHydratedAppKit();
 *
 *   if (renderFallback()) return <SkeletonButton />;
 *
 *   return <button>Connected: {address}</button>;
 * }
 * ```
 */
export function useHydratedAppKit(): UseHydratedAppKitReturn {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const renderFallback = useCallback(() => !isHydrated, [isHydrated]);

  return { isHydrated, renderFallback };
}

// ---------------------------------------------------------------------------
// useOnChainReady — fires a callback when the chain is ready on the client
// ---------------------------------------------------------------------------

/**
 * Hook that fires a callback once when the app has hydrated and
 * the wallet context is available.
 *
 * Useful for analytics, tracking, or initialization that should only
 * happen on the client.
 *
 * ```tsx
 * 'use client';
 * import { useOnChainReady } from '@cinacoin/next/hooks';
 *
 * useOnChainReady(({ address, chainId }) => {
 *   analytics.identify({ wallet: address, chain: chainId });
 * });
 * ```
 */
export function useOnChainReady(
  callback: (state: {
    address: string | null;
    chainId: number | null;
    isConnected: boolean;
  }) => void,
): void {
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;

    try {
      const win = window as unknown as Record<string, unknown>;
      const getter = win.__ocx_eip5792_context as (() => unknown) | undefined;
      if (getter) {
        const ctx = getter() as {
          address?: string | null;
          chainIdHex?: string | null;
          isConnected?: boolean;
        } | null;

        if (ctx) {
          hasFired.current = true;
          callback({
            address: ctx.address ?? null,
            chainId: ctx.chainIdHex ? parseInt(ctx.chainIdHex, 16) : null,
            isConnected: ctx.isConnected ?? false,
          });
        }
      }
    } catch {
      // Context not yet available
    }
  }, [callback]);
}
