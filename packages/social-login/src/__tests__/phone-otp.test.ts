/**
 * Phone OTP + SMS integration tests.
 *
 * Tests the full OTP flow with MockSMSProvider.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  sendPhoneOTP,
  verifyPhoneOTP,
  generatePhoneOTP,
  isValidPhoneNumber,
  generateSessionId,
  type PhoneOTPParams,
} from '../auth/phone-otp.js';
import { MockSMSProvider } from '../sms-providers.js';

describe('Phone OTP — Core Functions', () => {
  it('generates 6-digit OTP by default', () => {
    const otp = generatePhoneOTP();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('generates 4-digit OTP when requested', () => {
    const otp = generatePhoneOTP(4);
    expect(otp).toMatch(/^\d{4}$/);
  });

  it('throws for invalid OTP length', () => {
    expect(() => generatePhoneOTP(3)).toThrow();
    expect(() => generatePhoneOTP(11)).toThrow();
  });

  it('generates unique session IDs', () => {
    const s1 = generateSessionId();
    const s2 = generateSessionId();
    expect(s1).not.toBe(s2);
    expect(s1.length).toBe(64); // 32 bytes = 64 hex chars
  });

  it('validates E.164 phone numbers', () => {
    expect(isValidPhoneNumber('+1234567890')).toBe(true);
    expect(isValidPhoneNumber('+441234567890')).toBe(true);
    expect(isValidPhoneNumber('+8613912345678')).toBe(true);
    expect(isValidPhoneNumber('1234567890')).toBe(false); // missing +
    expect(isValidPhoneNumber('+0123456')).toBe(false); // leading 0
    expect(isValidPhoneNumber('+1')).toBe(false); // too short
    expect(isValidPhoneNumber('')).toBe(false);
  });
});

describe('Phone OTP — Send Flow', () => {
  let mockSMS: MockSMSProvider;

  beforeEach(() => {
    mockSMS = new MockSMSProvider();
  });

  it('sends OTP successfully with valid phone number', async () => {
    const result = await sendPhoneOTP(
      { phone: '+1234567890' },
      mockSMS
    );

    expect(result.success).toBe(true);
    expect(result.sessionId).toHaveLength(64);
    expect(result.expiresAt).toBeGreaterThan(Date.now() / 1000);
    expect(mockSMS.count).toBe(1);
  });

  it('fails for invalid phone numbers', async () => {
    const result = await sendPhoneOTP(
      { phone: 'invalid-phone' },
      mockSMS
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid phone number');
    expect(mockSMS.count).toBe(0); // No SMS sent
  });

  it('fails when SMS provider throws', async () => {
    const failingSMS = new MockSMSProvider({
      failNumbers: ['+9999999999'],
    });

    const result = await sendPhoneOTP(
      { phone: '+9999999999' },
      failingSMS
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('simulated failure');
  });

  it('sends SMS with OTP code in the message', async () => {
    await sendPhoneOTP(
      { phone: '+1234567890' },
      mockSMS
    );

    const msg = mockSMS.sentMessages[0].message;
    expect(msg).toContain('verification code');
    expect(msg).toMatch(/code is: \d{6}/);
    expect(msg).toContain('expires');
  });

  it('uses custom OTP length and TTL', async () => {
    const result = await sendPhoneOTP(
      { phone: '+1234567890', otpLength: 4, otpTtlSeconds: 60 },
      mockSMS
    );

    expect(result.success).toBe(true);
    // TTL is 60 seconds, so expiresAt should be close to now + 60
    expect(result.expiresAt - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(65);
  });
});

describe('Phone OTP — Verify Flow', () => {
  let mockSMS: MockSMSProvider;

  beforeEach(() => {
    mockSMS = new MockSMSProvider();
  });

  it('verifies correct OTP', async () => {
    const sendResult = await sendPhoneOTP(
      { phone: '+1234567890' },
      mockSMS
    );

    // Extract the OTP from the sent message
    const otpMatch = mockSMS.sentMessages[0].message.match(/code is: (\d{6})/);
    expect(otpMatch).not.toBeNull();
    const otp = otpMatch![1];

    const verifyResult = await verifyPhoneOTP({
      phone: '+1234567890',
      code: otp,
      sessionId: sendResult.sessionId,
    });

    expect(verifyResult.success).toBe(true);
    expect(verifyResult.walletAddress).toMatch(/^0x/);
    expect(verifyResult.publicKey).toMatch(/^0x/);
  });

  it('rejects wrong OTP', async () => {
    const sendResult = await sendPhoneOTP(
      { phone: '+1234567890' },
      mockSMS
    );

    const verifyResult = await verifyPhoneOTP({
      phone: '+1234567890',
      code: '000000',
      sessionId: sendResult.sessionId,
    });

    expect(verifyResult.success).toBe(false);
    expect(verifyResult.error).toContain('Invalid OTP');
    expect(verifyResult.error).toContain('attempts remaining');
  });

  it('rejects expired OTP', async () => {
    const sendResult = await sendPhoneOTP(
      { phone: '+1234567890', otpTtlSeconds: 1 },
      mockSMS
    );

    // Wait for expiry
    await new Promise(r => setTimeout(r, 1100));

    const otpMatch = mockSMS.sentMessages[0].message.match(/code is: (\d{6})/);
    const otp = otpMatch![1];

    const verifyResult = await verifyPhoneOTP({
      phone: '+1234567890',
      code: otp,
      sessionId: sendResult.sessionId,
    });

    expect(verifyResult.success).toBe(false);
    expect(verifyResult.error).toContain('expired');
  });

  it('rejects invalid session ID', async () => {
    const verifyResult = await verifyPhoneOTP({
      phone: '+1234567890',
      code: '123456',
      sessionId: 'nonexistent-session-id',
    });

    expect(verifyResult.success).toBe(false);
    expect(verifyResult.error).toContain('Invalid or expired session');
  });

  it('rejects after max attempts', async () => {
    const sendResult = await sendPhoneOTP(
      { phone: '+1234567890' },
      mockSMS
    );

    // Make 5 wrong attempts
    for (let i = 0; i < 5; i++) {
      await verifyPhoneOTP({
        phone: '+1234567890',
        code: '000000',
        sessionId: sendResult.sessionId,
      });
    }

    // 6th attempt should be blocked
    const verifyResult = await verifyPhoneOTP({
      phone: '+1234567890',
      code: '000000',
      sessionId: sendResult.sessionId,
    });

    expect(verifyResult.success).toBe(false);
    expect(verifyResult.error).toContain('Maximum verification attempts');
  });
});
