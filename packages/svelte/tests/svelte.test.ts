/**
 * Tests for @cinaconnect/svelte — stores, hooks, createCinaConnect, and actions.
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

vi.mock('@cinaconnect/core-sdk', () => ({
  Connector: vi.fn().mockImplementation(() => mockConnector),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('createCinaConnect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createdStores.length = 0;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should require connector or createConnector option', async () => {
    const { createCinaConnect } = await import('../src/lib/createCinaConnect.js');
    expect(() => createCinaConnect({})).toThrow(/requires either.*connector.*or.*createConnector/);
  });

  it('should accept a connector option', async () => {
    const { createCinaConnect } = await import('../src/lib/createCinaConnect.js');
    const ctx = createCinaConnect({ connector: mockConnector as any });

    expect(ctx).toBeDefined();
    expect(ctx.getConnector()).toBeTruthy();
    expect(typeof ctx.open).toBe('function');
    expect(typeof ctx.close).toBe('function');
    expect(typeof ctx.switchChain).toBe('function');
    expect(typeof ctx.reset).toBe('function');
  });

  it('should accept a createConnector function', async () => {
    const { createCinaConnect } = await import('../src/lib/createCinaConnect.js');
    const ctx = createCinaConnect({ createConnector: () => mockConnector as any });
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

  it('should export initCinaConnect', async () => {
    const { initCinaConnect } = await import('../src/lib/stores.js');
    expect(typeof initCinaConnect).toBe('function');
  });

  it('should export getConnector and return null before init', async () => {
    const { getConnector } = await import('../src/lib/stores.js');
    expect(typeof getConnector).toBe('function');
    expect(getConnector()).toBeNull();
  });

  it('should export open, close, switchChain, resetCinaConnect', async () => {
    const { open, close, switchChain, resetCinaConnect } = await import('../src/lib/stores.js');
    expect(typeof open).toBe('function');
    expect(typeof close).toBe('function');
    expect(typeof switchChain).toBe('function');
    expect(typeof resetCinaConnect).toBe('function');
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

  it('should initCinaConnect and getConnector returns connector after init', async () => {
    const { initCinaConnect, getConnector, resetCinaConnect } = await import('../src/lib/stores.js');
    resetCinaConnect();
    initCinaConnect(mockConnector as any, { chains: [{ id: '1', name: 'Ethereum' }] as any });
    expect(getConnector()).toBeTruthy();
  });
});

describe('useCinaConnect hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createdStores.length = 0;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should export getCinaConnect, getCinaConnectAccount, getCinaConnectNetwork', async () => {
    const hooks = await import('../src/lib/useCinaConnect.js');
    expect(hooks.getCinaConnect).toBeDefined();
    expect(hooks.getCinaConnectAccount).toBeDefined();
    expect(hooks.getCinaConnectNetwork).toBeDefined();
  });

  it('getCinaConnect returns open, close, isOpen', async () => {
    const { getCinaConnect } = await import('../src/lib/useCinaConnect.js');
    const result = getCinaConnect();
    expect(result).toHaveProperty('open');
    expect(result).toHaveProperty('close');
    expect(result).toHaveProperty('isOpen');
    expect(typeof result.open).toBe('function');
    expect(typeof result.close).toBe('function');
  });

  it('getCinaConnectAccount returns address, isConnected, status, balance', async () => {
    const { getCinaConnectAccount } = await import('../src/lib/useCinaConnect.js');
    const result = getCinaConnectAccount();
    expect(result).toHaveProperty('address');
    expect(result).toHaveProperty('isConnected');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('balance');
  });

  it('getCinaConnectNetwork returns chain, chainId, switchNetwork, chains', async () => {
    const { getCinaConnectNetwork } = await import('../src/lib/useCinaConnect.js');
    const result = getCinaConnectNetwork();
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
  it('should export createCinaConnect, stores, and hooks from index', async () => {
    const index = await import('../src/index.js');
    expect(index.createCinaConnect).toBeDefined();
    expect(index.isConnected).toBeDefined();
    expect(index.address).toBeDefined();
    expect(index.getCinaConnect).toBeDefined();
    expect(index.getCinaConnectAccount).toBeDefined();
    expect(index.getCinaConnectNetwork).toBeDefined();
  });
});
