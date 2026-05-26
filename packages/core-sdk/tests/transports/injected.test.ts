/**
 * Injected provider transport tests for core-sdk.
 *
 * Tests the InjectedProvider class for:
 * - Provider detection (window.ethereum)
 * - EIP-1193 interface (request, on, removeListener)
 * - Connect / disconnect lifecycle
 * - Chain switching
 * - Message / transaction signing
 * - Event handling (accountsChanged, chainChanged)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Helper to create a mock EIP-1193 provider
function createMockProvider(overrides: Record<string, unknown> = {}) {
  const listeners: Record<string, Set<(...args: unknown[]) => void>> = {};
  return {
    isMetaMask: true,
    request: vi.fn(async ({ method }: { method: string; params?: unknown[] }) => {
      switch (method) {
        case 'eth_requestAccounts':
          return ['0x1234567890abcdef1234567890abcdef12345678'];
        case 'eth_accounts':
          return ['0x1234567890abcdef1234567890abcdef12345678'];
        case 'eth_chainId':
          return '0x1';
        case 'wallet_switchEthereumChain':
          return null;
        case 'personal_sign':
          return '0xsigned';
        case 'eth_signTransaction':
          return '0xtxsigned';
        default:
          return null;
      }
    }),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners[event]) listeners[event] = new Set();
      listeners[event].add(handler);
    }),
    removeListener: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      listeners[event]?.delete(handler);
    }),
    emit(event: string, ...args: unknown[]) {
      listeners[event]?.forEach((h) => h(...args));
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  // @ts-ignore
  delete globalThis.window;
  vi.useRealTimers();
});

async function importInjected() {
  return await import('../../src/transports/injected.js');
}

describe('InjectedProvider', () => {
  it('creates with explicit provider', async () => {
    const { InjectedProvider } = await importInjected();
    const provider = createMockProvider();

    const injected = new InjectedProvider('io.metamask', 'MetaMask', 'icon.svg', provider);

    expect(injected.id).toBe('io.metamask');
    expect(injected.name).toBe('MetaMask');
    expect(injected.installed).toBe(true);
    expect(injected.type).toBe('injected');
  });

  it('detects window.ethereum provider', async () => {
    const { InjectedProvider } = await importInjected();
    const provider = createMockProvider();
    // @ts-ignore
    globalThis.window = { ethereum: provider };

    const injected = new InjectedProvider('io.metamask', 'MetaMask', 'icon.svg');

    expect(injected.installed).toBe(true);
  });

  it('returns false when no window.ethereum', async () => {
    const { InjectedProvider } = await importInjected();
    // @ts-ignore
    globalThis.window = {};

    const injected = new InjectedProvider('io.metamask', 'MetaMask', 'icon.svg');

    expect(injected.installed).toBe(false);
  });

  it('returns false when window is undefined', async () => {
    const { InjectedProvider } = await importInjected();
    // @ts-ignore
    delete globalThis.window;

    const injected = new InjectedProvider('io.metamask', 'MetaMask', 'icon.svg');

    expect(injected.installed).toBe(false);
  });

  it('connects and returns ConnectionResult', async () => {
    const { InjectedProvider } = await importInjected();
    const provider = createMockProvider();

    const injected = new InjectedProvider('io.metamask', 'MetaMask', 'icon.svg', provider);

    const result = await injected.connect();

    expect(result.sessionId).toMatch(/^injected-/);
    expect(result.accounts).toEqual(['0x1234567890abcdef1234567890abcdef12345678']);
    expect(result.chainId).toBe(1);
    expect(result.connectorId).toBe('io.metamask');
  });

  it('throws connect when not installed', async () => {
    const { InjectedProvider } = await importInjected();
    const injected = new InjectedProvider('io.metamask', 'MetaMask', 'icon.svg');

    await expect(injected.connect()).rejects.toThrow('is not installed');
  });

  it('disconnects and emits event', async () => {
    const { InjectedProvider } = await importInjected();
    const provider = createMockProvider();
    const injected = new InjectedProvider('io.metamask', 'MetaMask', 'icon.svg', provider);

    let disconnected = false;
    injected.on('disconnect', () => {
      disconnected = true;
    });

    await injected.disconnect();
    expect(disconnected).toBe(true);
  });

  it('returns accounts when connected', async () => {
    const { InjectedProvider } = await importInjected();
    const provider = createMockProvider();
    const injected = new InjectedProvider('io.metamask', 'MetaMask', 'icon.svg', provider);

    await injected.connect();
    const accounts = await injected.getAccounts();
    expect(accounts).toEqual(['0x1234567890abcdef1234567890abcdef12345678']);
  });

  it('throws getAccounts when not connected', async () => {
    const { InjectedProvider } = await importInjected();
    const provider = createMockProvider({
      request: vi.fn(async () => {
        throw new Error('Not connected');
      }),
    });
    const injected = new InjectedProvider('io.metamask', 'MetaMask', 'icon.svg', provider);

    await expect(injected.getAccounts()).rejects.toThrow('Not connected');
  });

  it('returns chainId when connected', async () => {
    const { InjectedProvider } = await importInjected();
    const provider = createMockProvider();
    const injected = new InjectedProvider('io.metamask', 'MetaMask', 'icon.svg', provider);

    await injected.connect();
    const chainId = await injected.getChainId();
    expect(chainId).toBe(1);
  });

  it('switches chain when connected', async () => {
    const { InjectedProvider } = await importInjected();
    const provider = createMockProvider();
    const injected = new InjectedProvider('io.metamask', 'MetaMask', 'icon.svg', provider);

    await injected.connect();
    await injected.switchChain(137);

    expect(provider.request).toHaveBeenCalledWith({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x89' }],
    });
  });

  it('signs messages when connected', async () => {
    const { InjectedProvider } = await importInjected();
    const provider = createMockProvider();
    const injected = new InjectedProvider('io.metamask', 'MetaMask', 'icon.svg', provider);

    await injected.connect();
    const sig = await injected.signMessage('hello');
    expect(sig).toBe('0xsigned');
  });

  it('signs transactions when connected', async () => {
    const { InjectedProvider } = await importInjected();
    const provider = createMockProvider();
    const injected = new InjectedProvider('io.metamask', 'MetaMask', 'icon.svg', provider);

    await injected.connect();
    const sig = await injected.signTransaction({
      from: '0x123',
      to: '0x456',
      value: '0x0',
    });
    expect(sig).toBe('0xtxsigned');
  });

  it('returns raw provider via getProvider', async () => {
    const { InjectedProvider } = await importInjected();
    const provider = createMockProvider();
    const injected = new InjectedProvider('io.metamask', 'MetaMask', 'icon.svg', provider);

    expect(injected.getProvider()).toBe(provider);
  });

  it('emits accountsChanged from provider', async () => {
    const { InjectedProvider } = await importInjected();
    const provider = createMockProvider();
    const injected = new InjectedProvider('io.metamask', 'MetaMask', 'icon.svg', provider);

    let newAccounts: unknown;
    injected.on('accountsChanged', (accounts: unknown) => {
      newAccounts = accounts;
    });

    provider.emit('accountsChanged', ['0xnewaddress']);
    expect(newAccounts).toEqual(['0xnewaddress']);
  });

  it('emits chainChanged from provider', async () => {
    const { InjectedProvider } = await importInjected();
    const provider = createMockProvider();
    const injected = new InjectedProvider('io.metamask', 'MetaMask', 'icon.svg', provider);

    let newChainId: unknown;
    injected.on('chainChanged', (chainId: unknown) => {
      newChainId = chainId;
    });

    provider.emit('chainChanged', '0x89');
    expect(newChainId).toBe(137);
  });

  it('emits disconnect from provider', async () => {
    const { InjectedProvider } = await importInjected();
    const provider = createMockProvider();
    const injected = new InjectedProvider('io.metamask', 'MetaMask', 'icon.svg', provider);

    let disconnected = false;
    injected.on('disconnect', () => {
      disconnected = true;
    });

    provider.emit('disconnect');
    expect(disconnected).toBe(true);
  });

  it('wraps non-Error errors', async () => {
    const { InjectedProvider } = await importInjected();
    const provider = createMockProvider({
      request: vi.fn(async () => {
        throw 'string error';
      }),
    });
    const injected = new InjectedProvider('io.metamask', 'MetaMask', 'icon.svg', provider);

    await expect(injected.connect()).rejects.toThrow('string error');
  });
});
