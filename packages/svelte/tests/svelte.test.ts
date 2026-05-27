/**
 * Tests for @cinacoin/svelte — stores, hooks, createCinacoin, and actions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock svelte/store ───────────────────────────────────────────────────────

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
  derived: mockDerived,
}));

vi.mock('svelte', () => ({
  getContext: vi.fn(() => null),
  setContext: vi.fn(),
  onDestroy: vi.fn(),
}));

// ─── Mock Connector ──────────────────────────────────────────────────────────

const mockConnector = {
  on: vi.fn(),
  off: vi.fn(),
  connect: vi.fn().mockResolvedValue({
    accounts: ['0x1234567890abcdef1234567890abcdef12345678'],
    chainId: 1,
  }),
  disconnect: vi.fn().mockResolvedValue(undefined),
  switchChain: vi.fn().mockResolvedValue(undefined),
  getAccounts: vi.fn().mockResolvedValue(['0x1234']),
  getChainId: vi.fn().mockReturnValue(1),
  getProvider: vi.fn().mockReturnValue(null),
};

vi.mock('@cinacoin/core-sdk', () => ({
  Connector: vi.fn().mockImplementation(() => mockConnector),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('createCinacoin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createdStores.length = 0;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should require connector or createConnector option', async () => {
    const { createCinacoin } = await import('../src/lib/createCinacoin.js');
    expect(() => createCinacoin({})).toThrow(/requires either.*connector.*or.*createConnector/);
  });

  it('should accept a connector option', async () => {
    const { createCinacoin } = await import('../src/lib/createCinacoin.js');
    const ctx = createCinacoin({ connector: mockConnector as any });

    expect(ctx).toBeDefined();
    expect(ctx.getConnector()).toBeTruthy();
    expect(typeof ctx.open).toBe('function');
    expect(typeof ctx.close).toBe('function');
    expect(typeof ctx.switchChain).toBe('function');
    expect(typeof ctx.reset).toBe('function');
  });

  it('should accept a createConnector function', async () => {
    const { createCinacoin } = await import('../src/lib/createCinacoin.js');
    const ctx = createCinacoin({ createConnector: () => mockConnector as any });
    expect(ctx.getConnector()).toBeTruthy();
  });
});

describe('stores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createdStores.length = 0;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should export all expected stores', async () => {
    const stores = await import('../src/lib/stores.js');
    expect(stores.isConnected).toBeDefined();
    expect(stores.address).toBeDefined();
    expect(stores.balance).toBeDefined();
    expect(stores.chainId).toBeDefined();
    expect(stores.status).toBeDefined();
    expect(stores.error).toBeDefined();
    expect(stores.isConnecting).toBeDefined();
    expect(stores.hasError).toBeDefined();
    expect(stores.chains).toBeDefined();
  });

  it('should export initCinacoin', async () => {
    const { initCinacoin } = await import('../src/lib/stores.js');
    expect(typeof initCinacoin).toBe('function');
  });

  it('should export getConnector and return null before init', async () => {
    const { getConnector } = await import('../src/lib/stores.js');
    expect(typeof getConnector).toBe('function');
    expect(getConnector()).toBeNull();
  });

  it('should export open, close, switchChain, resetCinacoin', async () => {
    const { open, close, switchChain, resetCinacoin } = await import('../src/lib/stores.js');
    expect(typeof open).toBe('function');
    expect(typeof close).toBe('function');
    expect(typeof switchChain).toBe('function');
    expect(typeof resetCinacoin).toBe('function');
  });

  it('should throw if open() called before init', async () => {
    const { open } = await import('../src/lib/stores.js');
    await expect(open()).rejects.toThrow(/SDK not initialized/);
  });

  it('should throw if close() called before init', async () => {
    const { close } = await import('../src/lib/stores.js');
    await expect(close()).rejects.toThrow(/SDK not initialized/);
  });

  it('should throw if switchChain() called before init', async () => {
    const { switchChain } = await import('../src/lib/stores.js');
    await expect(switchChain(1)).rejects.toThrow(/SDK not initialized/);
  });

  it('should initCinacoin and getConnector returns connector after init', async () => {
    const { initCinacoin, getConnector, resetCinacoin } = await import('../src/lib/stores.js');
    resetCinacoin();
    initCinacoin(mockConnector as any, { chains: [{ id: '1', name: 'Ethereum' }] as any });
    expect(getConnector()).toBeTruthy();
  });
});

describe('useCinacoin hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createdStores.length = 0;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should export getCinacoin, getCinacoinAccount, getCinacoinNetwork', async () => {
    const hooks = await import('../src/lib/useCinacoin.js');
    expect(hooks.getCinacoin).toBeDefined();
    expect(hooks.getCinacoinAccount).toBeDefined();
    expect(hooks.getCinacoinNetwork).toBeDefined();
  });

  it('getCinacoin returns open, close, isOpen', async () => {
    const { getCinacoin } = await import('../src/lib/useCinacoin.js');
    const result = getCinacoin();
    expect(result).toHaveProperty('open');
    expect(result).toHaveProperty('close');
    expect(result).toHaveProperty('isOpen');
    expect(typeof result.open).toBe('function');
    expect(typeof result.close).toBe('function');
  });

  it('getCinacoinAccount returns address, isConnected, status, balance', async () => {
    const { getCinacoinAccount } = await import('../src/lib/useCinacoin.js');
    const result = getCinacoinAccount();
    expect(result).toHaveProperty('address');
    expect(result).toHaveProperty('isConnected');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('balance');
  });

  it('getCinacoinNetwork returns chain, chainId, switchNetwork, chains', async () => {
    const { getCinacoinNetwork } = await import('../src/lib/useCinacoin.js');
    const result = getCinacoinNetwork();
    expect(result).toHaveProperty('chain');
    expect(result).toHaveProperty('chainId');
    expect(result).toHaveProperty('switchNetwork');
    expect(result).toHaveProperty('chains');
    expect(typeof result.switchNetwork).toBe('function');
  });
});

describe('actions', () => {
  it('should export cinaConnectConnect and cinaConnectNetwork', async () => {
    const actions = await import('../src/lib/actions.js');
    expect(actions.cinaConnectConnect).toBeDefined();
    expect(actions.cinaConnectNetwork).toBeDefined();
  });
});

describe('package exports', () => {
  it('should export createCinacoin, stores, and hooks from index', async () => {
    const index = await import('../src/index.js');
    expect(index.createCinacoin).toBeDefined();
    expect(index.isConnected).toBeDefined();
    expect(index.address).toBeDefined();
    expect(index.getCinacoin).toBeDefined();
    expect(index.getCinacoinAccount).toBeDefined();
    expect(index.getCinacoinNetwork).toBeDefined();
  });
});
