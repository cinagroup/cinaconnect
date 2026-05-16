/**
 * Tests for viem adapter — getAccounts, getBalance, sendTransaction, signMessage, switchChain.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ViemChainAdapter, createViemAdapter } from '../../src/adapters/viem.js';
import type { ViemClient, ViemChain } from '../../src/adapters/viem.js';

class MockViemClient implements ViemClient {
  private accounts: string[];
  private chainId: number;

  constructor(accounts: string[] = ['0xMockAccount1'], chainId: number = 1) {
    this.accounts = accounts;
    this.chainId = chainId;
  }

  account = { address: `0xMockAccount1` as `0x${string}` };
  chain = { id: 1, name: 'Ethereum', rpcUrls: { default: { http: ['https://eth.rpc'] } } };
  transport = {
    value: {
      request: async ({ method, params }: { method: string; params?: unknown[] }) => {
        switch (method) {
          case 'eth_getBalance':
            return '0x1234';
          case 'eth_sendTransaction':
            return '0xtxhash123';
          case 'personal_sign':
            return '0xsignature';
          case 'wallet_switchEthereumChain':
            return null;
          case 'eth_accounts':
            return this.accounts;
          default:
            return null;
        }
      },
    },
  };

  async request({ method, params }: { method: string; params?: unknown[] }): Promise<unknown> {
    return this.transport.value.request({ method, params });
  }
}

describe('ViemChainAdapter', () => {
  let adapter: ViemChainAdapter;

  beforeEach(() => {
    adapter = new ViemChainAdapter();
  });

  it('should throw when no client or connector is set', async () => {
    await expect(adapter.getBalance('0xabc')).rejects.toThrow('No viem client, transport, or connector available');
  });

  it('should get accounts from client.account', async () => {
    const client = new MockViemClient();
    adapter.setClient(client);
    const accounts = await adapter.getAccounts();
    expect(accounts).toEqual(['0xMockAccount1']);
  });

  it('should get balance via eth_getBalance', async () => {
    const client = new MockViemClient();
    adapter.setClient(client);
    const balance = await adapter.getBalance('0xabc');
    expect(balance).toBe('0x1234');
  });

  it('should send a transaction', async () => {
    const client = new MockViemClient();
    adapter.setClient(client);
    const txHash = await adapter.sendTransaction({
      from: '0xabc',
      to: '0xdef',
      value: '0x100',
    });
    expect(txHash).toBe('0xtxhash123');
  });

  it('should sign a message (hex)', async () => {
    const client = new MockViemClient();
    adapter.setClient(client);
    const sig = await adapter.signMessage('0xhello');
    expect(sig).toBe('0xsignature');
  });

  it('should sign a message (UTF-8 string)', async () => {
    const client = new MockViemClient();
    adapter.setClient(client);
    const sig = await adapter.signMessage('Hello World');
    expect(sig).toBe('0xsignature');
  });

  it('should switch chain', async () => {
    const client = new MockViemClient();
    adapter.setClient(client);
    await expect(adapter.switchChain(137)).resolves.not.toThrow();
  });

  it('should register and find chains', () => {
    adapter.registerChains([
      { id: '1', name: 'Ethereum', rpcUrl: 'https://eth.rpc' },
      { id: '137', name: 'Polygon', rpcUrl: 'https://polygon.rpc' },
    ]);
    expect(adapter.findChain(1)).toBeDefined();
    expect(adapter.findChain(137)?.name).toBe('Polygon');
  });

  it('should return undefined for unknown chain', () => {
    adapter.registerChains([{ id: '1', name: 'Ethereum', rpcUrl: 'https://eth.rpc' }]);
    expect(adapter.findChain(999)).toBeUndefined();
  });

  it('should throw when signing with no accounts', async () => {
    const client = {
      account: null,
      transport: {
        value: {
          request: async () => null,
        },
      },
      async request() { return null; },
    } as unknown as ViemClient;
    adapter.setClient(client);
    await expect(adapter.signMessage('test')).rejects.toThrow('No account connected');
  });

  it('should format transaction correctly', async () => {
    const client = new MockViemClient();
    adapter.setClient(client);
    // Internal test of formatTransaction
    await adapter.sendTransaction({
      from: '0xabc',
      to: '0xdef',
      value: '0x100',
      data: '0x',
      chainId: 1,
      gas: '0x5208',
      nonce: '0x1',
      maxFeePerGas: '0x3b9aca00',
      maxPriorityFeePerGas: '0x77359400',
    });
  });
});

describe('createViemAdapter factory', () => {
  it('should create adapter with client', () => {
    const client = new MockViemClient();
    const adapter = createViemAdapter(client);
    expect(adapter).toBeInstanceOf(ViemChainAdapter);
  });

  it('should create adapter without client', () => {
    const adapter = createViemAdapter();
    expect(adapter).toBeInstanceOf(ViemChainAdapter);
  });

  it('should set id and name', () => {
    const adapter = createViemAdapter();
    expect(adapter.id).toBe('viem');
    expect(adapter.name).toBe('viem');
  });
});
