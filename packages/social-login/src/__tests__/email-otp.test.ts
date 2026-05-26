/**
 * Email OTP and magic link tests.
 */

import { describe, it, expect } from 'vitest';
import { MagicLinkManager } from '../email-otp';

const TEST_SECRET = 'test-magic-link-secret-that-is-long-enough-for-jwt';

describe('MagicLinkManager', () => {
  it('throws on short secret', () => {
    expect(() => new MagicLinkManager({ secret: 'short' })).toThrow('at least 32 characters');
  });

  it('generates a magic link URL with token', async () => {
    const ml = new MagicLinkManager({ secret: TEST_SECRET });

    const result = await ml.sendMagicLink({
      email: 'user@example.com',
      baseUrl: 'https://myapp.com/auth/callback',
      redirectUrl: 'https://myapp.com/dashboard',
    });

    expect(result.magicLink).toContain('https://myapp.com/auth/callback');
    expect(result.magicLink).toContain('token=');
    expect(result.magicLink).toContain('redirect=');
    expect(result.token).toBeDefined();
    expect(result.expiresAt).toBeGreaterThan(Date.now() / 1000);
  });

  it('generates a valid signed JWT token', async () => {
    const ml = new MagicLinkManager({ secret: TEST_SECRET });

    const result = await ml.sendMagicLink({
      email: 'user@example.com',
      baseUrl: 'https://myapp.com/auth',
    });

    // JWT has 3 parts
    const parts = result.token.split('.');
    expect(parts).toHaveLength(3);
  });

  it('verifies a valid magic link', async () => {
    const ml = new MagicLinkManager({ secret: TEST_SECRET });

    const sent = await ml.sendMagicLink({
      email: 'user@example.com',
      baseUrl: 'https://myapp.com/auth',
    });

    const verified = await ml.verifyMagicLink({
      token: sent.token,
      expectedEmail: 'user@example.com',
    });

    expect(verified.valid).toBe(true);
    expect(verified.email).toBe('user@example.com');
    expect(verified.redirectUrl).toBe('');
  });

  it('verifies magic link with redirect URL', async () => {
    const ml = new MagicLinkManager({ secret: TEST_SECRET });

    const sent = await ml.sendMagicLink({
      email: 'user@example.com',
      baseUrl: 'https://myapp.com/auth',
      redirectUrl: 'https://myapp.com/settings',
    });

    const verified = await ml.verifyMagicLink({
      token: sent.token,
      expectedEmail: 'user@example.com',
    });

    expect(verified.valid).toBe(true);
    expect(verified.redirectUrl).toBe('https://myapp.com/settings');
  });

  it('rejects email mismatch', async () => {
    const ml = new MagicLinkManager({ secret: TEST_SECRET });

    const sent = await ml.sendMagicLink({
      email: 'user@example.com',
      baseUrl: 'https://myapp.com/auth',
    });

    const verified = await ml.verifyMagicLink({
      token: sent.token,
      expectedEmail: 'attacker@example.com',
    });

    expect(verified.valid).toBe(false);
    expect(verified.error).toContain('Email mismatch');
  });

  it('rejects tampered tokens', async () => {
    const ml = new MagicLinkManager({ secret: TEST_SECRET });

    const sent = await ml.sendMagicLink({
      email: 'user@example.com',
      baseUrl: 'https://myapp.com/auth',
    });

    // Tamper with the token
    const parts = sent.token.split('.');
    const tamperedPayload = Buffer.from(parts[1], 'base64url').toString('utf-8').replace('user@example.com', 'attacker@example.com');
    const tamperedToken = `${parts[0]}.${Buffer.from(tamperedPayload).toString('base64url')}.${parts[2]}`;

    const verified = await ml.verifyMagicLink({
      token: tamperedToken,
      expectedEmail: 'attacker@example.com',
    });

    expect(verified.valid).toBe(false);
  });

  it('rejects expired magic links', async () => {
    const ml = new MagicLinkManager({ secret: TEST_SECRET });

    const sent = await ml.sendMagicLink({
      email: 'user@example.com',
      baseUrl: 'https://myapp.com/auth',
      ttlSeconds: 1, // 1 second TTL
    });

    // Wait for expiry
    await new Promise(r => setTimeout(r, 1100));

    const verified = await ml.verifyMagicLink({
      token: sent.token,
      expectedEmail: 'user@example.com',
    });

    expect(verified.valid).toBe(false);
    expect(verified.error).toContain('exp');
  });

  it('uses custom issuer', async () => {
    const ml = new MagicLinkManager({
      secret: TEST_SECRET,
      issuer: 'my-custom-app',
    });

    const sent = await ml.sendMagicLink({
      email: 'user@example.com',
      baseUrl: 'https://myapp.com/auth',
    });

    const verified = await ml.verifyMagicLink({
      token: sent.token,
      expectedEmail: 'user@example.com',
    });

    expect(verified.valid).toBe(true);
  });
});

describe('MagicLinkManager — URL parsing', () => {
  it('generates parseable magic link URLs', async () => {
    const ml = new MagicLinkManager({ secret: TEST_SECRET });

    const sent = await ml.sendMagicLink({
      email: 'user@example.com',
      baseUrl: 'https://myapp.com/auth/callback?source=email',
    });

    // Parse the generated URL
    const url = new URL(sent.magicLink);
    expect(url.origin).toBe('https://myapp.com');
    expect(url.pathname).toBe('/auth/callback');
    expect(url.searchParams.get('source')).toBe('email');
    expect(url.searchParams.get('token')).not.toBeNull();
  });
});
