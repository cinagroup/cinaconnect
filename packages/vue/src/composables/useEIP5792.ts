/**
 * EIP-5792 Vue composables — Wallet Call API.
 *
 * Provides Vue 3 composables for the EIP-5792 Wallet Call API:
 * - useWalletCapabilities: discover what a wallet can do per chain
 * - useSendCalls: batch multiple calls into a single wallet interaction
 * - useAtomicBatch: build and execute atomic batch transactions
 * - useCallsStatus: poll the status of async call batches
 *
 * All composables require being used within <CinacoinProvider> and
 * require the provider to expose EIP-5792 support via the global context
 * getter (window.__ocx_eip5792_context).
 *
 * @see https://eips.ethereum.org/EIPS/eip-5792
 */

import { ref, onMounted, onUnmounted, computed, watch, type Ref } from 'vue';
import { useCinacoin } from '../composables.js';
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
} from '@cinacoin/core-sdk';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal EIP-1193 provider shape sufficient for EIP-5792 calls. */
interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

/** Context shape for EIP-5792 composables (provided via global getter). */
interface EIP5792Context {
  /** Raw EIP-1193 provider for RPC calls. */
  provider: EIP1193Provider | null;
  /** Connected account address (or null). */
  address: string | null;
  /** Current chain ID in hex format (e.g. '0x1'). */
  chainIdHex: string | null;
  /** Whether a wallet is currently connected. */
  isConnected: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build a minimal wallet client wrapper from an EIP-1193 provider. */
function toWalletClient(
  provider: EIP1193Provider,
  _address: string,
): { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } {
  return {
    request: (args) => provider!.request(args),
  };
}

/** Read EIP-5792 context from the global getter. */
function getEIP5792Context(): EIP5792Context {
  const win = window as unknown as Record<string, unknown>;
  const getter = win.__ocx_eip5792_context as (() => EIP5792Context) | undefined;
  if (!getter) {
    throw new Error(
      'EIP-5792 composables require <CinacoinProvider> with EIP-5792 support. ' +
      'Make sure you are rendering the provider.',
    );
  }
  return getter();
}

/** Check all calls in a batch succeeded. */
function allCallsSucceeded(result: GetCallsStatusResult): boolean {
  if (result.status !== 'CONFIRMED') return false;
  if (!result.receipts || result.receipts.length === 0) return false;
  return result.receipts.every((r) => r.receipt.status === '0x1');
}

/** Get failed receipts from a batch result. */
function getFailedReceipts(result: GetCallsStatusResult | null) {
  if (!result || result.status !== 'CONFIRMED' || !result.receipts) return [];
  return result.receipts.filter((r) => r.receipt.status === '0x0');
}

// ---------------------------------------------------------------------------
// useWalletCapabilities
// ---------------------------------------------------------------------------

/** Return type for useWalletCapabilities composable. */
export interface UseWalletCapabilitiesReturn {
  /** Full capabilities object keyed by chain ID (hex). */
  capabilities: Ref<WalletCapabilities | null>;
  /** Whether a fetch is in progress. */
  isLoading: Ref<boolean>;
  /** Error if the fetch failed. */
  error: Ref<Error | null>;
  /** Re-fetch capabilities. */
  refetch: () => Promise<void>;
  /** Helper: check if a capability is supported on a chain. */
  has: (chainId: string, capability: keyof ChainCapabilities) => boolean;
  /** Helper: get capabilities for a specific chain. */
  getChainCaps: (chainId: string) => ChainCapabilities;
  /** Helper: list all supported chain IDs (computed). */
  supportedChains: Ref<string[]>;
  /** Helper: filter to chains with a specific capability (computed). */
  filterBy: (capability: keyof ChainCapabilities) => WalletCapabilities;
}

/**
 * Composable to fetch wallet capabilities via `wallet_getCapabilities`.
 *
 * Returns per-chain capability info (paymasterService, atomicBatch, etc.).
 *
 * ```vue
 * <script setup>
 * const { capabilities, has, supportedChains } = useWalletCapabilities()
 *
 * if (has('0x1', 'atomicBatch')) {
 *   // Wallet supports atomic batch on mainnet
 * }
 * </script>
 * ```
 */
export function useWalletCapabilities(): UseWalletCapabilitiesReturn {
  useCinacoin(); // ensure provider context exists

  const capabilities = ref<WalletCapabilities | null>(null);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  const fetchCapabilities = async () => {
    const ctx = getEIP5792Context();
    if (!ctx.provider || !ctx.isConnected) {
      capabilities.value = null;
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const client = toWalletClient(ctx.provider, ctx.address!);
      const caps = await walletGetCapabilities(
        client as any,
        ctx.address as `0x${string}`,
      );
      capabilities.value = caps;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      error.value = e;
      // Method not supported — treat as empty capabilities
      if (e.message.includes('-32601')) {
        capabilities.value = {};
      }
    } finally {
      isLoading.value = false;
    }
  };

  const has = (chainId: string, capability: keyof ChainCapabilities): boolean => {
    if (!capabilities.value) return false;
    return hasCapability(capabilities.value, chainId, capability);
  };

  const getChainCaps = (chainId: string): ChainCapabilities => {
    if (!capabilities.value) return {};
    return getChainCapabilities(capabilities.value, chainId);
  };

  const supportedChains = computed(() =>
    capabilities.value ? getSupportedChains(capabilities.value) : [],
  );

  const filterBy = (capability: keyof ChainCapabilities): WalletCapabilities => {
    if (!capabilities.value) return {};
    return filterByCapability(capabilities.value, capability);
  };

  // Auto-fetch when component mounts
  onMounted(() => {
    const ctx = getEIP5792Context();
    if (ctx.isConnected && ctx.provider) {
      fetchCapabilities();
    }
  });

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

/** Return type for useSendCalls composable. */
export interface UseSendCallsReturn {
  /** Send a batch of calls. Returns batch ID. */
  sendCalls: (calls: Call[], options?: SendCallsOptions) => Promise<string>;
  /** Whether a send is in progress. */
  isSending: Ref<boolean>;
  /** Error if the send failed. */
  error: Ref<Error | null>;
  /** Last batch ID returned by wallet_sendCalls. */
  lastCallId: Ref<string | null>;
}

/**
 * Composable to send batch calls via `wallet_sendCalls`.
 *
 * ```vue
 * <script setup>
 * const { sendCalls, isSending, error, lastCallId } = useSendCalls()
 *
 * const handleSend = async () => {
 *   const batchId = await sendCalls([
 *     { to: '0x...', value: '0x0', data: '0x...' },
 *   ])
 *   console.log('Batch ID:', batchId)
 * }
 * </script>
 * ```
 */
export function useSendCalls(): UseSendCallsReturn {
  useCinacoin(); // ensure provider context exists

  const isSending = ref(false);
  const error = ref<Error | null>(null);
  const lastCallId = ref<string | null>(null);

  const sendCallsFn = async (
    calls: Call[],
    options?: SendCallsOptions,
  ): Promise<string> => {
    const ctx = getEIP5792Context();
    if (!ctx.provider || !ctx.isConnected) {
      throw new Error('No wallet connected');
    }
    if (!ctx.address) {
      throw new Error('No account address available');
    }

    isSending.value = true;
    error.value = null;

    try {
      const client = toWalletClient(ctx.provider, ctx.address);
      const params: SendCallsParams = {
        version: options?.version ?? '1.0.0',
        calls,
        chainId: (options?.chainId ?? ctx.chainIdHex ?? '0x1') as `0x${string}`,
        from: ctx.address as `0x${string}`,
        ...(options?.capabilities ? { capabilities: options.capabilities } : {}),
      };

      const result: SendCallsResult = await walletSendCalls(client as any, params);
      lastCallId.value = result.id;
      return result.id;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      error.value = e;
      throw e;
    } finally {
      isSending.value = false;
    }
  };

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

/** Return type for useAtomicBatch composable. */
export interface UseAtomicBatchReturn {
  /** Execute a batch of calls atomically. Returns batch ID. */
  executeBatch: (calls: Call[], options?: AtomicBatchOptions) => Promise<string>;
  /** Build batch params without sending (for preview). */
  buildBatch: (calls: Call[], options?: AtomicBatchOptions) => AtomicBatchResult;
  /** Whether execution is in progress. */
  isExecuting: Ref<boolean>;
  /** Error if execution failed. */
  error: Ref<Error | null>;
  /** Last batch ID. */
  lastCallId: Ref<string | null>;
  /** Whether the current chain supports atomic batches. */
  isAtomicSupported: Ref<boolean>;
}

/**
 * Composable to build and execute atomic batch transactions.
 *
 * Uses EIP-5792 `wallet_sendCalls` for atomic execution.
 *
 * ```vue
 * <script setup>
 * const { executeBatch, buildBatch, isExecuting, isAtomicSupported } = useAtomicBatch()
 *
 * // Preview before sending
 * const preview = buildBatch([approveCall, swapCall])
 * console.log('Is atomic?', preview.isAtomic)
 *
 * // Execute
 * const batchId = await executeBatch([approveCall, swapCall])
 * </script>
 * ```
 */
export function useAtomicBatch(): UseAtomicBatchReturn {
  useCinacoin(); // ensure provider context exists

  const isExecuting = ref(false);
  const error = ref<Error | null>(null);
  const lastCallId = ref<string | null>(null);

  const ctx = getEIP5792Context();
  const chainIdHex = ctx.chainIdHex ?? '0x1';
  const isAtomicSupported = ref(supportsAtomicBatch(chainIdHex as `0x${string}`));

  const buildBatch = (calls: Call[], options?: AtomicBatchOptions): AtomicBatchResult => {
    const context = getEIP5792Context();
    if (!context.address) {
      throw new Error('No account address available');
    }

    const config: AtomicBatchConfig = {
      chainId: (options?.chainId ?? context.chainIdHex ?? '0x1') as `0x${string}`,
      from: context.address as `0x${string}`,
      calls,
      ...(options?.capabilities ? { capabilities: options.capabilities } : {}),
      ...(options?.version ? { version: options.version } : {}),
    };

    return buildAtomicBatch(config);
  };

  const executeBatchFn = async (
    calls: Call[],
    options?: AtomicBatchOptions,
  ): Promise<string> => {
    const context = getEIP5792Context();
    if (!context.provider || !context.isConnected) {
      throw new Error('No wallet connected');
    }
    if (!context.address) {
      throw new Error('No account address available');
    }

    isExecuting.value = true;
    error.value = null;

    try {
      const client = toWalletClient(context.provider, context.address);
      const config: AtomicBatchConfig = {
        chainId: (options?.chainId ?? context.chainIdHex ?? '0x1') as `0x${string}`,
        from: context.address as `0x${string}`,
        calls,
        ...(options?.capabilities ? { capabilities: options.capabilities } : {}),
        ...(options?.version ? { version: options.version } : {}),
        simulate: options?.simulate,
      };

      const result: SendCallsResult = await executeAtomicBatch(client as any, config);
      lastCallId.value = result.id;
      return result.id;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      error.value = e;
      throw e;
    } finally {
      isExecuting.value = false;
    }
  };

  return {
    executeBatch: executeBatchFn,
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

/** Return type for useCallsStatus composable. */
export interface UseCallsStatusReturn {
  /** Current status of the call batch. */
  status: Ref<CallsStatus | null>;
  /** Full result with receipts (when confirmed). */
  result: Ref<GetCallsStatusResult | null>;
  /** Whether polling is active. */
  isPolling: Ref<boolean>;
  /** Error if polling failed. */
  error: Ref<Error | null>;
  /** Start polling for a batch ID. */
  startPolling: (batchId: string) => void;
  /** Stop polling. */
  stopPolling: () => void;
  /** Helper: whether all calls succeeded. */
  allSucceeded: Ref<boolean>;
  /** Helper: get failed receipts. */
  failedReceipts: Ref<GetCallsStatusResult['receipts']>;
}

/**
 * Composable to poll the status of an async call batch.
 *
 * Automatically polls `wallet_getCallsStatus` at a configurable interval.
 *
 * ```vue
 * <script setup>
 * const { status, result, isPolling, startPolling, stopPolling, allSucceeded } = useCallsStatus()
 *
 * // After sending calls:
 * startPolling(batchId)
 * </script>
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
  useCinacoin(); // ensure provider context exists

  const status = ref<CallsStatus | null>(null);
  const result = ref<GetCallsStatusResult | null>(null);
  const isPolling = ref(false);
  const error = ref<Error | null>(null);

  const intervalMs = options.intervalMs ?? 2000;

  let timerId: ReturnType<typeof setTimeout> | null = null;
  let currentCallId: string | null = options.callId ?? null;

  const clearTimer = () => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  const pollOnce = async () => {
    if (!currentCallId) return;

    try {
      const ctx = getEIP5792Context();
      if (!ctx.provider) return;

      const client = toWalletClient(ctx.provider, ctx.address ?? '0x0');
      const res = await walletGetCallsStatus(client as any, currentCallId);
      result.value = res;
      status.value = res.status;
      error.value = null;

      if (res.status === 'CONFIRMED') {
        clearTimer();
        isPolling.value = false;
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      error.value = e;
    }
  };

  const startPolling = (batchId: string) => {
    currentCallId = batchId;
    clearTimer();
    isPolling.value = true;
    error.value = null;
    result.value = null;
    status.value = null;

    const tick = async () => {
      await pollOnce();
      if (currentCallId && status.value !== 'CONFIRMED') {
        timerId = setTimeout(tick, intervalMs);
      }
    };

    tick();
  };

  const stopPolling = () => {
    currentCallId = null;
    clearTimer();
    isPolling.value = false;
  };

  const allSucceeded = computed(() =>
    result.value ? allCallsSucceeded(result.value) : false,
  );

  const failedReceipts = computed(() => getFailedReceipts(result.value));

  // Auto-start if callId was provided
  if (options.callId) {
    onMounted(() => {
      startPolling(options.callId!);
    });
  }

  // Cleanup on unmount
  onUnmounted(() => {
    clearTimer();
  });

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
