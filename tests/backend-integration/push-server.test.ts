/**
 * Push Server Integration Tests
 *
 * Tests device registration, push notification sending, batch delivery,
 * and delivery log auditing.
 * Uses mock APNs/FCM to avoid external network calls.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PushServer, type PushNotification } from '@cinacoin/push-server';

describe('Push Server — Configuration', () => {
  it('should instantiate with minimal config', () => {
    const server = new PushServer({ timeoutMs: 5000 });
    expect(server).toBeDefined();
  });

  it('should accept APNs configuration', () => {
    const server = new PushServer({
      apns: {
        keyId: 'key123',
        teamId: 'team456',
        bundleId: 'com.cinacoin.app',
        privateKey: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
      },
    });
    expect(server).toBeDefined();
  });

  it('should accept FCM configuration', () => {
    const server = new PushServer({
      fcm: {
        projectId: 'my-project',
        serviceAccountKey: '{"type":"service_account"}',
      },
    });
    expect(server).toBeDefined();
  });

  it('should accept both APNs and FCM configuration', () => {
    const server = new PushServer({
      apns: {
        keyId: 'key123',
        teamId: 'team456',
        bundleId: 'com.cinacoin.app',
        privateKey: 'test',
      },
      fcm: {
        projectId: 'my-project',
        serviceAccountKey: '{}',
      },
      timeoutMs: 10000,
    });
    expect(server).toBeDefined();
  });
});

describe('Push Server — APNs Delivery', () => {
  let server: PushServer;

  beforeEach(() => {
    server = new PushServer({
      apns: {
        keyId: 'test-key-id',
        teamId: 'test-team-id',
        bundleId: 'com.cinacoin.test',
        privateKey: 'test-private-key',
      },
    });
  });

  it('should send APNs notification successfully', async () => {
    const notification: PushNotification = {
      deviceToken: 'abcd1234efgh5678ijkl9012mnop3456qrst7890',
      platform: 'ios',
      title: 'Transaction Alert',
      body: 'You received 0.5 ETH',
    };
    const result = await server.send(notification);
    expect(result.success).toBe(true);
    expect(result.message).toContain('APNs notification sent');
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it('should truncate device token in log message', async () => {
    const notification: PushNotification = {
      deviceToken: '12345678abcdef',
      platform: 'ios',
      title: 'Test',
      body: 'Body',
    };
    const result = await server.send(notification);
    expect(result.message).toContain('12345678');
  });

  it('should include data payload in APNs notification', async () => {
    const notification: PushNotification = {
      deviceToken: 'token-with-data',
      platform: 'ios',
      title: 'Data Test',
      body: 'Has data',
      data: { screen: 'wallet', txHash: '0xabc' },
    };
    const result = await server.send(notification);
    expect(result.success).toBe(true);
  });

  it('should handle missing data payload gracefully', async () => {
    const notification: PushNotification = {
      deviceToken: 'no-data-token',
      platform: 'ios',
      title: 'No Data',
      body: 'Simple notification',
    };
    const result = await server.send(notification);
    expect(result.success).toBe(true);
  });

  it('should log failed delivery in delivery log', async () => {
    // Successful sends don't get logged in deliveryLog (only errors do)
    // Test failure logging instead
    const noConfigServer = new PushServer({});
    const notification: PushNotification = {
      deviceToken: 'log-test-token',
      platform: 'ios',
      title: 'Log Test',
      body: 'Check the log',
    };
    await noConfigServer.send(notification);

    const log = noConfigServer.getDeliveryLog();
    expect(log).toHaveLength(1);
    expect(log[0].success).toBe(false);
    expect(log[0].message).toContain('APNs configuration');
  });
});

describe('Push Server — FCM Delivery', () => {
  let server: PushServer;

  beforeEach(() => {
    server = new PushServer({
      fcm: {
        projectId: 'test-project',
        serviceAccountKey: '{"type":"service_account"}',
      },
    });
  });

  it('should send FCM notification successfully', async () => {
    const notification: PushNotification = {
      deviceToken: 'fcm-token-android-12345',
      platform: 'android',
      title: 'Balance Update',
      body: 'Your balance has changed',
    };
    const result = await server.send(notification);
    expect(result.success).toBe(true);
    expect(result.message).toContain('FCM notification sent');
  });

  it('should include data payload in FCM notification', async () => {
    const notification: PushNotification = {
      deviceToken: 'fcm-token-with-data',
      platform: 'android',
      title: 'Data Push',
      body: 'With extras',
      data: { action: 'open_wallet', deepLink: 'cinacoin://wallet' },
    };
    const result = await server.send(notification);
    expect(result.success).toBe(true);
  });
});

describe('Push Server — Delivery Failure', () => {
  it('should fail when APNs config is missing', async () => {
    const server = new PushServer({}); // No APNs config
    const result = await server.send({
      deviceToken: 'ios-token',
      platform: 'ios',
      title: 'Fail',
      body: 'Should fail',
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('APNs configuration');
  });

  it('should fail when FCM config is missing', async () => {
    const server = new PushServer({}); // No FCM config
    const result = await server.send({
      deviceToken: 'android-token',
      platform: 'android',
      title: 'Fail',
      body: 'Should fail',
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('FCM configuration');
  });
});

describe('Push Server — Batch Delivery', () => {
  let server: PushServer;

  beforeEach(() => {
    server = new PushServer({
      apns: {
        keyId: 'batch-key',
        teamId: 'batch-team',
        bundleId: 'com.cinacoin.batch',
        privateKey: 'test',
      },
      fcm: {
        projectId: 'batch-project',
        serviceAccountKey: '{}',
      },
    });
  });

  it('should send multiple notifications in batch', async () => {
    const notifications: PushNotification[] = [
      { deviceToken: 'ios-1', platform: 'ios', title: 'Batch 1', body: 'First' },
      { deviceToken: 'android-1', platform: 'android', title: 'Batch 2', body: 'Second' },
      { deviceToken: 'ios-2', platform: 'ios', title: 'Batch 3', body: 'Third' },
    ];

    const results = await server.sendBatch(notifications);
    expect(results).toHaveLength(3);
    results.forEach((r) => {
      expect(r.success).toBe(true);
    });
  });

  it('should handle empty batch', async () => {
    const results = await server.sendBatch([]);
    expect(results).toHaveLength(0);
  });

  it('should handle mixed platform batch', async () => {
    const notifications: PushNotification[] = [
      { deviceToken: 'ios-a', platform: 'ios', title: 'A', body: 'A' },
      { deviceToken: 'android-a', platform: 'android', title: 'A', body: 'A' },
    ];
    const results = await server.sendBatch(notifications);
    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
  });
});

describe('Push Server — Delivery Log Management', () => {
  let server: PushServer;

  beforeEach(() => {
    server = new PushServer({
      apns: { keyId: 'log-key', teamId: 'log-team', bundleId: 'com.test', privateKey: 'test' },
    });
  });

  it('should start with empty log', () => {
    expect(server.getDeliveryLog()).toHaveLength(0);
  });

  it('should append to log on failed sends', async () => {
    const noConfig = new PushServer({}); // No APNs/FCM — will fail
    await noConfig.send({ deviceToken: 'log-token', platform: 'ios', title: 'Test', body: 'Body' });
    await noConfig.send({ deviceToken: 'log-token', platform: 'android', title: 'Test', body: 'Body' });
    await noConfig.send({ deviceToken: 'log-token', platform: 'ios', title: 'Test', body: 'Body' });
    expect(noConfig.getDeliveryLog()).toHaveLength(3);
  });

  it('should clear the delivery log', async () => {
    const noConfig = new PushServer({});
    await noConfig.send({ deviceToken: 't', platform: 'ios', title: 'X', body: 'Y' });
    await noConfig.send({ deviceToken: 't', platform: 'ios', title: 'X', body: 'Y' });
    expect(noConfig.getDeliveryLog()).toHaveLength(2);

    noConfig.clearDeliveryLog();
    expect(noConfig.getDeliveryLog()).toHaveLength(0);
  });

  it('should return a copy of the log (not the reference)', async () => {
    const noConfig = new PushServer({});
    await noConfig.send({ deviceToken: 't', platform: 'ios', title: 'X', body: 'Y' });
    const log1 = noConfig.getDeliveryLog();
    const log2 = noConfig.getDeliveryLog();
    expect(log1).not.toBe(log2); // Different references
    expect(log1).toEqual(log2); // Same content
  });
});

describe('Push Server — Device Registration Flow', () => {
  it('should track registrations via delivery log', async () => {
    // In the Cloudflare worker, /register acknowledges device registration.
    // The PushServer tracks via delivery log after sends (errors only).
    const server = new PushServer({
      // Intentionally no APNs config so we can test error logging
    });

    // Simulate: device registers → attempts push → error logged
    const deviceToken = 'registered-device-token-123';
    await server.send({
      deviceToken,
      platform: 'ios',
      title: 'Welcome',
      body: 'Device registered successfully',
    });

    const log = server.getDeliveryLog();
    expect(log).toHaveLength(1);
    expect(log[0].success).toBe(false);
    expect(log[0].message).toContain('APNs configuration');
  });
});
