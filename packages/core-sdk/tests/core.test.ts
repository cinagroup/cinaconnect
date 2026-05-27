/**
 * core-sdk/tests/core.test.ts
 *
 * Tests for CinacoinCore initialization, Connector base class, and Connector
 * abstract interface contract.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from '../src/events.js';
import { Connector, RedirectHandler } from '../src/connector.js';
import type { ConnectParams, ConnectionResult, TransactionRequest } from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Concrete subclass for testing the abstract Connector class
class TestConnector extends Connector {
  readonly id = 'test-connector';
  readonly name = 'Test Connector';
  readonly icon = 'data:image/png;base64,icon';
  readonly installed = true;
  readonly type = 'injected';

  private _accounts = ['0xabcdef0123456789abcdef0123456789abcdef01'];
  private _chainId = 1;
  private _connected = false;

  async connect(_params?: ConnectParams): Promise<ConnectionResult> {
    this._connected = true;
    this.emit('connect', { accounts: this._accounts, chainId: this._chainId });
    return {
      sessionId: 'session-123',
      accounts: this._accounts,
      chainId: this._chainId,
      connectorId: this.id,
    };
  }

  async disconnect(): Promise<void> {
    this._connected = false;
    this.emit('disconnect');
  }

  async getAccounts(): Promise<string[]> {
    return this._connected ? this._accounts : [];
  }

  async getChainId(): Promise<number> {
    return this._chainId;
  }

  async switchChain(chainId: number): Promise<void> {
    this._chainId = chainId;
    this.emit('chainChanged', chainId);
  }

  async signMessage(message: string): Promise<string> {
    return `sig:${message}`;
  }

  async signTransaction(_tx: TransactionRequest): Promise<string> {
    return '0xsignedtx';
  }
}

// ---------------------------------------------------------------------------
// Connector
// ---------------------------------------------------------------------------

describe('Connector', () => {
  let connector: TestConnector;

  beforeEach(() => {
    connector = new TestConnector();
  });

  it('connector identity', () => {
    expect(connector.id).toBe('test-connector');
    expect(connector.name).toBe('Test Connector');
    expect(connector.installed).toBe(true);
    expect(connector.type).toBe('injected');
  });

  it('connector is EventEmitter', () => {
    expect(connector instanceof EventEmitter).toBe(true);

    let called = false;
    connector.on('test_event', () => { called = true; });
    connector.emit('test_event');
    expect(called).toBe(true);
  });

  it('connect / disconnect', async () => {
    const result = await connector.connect();
    expect(result.sessionId).toBe('session-123');
    expect(result.accounts.length).toBe(1);
    expect(result.chainId).toBe(1);
    expect(result.connectorId).toBe('test-connector');

    const accounts = await connector.getAccounts();
    expect(accounts.length).toBe(1);

    await connector.disconnect();
    const afterDisconnect = await connector.getAccounts();
    expect(afterDisconnect.length).toBe(0);
  });

  it('switch chain', async () => {
    await connector.connect();

    let changedChain: number | undefined;
    connector.on('chainChanged', (chainId: number) => { changedChain = chainId; });

    await connector.switchChain(42161);
    expect(changedChain).toBe(42161);

    const chainId = await connector.getChainId();
    expect(chainId).toBe(42161);
  });

  it('sign message', async () => {
    const sig = await connector.signMessage('hello');
    expect(sig).toBe('sig:hello');
  });

  it('sign transaction', async () => {
    const sig = await connector.signTransaction({ from: '0x1', to: '0x2', value: '100' });
    expect(sig).toBe('0xsignedtx');
  });

  it('getProvider default', () => {
    expect(connector.getProvider()).toBeNull();
  });

  it('connect event', async () => {
    let connectData: any;
    connector.on('connect', (data: any) => { connectData = data; });
    await connector.connect();
    expect(connectData.chainId).toBe(1);
  });

  it('disconnect event', async () => {
    await connector.connect();
    let disconnected = false;
    connector.on('disconnect', () => { disconnected = true; });
    await connector.disconnect();
    expect(disconnected).toBe(true);
  });

  it('RedirectHandler', () => {
    const handler = new RedirectHandler('desktop');
    expect(handler.platform).toBe('desktop');

    handler.setPlatform('mobile');
    expect(handler.platform).toBe('mobile');

    const link = handler.generateLink('metamask', 'wc:uri', { foo: 'bar' });
    expect(link).toContain('metamask');
    expect(link).toContain('wc'); // URI may be URL-encoded
  });
});
