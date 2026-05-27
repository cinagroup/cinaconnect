/**
 * EIP-5792 Svelte stores — Wallet Call API.
 *
 * Provides Svelte stores and functions for the EIP-5792 Wallet Call API:
 * - walletCapabilities: readable store with per-chain wallet capabilities
 * - sendCalls(): function returning a writable store for call status
 * - atomicBatch(): function for atomic batch execution
 * - callsStatus(callId): readable store with auto-polling
 *
 * Also exports helpers: has, getChainCaps, filterBy, allSucceeded, failedReceipts
 *
 * All stores require being used within a CinacoinProvider that
 * exposes EIP-5792 support via the global context getter
 * (window.__ocx_eip5792_context).
 *
 * @see https://eips.ethereum.org/EIPS/eip-5792
 * @packageDocumentation
 */

import {
  writable,
  readable,
  derived,
  type Readable,
  type Writable,
} from 'svelte/store';
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

/** Context shape for EIP-5792 stores (provided via global getter). */
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

/** Options for sendCalls function. */
export interface SendCallsOptions {
  /** Chain ID in hex format (defaults to current chain). */
  chainId?: string;
  /** Override capabilities. */
  capabilities?: WalletCapabilities;
  /** EIP-5792 version string. */
  version?: string;
}

/** Options for atomicBatch function. */
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

/** Return shape from sendCalls(). */
export interface SendCallsStore {
  /** Writable: batch ID returned by wallet_sendCalls (null before send). */
  callId: Writable<string | null>;
  /** Readable: whether a send is in progress. */
  isSending: Readable<boolean>;
  /** Readable: error if the send failed (null otherwise). */
  error: Readable<Error | null>;
  /** Send a batch of calls. */
  send: (calls: Call[], options?: SendCallsOptions) => Promise<string>;
}

/** Return shape from atomicBatch(). */
export interface AtomicBatchStore {
  /** Writable: batch ID (null before execute). */
  callId: Writable<string | null>;
  /** Readable: whether execution is in progress. */
  isExecuting: Readable<boolean>;
  /** Readable: error if execution failed (null otherwise). */
  error: Readable<Error | null>;
  /** Readable: whether current chain supports atomic batches. */
  isAtomicSupported: Readable<boolean>;
  /** Execute a batch of calls atomically. */
  execute: (calls: Call[], options?: AtomicBatchOptions) => Promise<string>;
  /** Build batch params without sending (for preview). */
  build: (calls: Call[], options?: AtomicBatchOptions) => AtomicBatchResult;
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
      'EIP-5792 stores require <CinacoinProvider> with EIP-5792 support. ' +
      'Make sure you are rendering the provider.',
    );
  }
  return getter();
}

/** Check all calls in a batch succeeded. */
export function allSucceeded(result: GetCallsStatusResult): boolean {
  if (result.status !== 'CONFIRMED') return false;
  if (!result.receipts || result.receipts.length === 0) return false;
  return result.receipts.every((r) => r.receipt.status === '0x1');
}

/** Get failed receipts from a batch result. */
export function failedReceipts(result: GetCallsStatusResult | null) {
  if (!result || result.status !== 'CONFIRMED' || !result.receipts) return [];
  return result.receipts.filter((r) => r.receipt.status === '0x0');
}

// ---------------------------------------------------------------------------
// walletCapabilities — readable store with per-chain capabilities
// ---------------------------------------------------------------------------

/**
 * A readable store holding wallet capabilities fetched via `wallet_getCapabilities`.
 *
 * The store is null until fetched. Use the helper stores/functions below to
 * inspect capabilities.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { walletCapabilities, has, getChainCaps, filterBy } from '@cinacoin/svelte';
 *
 *   // Helper: check support on a specific chain
 *   const supportsAtomic = has('0x1', 'atomicBatch');
 *
 *   // Derived: all chains with atomic batch support
 *   const atomicChains = filterBy('atomicBatch');
 * </script>
 *
 * {#if $walletCapabilities}
 *   <p>Capabilities loaded!</p>
 * {/if}
 * ```
 */
export const walletCapabilities: Readable<WalletCapabilities | null> = readable<WalletCapabilities | null>(
  null,
  (set) => {
    // We don't auto-fetch here; the consumer must call fetchWalletCapabilities()
    // or use the helper functions. This store is kept simple — the global context
    // is read at fetch time, not at subscription time.
    return () => {};
  },
);

/** Internal writable backing for walletCapabilities. */
const _capabilitiesWritable: Writable<WalletCapabilities | null> = writable<WalletCapabilities | null>(null);

/** Internal derived for isLoading flag. */
const _capabilitiesLoading: Writable<boolean> = writable(false);
const _capabilitiesError: Writable<Error | null> = writable(null);

/** Readable: whether a capability fetch is in progress. */
export const capabilitiesLoading: Readable<boolean> = _capabilitiesLoading;
/** Readable: error from last capability fetch (null if none). */
export const capabilitiesError: Readable<Error | null> = _capabilitiesError;

/**
 * Fetch wallet capabilities and update the walletCapabilities store.
 *
 * Call this when you need to refresh capabilities or after connecting.
 */
export async function fetchWalletCapabilities(): Promise<WalletCapabilities | null> {
  const ctx = getEIP5792Context();
  if (!ctx.provider || !ctx.isConnected) {
    _capabilitiesWritable.set(null);
    return null;
  }

  _capabilitiesLoading.set(true);
  _capabilitiesError.set(null);

  try {
    const client = toWalletClient(ctx.provider, ctx.address!);
    const caps = await walletGetCapabilities(
      client as any,
      ctx.address as `0x${string}`,
    );
    _capabilitiesWritable.set(caps);
    return caps;
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    _capabilitiesError.set(e);
    // Method not supported — treat as empty capabilities
    if (e.message.includes('-32601')) {
      _capabilitiesWritable.set({});
      return {};
    }
    throw e;
  } finally {
    _capabilitiesLoading.set(false);
  }
}

// ---------------------------------------------------------------------------
// Helper: has — check if a capability is supported on a chain
// ---------------------------------------------------------------------------

/**
 * Check whether a specific capability is supported on a given chain.
 *
 * Reads from the current walletCapabilities store value synchronously.
 *
 * @param chainId - Chain ID in hex format (e.g. '0x1').
 * @param capability - Capability key (e.g. 'atomicBatch', 'paymasterService').
 * @returns `true` if the capability is present and enabled.
 *
 * @example
 * ```ts
 * if (has('0x1', 'atomicBatch')) {
 *   // capability supported
 * }
 * ```
 */
export function has(chainId: string, capability: keyof ChainCapabilities): boolean {
  let caps: WalletCapabilities | null = null;
  _capabilitiesWritable.subscribe((v) => { caps = v; })();
  if (!caps) return false;
  return hasCapability(caps, chainId, capability);
}

// ---------------------------------------------------------------------------
// Helper: getChainCaps — get capabilities for a specific chain
// ---------------------------------------------------------------------------

/**
 * Get the capabilities object for a specific chain.
 *
 * @param chainId - Chain ID in hex format.
 * @returns ChainCapabilities object (empty if not found).
 */
export function getChainCaps(chainId: string): ChainCapabilities {
  let caps: WalletCapabilities | null = null;
  _capabilitiesWritable.subscribe((v) => { caps = v; })();
  if (!caps) return {};
  return getChainCapabilities(caps, chainId);
}

// ---------------------------------------------------------------------------
// Helper: filterBy — filter capabilities to chains with a specific capability
// ---------------------------------------------------------------------------

/**
 * Filter wallet capabilities to only chains that support a given capability.
 *
 * @param capability - Capability key to filter by.
 * @returns WalletCapabilities object containing only matching chains.
 */
export function filterBy(capability: keyof ChainCapabilities): WalletCapabilities {
  let caps: WalletCapabilities | null = null;
  _capabilitiesWritable.subscribe((v) => { caps = v; })();
  if (!caps) return {};
  return filterByCapability(caps, capability);
}

// ---------------------------------------------------------------------------
// sendCalls() — returns a writable store for call status
// ---------------------------------------------------------------------------

/**
 * Create a send-calls store for batch-sending calls via `wallet_sendCalls`.
 *
 * Each call returns a fresh store object with `callId`, `isSending`, `error`,
 * and a `send()` method.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { sendCalls } from '@cinacoin/svelte';
 *
 *   const batch = sendCalls();
 *
 *   async function handleSend() {
 *     const callId = await batch.send([
 *       { to: '0x...', value: '0x0', data: '0x...' },
 *     ]);
 *     console.log('Batch ID:', callId);
 *   }
 * </script>
 *
 * {#if $batch.isSending}Sending...{/if}
 * {#if $batch.error}Error: {$batch.error.message}{/if}
 * ```
 */
export function sendCalls(): SendCallsStore {
  const callId: Writable<string | null> = writable<string | null>(null);
  const isSending: Writable<boolean> = writable(false);
  const error: Writable<Error | null> = writable<Error | null>(null);

  const send = async (
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

    isSending.set(true);
    error.set(null);

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
      callId.set(result.id);
      return result.id;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      error.set(e);
      throw e;
    } finally {
      isSending.set(false);
    }
  };

  return { callId, isSending, error, send };
}

// ---------------------------------------------------------------------------
// atomicBatch() — function for atomic batch execution
// ---------------------------------------------------------------------------

/**
 * Create an atomic-batch store for building and executing atomic batch
 * transactions via `wallet_sendCalls`.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { atomicBatch } from '@cinacoin/svelte';
 *
 *   const batch = atomicBatch();
 *
 *   // Preview
 *   const preview = batch.build([approveCall, swapCall]);
 *   console.log('Is atomic?', preview.isAtomic);
 *
 *   // Execute
 *   const callId = await batch.execute([approveCall, swapCall]);
 * </script>
 * ```
 */
export function atomicBatch(): AtomicBatchStore {
  const callId: Writable<string | null> = writable<string | null>(null);
  const isExecuting: Writable<boolean> = writable(false);
  const error: Writable<Error | null> = writable<Error | null>(null);

  const ctx = getEIP5792Context();
  const chainIdHex = ctx.chainIdHex ?? '0x1';
  const isAtomicSupported = readable(supportsAtomicBatch(chainIdHex as `0x${string}`));

  const build = (calls: Call[], options?: AtomicBatchOptions): AtomicBatchResult => {
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

  const execute = async (
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

    isExecuting.set(true);
    error.set(null);

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
      callId.set(result.id);
      return result.id;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      error.set(e);
      throw e;
    } finally {
      isExecuting.set(false);
    }
  };

  return { callId, isExecuting, error, isAtomicSupported, execute, build };
}

// ---------------------------------------------------------------------------
// callsStatus(callId) — readable store with auto-polling
// ---------------------------------------------------------------------------

/** Return shape from callsStatus(). */
export interface CallsStatusStore {
  /** Readable: current status string (e.g. 'PENDING', 'CONFIRMED'). */
  status: Readable<CallsStatus | null>;
  /** Readable: full result with receipts (when confirmed). */
  result: Readable<GetCallsStatusResult | null>;
  /** Readable: whether polling is active. */
  isPolling: Readable<boolean>;
  /** Readable: error if polling failed (null otherwise). */
  error: Readable<Error | null>;
  /** Start polling for a batch ID. */
  startPolling: (batchId: string) => void;
  /** Stop polling. */
  stopPolling: () => void;
  /** Readable: whether all calls in the batch succeeded. */
  allSucceeded: Readable<boolean>;
  /** Readable: array of failed receipts. */
  failedReceipts: Readable<GetCallsStatusResult['receipts']>;
}

/**
 * Create a calls-status store with auto-polling for a batch ID.
 *
 * Polls `wallet_getCallsStatus` at the specified interval until the
 * batch is confirmed.
 *
 * @param callId - Optional batch ID to start polling immediately.
 * @param options.intervalMs - Polling interval in ms (default: 2000).
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { callsStatus } from '@cinacoin/svelte';
 *
 *   const status = callsStatus();
 *
 *   // After sending:
 *   status.startPolling(batchId);
 * </script>
 *
 * {#if $status.isPolling}Polling...{/if}
 * {#if $status.status === 'CONFIRMED'}
 *   {#if $status.allSucceeded}✅ All calls succeeded{/if}
 *   {#if $status.failedReceipts.length > 0}
 *     ❌ {#each $status.failedReceipts as r}
 *       Receipt {r.id} failed
 *     {/each}
 *   {/if}
 * {/if}
 * ```
 */
export function callsStatus(
  callId?: string,
  options: {
    /** Polling interval in ms. Default: 2000. */
    intervalMs?: number;
  } = {},
): CallsStatusStore {
  const statusStore: Writable<CallsStatus | null> = writable<CallsStatus | null>(null);
  const resultStore: Writable<GetCallsStatusResult | null> = writable<GetCallsStatusResult | null>(null);
  const isPollingStore: Writable<boolean> = writable(false);
  const errorStore: Writable<Error | null> = writable<Error | null>(null);

  const intervalMs = options.intervalMs ?? 2000;

  let timerId: ReturnType<typeof setTimeout> | null = null;
  let currentCallId: string | null = callId ?? null;

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
      resultStore.set(res);
      statusStore.set(res.status);
      errorStore.set(null);

      if (res.status === 'CONFIRMED') {
        clearTimer();
        isPollingStore.set(false);
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      errorStore.set(e);
    }
  };

  const startPolling = (batchId: string) => {
    currentCallId = batchId;
    clearTimer();
    isPollingStore.set(true);
    errorStore.set(null);
    resultStore.set(null);
    statusStore.set(null);

    const tick = async () => {
      await pollOnce();
      if (currentCallId) {
        let currentStatus: CallsStatus | null = null;
        statusStore.subscribe((v) => { currentStatus = v; })();
        if (currentStatus !== 'CONFIRMED') {
          timerId = setTimeout(tick, intervalMs);
        }
      }
    };

    tick();
  };

  const stopPolling = () => {
    currentCallId = null;
    clearTimer();
    isPollingStore.set(false);
  };

  // Derived: all succeeded
  const allSucceededStore = derived(resultStore, ($result) =>
    $result ? allSucceeded($result) : false,
  );

  // Derived: failed receipts
  const failedReceiptsStore = derived(resultStore, ($result) =>
    failedReceipts($result),
  );

  // Auto-start if callId was provided
  if (callId) {
    startPolling(callId);
  }

  return {
    status: statusStore,
    result: resultStore,
    isPolling: isPollingStore,
    error: errorStore,
    startPolling,
    stopPolling,
    allSucceeded: allSucceededStore,
    failedReceipts: failedReceiptsStore,
  };
}
