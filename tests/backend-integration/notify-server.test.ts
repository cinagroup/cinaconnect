/**
 * Notify Server Integration Tests
 *
 * Tests subscribe, send notification, unsubscribe flows.
 * Uses the NotifyServer TypeScript class (no external network calls).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NotifyServer, type NotificationPayload, type NotificationChannel } from '@cinacoin/notify-server';

describe('Notify Server — Subscription', () => {
  let server: NotifyServer;

  beforeEach(() => {
    server = new NotifyServer();
  });

  it('should subscribe an address to channels', () => {
    const sub = server.subscribe('0xabc123', ['push', 'email']);
    expect(sub.address).toBe('0xabc123');
    expect(sub.channels).toContain('push');
    expect(sub.channels).toContain('email');
    expect(sub.createdAt).toBeGreaterThan(0);
  });

  it('should merge channels on re-subscription', () => {
    server.subscribe('0xabc123', ['push']);
    server.subscribe('0xabc123', ['email']);

    const subs = server.getSubscriptions('0xabc123');
    expect(subs).toHaveLength(1);
    expect(subs[0].channels).toContain('push');
    expect(subs[0].channels).toContain('email');
  });

  it('should not duplicate channels', () => {
    server.subscribe('0xabc123', ['push', 'email']);
    server.subscribe('0xabc123', ['push', 'webhook']);

    const subs = server.getSubscriptions('0xabc123');
    const pushCount = subs[0].channels.filter((c) => c === 'push').length;
    expect(pushCount).toBe(1); // No duplicates
    expect(subs[0].channels).toHaveLength(3); // push, email, webhook
  });

  it('should unsubscribe an address from all channels', () => {
    server.subscribe('0xabc123', ['push', 'email']);
    const result = server.unsubscribe('0xabc123');
    expect(result).toBe(true);
    expect(server.getSubscriptions('0xabc123')).toHaveLength(0);
  });

  it('should return false when unsubscribing non-existent address', () => {
    const result = server.unsubscribe('0xnonexistent');
    expect(result).toBe(false);
  });

  it('should unsubscribe from specific channels only', () => {
    server.subscribe('0xabc123', ['push', 'email', 'webhook']);
    server.unsubscribeFrom('0xabc123', ['email']);

    const subs = server.getSubscriptions('0xabc123');
    expect(subs[0].channels).not.toContain('email');
    expect(subs[0].channels).toContain('push');
    expect(subs[0].channels).toContain('webhook');
  });

  it('should remove subscription when all channels unsubscribed', () => {
    server.subscribe('0xabc123', ['push']);
    server.unsubscribeFrom('0xabc123', ['push']);
    expect(server.getSubscriptions('0xabc123')).toHaveLength(0);
  });

  it('should return all subscriptions when no address filter', () => {
    server.subscribe('0xaaa', ['push']);
    server.subscribe('0xbbb', ['email']);
    server.subscribe('0xccc', ['webhook']);

    const all = server.getSubscriptions();
    expect(all).toHaveLength(3);
  });
});

describe('Notify Server — Notification Delivery', () => {
  let server: NotifyServer;

  beforeEach(() => {
    server = new NotifyServer();
  });

  it('should fail delivery when address is not subscribed', async () => {
    const payload: NotificationPayload = {
      title: 'Test',
      body: 'Body',
      channel: 'push',
    };
    const result = await server.sendNotification('0xnotsubscribed', payload);
    expect(result.status).toBe('failed');
  });

  it('should fail delivery when channel not in subscription', async () => {
    server.subscribe('0xabc', ['email']);
    const payload: NotificationPayload = {
      title: 'Test',
      body: 'Body',
      channel: 'push',
    };
    const result = await server.sendNotification('0xabc', payload);
    expect(result.status).toBe('failed');
  });

  it('should succeed delivery for subscribed channel', async () => {
    server.subscribe('0xabc', ['push']);
    const payload: NotificationPayload = {
      title: 'Welcome',
      body: 'You are subscribed',
      channel: 'push',
    };
    const result = await server.sendNotification('0xabc', payload);
    expect(result.status).toBe('sent');
    expect(result.channel).toBe('push');
    expect(result.id).toMatch(/^notif-/);
  });

  it('should deliver email notifications', async () => {
    server.subscribe('0xabc', ['email']);
    const payload: NotificationPayload = {
      title: 'Alert',
      body: 'Transaction confirmed',
      channel: 'email',
    };
    const result = await server.sendNotification('0xabc', payload);
    expect(result.status).toBe('sent');
  });

  it('should deliver webhook notifications', async () => {
    server.subscribe('0xabc', ['webhook']);
    const payload: NotificationPayload = {
      title: 'Event',
      body: 'Something happened',
      data: { event: 'test', value: 42 },
      channel: 'webhook',
    };
    const result = await server.sendNotification('0xabc', payload);
    expect(result.status).toBe('sent');
  });

  it('should generate unique notification IDs', async () => {
    server.subscribe('0xabc', ['push']);
    const payload: NotificationPayload = { title: 'Test', body: '', channel: 'push' };

    const r1 = await server.sendNotification('0xabc', payload);
    const r2 = await server.sendNotification('0xabc', payload);
    expect(r1.id).not.toBe(r2.id);
  });

  it('should handle data payload in notifications', async () => {
    server.subscribe('0xabc', ['push']);
    const payload: NotificationPayload = {
      title: 'Transaction',
      body: 'New transaction received',
      data: { txHash: '0x123', chainId: '1', amount: '0.5' },
      channel: 'push',
    };
    const result = await server.sendNotification('0xabc', payload);
    expect(result.status).toBe('sent');
  });
});

describe('Notify Server — Multi-Channel Delivery', () => {
  let server: NotifyServer;

  beforeEach(() => {
    server = new NotifyServer();
  });

  it('should deliver to each channel independently', async () => {
    server.subscribe('0xabc', ['push', 'email', 'webhook']);

    // Deliver to push
    const pushResult = await server.sendNotification('0xabc', {
      title: 'Push Alert',
      channel: 'push',
    });
    expect(pushResult.status).toBe('sent');

    // Deliver to email
    const emailResult = await server.sendNotification('0xabc', {
      title: 'Email Alert',
      channel: 'email',
    });
    expect(emailResult.status).toBe('sent');

    // Deliver to webhook
    const webhookResult = await server.sendNotification('0xabc', {
      title: 'Webhook Alert',
      channel: 'webhook',
    });
    expect(webhookResult.status).toBe('sent');
  });
});
