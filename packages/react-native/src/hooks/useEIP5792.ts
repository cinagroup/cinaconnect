/**
 * EIP-5792 React Native hooks — Wallet Call API.
 *
 * React Native hooks for the EIP-5792 Wallet Call API using the
 * existing `request<T>()` infrastructure from CinacoinProvider.
 *
 * - useSendCalls — send batch calls via wallet_sendCalls
 * - useAtomicBatch — build and execute atomic batch transactions
 * - useWalletCapabilities — discover wallet capabilities per chain
 *
 * All hooks require being used within <CinacoinProvider>.
 *
 * @see https://eips.ethereum.org/EIPS/eip-5792
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  WalletCapabilities,
  ChainCapabilities,
  Call,
  SendCallsParams,
  SendCallsResult,
  CallsStatus,
  GetCallsStatusResult,
  AtomicBatchConfig,
  AtomicBatchResult,
} from '@cinacoin/core-sdk';
import {
  walletGetCapabilities,
  walletSendCalls,
  walletGetCallsStatus,
  buildAtomicBatch,
  executeAtomicBatch,
  supportsAtomicBatch,
  hasCapability,
  getChainCapabilities,
  getSupportedChains,
  filterByCapability,
  allCallsSucceeded as checkAllCallsSucceeded,
  getFailedReceipts as getFailedReceiptsHelper,
} from '@cinacoin/core-sdk';
import { useCinacoinContext } from '../OnChainUXProvider.js';

// ---------------------------------------------------------------------------
// Internal: build a WalletClient wrapper from the context's request function
// ---------------------------------------------------------------------------

/** Minimal WalletClient-like wrapper using the context request function. */
function toWalletClient(
  request: <T = unknown>(method: string, params: unknown) => Promise<T>,
): { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } {
  return {
    request: (args) => request(args.method, args.params ?? []),
  };
}

// ---------------------------------------------------------------------------
// useWalletCapabilities
// ---------------------------------------------------------------------------

/** Return value for useWalletCapabilities hook. */
export interface UseWalletCapabilitiesReturn {
  /** Full capabilities object keyed by chain ID (hex). */
  capabilities: WalletCapabilities | null;
  /** Whether a fetch is in progress. */
  isLoading: boolean;
  /** Error if the fetch failed. */
  error: Error | null;
  /** Re-fetch capabilities. */
  refetch: () => Promise<void>;
  /** Helper: check if a capability is supported on a chain. */
  has: (chainId: string, capability: keyof ChainCapabilities) => boolean;
  /** Helper: get capabilities for a specific chain. */
  getChainCaps: (chainId: string) => ChainCapabilities;
  /** Helper: list all supported chain IDs. */
  supportedChains: string[];
  /** Helper: filter to chains with a specific capability. */
  filterBy: (capability: keyof ChainCapabilities) => WalletCapabilities;
}

/**
 * Hook to fetch wallet capabilities via `wallet_getCapabilities`.
 *
 * Uses the context's `request<T>()` method to call the JSON-RPC method.
 *
 * ```tsx
 * const { capabilities, has, supportedChains } = useWalletCapabilities();
 *
 * if (has('0x1', 'atomicBatch')) {
 *   // Wallet supports atomic batch on mainnet
 * }
 * ```
 */
export function useWalletCapabilities(): UseWalletCapabilitiesReturn {
  const { account, status, request: ctxRequest } = useCinacoinContext();
  const [capabilities, setCapabilities] = useState<WalletCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isConnected = status === 'connected';
  const address = account.address;

  const fetchCapabilities = useCallback(async () => {
    if (!address || !isConnected) {
      setCapabilities(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const client = toWalletClient(ctxRequest) as any;
      const caps = await walletGetCapabilities(client, address as `0x${string}`);
      setCapabilities(caps);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      // Method not supported — treat as empty capabilities
      if (e.message.includes('-32601')) {
        setCapabilities({});
      }
    } finally {
      setIsLoading(false);
    }
  }, [ctxRequest, address, isConnected]);

  // Auto-fetch on connection
  useEffect(() => {
    if (isConnected && address) {
      fetchCapabilities();
    }
  }, [isConnected, address, fetchCapabilities]);

  const has = useCallback(
    (chainId: string, capability: keyof ChainCapabilities) => {
      if (!capabilities) return false;
      return hasCapability(capabilities, chainId, capability);
    },
    [capabilities],
  );

  const getChainCaps = useCallback(
    (chainId: string) => {
      if (!capabilities) return {};
      return getChainCapabilities(capabilities, chainId);
    },
    [capabilities],
  );

  const supportedChains = capabilities ? getSupportedChains(capabilities) : [];

  const filterBy = useCallback(
    (capability: keyof ChainCapabilities) => {
      if (!capabilities) return {};
      return filterByCapability(capabilities, capability);
    },
    [capabilities],
  );

  return {
    capabilities,
    isLoading,
    error,
    refetch: fetchCapabilities,
    has,
    getChainCaps,
    supportedChains,
    filterBy,
  };
}

// ---------------------------------------------------------------------------
// useSendCalls
// ---------------------------------------------------------------------------

/** Options for sendCalls. */
export interface SendCallsOptions {
  /** Chain ID in hex format (defaults to current chain). */
  chainId?: string;
  /** Override capabilities. */
  capabilities?: WalletCapabilities;
  /** EIP-5792 version string. */
  version?: string;
}

/** Return value for useSendCalls hook. */
export interface UseSendCallsReturn {
  /** Send a batch of calls. Returns batch ID. */
  sendCalls: (calls: Call[], options?: SendCallsOptions) => Promise<string>;
  /** Whether a send is in progress. */
  isSending: boolean;
  /** Error if the send failed. */
  error: Error | null;
  /** Last batch ID returned by wallet_sendCalls. */
  lastCallId: string | null;
}

/**
 * Hook to send batch calls via `wallet_sendCalls`.
 *
 * ```tsx
 * const { sendCalls, isSending, error, lastCallId } = useSendCalls();
 *
 * const handleSend = async () => {
 *   const batchId = await sendCalls([
 *     { to: '0x...', value: '0x0', data: '0x...' },
 *   ]);
 *   console.log('Batch ID:', batchId);
 * };
 * ```
 */
export function useSendCalls(): UseSendCallsReturn {
  const { account, status, request: ctxRequest } = useCinacoinContext();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastCallId, setLastCallId] = useState<string | null>(null);

  const isConnected = status === 'connected';
  const address = account.address;
  const chainIdHex = account.chainId ? `0x${account.chainId.toString(16)}` : '0x1';

  const sendCallsFn = useCallback(
    async (calls: Call[], options?: SendCallsOptions): Promise<string> => {
      if (!address || !isConnected) {
        throw new Error('No wallet connected');
      }

      setIsSending(true);
      setError(null);

      try {
        const client = toWalletClient(ctxRequest) as any;
        const params: SendCallsParams = {
          version: options?.version ?? '1.0.0',
          calls,
          chainId: (options?.chainId ?? chainIdHex) as `0x${string}`,
          from: address as `0x${string}`,
          ...(options?.capabilities ? { capabilities: options.capabilities } : {}),
        };

        const result: SendCallsResult = await walletSendCalls(client, params);
        setLastCallId(result.id);
        return result.id;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setIsSending(false);
      }
    },
    [ctxRequest, isConnected, address, chainIdHex],
  );

  return { sendCalls: sendCallsFn, isSending, error, lastCallId };
}

// ---------------------------------------------------------------------------
// useAtomicBatch
// ---------------------------------------------------------------------------

/** Options for atomic batch execution. */
export interface AtomicBatchOptions {
  /** Chain ID in hex format (defaults to current chain). */
  chainId?: string;
  /** Override capabilities. */
  capabilities?: WalletCapabilities;
  /** EIP-5792 version string. */
  version?: string;
  /** Simulate before sending. */
  simulate?: boolean;
}

/** Return value for useAtomicBatch hook. */
export interface UseAtomicBatchReturn {
  /** Execute a batch of calls atomically. Returns batch ID. */
  executeBatch: (calls: Call[], options?: AtomicBatchOptions) => Promise<string>;
  /** Build batch params without sending (for preview). */
  buildBatch: (calls: Call[], options?: AtomicBatchOptions) => AtomicBatchResult;
  /** Whether execution is in progress. */
  isExecuting: boolean;
  /** Error if execution failed. */
  error: Error | null;
  /** Last batch ID. */
  lastCallId: string | null;
  /** Whether the current chain supports atomic batches. */
  isAtomicSupported: boolean;
}

/**
 * Hook to build and execute atomic batch transactions.
 *
 * Uses EIP-5792 `wallet_sendCalls` for atomic execution.
 *
 * ```tsx
 * const { executeBatch, buildBatch, isExecuting, isAtomicSupported } = useAtomicBatch();
 *
 * // Preview before sending
 * const preview = buildBatch([approveCall, swapCall]);
 * console.log('Is atomic?', preview.isAtomic);
 *
 * // Execute
 * const batchId = await executeBatch([approveCall, swapCall]);
 * ```
 */
export function useAtomicBatch(): UseAtomicBatchReturn {
  const { account, status, request: ctxRequest } = useCinacoinContext();
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastCallId, setLastCallId] = useState<string | null>(null);

  const isConnected = status === 'connected';
  const address = account.address;
  const chainIdHex = account.chainId ? `0x${account.chainId.toString(16)}` : '0x1';
  const isAtomicSupported = supportsAtomicBatch(chainIdHex as `0x${string}`);

  const buildBatch = useCallback(
    (calls: Call[], options?: AtomicBatchOptions): AtomicBatchResult => {
      if (!address) {
        throw new Error('No account address available');
      }

      const config: AtomicBatchConfig = {
        chainId: (options?.chainId ?? chainIdHex) as `0x${string}`,
        from: address as `0x${string}`,
        calls,
        ...(options?.capabilities ? { capabilities: options.capabilities } : {}),
        ...(options?.version ? { version: options.version } : {}),
      };

      return buildAtomicBatch(config);
    },
    [address, chainIdHex],
  );

  const executeBatch = useCallback(
    async (calls: Call[], options?: AtomicBatchOptions): Promise<string> => {
      if (!address || !isConnected) {
        throw new Error('No wallet connected');
      }

      setIsExecuting(true);
      setError(null);

      try {
        const client = toWalletClient(ctxRequest) as any;
        const config: AtomicBatchConfig = {
          chainId: (options?.chainId ?? chainIdHex) as `0x${string}`,
          from: address as `0x${string}`,
          calls,
          ...(options?.capabilities ? { capabilities: options.capabilities } : {}),
          ...(options?.version ? { version: options.version } : {}),
          simulate: options?.simulate,
        };

        const result: SendCallsResult = await executeAtomicBatch(client, config);
        setLastCallId(result.id);
        return result.id;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setIsExecuting(false);
      }
    },
    [ctxRequest, isConnected, address, chainIdHex],
  );

  return {
    executeBatch,
    buildBatch,
    isExecuting,
    error,
    lastCallId,
    isAtomicSupported,
  };
}

// ---------------------------------------------------------------------------
// useCallsStatus
// ---------------------------------------------------------------------------

/** Return value for useCallsStatus hook. */
export interface UseCallsStatusReturn {
  /** Current status of the call batch. */
  status: CallsStatus | null;
  /** Full result with receipts (when confirmed). */
  result: GetCallsStatusResult | null;
  /** Whether polling is active. */
  isPolling: boolean;
  /** Error if polling failed. */
  error: Error | null;
  /** Start polling for a batch ID. */
  startPolling: (batchId: string) => void;
  /** Stop polling. */
  stopPolling: () => void;
  /** Helper: whether all calls succeeded. */
  allSucceeded: boolean;
  /** Helper: get failed receipts. */
  failedReceipts: GetCallsStatusResult['receipts'];
}

/**
 * Hook to poll the status of an async call batch.
 *
 * Automatically polls `wallet_getCallsStatus` at a configurable interval.
 *
 * ```tsx
 * const { status, result, isPolling, startPolling, stopPolling, allSucceeded } = useCallsStatus();
 *
 * // After sending calls:
 * startPolling(batchId);
 *
 * // Stop polling when confirmed or on unmount:
 * useEffect(() => () => stopPolling(), []);
 * ```
 */
export function useCallsStatus(
  options: {
    /** Polling interval in ms. Default: 2000. */
    intervalMs?: number;
    /** Auto-start polling for this batch ID. */
    callId?: string;
  } = {},
): UseCallsStatusReturn {
  const { request: ctxRequest, account } = useCinacoinContext();
  const [status, setStatus] = useState<CallsStatus | null>(null);
  const [result, setResult] = useState<GetCallsStatusResult | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callIdRef = useRef<string | null>(options.callId ?? null);
  const intervalMs = options.intervalMs ?? 2000;
  const statusRef = useRef<CallsStatus | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pollOnce = useCallback(async () => {
    if (!callIdRef.current) return;

    try {
      const client = toWalletClient(ctxRequest) as any;
      const res = await walletGetCallsStatus(client, callIdRef.current);
      setResult(res);
      setStatus(res.status);
      statusRef.current = res.status;
      setError(null);

      if (res.status === 'CONFIRMED') {
        clearTimer();
        setIsPolling(false);
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
    }
  }, [ctxRequest, clearTimer]);

  const startPolling = useCallback(
    (batchId: string) => {
      callIdRef.current = batchId;
      clearTimer();
      setIsPolling(true);
      setError(null);
      setResult(null);
      setStatus(null);
      statusRef.current = null;

      const tick = async () => {
        await pollOnce();
        if (callIdRef.current && statusRef.current !== 'CONFIRMED') {
          intervalRef.current = setTimeout(tick, intervalMs);
        }
      };

      tick();
    },
    [clearTimer, pollOnce, intervalMs],
  );

  const stopPolling = useCallback(() => {
    callIdRef.current = null;
    clearTimer();
    setIsPolling(false);
  }, [clearTimer]);

  // Auto-start if callId was provided
  useEffect(() => {
    if (options.callId) {
      startPolling(options.callId);
    }
    return () => clearTimer();
  }, [options.callId, startPolling, clearTimer]);

  // Stop polling on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const allSucceeded = result ? checkAllCallsSucceeded(result) : false;
  const failedReceipts = getFailedReceiptsHelper(result ?? null as unknown as GetCallsStatusResult);

  return {
    status,
    result,
    isPolling,
    error,
    startPolling,
    stopPolling,
    allSucceeded,
    failedReceipts,
  };
}
