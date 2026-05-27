/**
 * WalletConnect v2 adapter tests for core-sdk.
 *
 * Tests the adapter interface that bridges @cinacoin/walletconnect-v2
 * to the core-sdk Connector API (EIP-1193 / Connector interface).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Connector } from '../../src/connector.js';
import type { ConnectParams, ConnectionResult, TransactionRequest } from '../../src/types.js';

// ============================================================
// Mock WCv2 connector — tests the adapter contract
// ============================================================

class MockWalletConnectAdapter implements Connector {
  readonly id = 'walletconnect-v2';
  readonly name = 'WalletConnect';
  readonly icon = 'data:image/svg+xml;base64,wcv2';
  readonly installed = true;
  readonly type = 'relay';

  private _session: ConnectionResult | null = null;

  async connect(params?: ConnectParams): Promise<ConnectionResult> {
    const chains = params?.chains ?? [1];
    const result: ConnectionResult = {
      sessionId: `wc2-${Date.now()}`,
      accounts: ['0xabcdef1234567890abcdef1234567890abcdef12'],
      chainId: chains[0],
      connectorId: this.id,
    };
    this._session = result;
    return result;
  }

  async disconnect(): Promise<void> {
    this._session = null;
  }

  async getAccounts(): Promise<string[]> {
    return this._session?.accounts ?? [];
  }

  async getChainId(): Promise<number> {
    if (!this._session) throw new Error('Not connected');
    return this._session.chainId;
  }

  async switchChain(chainId: number): Promise<void> {
    if (!this._session) throw new Error('Not connected');
    this._session.chainId = chainId;
  }

  async signMessage(_message: string): Promise<string> {
    if (!this._session) throw new Error('Not connected');
    return '0xwc2signed';
  }

  async signTransaction(_tx: TransactionRequest): Promise<string> {
    if (!this._session) throw new Error('Not connected');
    return '0xwc2txsigned';
  }

  getProvider(): unknown {
    return this._session
      ? {
          request: async ({ method }: { method: string; params?: unknown[] }) => {
            if (method === 'eth_accounts') return this._session?.accounts;
            if (method === 'eth_chainId') return `0x${this._session?.chainId?.toString(16)}`;
            return null;
          },
        }
      : null;
  }
}

// ============================================================
// Tests
// ============================================================

describe('WalletConnect v2 Adapter', () => {
  let adapter: MockWalletConnectAdapter;

  beforeEach(() => {
    adapter = new MockWalletConnectAdapter();
  });

  it('has correct static identity', () => {
    expect(adapter.id).toBe('walletconnect-v2');
    expect(adapter.name).toBe('WalletConnect');
    expect(adapter.installed).toBe(true);
    expect(adapter.type).toBe('relay');
  });

  it('connects and returns ConnectionResult', async () => {
    const result = await adapter.connect();
    expect(result.sessionId).toMatch(/^wc2-/);
    expect(result.accounts).toHaveLength(1);
    expect(result.chainId).toBe(1);
    expect(result.connectorId).toBe('walletconnect-v2');
  });

  it('connects with custom chain', async () => {
    const result = await adapter.connect({ chains: [137] });
    expect(result.chainId).toBe(137);
  });

  it('disconnects and clears session', async () => {
    await adapter.connect();
    expect(await adapter.getAccounts()).toHaveLength(1);
    await adapter.disconnect();
    expect(await adapter.getAccounts()).toEqual([]);
  });

  it('returns accounts when connected', async () => {
    await adapter.connect();
    const accounts = await adapter.getAccounts();
    expect(accounts).toEqual(['0xabcdef1234567890abcdef1234567890abcdef12']);
  });

  it('signs messages when connected', async () => {
    await adapter.connect();
    const sig = await adapter.signMessage('hello');
    expect(sig).toBe('0xwc2signed');
  });

  it('signs transactions when connected', async () => {
    await adapter.connect();
    const sig = await adapter.signTransaction({
      from: '0xabc',
      to: '0xdef',
      value: '0x0',
    });
    expect(sig).toBe('0xwc2txsigned');
  });

  it('throws signMessage when not connected', async () => {
    await expect(adapter.signMessage('hello')).rejects.toThrow('Not connected');
  });

  it('throws signTransaction when not connected', async () => {
    await expect(adapter.signTransaction({ from: '0x', to: '0x' })).rejects.toThrow(
      'Not connected',
    );
  });

  it('switches chain when connected', async () => {
    await adapter.connect({ chains: [1] });
    await adapter.switchChain(56);
    expect(await adapter.getChainId()).toBe(56);
  });

  it('throws switchChain when not connected', async () => {
    await expect(adapter.switchChain(1)).rejects.toThrow('Not connected');
  });

  it('throws getChainId when not connected', async () => {
    await expect(adapter.getChainId()).rejects.toThrow('Not connected');
  });
});
