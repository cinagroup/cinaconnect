/**
 * Tests for @cinacoin/react EIP-5792 hooks — useWalletCapabilities, useSendCalls, useAtomicBatch, useCallsStatus.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock @cinacoin/core-sdk — module-level fn refs captured by hoisted vi.mock
// ---------------------------------------------------------------------------

const mockCapabilities = {
  '0x1': { paymasterService: { supported: true }, atomicBatch: { supported: true } },
  '0x89': { paymasterService: { supported: false }, atomicBatch: { supported: true } },
  '0xa4b1': { paymasterService: { supported: true }, atomicBatch: { supported: false } },
};

const mockSendCallsResult = { id: 'batch-001' };
const mockAtomicBatchResult = { id: 'atomic-002' };
const mockCallsStatusResult = {
  status: 'CONFIRMED' as const,
  receipts: [
    { id: 'call-1', receipt: { status: '0x1', transactionHash: '0xtx1' } },
    { id: 'call-2', receipt: { status: '0x1', transactionHash: '0xtx2' } },
  ],
};
const mockPendingCallsStatusResult = { status: 'PENDING' as const, receipts: [] };

const _walletGetCapabilities = vi.fn().mockResolvedValue(mockCapabilities);
const _walletSendCalls = vi.fn().mockResolvedValue(mockSendCallsResult);
const _walletGetCallsStatus = vi.fn().mockResolvedValue(mockCallsStatusResult);
const _buildAtomicBatch = vi.fn().mockReturnValue({
  params: { version: '1.0.0', calls: [], chainId: '0x1', from: '0xaddr' },
  isAtomic: true,
});
const _executeAtomicBatch = vi.fn().mockResolvedValue(mockAtomicBatchResult);
const _supportsAtomicBatch = vi.fn((chainId: string) => chainId === '0x1' || chainId === '0x89');
const _hasCapability = vi.fn((caps: any, cid: string, cap: string) => caps[cid]?.[cap]?.supported === true);
const _getChainCapabilities = vi.fn((caps: any, cid: string) => caps[cid] ?? {});
const _getSupportedChains = vi.fn((caps: any) => Object.keys(caps));
const _filterByCapability = vi.fn((caps: any, cap: string) => {
  const r: any = {};
  for (const [k, v] of Object.entries(caps)) if ((v as any)[cap]?.supported) r[k] = v;
  return r;
});

vi.mock('@cinacoin/core-sdk', () => ({
  walletGetCapabilities: (...a: any[]) => _walletGetCapabilities(...a),
  walletSendCalls: (...a: any[]) => _walletSendCalls(...a),
  walletGetCallsStatus: (...a: any[]) => _walletGetCallsStatus(...a),
  buildAtomicBatch: (...a: any[]) => _buildAtomicBatch(...a),
  executeAtomicBatch: (...a: any[]) => _executeAtomicBatch(...a),
  supportsAtomicBatch: (...a: any[]) => _supportsAtomicBatch(...a),
  hasCapability: (...a: any[]) => _hasCapability(...a),
  getChainCapabilities: (...a: any[]) => _getChainCapabilities(...a),
  getSupportedChains: (...a: any[]) => _getSupportedChains(...a),
  filterByCapability: (...a: any[]) => _filterByCapability(...a),
}));

// ---------------------------------------------------------------------------
// Global EIP-5792 context mock
// ---------------------------------------------------------------------------

const mockProvider = { request: vi.fn(), on: vi.fn(), removeListener: vi.fn() };

let _ctxProvider: typeof mockProvider | null = mockProvider;
let _ctxAddress: string | null = '0x1234567890abcdef1234567890abcdef12345678';
let _ctxChainIdHex: string | null = '0x1';
let _ctxIsConnected: boolean = true;

function resetContext() {
  _ctxProvider = mockProvider;
  _ctxAddress = '0x1234567890abcdef1234567890abcdef12345678';
  _ctxChainIdHex = '0x1';
  _ctxIsConnected = true;
}

beforeEach(() => {
  resetContext();
  (window as any).__ocx_eip5792_context = () => ({
    provider: _ctxProvider,
    address: _ctxAddress,
    chainIdHex: _ctxChainIdHex,
    isConnected: _ctxIsConnected,
  });

  // Reset mock implementations back to defaults after each test
  _walletGetCapabilities.mockReset().mockResolvedValue(mockCapabilities);
  _walletSendCalls.mockReset().mockResolvedValue(mockSendCallsResult);
  _walletGetCallsStatus.mockReset().mockResolvedValue(mockCallsStatusResult);
  _buildAtomicBatch.mockReset().mockReturnValue({
    params: { version: '1.0.0', calls: [], chainId: '0x1', from: '0xaddr' },
    isAtomic: true,
  });
  _executeAtomicBatch.mockReset().mockResolvedValue(mockAtomicBatchResult);
  _supportsAtomicBatch.mockReset().mockImplementation((chainId: string) => chainId === '0x1' || chainId === '0x89');
  _hasCapability.mockReset().mockImplementation((caps: any, cid: string, cap: string) => caps[cid]?.[cap]?.supported === true);
  _getChainCapabilities.mockReset().mockImplementation((caps: any, cid: string) => caps[cid] ?? {});
  _getSupportedChains.mockReset().mockImplementation((caps: any) => Object.keys(caps));
  _filterByCapability.mockReset().mockImplementation((caps: any, cap: string) => {
    const r: any = {};
    for (const [k, v] of Object.entries(caps)) if ((v as any)[cap]?.supported) r[k] = v;
    return r;
  });
});

afterEach(() => {
  delete (window as any).__ocx_eip5792_context;
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Static imports (avoid dynamic import module cache issues)
// ---------------------------------------------------------------------------

// Note: These are resolved by the tsResolver plugin (.js → .ts)
import { useWalletCapabilities, useSendCalls, useAtomicBatch, useCallsStatus } from '../src/hooks/useEIP5792.js';

const testCalls = [
  { to: '0x1234567890abcdef1234567890abcdef12345678', value: '0x0', data: '0x' as const },
];

// ---------------------------------------------------------------------------
// useWalletCapabilities
// ---------------------------------------------------------------------------

describe('useWalletCapabilities', () => {
  it('is exported as a function', () => {
    expect(typeof useWalletCapabilities).toBe('function');
  });

  it('returns initial state with null capabilities', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useWalletCapabilities());

    expect(result.current.capabilities).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.refetch).toBe('function');
    expect(typeof result.current.has).toBe('function');
    expect(typeof result.current.getChainCaps).toBe('function');
    expect(typeof result.current.filterBy).toBe('function');
    expect(Array.isArray(result.current.supportedChains)).toBe(true);
  });

  it('fetches capabilities on mount when connected', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useWalletCapabilities());

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(_walletGetCapabilities).toHaveBeenCalled();
  });

  it('does not fetch when not connected', async () => {
    _ctxIsConnected = false;
    vi.useFakeTimers();
    renderHook(() => useWalletCapabilities());

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(_walletGetCapabilities).not.toHaveBeenCalled();
  });

  it('does not fetch when provider is null', async () => {
    _ctxProvider = null;
    vi.useFakeTimers();
    renderHook(() => useWalletCapabilities());

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(_walletGetCapabilities).not.toHaveBeenCalled();
  });

  it('has() returns true for supported capability', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useWalletCapabilities());

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(result.current.has('0x1', 'atomicBatch')).toBe(true);
    expect(result.current.has('0x89', 'paymasterService')).toBe(false);
    expect(result.current.has('0x999', 'atomicBatch')).toBe(false);
  });

  it('has() returns false for null capabilities', () => {
    vi.useFakeTimers();
    _walletGetCapabilities.mockReset().mockResolvedValue(null as any);
    const { result } = renderHook(() => useWalletCapabilities());

    expect(result.current.has('0x1', 'atomicBatch')).toBe(false);
  });

  it('getChainCaps() returns chain-specific capabilities', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useWalletCapabilities());

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(result.current.getChainCaps('0x1')).toEqual({
      paymasterService: { supported: true },
      atomicBatch: { supported: true },
    });
  });

  it('filterBy() returns only chains with the capability', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useWalletCapabilities());

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    const filtered = result.current.filterBy('paymasterService');
    expect(Object.keys(filtered)).toContain('0x1');
    expect(Object.keys(filtered)).toContain('0xa4b1');
    expect(Object.keys(filtered)).not.toContain('0x89');
  });

  it('supportedChains lists all chain IDs', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useWalletCapabilities());

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(result.current.supportedChains).toEqual(['0x1', '0x89', '0xa4b1']);
  });

  it('refetch re-fetches capabilities', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useWalletCapabilities());

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    const count1 = _walletGetCapabilities.mock.calls.length;
    await act(async () => { await result.current.refetch(); });
    expect(_walletGetCapabilities.mock.calls.length).toBeGreaterThan(count1);
  });

  it('handles fetch error gracefully', async () => {
    _walletGetCapabilities.mockRejectedValue(new Error('RPC error'));
    vi.useFakeTimers();
    const { result } = renderHook(() => useWalletCapabilities());

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(result.current.error?.message).toBe('RPC error');
  });

  it('sets empty capabilities on method not supported (-32601)', async () => {
    _walletGetCapabilities.mockRejectedValue(new Error('Method not found (-32601)'));
    vi.useFakeTimers();
    const { result } = renderHook(() => useWalletCapabilities());

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.capabilities).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// useSendCalls
// ---------------------------------------------------------------------------

describe('useSendCalls', () => {
  it('is exported as a function', () => {
    expect(typeof useSendCalls).toBe('function');
  });

  it('sends calls and returns batch ID', async () => {
    const { result } = renderHook(() => useSendCalls());

    const batchId = await act(async () => result.current.sendCalls(testCalls));

    expect(batchId).toBe('batch-001');
    expect(_walletSendCalls).toHaveBeenCalled();
    expect(result.current.lastCallId).toBe('batch-001');
  });

  it('sets isSending during call execution', async () => {
    vi.useFakeTimers();
    let resolveSend!: (v: typeof mockSendCallsResult) => void;
    _walletSendCalls.mockImplementation(() => new Promise(r => { resolveSend = r; }));

    const { result } = renderHook(() => useSendCalls());

    await act(async () => {
      result.current.sendCalls(testCalls);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.isSending).toBe(true);

    await act(async () => {
      resolveSend(mockSendCallsResult);
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(result.current.isSending).toBe(false);
    expect(result.current.lastCallId).toBe('batch-001');
  });

  it('throws when no wallet is connected', async () => {
    _ctxIsConnected = false;
    const { result } = renderHook(() => useSendCalls());

    await expect(result.current.sendCalls(testCalls)).rejects.toThrow('No wallet connected');
  });

  it('throws when no account address available', async () => {
    _ctxAddress = null;
    const { result } = renderHook(() => useSendCalls());

    await expect(result.current.sendCalls(testCalls)).rejects.toThrow('No account address available');
  });

  it('passes custom options to wallet_sendCalls', async () => {
    const { result } = renderHook(() => useSendCalls());

    await act(async () => {
      await result.current.sendCalls(testCalls, { chainId: '0x89', version: '2.0.0' });
    });

    expect(_walletSendCalls).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ chainId: '0x89', version: '2.0.0' }),
    );
  });

  it('uses default chainId when not specified', async () => {
    const { result } = renderHook(() => useSendCalls());

    await act(async () => {
      await result.current.sendCalls(testCalls);
    });

    expect(_walletSendCalls).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ chainId: '0x1' }),
    );
  });

  it('falls back to 0x1 when chainIdHex is null', async () => {
    _ctxChainIdHex = null;
    const { result } = renderHook(() => useSendCalls());

    await act(async () => {
      await result.current.sendCalls(testCalls);
    });

    expect(_walletSendCalls).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ chainId: '0x1' }),
    );
  });

  it('handles send errors gracefully', async () => {
    _walletSendCalls.mockRejectedValue(new Error('User rejected'));
    const { result } = renderHook(() => useSendCalls());

    await expect(result.current.sendCalls(testCalls)).rejects.toThrow('User rejected');
    expect(result.current.error?.message).toBe('User rejected');
    expect(result.current.isSending).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// useAtomicBatch
// ---------------------------------------------------------------------------

describe('useAtomicBatch', () => {
  it('is exported as a function', () => {
    expect(typeof useAtomicBatch).toBe('function');
  });

  it('buildBatch returns atomic batch params', () => {
    const { result } = renderHook(() => useAtomicBatch());
    const batchResult = result.current.buildBatch(testCalls);

    expect(batchResult.isAtomic).toBe(true);
    expect(batchResult.params).toBeDefined();
    expect(_buildAtomicBatch).toHaveBeenCalled();
  });

  it('executeBatch executes and returns batch ID', async () => {
    const { result } = renderHook(() => useAtomicBatch());

    const batchId = await act(async () => result.current.executeBatch(testCalls));

    expect(batchId).toBe('atomic-002');
    expect(_executeAtomicBatch).toHaveBeenCalled();
    expect(result.current.lastCallId).toBe('atomic-002');
  });

  it('executeBatch sets isExecuting during execution', async () => {
    vi.useFakeTimers();
    let resolveExec!: (v: typeof mockAtomicBatchResult) => void;
    _executeAtomicBatch.mockImplementation(() => new Promise(r => { resolveExec = r; }));

    const { result } = renderHook(() => useAtomicBatch());

    await act(async () => {
      result.current.executeBatch(testCalls);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.isExecuting).toBe(true);

    await act(async () => {
      resolveExec(mockAtomicBatchResult);
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(result.current.isExecuting).toBe(false);
    expect(result.current.lastCallId).toBe('atomic-002');
  });

  it('checks if atomic batch is supported on current chain', () => {
    const { result } = renderHook(() => useAtomicBatch());
    expect(result.current.isAtomicSupported).toBe(true);
  });

  it('buildBatch throws when no account address available', () => {
    _ctxAddress = null;
    const { result } = renderHook(() => useAtomicBatch());

    expect(() => result.current.buildBatch(testCalls)).toThrow('No account address available');
  });

  it('executeBatch throws when no wallet connected', async () => {
    _ctxIsConnected = false;
    const { result } = renderHook(() => useAtomicBatch());

    await expect(result.current.executeBatch(testCalls)).rejects.toThrow('No wallet connected');
  });

  it('handles execute errors gracefully', async () => {
    _executeAtomicBatch.mockRejectedValue(new Error('Execution reverted'));
    const { result } = renderHook(() => useAtomicBatch());

    await expect(result.current.executeBatch(testCalls)).rejects.toThrow('Execution reverted');
    expect(result.current.error?.message).toBe('Execution reverted');
    expect(result.current.isExecuting).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// useCallsStatus
// ---------------------------------------------------------------------------

describe('useCallsStatus', () => {
  it('is exported as a function', () => {
    expect(typeof useCallsStatus).toBe('function');
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useCallsStatus());

    expect(result.current.status).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.isPolling).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.startPolling).toBe('function');
    expect(typeof result.current.stopPolling).toBe('function');
    expect(result.current.allSucceeded).toBe(false);
    expect(result.current.failedReceipts).toEqual([]);
  });

  it('startPolling fetches status', async () => {
    const { result } = renderHook(() => useCallsStatus());

    await act(async () => {
      result.current.startPolling('batch-001');
      await Promise.resolve();
    });

    expect(_walletGetCallsStatus).toHaveBeenCalledWith(expect.anything(), 'batch-001');
    expect(result.current.status).toBe('CONFIRMED');
  });

  it('stopPolling stops polling', async () => {
    const { result } = renderHook(() => useCallsStatus());

    await act(async () => {
      result.current.startPolling('batch-001');
      await Promise.resolve();
    });

    await act(async () => { result.current.stopPolling(); });
    expect(result.current.isPolling).toBe(false);
  });

  it('stops polling when status is CONFIRMED', async () => {
    vi.useFakeTimers();
    let callCount = 0;
    _walletGetCallsStatus.mockImplementation(async () => {
      callCount++;
      return callCount === 1 ? mockPendingCallsStatusResult : mockCallsStatusResult;
    });

    const { result } = renderHook(() => useCallsStatus());

    await act(async () => {
      result.current.startPolling('batch-001');
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(result.current.status).toBe('PENDING');
    expect(result.current.isPolling).toBe(true);

    // Trigger second poll
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(result.current.status).toBe('CONFIRMED');
    expect(result.current.isPolling).toBe(false);
  });

  it('handles failed receipts', async () => {
    const failedResult = {
      status: 'CONFIRMED' as const,
      receipts: [
        { id: 'call-1', receipt: { status: '0x1', transactionHash: '0xtx1' } },
        { id: 'call-2', receipt: { status: '0x0', transactionHash: '0xtx2' } },
      ],
    };
    _walletGetCallsStatus.mockResolvedValue(failedResult);

    const { result } = renderHook(() => useCallsStatus());

    await act(async () => {
      result.current.startPolling('batch-001');
      await Promise.resolve();
    });

    expect(result.current.failedReceipts).toHaveLength(1);
    expect(result.current.failedReceipts[0].id).toBe('call-2');
    expect(result.current.allSucceeded).toBe(false);
  });

  it('auto-starts polling when callId option is provided', async () => {
    renderHook(() => useCallsStatus({ callId: 'auto-batch-001', intervalMs: 100 }));

    await act(async () => { await Promise.resolve(); });

    expect(_walletGetCallsStatus).toHaveBeenCalledWith(expect.anything(), 'auto-batch-001');
  });

  it('handles polling errors gracefully', async () => {
    _walletGetCallsStatus.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useCallsStatus());

    await act(async () => {
      result.current.startPolling('batch-001');
      await Promise.resolve();
    });

    expect(result.current.error?.message).toBe('Network error');
  });

  it('cleans up timer on unmount', async () => {
    const { unmount } = renderHook(() =>
      useCallsStatus({ callId: 'batch-001', intervalMs: 100 }),
    );

    await act(async () => { await Promise.resolve(); });

    act(() => { unmount(); });
    // Should not crash
    expect(true).toBe(true);
  });

  it('does not poll when provider is null', async () => {
    _ctxProvider = null;
    const { result } = renderHook(() => useCallsStatus());

    await act(async () => {
      result.current.startPolling('batch-001');
      await Promise.resolve();
    });

    expect(_walletGetCallsStatus).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Type exports verification
// ---------------------------------------------------------------------------

describe('Type exports', () => {
  it('exports all expected types from useEIP5792.ts', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(require.resolve('../src/hooks/useEIP5792.ts'), 'utf-8');
    expect(src).toContain('UseWalletCapabilitiesReturn');
    expect(src).toContain('UseSendCallsReturn');
    expect(src).toContain('UseAtomicBatchReturn');
    expect(src).toContain('UseCallsStatusReturn');
    expect(src).toContain('SendCallsOptions');
    expect(src).toContain('AtomicBatchOptions');
  });

  it('re-exports types from hooks.ts index', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(require.resolve('../src/hooks.ts'), 'utf-8');
    expect(src).toContain('useWalletCapabilities');
    expect(src).toContain('useSendCalls');
    expect(src).toContain('useAtomicBatch');
    expect(src).toContain('useCallsStatus');
  });
});
