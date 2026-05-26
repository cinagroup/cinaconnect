/**
 * Token verifier tests — Google, Apple, Twitter/X.
 *
 * Uses mocked fetch to simulate provider responses.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TokenVerifier, type TokenVerifyResult } from '../token-verifier';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeJWT(payload: Record<string, unknown>, secret = 'test'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  // Fake signature (not cryptographically valid, but structurally a JWT)
  const sig = Buffer.from('fake-signature').toString('base64url');
  return `${header}.${body}.${sig}`;
}

// ─── Google Token Verification ────────────────────────────────────────────

describe('TokenVerifier — Google', () => {
  let verifier: TokenVerifier;

  beforeEach(() => {
    verifier = new TokenVerifier({
      googleClientId: 'test-google-client-id.apps.googleusercontent.com',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects non-JWT tokens', async () => {
    const result = await verifier.verify('google', 'not-a-jwt');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not a JWT');
  });

  it('rejects malformed JWT payload', async () => {
    const token = 'aaa.bbb.ccc'; // invalid base64
    const result = await verifier.verify('google', token);
    expect(result.valid).toBe(false);
  });

  it('rejects tokens with wrong audience', async () => {
    const token = makeJWT({
      aud: 'wrong-client-id',
      sub: '123456',
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const result = await verifier.verify('google', token);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('audience mismatch');
  });

  it('rejects expired tokens', async () => {
    const token = makeJWT({
      aud: 'test-google-client-id.apps.googleusercontent.com',
      sub: '123456',
      exp: Math.floor(Date.now() / 1000) - 100, // expired
    });

    const result = await verifier.verify('google', token);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('expired');
  });

  it('passes structural checks and returns payload on tokeninfo success', async () => {
    const token = makeJWT({
      aud: 'test-google-client-id.apps.googleusercontent.com',
      sub: 'google-user-123',
      email: 'user@gmail.com',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    // Mock successful tokeninfo response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        sub: 'google-user-123',
        email: 'user@gmail.com',
        aud: 'test-google-client-id.apps.googleusercontent.com',
      }),
    });

    const result = await verifier.verify('google', token);
    expect(result.valid).toBe(true);
    expect(result.userId).toBe('google-user-123');
    expect(result.email).toBe('user@gmail.com');
  });

  it('returns partial validity when tokeninfo endpoint fails (network error)', async () => {
    const token = makeJWT({
      aud: 'test-google-client-id.apps.googleusercontent.com',
      sub: 'google-user-123',
      email: 'user@gmail.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await verifier.verify('google', token);
    expect(result.valid).toBe(true); // structurally valid
    expect(result.userId).toBe('google-user-123');
    expect(result.error).toContain('network issue');
  });

  it('returns error on tokeninfo 400 response', async () => {
    const token = makeJWT({
      aud: 'test-google-client-id.apps.googleusercontent.com',
      sub: 'google-user-123',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Invalid token'),
    });

    const result = await verifier.verify('google', token);
    // 400 from tokeninfo is not a network error, it goes through the !response.ok path
    // But the catch block is not triggered; the structured return has valid:false
    // Since the code doesn't go to catch, it returns { valid: false, error: ... }
    // However, the test previously expected partial validity — let's verify actual behavior
    expect(result.valid).toBe(false);
    expect(result.error).toContain('400');
  });
});

// ─── Apple Token Verification ─────────────────────────────────────────────

describe('TokenVerifier — Apple', () => {
  let verifier: TokenVerifier;

  beforeEach(() => {
    verifier = new TokenVerifier({
      appleClientId: 'com.example.app',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects non-JWT tokens', async () => {
    const result = await verifier.verify('apple', 'not-a-jwt');
    expect(result.valid).toBe(false);
  });

  it('rejects tokens with wrong audience', async () => {
    const token = makeJWT({
      aud: 'com.wrong.app',
      sub: 'apple-user-123',
    });

    const result = await verifier.verify('apple', token);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('audience mismatch');
  });

  it('fails signature verification with fake JWT (expected)', async () => {
    // A structurally valid but unverified JWT will fail jose's jwtVerify
    const token = makeJWT({
      aud: 'com.example.app',
      sub: 'apple-user-123',
      email: 'user@icloud.com',
      iss: 'https://appleid.apple.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    // Mock Apple JWKS endpoint
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        keys: [{
          kty: 'RSA',
          kid: 'fake-key-id',
          n: 'fake-modulus',
          e: 'AQAB',
        }],
      }),
    });

    // The fake token won't verify against real Apple keys
    const result = await verifier.verify('apple', token);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('verification failed');
  });
});

// ─── Twitter Token Verification ───────────────────────────────────────────

describe('TokenVerifier — Twitter', () => {
  let verifier: TokenVerifier;

  beforeEach(() => {
    verifier = new TokenVerifier({
      twitterBearerToken: 'test-bearer-token',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects very short tokens', async () => {
    const result = await verifier.verify('twitter', 'short');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too short');
  });

  it('validates access token via Twitter API v2 /me endpoint', async () => {
    const accessToken = 'a-valid-looking-twitter-access-token-12345';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          id: 'twitter-user-456',
          name: 'Test User',
          username: 'testuser',
        },
      }),
    });

    const result = await verifier.verify('twitter', accessToken);
    expect(result.valid).toBe(true);
    expect(result.userId).toBe('twitter-user-456');
    expect(result.payload?.sub).toBe('twitter-user-456');
  });

  it('handles Twitter API errors', async () => {
    const accessToken = 'invalid-twitter-token';

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('{"errors":[{"message":"Could not authenticate you"}]}'),
    });

    const result = await verifier.verify('twitter', accessToken);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('401');
  });

  it('handles missing user data in response', async () => {
    const accessToken = 'valid-looking-token';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        errors: [{ message: 'Invalid bearer token' }],
      }),
    });

    const result = await verifier.verify('twitter', accessToken);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid bearer token');
  });

  it('handles network errors', async () => {
    const accessToken = 'valid-looking-token';

    global.fetch = vi.fn().mockRejectedValue(new Error('DNS lookup failed'));

    const result = await verifier.verify('twitter', accessToken);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('DNS lookup failed');
  });
});

// ─── Unsupported Provider ─────────────────────────────────────────────────

describe('TokenVerifier — unsupported provider', () => {
  it('returns error for unknown providers', async () => {
    const verifier = new TokenVerifier();
    // @ts-expect-error — testing unsupported provider string at runtime
    const result = await verifier.verify('facebook' as any, 'some-token');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unsupported provider');
  });
});
