/**
 * Tests for social-login email provider.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateOTP, generateMagicLinkToken, buildMagicLink, validateMagicLinkToken, validateOTP } from '../src/providers/email.js';

describe('generateOTP', () => {
  it('should generate a 6-digit OTP by default', () => {
    const otp = generateOTP();
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  it('should generate a 4-digit OTP when specified', () => {
    const otp = generateOTP(4);
    expect(otp).toHaveLength(4);
    expect(/^\d{4}$/.test(otp)).toBe(true);
  });

  it('should generate different OTPs on subsequent calls', () => {
    const otp1 = generateOTP();
    const otp2 = generateOTP();
    // Probability of collision is 1 in 900000
    expect(otp1).not.toBe(otp2);
  });
});

describe('generateMagicLinkToken', () => {
  it('should generate a 64-char hex token (32 bytes)', () => {
    const token = generateMagicLinkToken();
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
  });

  it('should generate unique tokens', () => {
    const token1 = generateMagicLinkToken();
    const token2 = generateMagicLinkToken();
    expect(token1).not.toBe(token2);
  });
});

describe('buildMagicLink', () => {
  it('should build a magic link URL with token', () => {
    const link = buildMagicLink({
      email: 'user@example.com',
      redirectUrl: 'https://app.example.com/auth',
    }, 'test-token-123');

    expect(link).toContain('https://app.example.com/auth');
    expect(link).toContain('token=test-token-123');
    expect(link).toContain('email=user%40example.com');
    expect(link).toContain('exp=');
  });

  it('should generate token if not provided', () => {
    const link = buildMagicLink({
      email: 'user@example.com',
      redirectUrl: 'https://app.example.com/auth',
    });

    expect(link).toContain('token=');
  });

  it('should include expiry parameter', () => {
    const link = buildMagicLink({
      email: 'user@example.com',
      redirectUrl: 'https://app.example.com/auth',
      expiresInSeconds: 1800,
    });

    const url = new URL(link);
    const expiry = parseInt(url.searchParams.get('exp')!);
    const expectedExpiry = Math.floor(Date.now() / 1000) + 1800;
    expect(expiry).toBeGreaterThanOrEqual(expectedExpiry - 1);
    expect(expiry).toBeLessThanOrEqual(expectedExpiry + 1);
  });
});

describe('validateMagicLinkToken', () => {
  it('should validate a matching token', () => {
    const valid = validateMagicLinkToken(
      'abc123',
      'user@example.com',
      'abc123',
      Math.floor(Date.now() / 1000) + 3600
    );
    expect(valid).toBe(true);
  });

  it('should reject non-matching token', () => {
    const valid = validateMagicLinkToken(
      'abc123',
      'user@example.com',
      'xyz789',
      Math.floor(Date.now() / 1000) + 3600
    );
    expect(valid).toBe(false);
  });

  it('should reject expired token', () => {
    const valid = validateMagicLinkToken(
      'abc123',
      'user@example.com',
      'abc123',
      Math.floor(Date.now() / 1000) - 100
    );
    expect(valid).toBe(false);
  });
});

describe('validateOTP', () => {
  it('should validate a matching OTP', () => {
    const valid = validateOTP(
      '123456',
      '123456',
      Math.floor(Date.now() / 1000) + 300
    );
    expect(valid).toBe(true);
  });

  it('should reject non-matching OTP', () => {
    const valid = validateOTP(
      '123456',
      '654321',
      Math.floor(Date.now() / 1000) + 300
    );
    expect(valid).toBe(false);
  });

  it('should reject expired OTP', () => {
    const valid = validateOTP(
      '123456',
      '123456',
      Math.floor(Date.now() / 1000) - 100
    );
    expect(valid).toBe(false);
  });
});
