'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import DemoLayout from '@/components/DemoLayout';
import { useWallet, shortenAddress } from '@/lib/useWallet';
import { useToast } from '@/lib/toast';
import {
  buildBatchTx,
  estimateBatchGas,
  executeBatchTx,
  checkEIP5792Support,
  type Call,
  type GasEstimate,
  type BatchResult,
  type CallsStatus,
  getBatchStatus,
  type EIP1193Provider,
} from '@/lib/batch';

/* ────────────────────────────────────────────────────────
   Inline EIP-5792 hooks (copied from @cinacoin/react)
   ────────────────────────────────────────────────────────
   We inline these to avoid monorepo module-resolution issues
   where webpack can't resolve @cinacoin/core-sdk from the
   pre-compiled dist/ of @cinacoin/react.
   ──────────────────────────────────────────────────────── */

interface EIP5792Context {
  provider: EIP1193Provider | null;
  address: string | null;
  chainIdHex: string | null;
  isConnected: boolean;
}

interface ChainCapabilities {
  atomicBatch?: Record<string, unknown>;
  paymasterService?: Record<string, unknown>;
  sessionKeys?: Record<string, unknown>;
  permissions?: Record<string, unknown>;
}

interface WalletCapabilities {
  [chainIdHex: string]: ChainCapabilities;
}

function useEIP5792Context(): EIP5792Context {
  const [ctx, setCtx] = useState<EIP5792Context | null>(null);
  useEffect(() => {
    const win = window as unknown as Record<string, unknown>;
    const getter = win.__ocx_eip5792_context as (() => EIP5792Context) | undefined;
    if (getter) {
      setCtx(getter());
    }
  }, []);
  if (!ctx) {
    return { provider: null, address: null, chainIdHex: null, isConnected: false };
  }
  return ctx;
}

/* ── useWalletCapabilities ── */

interface UseWalletCapabilitiesReturn {
  capabilities: WalletCapabilities | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  has: (chainId: string, capability: keyof ChainCapabilities) => boolean;
  getChainCaps: (chainId: string) => ChainCapabilities;
  supportedChains: string[];
  filterBy: (capability: keyof ChainCapabilities) => WalletCapabilities;
}

function useWalletCapabilities(): UseWalletCapabilitiesReturn {
  const ctx = useEIP5792Context();
  const [capabilities, setCapabilities] = useState<WalletCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCapabilities = useCallback(async () => {
    if (!ctx.provider || !ctx.isConnected) {
      setCapabilities(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const caps = (await ctx.provider.request({
        method: 'wallet_getCapabilities',
        params: [ctx.address as `0x${string}`],
      })) as WalletCapabilities;
      setCapabilities(caps);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      if (e.message.includes('-32601')) {
        setCapabilities({});
      }
    } finally {
      setIsLoading(false);
    }
  }, [ctx.provider, ctx.address, ctx.isConnected]);

  useEffect(() => {
    if (ctx.isConnected && ctx.provider) {
      fetchCapabilities();
    }
  }, [ctx.isConnected, ctx.provider, fetchCapabilities]);

  const has = useCallback(
    (chainId: string, capability: keyof ChainCapabilities) => {
      if (!capabilities) return false;
      return !!capabilities[chainId]?.[capability];
    },
    [capabilities],
  );

  const getChainCaps = useCallback(
    (chainId: string) => {
      if (!capabilities) return {};
      return capabilities[chainId] ?? {};
    },
    [capabilities],
  );

  const supportedChains = capabilities ? Object.keys(capabilities) : [];

  const filterBy = useCallback(
    (capability: keyof ChainCapabilities): WalletCapabilities => {
      if (!capabilities) return {};
      const result: WalletCapabilities = {};
      for (const [chainId, caps] of Object.entries(capabilities)) {
        if (caps?.[capability]) {
          result[chainId] = caps as ChainCapabilities;
        }
      }
      return result;
    },
    [capabilities],
  );

  return { capabilities, isLoading, error, refetch: fetchCapabilities, has, getChainCaps, supportedChains, filterBy };
}

/* ── useCallsStatus ── */

interface UseCallsStatusReturn {
  status: string | null;
  result: CallsStatus | null;
  isPolling: boolean;
  error: Error | null;
  startPolling: (batchId: string) => void;
  stopPolling: () => void;
  allSucceeded: boolean;
  failedReceipts: CallsStatus['receipts'];
}

function useCallsStatus(
  options: { intervalMs?: number; callId?: string } = {},
): UseCallsStatusReturn {
  const ctx = useEIP5792Context();
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<CallsStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callIdRef = useRef<string | null>(options.callId ?? null);
  const intervalMs = options.intervalMs ?? 2000;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pollOnce = useCallback(async () => {
    if (!callIdRef.current || !ctx.provider) return;
    try {
      const res = await getBatchStatus(ctx.provider, callIdRef.current);
      setResult(res);
      setStatus(res.status);
      setError(null);
      if (res.status === 'CONFIRMED') {
        clearTimer();
        setIsPolling(false);
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
    }
  }, [ctx.provider, clearTimer]);

  const startPolling = useCallback(
    (batchId: string) => {
      callIdRef.current = batchId;
      clearTimer();
      setIsPolling(true);
      setError(null);
      setResult(null);
      setStatus(null);

      const tick = async () => {
        await pollOnce();
        if (callIdRef.current) {
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

  useEffect(() => {
    if (options.callId) startPolling(options.callId);
    return () => clearTimer();
  }, [options.callId, startPolling, clearTimer]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const allSucceeded = result
    ? result.status === 'CONFIRMED' && !!result.receipts && result.receipts.length > 0 && result.receipts.every((r) => r.receipt.status === '0x1')
    : false;

  const failedReceipts = result && result.status === 'CONFIRMED' && result.receipts
    ? result.receipts.filter((r) => r.receipt.status === '0x0')
    : [];

  return { status, result, isPolling, error, startPolling, stopPolling, allSucceeded, failedReceipts };
}

/* ────────────────────────────────────────────────────────
   Chain names lookup
   ──────────────────────────────────────────────────────── */

const CHAIN_NAMES: Record<string, string> = {
  '0x1': 'Ethereum Mainnet',
  '0x89': 'Polygon',
  '0xa4b1': 'Arbitrum One',
  '0xa': 'Optimism',
  '0x2105': 'Base',
  '0x38': 'BNB Chain',
  '0xa86a': 'Avalanche',
  '0xaa36a7': 'Sepolia',
  '0x5': 'Goerli',
  '0x13881': 'Mumbai',
  '0x144': 'zkSync Mainnet',
};

function chainLabel(chainIdHex: string): string {
  return CHAIN_NAMES[chainIdHex] ?? `Chain ${parseInt(chainIdHex, 16)}`;
}

/* ────────────────────────────────────────────────────────
   UI Components
   ──────────────────────────────────────────────────────── */

function CapBadge({ label, supported }: { label: string; supported: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        supported
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
          : 'bg-gray-700/50 text-gray-500 border border-gray-600/30'
      }`}
    >
      <span className={`size-1.5 rounded-full ${supported ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    CONFIRMED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    REVERTED: 'bg-red-500/15 text-red-400 border-red-500/25',
    COMPLETE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[status] ?? 'bg-gray-700/50 text-gray-400 border-gray-600/30'}`}>
      {status === 'PENDING' && <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />}
      {status === 'CONFIRMED' && <span className="size-1.5 rounded-full bg-emerald-400" />}
      {status === 'REVERTED' && <span className="size-1.5 rounded-full bg-red-400" />}
      {status}
    </span>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────
   EIP-5792 Context Bridge
   ──────────────────────────────────────────────────────── */

function EIP5792Bridge({
  address,
  chainId,
  isConnected,
}: {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
}) {
  const addressRef = useRef(address);
  addressRef.current = address;
  const chainIdRef = useRef(chainId);
  chainIdRef.current = chainId;
  const connectedRef = useRef(isConnected);
  connectedRef.current = isConnected;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const eth = (window as unknown as Record<string, unknown>).ethereum;
    const provider =
      eth && typeof (eth as Record<string, unknown>).request === 'function'
        ? (eth as EIP1193Provider)
        : null;

    const getter = () => ({
      provider,
      address: addressRef.current,
      chainIdHex: chainIdRef.current ? `0x${chainIdRef.current.toString(16)}` : null,
      isConnected: connectedRef.current,
    });

    (window as unknown as Record<string, unknown>).__ocx_eip5792_context = getter;
    return () => {
      delete (window as unknown as Record<string, unknown>).__ocx_eip5792_context;
    };
  }, []);

  return null;
}

/* ────────────────────────────────────────────────────────
   Main Page
   ──────────────────────────────────────────────────────── */

export default function BatchPage() {
  const { account, status, error, connectors, connect, disconnect } = useWallet();
  const { success, error: toastError, info } = useToast();
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  const address = account.address;
  const chainId = account.chainId;
  const currentChainHex = chainId ? `0x${chainId.toString(16)}` : null;

  const capabilities = useWalletCapabilities();
  const callsStatus = useCallsStatus();

  const [batchCalls, setBatchCalls] = useState<{ to: string; value: string; data: string }[]>([
    { to: address ?? '0x0000000000000000000000000000000000000000', value: '0x0', data: '0x' },
  ]);
  const [showPreview, setShowPreview] = useState(false);
  const [lastAction, setLastAction] = useState<'send' | 'batch' | null>(null);

  // Real batch service state
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [estimatingGas, setEstimatingGas] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [eip5792Supported, setEip5792Supported] = useState<boolean | null>(null);

  useEffect(() => {
    if (address && batchCalls.length === 1 && batchCalls[0].to === '0x0000000000000000000000000000000000000000') {
      setBatchCalls((prev) => prev.map((c) => ({ ...c, to: address })));
    }
  }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => callsStatus.stopPolling(), [callsStatus.stopPolling]);

  // Check EIP-5792 support on connect
  useEffect(() => {
    if (!isConnected || !address) {
      setEip5792Supported(null);
      return;
    }
    const eth = (window as unknown as Record<string, unknown>).ethereum as EIP1193Provider | undefined;
    if (!eth) return;
    checkEIP5792Support(eth, address)
      .then(setEip5792Supported)
      .catch(() => setEip5792Supported(false));
  }, [isConnected, address]);

  const handleAddCall = useCallback(() => {
    setBatchCalls((prev) => [...prev, { to: '', value: '0x0', data: '0x' }]);
    setGasEstimate(null);
    setBatchResult(null);
  }, []);

  const handleRemoveCall = useCallback((index: number) => {
    setBatchCalls((prev) => prev.filter((_, i) => i !== index));
    setGasEstimate(null);
    setBatchResult(null);
  }, []);

  const handleUpdateCall = useCallback((index: number, field: string, value: string) => {
    setBatchCalls((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
    setGasEstimate(null);
    setBatchResult(null);
  }, []);

  /** Estimate gas for the current batch via real RPC calls. */
  const handleEstimateGas = useCallback(async () => {
    const eth = (window as unknown as Record<string, unknown>).ethereum as EIP1193Provider | undefined;
    if (!eth || !address) return;

    const calls = batchCalls.map((c) => ({
      to: c.to as `0x${string}`,
      value: c.value as `0x${string}`,
      data: c.data as `0x${string}`,
    }));

    const validated = buildBatchTx(calls);
    if (!validated.valid) {
      toastError(`Invalid batch: ${validated.error}`);
      return;
    }

    setEstimatingGas(true);
    try {
      const estimate = await estimateBatchGas(eth, address, validated.calls);
      setGasEstimate(estimate);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gas estimation failed';
      toastError(message);
    } finally {
      setEstimatingGas(false);
    }
  }, [batchCalls, address, toastError]);

  /** Execute batch using the real batch service. */
  const handleExecuteBatch = useCallback(async (atomic: boolean) => {
    const eth = (window as unknown as Record<string, unknown>).ethereum as EIP1193Provider | undefined;
    if (!eth || !address) return;

    setLastAction(atomic ? 'batch' : 'send');
    setBatchResult(null);
    setExecuting(true);

    const calls = batchCalls.map((c) => ({
      to: c.to as `0x${string}`,
      value: c.value as `0x${string}`,
      data: c.data as `0x${string}`,
    }));

    const validated = buildBatchTx(calls);
    if (!validated.valid) {
      toastError(`Invalid batch: ${validated.error}`);
      setExecuting(false);
      return;
    }

    try {
      const result = await executeBatchTx(eth, address, validated.calls);
      setBatchResult(result);

      if (result.success) {
        if (result.callId) {
          // EIP-5792 atomic batch — start polling
          callsStatus.startPolling(result.callId);
          toastSuccess(`Batch submitted! Call ID: ${result.callId.slice(0, 10)}…`);
        } else if (result.txHashes && result.txHashes.length > 0) {
          toastSuccess(`Batch executed! ${result.txHashes.length} transaction(s) sent.`);
        }
      } else {
        toastError(result.error ?? 'Batch execution failed');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Batch execution failed';
      setBatchResult({ success: false, error: message });
      toastError(message);
    } finally {
      setExecuting(false);
    }
  }, [batchCalls, address, toastError, callsStatus]);

  const handleSendBatch = useCallback(() => handleExecuteBatch(false), [handleExecuteBatch]);
  const handleAtomicBatch = useCallback(() => handleExecuteBatch(true), [handleExecuteBatch]);

  const handlePreview = useCallback(() => {
    const calls = batchCalls.map((c) => ({
      to: c.to as `0x${string}`,
      value: c.value as `0x${string}`,
      data: c.data as `0x${string}`,
    }));
    const validated = buildBatchTx(calls);
    if (!validated.valid) {
      toastError(`Invalid batch: ${validated.error}`);
      return;
    }
    setShowPreview(true);
  }, [batchCalls, toastError]);

  function toastSuccess(msg: string) {
    try { success(msg); } catch { /* noop */ }
  }

  return (
    <DemoLayout>
      <EIP5792Bridge address={address} chainId={chainId} isConnected={isConnected} />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            EIP-5792 Atomic Batch
          </h1>
          <p className="text-gray-400 text-sm">
            Send multiple transactions atomically via wallet_sendCalls — with real gas estimation
          </p>
        </div>

        {/* ── Wallet Connect ─────────────────────────────── */}
        <div className="flex items-center justify-end gap-3">
          {isConnected ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                <span className="text-white font-semibold">{shortenAddress(account.address ?? '')}</span>
                {currentChainHex && (
                  <span className="text-gray-500 ml-1">· {chainLabel(currentChainHex)}</span>
                )}
              </span>
              <button
                onClick={() => disconnect()}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-700/60 text-gray-300 border border-gray-600/40 hover:text-white hover:border-gray-500 transition-all"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => connect(connectors.find((c) => c.id === 'io.metamask')?.id ?? connectors[0]?.id ?? 'io.metamask')}
              disabled={isConnecting}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>

        {error && (
          <div className="text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
            {error}
          </div>
        )}

        {/* ── Wallet Capabilities ────────────────────────── */}
        <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 shadow-2xl shadow-black/30 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700/50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Wallet Capabilities</h2>
            <button
              onClick={() => capabilities.refetch()}
              disabled={!isConnected}
              className="text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-40"
            >
              ↻ Refresh
            </button>
          </div>

          {!isConnected && (
            <div className="p-6 text-center text-sm text-gray-500">
              Connect a wallet to discover capabilities
            </div>
          )}

          {isConnected && capabilities.isLoading && (
            <div className="p-6 text-center text-sm text-gray-400">
              <span className="inline-flex items-center gap-2">
                <Spinner /> Fetching capabilities…
              </span>
            </div>
          )}

          {isConnected && !capabilities.isLoading && (
            <div className="p-5 space-y-4">
              {capabilities.supportedChains.length > 0 ? (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Supported Chains</p>
                  <div className="flex flex-wrap gap-2">
                    {capabilities.supportedChains.map((cid) => (
                      <span
                        key={cid}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700/60 border border-gray-600/40 text-xs text-gray-300 font-mono"
                      >
                        <span className="size-1.5 rounded-full bg-emerald-400" />
                        {chainLabel(cid)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <CapBadge label="wallet_getCapabilities" supported={false} />
                  <span className="text-xs text-gray-500 self-center">
                    {capabilities.error
                      ? `Not supported (${capabilities.error.message.slice(0, 60)}…)`
                      : 'Method not available on this wallet'}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <CapBadge label="atomicBatch" supported={eip5792Supported === true} />
                <CapBadge label="paymasterService" supported={capabilities.has(currentChainHex ?? '0x1', 'paymasterService')} />
                <CapBadge label="sessionKeys" supported={capabilities.has(currentChainHex ?? '0x1', 'sessionKeys')} />
                <CapBadge label="permissions" supported={capabilities.has(currentChainHex ?? '0x1', 'permissions')} />
              </div>

              {currentChainHex && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-900/50 border border-gray-700/40">
                  <span className="text-xs text-gray-400">Current chain:</span>
                  <span className="text-xs font-mono text-gray-300">{chainLabel(currentChainHex)} ({currentChainHex})</span>
                  <span className="ml-auto">
                    {eip5792Supported === true ? (
                      <CapBadge label="EIP-5792 ✓" supported />
                    ) : (
                      <CapBadge label="Sequential fallback" supported={false} />
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Gas Estimation ─────────────────────────────── */}
        {isConnected && (
          <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 shadow-2xl shadow-black/30 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700/50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Gas Estimation</h2>
              <button
                onClick={handleEstimateGas}
                disabled={estimatingGas || batchCalls.length === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-all disabled:opacity-50"
              >
                {estimatingGas ? (
                  <span className="inline-flex items-center gap-1.5"><Spinner /> Estimating…</span>
                ) : (
                  '↻ Estimate Gas'
                )}
              </button>
            </div>
            <div className="p-5 space-y-3">
              {gasEstimate ? (
                <>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900/50 border border-gray-700/40">
                    <span className="text-xs text-gray-400">Total Gas</span>
                    <span className="text-sm font-mono text-emerald-400 font-bold">
                      {gasEstimate.totalDecimal.toLocaleString()} gas
                    </span>
                  </div>
                  {gasEstimate.individual.map((g, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2 rounded-lg bg-gray-900/30">
                      <span className="text-xs text-gray-500">Call #{i + 1}</span>
                      <span className="text-xs font-mono text-gray-400">
                        {g === '0x0' ? 'N/A (default 21k)' : `${parseInt(g, 16).toLocaleString()} gas`}
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-gray-500 text-center py-2">
                  Click "Estimate Gas" to calculate real gas costs for this batch
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Batch Transaction Builder ──────────────────── */}
        <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 shadow-2xl shadow-black/30 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700/50">
            <h2 className="text-lg font-bold text-white">Batch Transaction Builder</h2>
            <p className="text-xs text-gray-500 mt-1">Add multiple calls to send atomically</p>
          </div>

          <div className="p-5 space-y-3">
            {batchCalls.map((call, index) => (
              <div key={index} className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Call #{index + 1}</span>
                  {batchCalls.length > 1 && (
                    <button
                      onClick={() => handleRemoveCall(index)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">To (address)</label>
                  <input
                    type="text"
                    value={call.to}
                    onChange={(e) => handleUpdateCall(index, 'to', e.target.value)}
                    placeholder="0x…"
                    className="w-full px-3 py-2 bg-gray-800/80 border border-gray-700/50 rounded-lg text-sm font-mono text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Value (hex wei)</label>
                    <input
                      type="text"
                      value={call.value}
                      onChange={(e) => handleUpdateCall(index, 'value', e.target.value)}
                      placeholder="0x0"
                      className="w-full px-3 py-2 bg-gray-800/80 border border-gray-700/50 rounded-lg text-sm font-mono text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Data (hex)</label>
                    <input
                      type="text"
                      value={call.data}
                      onChange={(e) => handleUpdateCall(index, 'data', e.target.value)}
                      placeholder="0x"
                      className="w-full px-3 py-2 bg-gray-800/80 border border-gray-700/50 rounded-lg text-sm font-mono text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={handleAddCall}
              className="w-full py-2.5 rounded-xl text-sm font-semibold border border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-all"
            >
              + Add Call
            </button>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handlePreview}
                disabled={!isConnected}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold bg-gray-700/60 text-gray-300 border border-gray-600/40 hover:text-white hover:border-gray-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Preview Batch
              </button>
              <button
                onClick={handleSendBatch}
                disabled={!isConnected || executing || callsStatus.isPolling}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {executing && lastAction === 'send' ? (
                  <span className="inline-flex items-center gap-2"><Spinner /> Sending…</span>
                ) : (
                  'wallet_sendCalls'
                )}
              </button>
              <button
                onClick={handleAtomicBatch}
                disabled={!isConnected || executing || callsStatus.isPolling}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {executing && lastAction === 'batch' ? (
                  <span className="inline-flex items-center gap-2"><Spinner /> Executing…</span>
                ) : (
                  'Execute Atomic Batch'
                )}
              </button>
            </div>

            {batchResult && !batchResult.success && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{batchResult.error ?? 'Unknown error'}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Batch Preview ──────────────────────────────── */}
        {showPreview && (
          <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 shadow-2xl shadow-black/30 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700/50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Batch Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Total calls:</span>
                  <span className="text-xs font-bold text-emerald-400">{batchCalls.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Atomic:</span>
                  {eip5792Supported ? (
                    <span className="text-xs font-bold text-emerald-400">Yes ✓</span>
                  ) : (
                    <span className="text-xs font-bold text-amber-400">Sequential fallback</span>
                  )}
                </div>
                {gasEstimate && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Est. gas:</span>
                    <span className="text-xs font-mono text-blue-400">{gasEstimate.totalDecimal.toLocaleString()}</span>
                  </div>
                )}
              </div>
              {batchCalls.map((call, index) => (
                <div key={index} className="p-3 rounded-lg bg-gray-900/50 border border-gray-700/40 font-mono text-xs text-gray-400 space-y-1">
                  <div><span className="text-gray-500">to:</span> {call.to || '(empty)'}</div>
                  <div><span className="text-gray-500">value:</span> {call.value}</div>
                  <div><span className="text-gray-500">data:</span> {call.data || '0x (empty)'}</div>
                  {gasEstimate && (
                    <div><span className="text-gray-500">gas:</span> {gasEstimate.individual[index] === '0x0' ? 'N/A' : `${parseInt(gasEstimate.individual[index], 16).toLocaleString()}`}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Transaction Status ─────────────────────────── */}
        {(callsStatus.isPolling || callsStatus.result || batchResult) && (
          <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 shadow-2xl shadow-black/30 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700/50">
              <h2 className="text-lg font-bold text-white">Transaction Status</h2>
            </div>
            <div className="p-5 space-y-4">
              {/* EIP-5792 call ID */}
              {batchResult?.callId && (
                <div className="p-3 rounded-xl bg-gray-900/50 border border-gray-700/40">
                  <p className="text-xs text-gray-500 mb-1">Batch ID (EIP-5792)</p>
                  <p className="text-sm font-mono text-gray-300 break-all">{batchResult.callId}</p>
                </div>
              )}

              {/* Sequential tx hashes */}
              {batchResult?.txHashes && batchResult.txHashes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Transaction Hashes</p>
                  {batchResult.txHashes.map((hash, i) => (
                    <div key={i} className="p-3 rounded-lg bg-gray-900/50 border border-gray-700/40 font-mono text-xs text-gray-400">
                      <span className="text-gray-500">#{i + 1}:</span> {hash}
                    </div>
                  ))}
                </div>
              )}

              {callsStatus.isPolling && (
                <div className="flex items-center gap-2 text-sm text-amber-400">
                  <Spinner /> Polling status…
                </div>
              )}

              {callsStatus.status && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">Status:</span>
                  <StatusBadge status={callsStatus.status} />
                </div>
              )}

              {callsStatus.allSucceeded && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-sm text-emerald-400 font-semibold">✓ All calls succeeded!</p>
                </div>
              )}

              {callsStatus.failedReceipts.length > 0 && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400 font-semibold mb-1">✗ {callsStatus.failedReceipts.length} call(s) failed</p>
                  {callsStatus.failedReceipts.map((r, i) => (
                    <p key={i} className="text-xs font-mono text-red-400/80">tx: {r.transactionHash ?? 'pending'}</p>
                  ))}
                </div>
              )}

              {callsStatus.error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">{callsStatus.error.message}</p>
                </div>
              )}

              {callsStatus.result?.receipts && callsStatus.result.receipts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Receipts</p>
                  {callsStatus.result.receipts.map((r, i) => (
                    <div key={i} className="p-3 rounded-lg bg-gray-900/50 border border-gray-700/40 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Call #{i + 1}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${r.receipt.status === '0x1' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                          {r.receipt.status === '0x1' ? 'SUCCESS' : 'FAILED'}
                        </span>
                      </div>
                      {r.transactionHash && (
                        <p className="text-xs font-mono text-gray-500 break-all">tx: {r.transactionHash}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {callsStatus.isPolling && (
                <button
                  onClick={() => callsStatus.stopPolling()}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-700/60 text-gray-300 border border-gray-600/40 hover:text-white hover:border-gray-500 transition-all"
                >
                  Stop Polling
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Info ───────────────────────────────────────── */}
        <div className="text-center space-y-2 bg-blue-500/5 border border-blue-500/20 rounded-xl px-6 py-4">
          <p className="text-sm text-blue-400 font-semibold">EIP-5792 Wallet Call API</p>
          <p className="text-xs text-gray-500">
            This page demonstrates atomic batch transactions using EIP-5792{' '}
            <code className="text-gray-400 font-mono">wallet_sendCalls</code>.
            Requires a wallet that supports the Wallet Call API (e.g. Coinbase Smart Wallet, Biconomy, Zerodev).
            Standard EOA wallets fall back to sequential <code className="text-gray-400 font-mono">eth_sendTransaction</code> calls.
          </p>
        </div>
      </div>
    </DemoLayout>
  );
}
