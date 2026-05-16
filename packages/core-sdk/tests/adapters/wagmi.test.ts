/**
 * Tests for wagmi adapter — WagmiConnector, MultiChainConnector, factory functions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WagmiConnector,
  MultiChainConnector,
  createWagmiConnector,
  createMultiChainConnector,
} from '../../src/adapters/wagmi.js';
import type { WagmiConfig, WagmiConnectorInstance } from '../../src/adapters/wagmi.js';

function createMockWagmiConnector(overrides?: Partial<WagmiConnectorInstance>): WagmiConnectorInstance {
  return {
    id: 'injected',
    name: 'Injected Wallet',
    type: 'injected',
    connect: async () => ({
      accounts: ['0xWagmiAccount'],
      chainId: 1,
    }),
    disconnect: async () => {},
    getAccounts: async () => ['0xWagmiAccount'],
    getChainId: async () => 1,
    switchChain: async () => {},
    ...overrides,
  };
}

function makeTransport(): WagmiConfig['transports'][number] {
  return {
    value: {
      request: async ({ method }: { method: string }) =>
        method === 'personal_sign' ? '0xsignature' : '0xresult',
    },
  };
}

function createMockWagmiConfig(): WagmiConfig {
  return {
    chains: [
      { id: 1, name: 'Ethereum', rpcUrls: { default: { http: ['https://eth.rpc'] } } },
      { id: 137, name: 'Polygon', rpcUrls: { default: { http: ['https://polygon.rpc'] } } },
    ],
    transports: {
      1: makeTransport(),
      137: makeTransport(),
    },
    connectors: [createMockWagmiConnector()],
  };
}

describe('WagmiConnector', () => {
  let connector: WagmiConnector;
  let config: WagmiConfig;
  let wagmiInstance: WagmiConnectorInstance;

  beforeEach(() => {
    wagmiInstance = createMockWagmiConnector();
    config = createMockWagmiConfig();
    connector = new WagmiConnector(wagmiInstance, config);
  });

  it('should have correct id, name, type', () => {
    expect(connector.id).toBe('injected');
    expect(connector.name).toBe('Injected Wallet');
    expect(connector.type).toBe('injected');
    expect(connector.installed).toBe(true);
  });

  it('should connect and return ConnectionResult', async () => {
    const result = await connector.connect();
    expect(result.accounts).toEqual(['0xWagmiAccount']);
    expect(result.chainId).toBe(1);
    expect(result.connectorId).toBe('injected');
    expect(result.sessionId).toContain('injected');
  });

  it('should disconnect', async () => {
    await connector.connect();
    await expect(connector.disconnect()).resolves.not.toThrow();
  });

  it('should get accounts', async () => {
    const accounts = await connector.getAccounts();
    expect(accounts).toEqual(['0xWagmiAccount']);
  });

  it('should get chainId', async () => {
    const chainId = await connector.getChainId();
    expect(chainId).toBe(1);
  });

  it('should switch chain', async () => {
    await expect(connector.switchChain(137)).resolves.not.toThrow();
  });

  it('should throw on unknown chain switch', async () => {
    await expect(connector.switchChain(999)).rejects.toThrow('not configured');
  });

  it('should sign a message (hex)', async () => {
    await connector.connect();
    const sig = await connector.signMessage('0xhello');
    expect(typeof sig).toBe('string');
  });

  it('should sign a message (UTF-8)', async () => {
    await connector.connect();
    const sig = await connector.signMessage('Hello World');
    expect(typeof sig).toBe('string');
  });

  it('should throw when signing without connecting', async () => {
    await expect(connector.signMessage('test')).rejects.toThrow();
  });

  it('should get wagmi config', () => {
    expect(connector.getWagmiConfig()).toBe(config);
  });

  it('should get wagmi connector instance', () => {
    expect(connector.getWagmiConnectorInstance()).toBe(wagmiInstance);
  });

  it('should sign a transaction', async () => {
    await connector.connect();
    const result = await connector.signTransaction({
      from: '0xabc',
      to: '0xdef',
      value: '0x100',
    });
    expect(typeof result).toBe('string');
  });
});

describe('MultiChainConnector', () => {
  let connector: MultiChainConnector;
  let config: WagmiConfig;

  beforeEach(() => {
    config = {
      chains: [
        { id: 1, name: 'Ethereum', rpcUrls: { default: { http: ['https://eth.rpc'] } } },
        { id: 10, name: 'Optimism', rpcUrls: { default: { http: ['https://optimism.rpc'] } } },
      ],
      transports: {
        1: makeTransport(),
        10: makeTransport(),
      },
      connectors: [
        createMockWagmiConnector({ id: 'injected', name: 'MetaMask' }),
        createMockWagmiConnector({ id: 'walletconnect', name: 'WalletConnect' }),
      ],
    };
    connector = new MultiChainConnector(config);
  });

  it('should have correct id and type', () => {
    expect(connector.id).toBe('wagmi-multi');
    expect(connector.type).toBe('multi');
    expect(connector.installed).toBe(true);
  });

  it('should list available connectors', () => {
    expect(connector.getAvailableConnectors()).toEqual(['injected', 'walletconnect']);
  });

  it('should set active connector', () => {
    connector.setActiveConnector('walletconnect');
    expect(connector.getAvailableConnectors()).toContain('walletconnect');
  });

  it('should throw on unknown connector', () => {
    expect(() => connector.setActiveConnector('unknown')).toThrow('not found');
  });

  it('should connect via active connector', async () => {
    connector.setActiveConnector('injected');
    const result = await connector.connect();
    expect(result.accounts).toEqual(['0xWagmiAccount']);
    expect(result.chainId).toBe(1);
  });

  it('should throw when connecting without active connector', async () => {
    await expect(connector.connect()).rejects.toThrow('No active wagmi connector');
  });

  it('should disconnect', async () => {
    connector.setActiveConnector('injected');
    await connector.connect();
    await expect(connector.disconnect()).resolves.not.toThrow();
  });

  it('should switch chain', async () => {
    connector.setActiveConnector('injected');
    await connector.connect();
    await expect(connector.switchChain(10)).resolves.not.toThrow();
  });

  it('should throw on unknown chain switch', async () => {
    await expect(connector.switchChain(999)).rejects.toThrow('not in wagmi config');
  });

  it('should get provider for active chain', async () => {
    connector.setActiveConnector('injected');
    await connector.connect();
    await connector.switchChain(1);
    const provider = connector.getProvider();
    expect(provider).toBeDefined();
  });
});

describe('createWagmiConnector factory', () => {
  it('should create WagmiConnector', () => {
    const instance = createMockWagmiConnector();
    const config = createMockWagmiConfig();
    const c = createWagmiConnector(instance, config, { icon: 'icon.png' });
    expect(c).toBeInstanceOf(WagmiConnector);
    expect(c.icon).toBe('icon.png');
  });
});

describe('createMultiChainConnector factory', () => {
  it('should create MultiChainConnector', () => {
    const config = createMockWagmiConfig();
    const c = createMultiChainConnector(config);
    expect(c).toBeInstanceOf(MultiChainConnector);
  });
});
