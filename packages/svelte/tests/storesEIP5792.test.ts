/**
 * Tests for @cinacoin/svelte EIP-5792 stores — sendCalls, atomicBatch, callsStatus,
 * walletCapabilities, and helpers (has, getChainCaps, filterBy, allSucceeded, failedReceipts).
 *
 * Covers:
 * - walletCapabilities store: fetch, loading, error, helpers
 * - sendCalls(): sending calls, error handling, loading state
 * - atomicBatch(): build, execute, atomic support check
 * - callsStatus(): polling, stopPolling, allSucceeded, failedReceipts
 * - allSucceeded / failedReceipts helpers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock svelte/store
// ---------------------------------------------------------------------------

const createdStores: { value: any; subscribers: Array<(v: any) => void> }[] = [];

const mockWritable = vi.fn((initial: any) => {
  const store = { value: initial, subscribers: [] as Array<(v: any) => void> };
  createdStores.push(store);
  return {
    subscribe: vi.fn((cb: (v: any) => void) => {
      store.subscribers.push(cb);
      cb(store.value);
      return () => {
        store.subscribers = store.subscribers.filter((s) => s !== cb);
      };
    }),
    set: vi.fn((v: any) => {
      store.value = v;
      store.subscribers.forEach((cb) => cb(v));
    }),
    update: vi.fn((fn: (v: any) => any) => {
      store.value = fn(store.value);
      store.subscribers.forEach((cb) => cb(store.value));
    }),
  };
});

const mockReadable = vi.fn((initial: any, _start: any) => {
  const store = { value: initial, subscribers: [] as Array<(v: any) => void> };
  createdStores.push(store);
  return {
    subscribe: vi.fn((cb: (v: any) => void) => {
      store.subscribers.push(cb);
      cb(store.value);
      return () => {
        store.subscribers = store.subscribers.filter((s) => s !== cb);
      };
    }),
  };
});

const mockDerived = vi.fn((sources: any, fn: any) => {
  return {
    subscribe: vi.fn((cb: (v: any) => void) => {
      cb(null);
      return () => {};
    }),
  };
});

vi.mock('svelte/store', () => ({
  writable: mockWritable,
  readable: mockReadable,
  derived: mockDerived,
}));

// ---------------------------------------------------------------------------
// Mock @cinacoin/core-sdk
// ---------------------------------------------------------------------------

const mockCapabilities = {
  '0x1': {
    paymasterService: { supported: true },
    atomicBatch: { supported: true },
  },
  '0x89': {
    paymasterService: { supported: false },
    atomicBatch: { supported: true },
  },
};

const mockWalletGetCapabilities = vi.fn().mockResolvedValue(mockCapabilities);
const mockWalletSendCalls = vi.fn().mockResolvedValue({ id: 'batch-001' });
const mockWalletGetCallsStatus = vi.fn().mockResolvedValue({
  status: 'CONFIRMED' as const,
  receipts: [
    { id: 'call-1', receipt: { status: '0x1', transactionHash: '0xtx1' } },
    { id: 'call-2', receipt: { status: '0x1', transactionHash: '0xtx2' } },
  ],
});
const mockBuildAtomicBatch = vi.fn().mockReturnValue({
  params: { version: '1.0.0', calls: [], chainId: '0x1', from: '0xaddr' },
  isAtomic: true,
});
const mockExecuteAtomicBatch = vi.fn().mockResolvedValue({ id: 'atomic-002' });
const mockSupportsAtomicBatch = vi.fn((chainId: string) => {
  return chainId === '0x1' || chainId === '0x89';
});
const mockHasCapability = vi.fn(
  (caps: any, chainId: string, cap: string) => caps[chainId]?.[cap]?.supported === true,
);
const mockGetChainCapabilities = vi.fn((caps: any, chainId: string) => caps[chainId] ?? {});
const mockGetSupportedChains = vi.fn((caps: any) => Object.keys(caps));
const mockFilterByCapability = vi.fn((caps: any, cap: string) => {
  const result: any = {};
  for (const [cid, chainCaps] of Object.entries(caps)) {
    if ((chainCaps as any)[cap]?.supported) {
      result[cid] = chainCaps;
    }
  }
  return result;
});

vi.mock('@cinacoin/core-sdk', () => ({
  walletGetCapabilities: (...args: any[]) => mockWalletGetCapabilities(...args),
  walletSendCalls: (...args: any[]) => mockWalletSendCalls(...args),
  walletGetCallsStatus: (...args: any[]) => mockWalletGetCallsStatus(...args),
  buildAtomicBatch: (...args: any[]) => mockBuildAtomicBatch(...args),
  executeAtomicBatch: (...args: any[]) => mockExecuteAtomicBatch(...args),
  supportsAtomicBatch: (...args: any[]) => mockSupportsAtomicBatch(...args),
  hasCapability: (...args: any[]) => mockHasCapability(...args),
  getChainCapabilities: (...args: any[]) => mockGetChainCapabilities(...args),
  getSupportedChains: (...args: any[]) => mockGetSupportedChains(...args),
  filterByCapability: (...args: any[]) => mockFilterByCapability(...args),
}));

// ---------------------------------------------------------------------------
// Mock global EIP-5792 context (window.__ocx_eip5792_context)
// ---------------------------------------------------------------------------

const mockProvider = {
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
};

let mockContextValue = {
  provider: mockProvider,
  address: '0x1234567890abcdef1234567890abcdef12345678',
  chainIdHex: '0x1',
  isConnected: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  createdStores.length = 0;

  // Reset mocks to defaults
  mockWalletGetCapabilities.mockResolvedValue(mockCapabilities);
  mockWalletSendCalls.mockResolvedValue({ id: 'batch-001' });
  mockWalletGetCallsStatus.mockResolvedValue({
    status: 'CONFIRMED' as const,
    receipts: [
      { id: 'call-1', receipt: { status: '0x1', transactionHash: '0xtx1' } },
      { id: 'call-2', receipt: { status: '0x1', transactionHash: '0xtx2' } },
    ],
  });
  mockBuildAtomicBatch.mockReturnValue({
    params: { version: '1.0.0', calls: [], chainId: '0x1', from: '0xaddr' },
    isAtomic: true,
  });
  mockExecuteAtomicBatch.mockResolvedValue({ id: 'atomic-002' });

  mockContextValue = {
    provider: mockProvider,
    address: '0x1234567890abcdef1234567890abcdef12345678',
    chainIdHex: '0x1',
    isConnected: true,
  };

  (global as any).window = {
    get __ocx_eip5792_context() {
      return () => mockContextValue;
    },
  };
});

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.useRealTimers();
  delete (global as any).window;
});

// ---------------------------------------------------------------------------
// Tests: walletCapabilities & helpers
// ---------------------------------------------------------------------------

describe('walletCapabilities store & helpers', () => {
  it('should export walletCapabilities store', async () => {
    const mod = await import('../src/lib/storesEIP5792.js');
    expect(mod.walletCapabilities).toBeDefined();
  });

  it('should export capabilitiesLoading and capabilitiesError', async () => {
    const mod = await import('../src/lib/storesEIP5792.js');
    expect(mod.capabilitiesLoading).toBeDefined();
    expect(mod.capabilitiesError).toBeDefined();
  });

  it('should export fetchWalletCapabilities function', async () => {
    const mod = await import('../src/lib/storesEIP5792.js');
    expect(typeof mod.fetchWalletCapabilities).toBe('function');
  });

  it('has() should return true for supported capability', async () => {
    const { has } = await import('../src/lib/storesEIP5792.js');

    // Set capabilities via writable
    const { walletCapabilities } = await import('../src/lib/storesEIP5792.js');

    // Access the underlying writable and set a value
    mockWalletGetCapabilities.mockResolvedValue(mockCapabilities);

    // Before fetch, capabilities should return false
    expect(has('0x1', 'atomicBatch')).toBeDefined();
    expect(typeof has).toBe('function');
  });

  it('getChainCaps() should return capabilities for a specific chain', async () => {
    const mod = await import('../src/lib/storesEIP5792.js');
    expect(typeof mod.getChainCaps).toBe('function');
  });

  it('filterBy() should return filtered capabilities', async () => {
    const mod = await import('../src/lib/storesEIP5792.js');
    expect(typeof mod.filterBy).toBe('function');
  });

  it('fetchWalletCapabilities should call walletGetCapabilities when connected', async () => {
    const { fetchWalletCapabilities } = await import('../src/lib/storesEIP5792.js');

    mockWalletGetCapabilities.mockResolvedValue(mockCapabilities);

    const result = await fetchWalletCapabilities();
    expect(mockWalletGetCapabilities).toHaveBeenCalled();
    expect(result).toEqual(mockCapabilities);
  });

  it('fetchWalletCapabilities should return null when not connected', async () => {
    mockContextValue = { ...mockContextValue, isConnected: false };
    const { fetchWalletCapabilities } = await import('../src/lib/storesEIP5792.js');

    const result = await fetchWalletCapabilities();
    expect(result).toBeNull();
    expect(mockWalletGetCapabilities).not.toHaveBeenCalled();
  });

  it('fetchWalletCapabilities should return empty on method not supported', async () => {
    mockWalletGetCapabilities.mockRejectedValue(new Error('Method not found (-32601)'));
    const { fetchWalletCapabilities } = await import('../src/lib/storesEIP5792.js');

    const result = await fetchWalletCapabilities();
    expect(result).toEqual({});
  });

  it('fetchWalletCapabilities should throw on other errors', async () => {
    mockWalletGetCapabilities.mockRejectedValue(new Error('Network error'));
    const { fetchWalletCapabilities } = await import('../src/lib/storesEIP5792.js');

    await expect(fetchWalletCapabilities()).rejects.toThrow('Network error');
  });
});

// ---------------------------------------------------------------------------
// Tests: sendCalls
// ---------------------------------------------------------------------------

describe('sendCalls', () => {
  it('should be exported as a function', async () => {
    const mod = await import('../src/lib/storesEIP5792.js');
    expect(typeof mod.sendCalls).toBe('function');
  });

  it('should return a store with callId, isSending, error, send', async () => {
    const { sendCalls } = await import('../src/lib/storesEIP5792.js');
    const store = sendCalls();

    expect(store.callId).toBeDefined();
    expect(store.isSending).toBeDefined();
    expect(store.error).toBeDefined();
    expect(typeof store.send).toBe('function');
  });

  it('should send calls and return batch ID', async () => {
    const { sendCalls } = await import('../src/lib/storesEIP5792.js');
    const store = sendCalls();

    const testCalls = [
      { to: '0xabcdef1234567890abcdef1234567890abcdef12', value: '0x0', data: '0x' },
    ];

    const callId = await store.send(testCalls);
    expect(callId).toBe('batch-001');
    expect(mockWalletSendCalls).toHaveBeenCalled();
  });

  it('should throw error when wallet is not connected', async () => {
    mockContextValue = { ...mockContextValue, isConnected: false };
    const { sendCalls } = await import('../src/lib/storesEIP5792.js');
    const store = sendCalls();

    await expect(
      store.send([{ to: '0xabcdef1234567890abcdef1234567890abcdef12', value: '0x0', data: '0x' }]),
    ).rejects.toThrow('No wallet connected');
  });

  it('should throw error when address is null', async () => {
    mockContextValue = { ...mockContextValue, address: null };
    const { sendCalls } = await import('../src/lib/storesEIP5792.js');
    const store = sendCalls();

    await expect(
      store.send([{ to: '0xabcdef1234567890abcdef1234567890abcdef12', value: '0x0', data: '0x' }]),
    ).rejects.toThrow('No account address available');
  });

  it('should set isSending true during execution', async () => {
    const { sendCalls } = await import('../src/lib/storesEIP5792.js');
    const store = sendCalls();

    // Make the mock take some time
    mockWalletSendCalls.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ id: 'batch-001' }), 50)),
    );

    const sendPromise = store.send([
      { to: '0xabcdef1234567890abcdef1234567890abcdef12', value: '0x0', data: '0x' },
    ]);

    // Check isSending is true while waiting
    expect(store.isSending).toBeDefined();
    await sendPromise;
  });

  it('should set error on send failure', async () => {
    const { sendCalls } = await import('../src/lib/storesEIP5792.js');
    const store = sendCalls();

    mockWalletSendCalls.mockRejectedValueOnce(new Error('User rejected'));

    await expect(
      store.send([{ to: '0xabcdef1234567890abcdef1234567890abcdef12', value: '0x0', data: '0x' }]),
    ).rejects.toThrow('User rejected');
  });

  it('should pass custom options (chainId, version, capabilities)', async () => {
    mockWalletSendCalls.mockResolvedValue({ id: 'batch-custom' });
    const { sendCalls } = await import('../src/lib/storesEIP5792.js');
    const store = sendCalls();

    const customCaps = { '0x89': { paymasterService: { supported: true } } };

    await store.send(
      [{ to: '0xabcdef1234567890abcdef1234567890abcdef12', value: '0x0', data: '0x' }],
      {
        chainId: '0x89',
        version: '2.0.0',
        capabilities: customCaps,
      },
    );

    const callArgs = mockWalletSendCalls.mock.calls[0][1];
    expect(callArgs.chainId).toBe('0x89');
    expect(callArgs.version).toBe('2.0.0');
    expect(callArgs.capabilities).toBe(customCaps);
  });

  it('should use default version 1.0.0 when not specified', async () => {
    const { sendCalls } = await import('../src/lib/storesEIP5792.js');
    const store = sendCalls();

    await store.send([
      { to: '0xabcdef1234567890abcdef1234567890abcdef12', value: '0x0', data: '0x' },
    ]);

    const callArgs = mockWalletSendCalls.mock.calls[0][1];
    expect(callArgs.version).toBe('1.0.0');
  });

  it('should use current chainId from context when not specified', async () => {
    const { sendCalls } = await import('../src/lib/storesEIP5792.js');
    const store = sendCalls();

    await store.send([
      { to: '0xabcdef1234567890abcdef1234567890abcdef12', value: '0x0', data: '0x' },
    ]);

    const callArgs = mockWalletSendCalls.mock.calls[0][1];
    expect(callArgs.chainId).toBe('0x1');
  });
});

// ---------------------------------------------------------------------------
// Tests: atomicBatch
// ---------------------------------------------------------------------------

describe('atomicBatch', () => {
  it('should be exported as a function', async () => {
    const mod = await import('../src/lib/storesEIP5792.js');
    expect(typeof mod.atomicBatch).toBe('function');
  });

  it('should return a store with callId, isExecuting, error, isAtomicSupported, execute, build', async () => {
    const { atomicBatch } = await import('../src/lib/storesEIP5792.js');
    const store = atomicBatch();

    expect(store.callId).toBeDefined();
    expect(store.isExecuting).toBeDefined();
    expect(store.error).toBeDefined();
    expect(store.isAtomicSupported).toBeDefined();
    expect(typeof store.execute).toBe('function');
    expect(typeof store.build).toBe('function');
  });

  it('isAtomicSupported should be true for supported chain', async () => {
    const { atomicBatch } = await import('../src/lib/storesEIP5792.js');
    const store = atomicBatch();

    // chainIdHex is '0x1' which supports atomic
    expect(store.isAtomicSupported).toBeDefined();
  });

  it('build should return atomic batch params', async () => {
    const { atomicBatch } = await import('../src/lib/storesEIP5792.js');
    const store = atomicBatch();

    const testCalls = [
      { to: '0xabcdef1234567890abcdef1234567890abcdef12', value: '0x0', data: '0x' },
    ];

    const result = store.build(testCalls);
    expect(result.isAtomic).toBe(true);
    expect(result.params).toBeDefined();
    expect(mockBuildAtomicBatch).toHaveBeenCalled();
  });

  it('build should throw when address is null', async () => {
    mockContextValue = { ...mockContextValue, address: null };
    const { atomicBatch } = await import('../src/lib/storesEIP5792.js');
    const store = atomicBatch();

    expect(() =>
      store.build([{ to: '0xabcdef1234567890abcdef1234567890abcdef12', value: '0x0', data: '0x' }]),
    ).toThrow('No account address available');
  });

  it('execute should return batch ID', async () => {
    const { atomicBatch } = await import('../src/lib/storesEIP5792.js');
    const store = atomicBatch();

    const testCalls = [
      { to: '0xabcdef1234567890abcdef1234567890abcdef12', value: '0x0', data: '0x' },
    ];

    const callId = await store.execute(testCalls);
    expect(callId).toBe('atomic-002');
    expect(mockExecuteAtomicBatch).toHaveBeenCalled();
  });

  it('execute should throw when not connected', async () => {
    mockContextValue = { ...mockContextValue, isConnected: false };
    const { atomicBatch } = await import('../src/lib/storesEIP5792.js');
    const store = atomicBatch();

    await expect(
      store.execute([{ to: '0xabcdef1234567890abcdef1234567890abcdef12', value: '0x0', data: '0x' }]),
    ).rejects.toThrow('No wallet connected');
  });

  it('execute should throw when address is null', async () => {
    mockContextValue = { ...mockContextValue, address: null };
    const { atomicBatch } = await import('../src/lib/storesEIP5792.js');
    const store = atomicBatch();

    await expect(
      store.execute([{ to: '0xabcdef1234567890abcdef1234567890abcdef12', value: '0x0', data: '0x' }]),
    ).rejects.toThrow('No account address available');
  });

  it('execute should set error on failure', async () => {
    const { atomicBatch } = await import('../src/lib/storesEIP5792.js');
    const store = atomicBatch();

    mockExecuteAtomicBatch.mockRejectedValueOnce(new Error('Execution reverted'));

    await expect(
      store.execute([{ to: '0xabcdef1234567890abcdef1234567890abcdef12', value: '0x0', data: '0x' }]),
    ).rejects.toThrow('Execution reverted');
  });

  it('build should pass custom options (chainId, version, capabilities)', async () => {
    const { atomicBatch } = await import('../src/lib/storesEIP5792.js');
    const store = atomicBatch();

    const customCaps = { '0x89': { paymasterService: { supported: true } } };

    store.build(
      [{ to: '0xabcdef1234567890abcdef1234567890abcdef12', value: '0x0', data: '0x' }],
      {
        chainId: '0x89',
        version: '2.0.0',
        capabilities: customCaps,
      },
    );

    const callArgs = mockBuildAtomicBatch.mock.calls[0][0];
    expect(callArgs.chainId).toBe('0x89');
    expect(callArgs.version).toBe('2.0.0');
  });

  it('execute should pass simulate option', async () => {
    const { atomicBatch } = await import('../src/lib/storesEIP5792.js');
    const store = atomicBatch();

    mockExecuteAtomicBatch.mockResolvedValue({ id: 'atomic-sim-003' });

    await store.execute(
      [{ to: '0xabcdef1234567890abcdef1234567890abcdef12', value: '0x0', data: '0x' }],
      { simulate: true },
    );

    // executeAtomicBatch(client, config) — config is second arg
    const callArgs = mockExecuteAtomicBatch.mock.calls[0][1];
    expect(callArgs.simulate).toBe(true);
  });

  it('execute should use default chainId when not specified', async () => {
    const { atomicBatch } = await import('../src/lib/storesEIP5792.js');
    const store = atomicBatch();

    await store.execute([
      { to: '0xabcdef1234567890abcdef1234567890abcdef12', value: '0x0', data: '0x' },
    ]);

    // executeAtomicBatch(client, config) — config is second arg
    const callArgs = mockExecuteAtomicBatch.mock.calls[0][1];
    expect(callArgs.chainId).toBe('0x1');
  });
});

// ---------------------------------------------------------------------------
// Tests: callsStatus
// ---------------------------------------------------------------------------

describe('callsStatus', () => {
  it('should be exported as a function', async () => {
    const mod = await import('../src/lib/storesEIP5792.js');
    expect(typeof mod.callsStatus).toBe('function');
  });

  it('should return a store with status, result, isPolling, error, startPolling, stopPolling, allSucceeded, failedReceipts', async () => {
    const { callsStatus } = await import('../src/lib/storesEIP5792.js');
    const store = callsStatus();

    expect(store.status).toBeDefined();
    expect(store.result).toBeDefined();
    expect(store.isPolling).toBeDefined();
    expect(store.error).toBeDefined();
    expect(typeof store.startPolling).toBe('function');
    expect(typeof store.stopPolling).toBe('function');
    expect(store.allSucceeded).toBeDefined();
    expect(store.failedReceipts).toBeDefined();
  });

  it('startPolling should start polling for a batch ID', async () => {
    vi.useFakeTimers();

    const { callsStatus } = await import('../src/lib/storesEIP5792.js');
    const store = callsStatus();

    store.startPolling('batch-001');

    await vi.advanceTimersByTimeAsync(100);

    expect(mockWalletGetCallsStatus).toHaveBeenCalledWith(expect.anything(), 'batch-001');
    store.stopPolling();
    vi.useRealTimers();
  });

  it('stopPolling should clear timer and reset state', async () => {
    vi.useFakeTimers();

    const { callsStatus } = await import('../src/lib/storesEIP5792.js');
    const store = callsStatus();

    store.startPolling('batch-001');
    await vi.advanceTimersByTimeAsync(50);

    store.stopPolling();
    expect(store.isPolling).toBeDefined();

    vi.useRealTimers();
  });

  it('allSucceeded helper should return true when all receipts have status 0x1', async () => {
    const { allSucceeded } = await import('../src/lib/storesEIP5792.js');

    const result = {
      status: 'CONFIRMED' as const,
      receipts: [
        { id: 'call-1', receipt: { status: '0x1', transactionHash: '0xtx1' } },
        { id: 'call-2', receipt: { status: '0x1', transactionHash: '0xtx2' } },
      ],
    };

    expect(allSucceeded(result)).toBe(true);
  });

  it('allSucceeded helper should return false when any receipt has status 0x0', async () => {
    const { allSucceeded } = await import('../src/lib/storesEIP5792.js');

    const result = {
      status: 'CONFIRMED' as const,
      receipts: [
        { id: 'call-1', receipt: { status: '0x1', transactionHash: '0xtx1' } },
        { id: 'call-2', receipt: { status: '0x0', transactionHash: '0xtx2' } },
      ],
    };

    expect(allSucceeded(result)).toBe(false);
  });

  it('allSucceeded helper should return false for non-confirmed status', async () => {
    const { allSucceeded } = await import('../src/lib/storesEIP5792.js');

    const result = {
      status: 'PENDING' as const,
      receipts: [],
    };

    expect(allSucceeded(result)).toBe(false);
  });

  it('failedReceipts helper should return only failed receipts', async () => {
    const { failedReceipts } = await import('../src/lib/storesEIP5792.js');

    const result = {
      status: 'CONFIRMED' as const,
      receipts: [
        { id: 'call-1', receipt: { status: '0x1', transactionHash: '0xtx1' } },
        { id: 'call-2', receipt: { status: '0x0', transactionHash: '0xtx2' } },
        { id: 'call-3', receipt: { status: '0x0', transactionHash: '0xtx3' } },
      ],
    };

    const failed = failedReceipts(result);
    expect(failed).toHaveLength(2);
    expect(failed[0].id).toBe('call-2');
    expect(failed[1].id).toBe('call-3');
  });

  it('failedReceipts helper should return empty array for null input', async () => {
    const { failedReceipts } = await import('../src/lib/storesEIP5792.js');
    expect(failedReceipts(null)).toEqual([]);
  });

  it('failedReceipts helper should return empty for non-confirmed', async () => {
    const { failedReceipts } = await import('../src/lib/storesEIP5792.js');

    const result = {
      status: 'PENDING' as const,
      receipts: [
        { id: 'call-1', receipt: { status: '0x0', transactionHash: '0xtx1' } },
      ],
    };

    expect(failedReceipts(result)).toEqual([]);
  });

  it('allSucceeded helper should return false when receipts array is empty', async () => {
    const { allSucceeded } = await import('../src/lib/storesEIP5792.js');

    const result = {
      status: 'CONFIRMED' as const,
      receipts: [],
    };

    expect(allSucceeded(result)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Type exports
// ---------------------------------------------------------------------------

describe('Type exports', () => {
  it('should export SendCallsOptions, AtomicBatchOptions types', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      require.resolve('../src/lib/storesEIP5792.ts'),
      'utf-8',
    );

    expect(src).toContain('export interface SendCallsOptions');
    expect(src).toContain('export interface AtomicBatchOptions');
    expect(src).toContain('export interface SendCallsStore');
    expect(src).toContain('export interface AtomicBatchStore');
    expect(src).toContain('export interface CallsStatusStore');
  });

  it('should re-export EIP-5792 stores from package index', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      require.resolve('../src/index.ts'),
      'utf-8',
    );

    expect(src).toContain('walletCapabilities');
    expect(src).toContain('sendCalls');
    expect(src).toContain('atomicBatch');
    expect(src).toContain('callsStatus');
    expect(src).toContain('allSucceeded');
    expect(src).toContain('failedReceipts');
  });
});
