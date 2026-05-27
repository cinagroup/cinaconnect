/**
 * Multi-chain integration tests for the Cinacoin Core SDK.
 *
 * Tests chain switching mid-session across different EVM networks.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Connector } from '../../src/connector.js';
import type { ConnectParams, ConnectionResult, TransactionRequest } from '../../src/types.js';

// ============================================================
// Mock Multi-Chain Connector
// ============================================================

const SUPPORTED_CHAINS = [1, 137, 10, 42161, 8453]; // ETH, POLYGON, OP, ARB, BASE

class MultiChainConnector extends Connector {
  readonly id = 'test-multi-chain';
  readonly name = 'Multi-Chain Wallet';
  readonly icon = '';
  readonly installed = true;
  readonly type = 'injected';

  private _accounts = ['0xabcdef1234567890abcdef1234567890abcdef12'];
  private _chainId = 1;
  private _connected = false;
  private _chainSwitchHistory: number[] = [];

  async connect(params?: ConnectParams): Promise<ConnectionResult> {
    this._connected = true;
    this._chainId = params?.chains?.[0] ?? 1;
    this._chainSwitchHistory = [this._chainId];
    return {
      sessionId: 'multi-chain-session',
      accounts: [...this._accounts],
      chainId: this._chainId,
      connectorId: this.id,
    };
  }

  async disconnect(): Promise<void> {
    this._connected = false;
    this._chainSwitchHistory = [];
  }

  async getAccounts(): Promise<string[]> {
    return this._connected ? [...this._accounts] : [];
  }

  async getChainId(): Promise<number> {
    if (!this._connected) throw new Error('Not connected');
    return this._chainId;
  }

  async switchChain(chainId: number): Promise<void> {
    if (!this._connected) throw new Error('Not connected');
    if (!SUPPORTED_CHAINS.includes(chainId)) {
      throw new Error(`Chain ${chainId} not supported`);
    }
    this._chainId = chainId;
    this._chainSwitchHistory.push(chainId);
  }

  async signMessage(_message: string): Promise<string> {
    if (!this._connected) throw new Error('Not connected');
    return '0xmocksig';
  }

  async signTransaction(_tx: TransactionRequest): Promise<string> {
    if (!this._connected) throw new Error('Not connected');
    return '0xmocktx';
  }

  getChainSwitchHistory(): number[] {
    return [...this._chainSwitchHistory];
  }
}

// ============================================================
// Tests
// ============================================================

describe('Multi-chain switching', () => {
  let connector: MultiChainConnector;

  beforeEach(() => {
    connector = new MultiChainConnector();
  });

  it('connects on default chain 1', async () => {
    const result = await connector.connect();
    expect(result.chainId).toBe(1);
  });

  it('connects on specified chain', async () => {
    const result = await connector.connect({ chains: [137] });
    expect(result.chainId).toBe(137);
  });

  it('switches from ETH to Polygon', async () => {
    await connector.connect({ chains: [1] });
    await connector.switchChain(137);
    expect(await connector.getChainId()).toBe(137);
  });

  it('switches through multiple chains', async () => {
    await connector.connect({ chains: [1] });
    await connector.switchChain(137);
    await connector.switchChain(10);
    await connector.switchChain(42161);

    expect(await connector.getChainId()).toBe(42161);
    expect(connector.getChainSwitchHistory()).toEqual([1, 137, 10, 42161]);
  });

  it('rejects switching to unsupported chain', async () => {
    await connector.connect({ chains: [1] });
    await expect(connector.switchChain(999)).rejects.toThrow('Chain 999 not supported');
  });

  it('rejects switching when not connected', async () => {
    await expect(connector.switchChain(137)).rejects.toThrow('Not connected');
  });
});
