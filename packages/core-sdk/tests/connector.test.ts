/**
 * Tests for the Connector abstract class and mock provider.
 */

import { describe, it, expect } from 'vitest';
import { Connector } from '../../src/connector';
import type { ConnectParams, ConnectionResult, TransactionRequest } from '../../src/types';

class MockConnector extends Connector {
  readonly id = 'mock-connector';
  readonly name = 'Mock Wallet';
  readonly icon = 'data:image/svg+xml;base64,mock';
  readonly installed = true;
  readonly type = 'injected';
  private _connected = false;
  private _accounts: string[] = [];
  private _chainId = 1;

  async connect(params?: ConnectParams): Promise<ConnectionResult> {
    if (this._connected) {
      throw new Error('Already connected');
    }
    this._connected = true;
    this._accounts = ['0x1234567890abcdef1234567890abcdef12345678'];
    this._chainId = params?.chains?.[0] ?? 1;
    return {
      sessionId: 'mock-session-123',
      accounts: this._accounts,
      chainId: this._chainId,
      connectorId: this.id,
    };
  }

  async disconnect(): Promise<void> {
    this._connected = false;
    this._accounts = [];
  }

  async getAccounts(): Promise<string[]> {
    return this._connected ? [...this._accounts] : [];
  }

  async getChainId(): Promise<number> {
    return this._chainId;
  }

  async switchChain(chainId: number): Promise<void> {
    if (!this._connected) {
      throw new Error('Not connected');
    }
    this._chainId = chainId;
  }

  async signMessage(message: string): Promise<string> {
    if (!this._connected) {
      throw new Error('Not connected');
    }
    return '0xmocksignature_' + message;
  }

  async signTransaction(tx: TransactionRequest): Promise<string> {
    if (!this._connected) {
      throw new Error('Not connected');
    }
    return '0xmocksignedtx';
  }

  getProvider(): unknown {
    return this._connected
      ? {
          request: async ({ method }: { method: string; params?: unknown[] }) => {
            switch (method) {
              case 'eth_accounts':
                return this._accounts;
              case 'eth_chainId':
                return `0x${this._chainId.toString(16)}`;
              default:
                return null;
            }
          },
        }
      : null;
  }

  get isConnected(): boolean {
    return this._connected;
  }
}

describe('MockConnector', () => {
  it('should connect and return a ConnectionResult', async () => {
    const connector = new MockConnector();
    const result = await connector.connect();
    expect(result.sessionId).toBe('mock-session-123');
    expect(result.accounts).toHaveLength(1);
    expect(result.chainId).toBe(1);
    expect(result.connectorId).toBe('mock-connector');
  });

  it('should prevent double connection', async () => {
    const connector = new MockConnector();
    await connector.connect();
    await expect(connector.connect()).rejects.toThrow('Already connected');
  });

  it('should return accounts only when connected', async () => {
    const connector = new MockConnector();
    expect(await connector.getAccounts()).toEqual([]);
    await connector.connect();
    expect(await connector.getAccounts()).toEqual([
      '0x1234567890abcdef1234567890abcdef12345678',
    ]);
    await connector.disconnect();
    expect(await connector.getAccounts()).toEqual([]);
  });

  it('should switch chain when connected', async () => {
    const connector = new MockConnector();
    await connector.connect({ chains: [1] });
    await connector.switchChain(137);
    expect(await connector.getChainId()).toBe(137);
  });

  it('should reject switch chain when not connected', async () => {
    const connector = new MockConnector();
    await expect(connector.switchChain(137)).rejects.toThrow('Not connected');
  });

  it('should sign message when connected', async () => {
    const connector = new MockConnector();
    await connector.connect();
    const sig = await connector.signMessage('hello');
    expect(sig).toBe('0xmocksignature_hello');
  });

  it('should return null provider when not connected', async () => {
    const connector = new MockConnector();
    expect(connector.getProvider()).toBeNull();
    await connector.connect();
    expect(connector.getProvider()).not.toBeNull();
  });

  it('should support custom chain IDs in connect params', async () => {
    const connector = new MockConnector();
    const result = await connector.connect({ chains: [10] });
    expect(result.chainId).toBe(10);
  });

  it('should emit events on connect and disconnect', async () => {
    const connector = new MockConnector();
    const states: string[] = [];

    connector.on('stateChange', (s: unknown) => {
      states.push(String(s));
    });

    await connector.connect();
    connector.emit('stateChange', 'connected');
    await connector.disconnect();
    connector.emit('stateChange', 'disconnected');

    expect(states).toContain('connected');
    expect(states).toContain('disconnected');
  });

  it('should have correct static properties', () => {
    const connector = new MockConnector();
    expect(connector.id).toBe('mock-connector');
    expect(connector.name).toBe('Mock Wallet');
    expect(connector.installed).toBe(true);
    expect(connector.type).toBe('injected');
  });
});
