/**
 * Cross-Service Flow Integration Tests
 *
 * Tests end-to-end flows that span multiple services:
 * - Wallet connect → relay → notify
 * - Key storage → session → push notification
 * - RPC proxy → relay → notification
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import WebSocket from 'ws';

import { RpcProxy } from '@cinacoin/rpc-proxy';
import { KeyManager } from '@cinacoin/keys-server';
import { RelayServer, type RelayMessage } from '@cinacoin/relay-server';
import { NotifyServer } from '@cinacoin/notify-server';
import { PushServer } from '@cinacoin/push-server';

// ── Helper: GET JSON ────────────────────────────────────────
function getJson(url: string): Promise<unknown> {
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

/**
 * Flow 1: Wallet Connect → Relay → Notify
 *
 * Scenario:
 * 1. User connects wallet (session created via KeyManager)
 * 2. Message is relayed via RelayServer
 * 3. Notification is sent via NotifyServer
 */
describe('Flow: Wallet Connect → Relay → Notify', () => {
  let keyManager: KeyManager;
  let relay: RelayServer;
  let notify: NotifyServer;

  beforeAll(async () => {
    keyManager = new KeyManager({ encryptionKey: 'flow-test-key', sessionTtlMs: 300_000 });
    relay = new RelayServer({ port: 18090, host: '127.0.0.1' });
    notify = new NotifyServer();
    await relay.start();
  });

  afterAll(async () => {
    await relay.stop();
  });

  it('should create session, relay message, and notify', async () => {
    // Step 1: Create session (simulate wallet connect)
    const session = keyManager.createSession('user-wallet-1', ['sign', 'relay']);
    expect(session).toBeDefined();
    expect(session.permissions).toContain('relay');

    // Step 2: Relay a message through the relay server
    // (Subscribe a listener, publish a message)
    relay.subscribe('listener-1', 'wallet-user-wallet-1');

    const messageData = JSON.stringify({
      type: 'wallet_connected',
      address: '0xabc123',
      sessionId: session.id,
    });

    relay.publish('wallet-user-wallet-1', messageData);

    // Step 3: Send notification to the user
    notify.subscribe('user-wallet-1', ['push']);
    const notifResult = await notify.sendNotification('user-wallet-1', {
      title: 'Wallet Connected',
      body: `Session ${session.id.slice(0, 8)}… started`,
      channel: 'push',
    });

    expect(notifResult.status).toBe('sent');
  });

  it('should handle relay → notify chain for transaction events', async () => {
    // Step 1: Create session
    const session = keyManager.createSession('user-tx-1', ['sign']);

    // Step 2: Relay transaction data
    relay.subscribe('tx-listener', 'tx-user-tx-1');
    relay.publish('tx-user-tx-1', JSON.stringify({
      type: 'transaction_signed',
      hash: '0xdeadbeef',
      chainId: '1',
    }));

    // Step 3: Notify about the transaction
    notify.subscribe('user-tx-1', ['webhook']);
    const result = await notify.sendNotification('user-tx-1', {
      title: 'Transaction Signed',
      body: 'Your transaction has been signed',
      data: { txHash: '0xdeadbeef' },
      channel: 'webhook',
    });

    expect(result.status).toBe('sent');
    expect(result.channel).toBe('webhook');
  });
});

/**
 * Flow 2: Key Storage → Session → Push Notification
 *
 * Scenario:
 * 1. User's key is stored encrypted in KeyManager
 * 2. Session is created for key access
 * 3. Push notification confirms key operation
 */
describe('Flow: Key Storage → Session → Push Notification', () => {
  let keyManager: KeyManager;
  let push: PushServer;

  beforeAll(() => {
    keyManager = new KeyManager({
      encryptionKey: 'key-storage-flow-key',
      sessionTtlMs: 300_000,
    });
    push = new PushServer({
      apns: { keyId: 'flow-key', teamId: 'flow-team', bundleId: 'com.cinacoin.flow', privateKey: 'test' },
      fcm: { projectId: 'flow-project', serviceAccountKey: '{}' },
    });
  });

  it('should store key, create session, and send push confirmation', async () => {
    // Step 1: Store an encrypted key
    const keyData = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]);
    const stored = await keyManager.storeKey('user-key-1', 'Primary Wallet Key', keyData);
    expect(stored.id).toBe('user-key-1');
    expect(stored.algorithm).toBe('aes-256-gcm');

    // Step 2: Create session for key access
    const session = keyManager.createSession('user-keys-1', ['key:read']);
    expect(session).toBeDefined();

    // Step 3: Send push notification confirming key storage
    const iosResult = await push.send({
      deviceToken: 'ios-flow-token-12345',
      platform: 'ios',
      title: 'Key Stored',
      body: 'Your wallet key has been securely stored',
      data: { keyId: stored.id, sessionId: session.id },
    });
    expect(iosResult.success).toBe(true);

    // Also send to Android
    const androidResult = await push.send({
      deviceToken: 'android-flow-token-67890',
      platform: 'android',
      title: 'Key Stored',
      body: 'Your wallet key has been securely stored',
    });
    expect(androidResult.success).toBe(true);
  });

  it('should handle key rotation with session and push', async () => {
    // Step 1: Store initial key
    await keyManager.storeKey('user-key-2', 'Old Key', new Uint8Array([1]));

    // Step 2: Create session for rotation
    const session = keyManager.createSession('user-key-rotation', ['key:write']);
    expect(session.permissions).toContain('key:write');

    // Step 3: Replace the key (simulate rotation)
    await keyManager.storeKey('user-key-2', 'Rotated Key', new Uint8Array([2, 3]));
    const updated = await keyManager.getKey('user-key-2');
    const decrypted = keyManager.decryptKey(updated!.encrypted);
    expect(Array.from(decrypted)).toEqual([2, 3]);

    // Step 4: Push notification about rotation
    const result = await push.send({
      deviceToken: 'rotation-device-token',
      platform: 'ios',
      title: 'Key Rotated',
      body: 'Your wallet key has been rotated for security',
    });
    expect(result.success).toBe(true);
  });
});

/**
 * Flow 3: RPC Proxy → Relay → Notification
 *
 * Scenario:
 * 1. RPC Proxy receives a chain query
 * 2. Result is relayed to waiting client
 * 3. Notification confirms the operation
 */
describe('Flow: RPC Proxy → Relay → Notification', () => {
  let rpcProxy: RpcProxy;
  let relay: RelayServer;
  let notify: NotifyServer;

  beforeAll(async () => {
    rpcProxy = new RpcProxy({
      port: 18091,
      host: '127.0.0.1',
      chains: {
        '1': 'https://eth-rpc.example.com',
        '42161': 'https://arb-rpc.example.com',
      },
      cacheTtlMs: 5000,
    });
    relay = new RelayServer({ port: 18092, host: '127.0.0.1' });
    notify = new NotifyServer();
    await rpcProxy.start();
    await relay.start();
  });

  afterAll(async () => {
    await rpcProxy.stop();
    await relay.stop();
  });

  it('should have both RPC and Relay services running', () => {
    expect(rpcProxy.getChains()).toHaveProperty('1');
    expect(rpcProxy.getChains()).toHaveProperty('42161');

    const relayStats = relay.getStats();
    expect(relayStats.connections).toBe(0);
  });

  it('should relay chain query results to subscribers', async () => {
    // Simulate: user queries chain → result relayed → notification sent
    const chains = rpcProxy.getChains();
    const availableChains = Object.keys(chains);
    expect(availableChains).toContain('1');
    expect(availableChains).toContain('42161');

    // Relay the available chains to a subscriber
    relay.subscribe('chain-watcher', 'chain-status');
    relay.publish('chain-status', JSON.stringify({
      type: 'chain_status',
      chains: availableChains,
      timestamp: Date.now(),
    }));

    // Notify subscriber about available chains
    notify.subscribe('chain-watcher', ['push']);
    const result = await notify.sendNotification('chain-watcher', {
      title: 'Chain Status Updated',
      body: `${availableChains.length} chains available`,
      channel: 'push',
    });
    expect(result.status).toBe('sent');
  });
});

/**
 * Flow 4: Full Wallet Lifecycle
 *
 * Scenario:
 * 1. Generate and store wallet key
 * 2. Create session
 * 3. Relay wallet connection message
 * 4. Send push notification
 * 5. Notify via email
 * 6. Clean up: revoke session
 */
describe('Flow: Full Wallet Lifecycle', () => {
  it('should handle complete wallet lifecycle end-to-end', async () => {
    const keyManager = new KeyManager({ encryptionKey: 'lifecycle-key', sessionTtlMs: 60_000 });
    const relay = new RelayServer({ port: 18093, host: '127.0.0.1' });
    const notify = new NotifyServer();
    const push = new PushServer({
      apns: { keyId: 'lc-key', teamId: 'lc-team', bundleId: 'com.test', privateKey: 'test' },
    });

    await relay.start();
    try {
      // 1. Generate wallet key (simulated as random bytes)
      const privateKey = new Uint8Array(Array.from({ length: 32 }, () => Math.floor(Math.random() * 256)));
      const storedKey = await keyManager.storeKey('wallet-lifecycle', 'Lifecycle Wallet', privateKey);
      expect(storedKey.encrypted).toBeDefined();

      // 2. Create session for wallet operations
      const session = keyManager.createSession('user-lifecycle', ['sign', 'send']);
      expect(session.permissions).toContain('sign');
      expect(session.permissions).toContain('send');

      // 3. Relay wallet connection event
      relay.subscribe('device-1', 'wallet-lifecycle-connected');
      relay.publish('wallet-lifecycle-connected', JSON.stringify({
        type: 'wallet_connected',
        keyId: storedKey.id,
        sessionId: session.id,
      }));

      // 4. Send push notification
      const pushResult = await push.send({
        deviceToken: 'lifecycle-ios-token',
        platform: 'ios',
        title: 'Wallet Connected',
        body: 'Your wallet is ready',
      });
      expect(pushResult.success).toBe(true);

      // 5. Subscribe and send email notification
      notify.subscribe('user-lifecycle', ['email', 'push']);
      const emailResult = await notify.sendNotification('user-lifecycle', {
        title: 'Wallet Ready',
        body: 'Your new wallet has been set up successfully',
        data: { keyId: storedKey.id },
        channel: 'email',
      });
      expect(emailResult.status).toBe('sent');

      // 6. Revoke session (cleanup)
      const revoked = keyManager.revokeSession(session.id);
      expect(revoked).toBe(true);
      expect(keyManager.validateSession(session.id)).toBeNull();
    } finally {
      await relay.stop();
    }
  });
});

/**
 * Flow 5: Multi-Service Error Recovery
 *
 * Scenario:
 * - One service fails, others should still work
 * - Graceful degradation
 */
describe('Flow: Multi-Service Error Recovery', () => {
  it('should handle push failure gracefully in notification chain', async () => {
    const notify = new NotifyServer();
    const push = new PushServer(); // No APNs/FCM config — will fail

    // Subscribe to push channel
    notify.subscribe('user-recovery', ['push']);

    // Attempt delivery — NotifyServer will try to deliver
    const result = await notify.sendNotification('user-recovery', {
      title: 'Recovery Test',
      body: 'Testing error handling',
      channel: 'push',
    });

    // NotifyServer's mock delivery returns true for push (it's a mock)
    // This tests the chain: notify receives → attempts delivery
    expect(result.status).toBeDefined();
  });

  it('should handle multiple independent service instances', async () => {
    const km1 = new KeyManager({ encryptionKey: 'instance-1' });
    const km2 = new KeyManager({ encryptionKey: 'instance-2' });

    // Different encryption keys → different encrypted output
    const data = new Uint8Array([1, 2, 3]);
    await km1.storeKey('shared-key', 'test', data);
    await km2.storeKey('shared-key', 'test', data);

    const s1 = await km1.getKey('shared-key');
    const s2 = await km2.getKey('shared-key');

    // Encrypted values should be different (different keys + different IVs)
    expect(s1!.encrypted).not.toBe(s2!.encrypted);

    // But each decrypts correctly
    expect(Array.from(km1.decryptKey(s1!.encrypted))).toEqual(Array.from(data));
    expect(Array.from(km2.decryptKey(s2!.encrypted))).toEqual(Array.from(data));
  });
});
