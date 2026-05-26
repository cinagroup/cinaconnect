/**
 * SMS provider tests — Twilio, Vonage, Mock.
 *
 * Tests use mocked fetch to avoid real API calls.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TwilioProvider, MockSMSProvider } from '../sms-providers';

// ─── Twilio Provider ──────────────────────────────────────────────────────

describe('TwilioProvider', () => {
  let twilio: TwilioProvider;

  beforeEach(() => {
    twilio = new TwilioProvider({
      accountSid: 'AC1234567890',
      authToken: 'auth-token-secret',
      fromNumber: '+1234567890',
      baseUrl: 'https://api.twilio.com/2010-04-01/Accounts/AC1234567890',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws on missing config', () => {
    expect(() => new TwilioProvider({
      accountSid: '',
      authToken: 'token',
      fromNumber: '+1234567890',
    })).toThrow('requires accountSid, authToken, and fromNumber');
  });

  it('sends SMS successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        sid: 'SM123',
        status: 'sent',
      }),
    });

    await expect(twilio.send('+1987654321', 'Your code is: 123456')).resolves.not.toThrow();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/Messages.json'),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('throws on API error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('{"code": 20003, "message": "Invalid auth"}'),
    });

    await expect(twilio.send('+1987654321', 'test')).rejects.toThrow('Twilio SMS failed (401)');
  });

  it('throws on delivery failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        sid: 'SM123',
        status: 'failed',
        error_message: 'Invalid phone number',
      }),
    });

    await expect(twilio.send('+1987654321', 'test')).rejects.toThrow('Twilio SMS failed');
  });
});

// ─── Mock SMS Provider ────────────────────────────────────────────────────

describe('MockSMSProvider', () => {
  it('captures sent messages', async () => {
    const mock = new MockSMSProvider();

    await mock.send('+1234567890', 'Test message');

    expect(mock.count).toBe(1);
    expect(mock.sentMessages[0].to).toBe('+1234567890');
    expect(mock.sentMessages[0].message).toBe('Test message');
  });

  it('invokes onMessage callback', async () => {
    const messages: Array<{ to: string; message: string }> = [];
    const mock = new MockSMSProvider({
      onMessage: (to, message) => messages.push({ to, message }),
    });

    await mock.send('+1111111111', 'Code: 123456');

    expect(messages).toHaveLength(1);
    expect(messages[0].to).toBe('+1111111111');
    expect(messages[0].message).toBe('Code: 123456');
  });

  it('simulates failure for specific numbers', async () => {
    const mock = new MockSMSProvider({
      failNumbers: ['+9999999999'],
    });

    await expect(mock.send('+9999999999', 'test')).rejects.toThrow('simulated failure');

    // Non-failing number should work
    await expect(mock.send('+1234567890', 'test')).resolves.not.toThrow();
  });

  it('supports delay simulation', async () => {
    const start = Date.now();
    const mock = new MockSMSProvider({ delayMs: 50 });

    await mock.send('+1234567890', 'test');

    expect(Date.now() - start).toBeGreaterThanOrEqual(35);
  });

  it('filters messages by phone number', async () => {
    const mock = new MockSMSProvider();

    await mock.send('+1111111111', 'msg1');
    await mock.send('+2222222222', 'msg2');
    await mock.send('+1111111111', 'msg3');

    expect(mock.getMessagesTo('+1111111111')).toHaveLength(2);
    expect(mock.getMessagesTo('+2222222222')).toHaveLength(1);
  });

  it('clears captured messages', async () => {
    const mock = new MockSMSProvider();

    await mock.send('+1234567890', 'test');
    expect(mock.count).toBe(1);

    mock.clear();
    expect(mock.count).toBe(0);
  });
});
