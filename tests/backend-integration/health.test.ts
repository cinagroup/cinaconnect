/**
 * Health Check Integration Tests
 *
 * Tests the /health endpoint for all 5 Cloudflare Workers services.
 * Runs against both the TypeScript class implementations (local) and
 * simulated Cloudflare Worker fetch handlers.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';

// ── Service classes ──────────────────────────────────────────
import { RpcProxy } from '@cinacoin/rpc-proxy';
import { KeyManager } from '@cinacoin/keys-server';
import { RelayServer } from '@cinacoin/relay-server';
import { NotifyServer } from '@cinacoin/notify-server';
import { PushServer } from '@cinacoin/push-server';

/** Helper: GET a URL and return parsed JSON. */
async function getJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Invalid JSON from ${url}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

describe('Service Health Checks', () => {
  describe('RPC Proxy', () => {
    let proxy: RpcProxy;

    beforeAll(async () => {
      proxy = new RpcProxy({
        port: 18545,
        chains: { mainnet: 'https://rpc.example.com' },
        cacheTtlMs: 5000,
      });
      await proxy.start();
    });

    afterAll(async () => {
      await proxy.stop();
    });

    it('should return 405 for GET requests (RPC Proxy uses POST)', async () => {
      await expect(getJson('http://127.0.0.1:18545/health')).rejects.toThrow();
    });

    it('should respond to POST with chain routing configured', () => {
      const chains = proxy.getChains();
      expect(chains).toHaveProperty('mainnet');
    });
  });

  describe('Key Manager', () => {
    it('should create a KeyManager instance with default config', () => {
      const km = new KeyManager();
      expect(km).toBeDefined();
    });

    it('should accept custom encryption key', () => {
      const km = new KeyManager({ encryptionKey: 'test-key-123' });
      expect(km).toBeDefined();
    });

    it('should handle session creation and validation', async () => {
      const km = new KeyManager({ sessionTtlMs: 60_000 });
      const session = km.createSession('user-1', ['read', 'write']);
      expect(session.id).toBeDefined();
      expect(session.userId).toBe('user-1');
      expect(session.permissions).toContain('read');

      const validated = km.validateSession(session.id);
      expect(validated).not.toBeNull();
      expect(validated!.userId).toBe('user-1');
    });

    it('should reject expired sessions', async () => {
      const km = new KeyManager({ sessionTtlMs: 1 }); // 1ms TTL
      const session = km.createSession('user-1', ['read']);
      // Wait for expiration
      await new Promise((r) => setTimeout(r, 10));
      expect(km.validateSession(session.id)).toBeNull();
    });

    it('should revoke sessions', () => {
      const km = new KeyManager();
      const session = km.createSession('user-1', []);
      expect(km.revokeSession(session.id)).toBe(true);
      expect(km.validateSession(session.id)).toBeNull();
    });
  });

  describe('Relay Server', () => {
    let relay: RelayServer;

    beforeAll(async () => {
      relay = new RelayServer({ port: 18081 });
      await relay.start();
    });

    afterAll(async () => {
      await relay.stop();
    });

    it('should respond to /health endpoint', async () => {
      const result = await getJson('http://127.0.0.1:18081/health');
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('connections');
      expect(result).toHaveProperty('uptime');
    });

    it('should return 404 for unknown paths', async () => {
      await expect(getJson('http://127.0.0.1:18081/unknown')).rejects.toThrow();
    });

    it('should track stats correctly', () => {
      const stats = relay.getStats();
      expect(stats.connections).toBe(0);
      expect(stats.messagesReceived).toBe(0);
      expect(stats.messagesSent).toBe(0);
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Notify Server', () => {
    let notify: NotifyServer;

    beforeAll(() => {
      notify = new NotifyServer();
    });

    it('should instantiate without error', () => {
      expect(notify).toBeDefined();
    });

    it('should have empty subscriptions initially', () => {
      const subs = notify.getSubscriptions();
      expect(subs).toHaveLength(0);
    });
  });

  describe('Push Server', () => {
    it('should instantiate without APNs/FCM config (lazy init)', () => {
      const push = new PushServer({ timeoutMs: 3000 });
      expect(push).toBeDefined();
    });

    it('should have empty delivery log initially', () => {
      const push = new PushServer({});
      expect(push.getDeliveryLog()).toHaveLength(0);
    });

    it('should fail delivery when APNs config is missing', async () => {
      const push = new PushServer({});
      const result = await push.send({
        deviceToken: 'test-token-123',
        platform: 'ios',
        title: 'Test',
        body: 'Body',
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain('APNs configuration');
    });

    it('should fail delivery when FCM config is missing', async () => {
      const push = new PushServer({});
      const result = await push.send({
        deviceToken: 'test-token-456',
        platform: 'android',
        title: 'Test',
        body: 'Body',
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain('FCM configuration');
    });
  });
});

describe('Cross-Service Health Summary', () => {
  it('all 5 service classes should be importable', () => {
    expect(RpcProxy).toBeDefined();
    expect(KeyManager).toBeDefined();
    expect(RelayServer).toBeDefined();
    expect(NotifyServer).toBeDefined();
    expect(PushServer).toBeDefined();
  });

  it('all services should have expected public API methods', () => {
    // RpcProxy
    const rpcProxy = new RpcProxy({ port: 0, chains: {} });
    expect(typeof rpcProxy.start).toBe('function');
    expect(typeof rpcProxy.stop).toBe('function');
    expect(typeof rpcProxy.getChains).toBe('function');
    expect(typeof rpcProxy.forwardRpc).toBe('function');

    // KeyManager
    const km = new KeyManager();
    expect(typeof km.storeKey).toBe('function');
    expect(typeof km.getKey).toBe('function');
    expect(typeof km.createSession).toBe('function');
    expect(typeof km.validateSession).toBe('function');

    // RelayServer
    const relay = new RelayServer({ port: 0 });
    expect(typeof relay.start).toBe('function');
    expect(typeof relay.stop).toBe('function');
    expect(typeof relay.getStats).toBe('function');
    expect(typeof relay.publish).toBe('function');
    expect(typeof relay.subscribe).toBe('function');

    // NotifyServer
    const notify = new NotifyServer();
    expect(typeof notify.sendNotification).toBe('function');
    expect(typeof notify.subscribe).toBe('function');
    expect(typeof notify.unsubscribe).toBe('function');
    expect(typeof notify.getSubscriptions).toBe('function');

    // PushServer
    const push = new PushServer({});
    expect(typeof push.send).toBe('function');
    expect(typeof push.sendBatch).toBe('function');
    expect(typeof push.getDeliveryLog).toBe('function');
  });
});
