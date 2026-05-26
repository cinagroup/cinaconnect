/**
 * QR transport tests for core-sdk.
 *
 * Tests the QRTransport class for:
 * - QR URI generation
 * - Topic and key generation
 * - Connection lifecycle
 * - getUri / getAccounts / getChainId
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock WebSocket for relay
class MockWebSocket {
  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  sent: any[] = [];

  constructor(url: string) {
    this.url = url;
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code: 1000 } as CloseEvent);
    }
  }

  simulateOpen(): void {
    this.readyState = WebSocket.OPEN;
    if (this.onopen) this.onopen();
  }

  simulateMessage(data: string): void {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent);
    }
  }

  simulateClose(code: number = 1000): void {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose({ code } as CloseEvent);
  }
}

let mockWs: MockWebSocket | null = null;

beforeEach(() => {
  mockWs = new MockWebSocket('wss://relay.example.com');
  // @ts-ignore
  globalThis.WebSocket = class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      return mockWs!;
    }
  } as unknown as typeof WebSocket;

  // Mock crypto.getRandomValues via vi.spyOn
  vi.spyOn(crypto, 'getRandomValues').mockImplementation((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) arr[i] = i % 256;
    return arr;
  });

  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function importQR() {
  return await import('../../src/transports/qr.js');
}

describe('QRTransport', () => {
  it('has correct static identity', async () => {
    const { QRTransport } = await importQR();
    const transport = new QRTransport({
      relayUrl: 'wss://relay.example.com',
      projectId: 'test-project-id',
    });
    expect(transport.id).toBe('qr');
    expect(transport.name).toBe('Scan QR Code');
    expect(transport.installed).toBe(true);
    expect(transport.type).toBe('qr');
  });

  it('creates with default config', async () => {
    const { QRTransport } = await importQR();
    const transport = new QRTransport({
      relayUrl: 'wss://relay.example.com',
      projectId: 'test-project-id',
    });
    expect(transport).toBeDefined();
  });

  it('generates a pairing URI', async () => {
    const { QRTransport } = await importQR();
    const transport = new QRTransport({
      relayUrl: 'wss://relay.example.com',
      projectId: 'test-project-id',
    });

    const uriPromise = transport.generatePairingUri();
    // simulateOpen must be called before the promise resolves
    mockWs!.simulateOpen();
    const uri = await uriPromise;

    expect(uri).toContain('wc:');
    expect(uri).toContain('@2');
    expect(uri).toContain('relay-protocol=ws');
    expect(uri).toContain('symKey=');
  });

  it('returns URI via getUri after generation', async () => {
    const { QRTransport } = await importQR();
    const transport = new QRTransport({
      relayUrl: 'wss://relay.example.com',
      projectId: 'test-project-id',
    });

    const uriPromise = transport.generatePairingUri();
    mockWs!.simulateOpen();
    await uriPromise;

    expect(transport.getUri()).not.toBeNull();
  });

  it('returns null URI via getUri before generation', async () => {
    const { QRTransport } = await importQR();
    const transport = new QRTransport({
      relayUrl: 'wss://relay.example.com',
      projectId: 'test-project-id',
    });
    expect(transport.getUri()).toBeNull();
  });

  it('emits qrExpired event after timeout', async () => {
    const { QRTransport } = await importQR();
    const transport = new QRTransport({
      relayUrl: 'wss://relay.example.com',
      projectId: 'test-project-id',
      qrTimeout: 5000,
    });

    let expired = false;
    transport.on('qrExpired', () => {
      expired = true;
    });

    const uriPromise = transport.generatePairingUri();
    mockWs!.simulateOpen();
    await uriPromise;

    vi.advanceTimersByTime(5001);
    expect(expired).toBe(true);
  });

  it('returns empty accounts when not connected', async () => {
    const { QRTransport } = await importQR();
    const transport = new QRTransport({
      relayUrl: 'wss://relay.example.com',
      projectId: 'test-project-id',
    });
    const accounts = await transport.getAccounts();
    expect(accounts).toEqual([]);
  });

  it('throws on switchChain', async () => {
    const { QRTransport } = await importQR();
    const transport = new QRTransport({
      relayUrl: 'wss://relay.example.com',
      projectId: 'test-project-id',
    });
    await expect(transport.switchChain(1)).rejects.toThrow(
      'QR transport does not support chain switching',
    );
  });

  it('throws on signMessage', async () => {
    const { QRTransport } = await importQR();
    const transport = new QRTransport({
      relayUrl: 'wss://relay.example.com',
      projectId: 'test-project-id',
    });
    await expect(transport.signMessage('hello')).rejects.toThrow(
      'Sign via session layer',
    );
  });

  it('throws on signTransaction', async () => {
    const { QRTransport } = await importQR();
    const transport = new QRTransport({
      relayUrl: 'wss://relay.example.com',
      projectId: 'test-project-id',
    });
    await expect(
      transport.signTransaction({ from: '0x', to: '0x' }),
    ).rejects.toThrow('Sign via session layer');
  });

  it('throws on getChainId when not connected', async () => {
    const { QRTransport } = await importQR();
    const transport = new QRTransport({
      relayUrl: 'wss://relay.example.com',
      projectId: 'test-project-id',
    });
    await expect(transport.getChainId()).rejects.toThrow('Not connected');
  });

  it('disconnects cleanly', async () => {
    const { QRTransport } = await importQR();
    const transport = new QRTransport({
      relayUrl: 'wss://relay.example.com',
      projectId: 'test-project-id',
    });

    const uriPromise = transport.generatePairingUri();
    mockWs!.simulateOpen();
    await uriPromise;

    await transport.disconnect();
    expect(transport.getUri()).toBeNull();
  });

  it('emits disconnect event', async () => {
    const { QRTransport } = await importQR();
    const transport = new QRTransport({
      relayUrl: 'wss://relay.example.com',
      projectId: 'test-project-id',
    });

    let disconnected = false;
    transport.on('disconnect', () => {
      disconnected = true;
    });

    await transport.disconnect();
    expect(disconnected).toBe(true);
  });

  it('connect method rejects after timeout', async () => {
    const { QRTransport } = await importQR();
    const transport = new QRTransport({
      relayUrl: 'wss://relay.example.com',
      projectId: 'test-project-id',
      qrTimeout: 3000,
    });

    const uriPromise = transport.generatePairingUri();
    mockWs!.simulateOpen();
    await uriPromise;

    const connectPromise = transport.connect();
    // Pre-attach catch to avoid unhandled rejection if timing is off
    connectPromise.catch(() => {});
    await vi.advanceTimersByTimeAsync(3001);

    await expect(connectPromise).rejects.toThrow('QR connection timed out');
  });

  it('generates unique topics', async () => {
    const { QRTransport } = await importQR();
    const transport1 = new QRTransport({
      relayUrl: 'wss://relay1.example.com',
      projectId: 'test-project-id',
    });
    const transport2 = new QRTransport({
      relayUrl: 'wss://relay2.example.com',
      projectId: 'test-project-id',
    });

    const p1 = transport1.generatePairingUri();
    mockWs!.simulateOpen();
    const uri1 = await p1;

    mockWs = new MockWebSocket('wss://relay2.example.com');
    // @ts-ignore
    globalThis.WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        return mockWs!;
      }
    } as unknown as typeof WebSocket;

    const p2 = transport2.generatePairingUri();
    mockWs!.simulateOpen();
    const uri2 = await p2;

    // Topics should be different (random)
    expect(uri1).not.toBe(uri2);
  });
});
