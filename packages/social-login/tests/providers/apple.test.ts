/**
 * Tests for social-login Apple Sign-In provider.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildAppleAuthUrl,
  decodeAppleIdToken,
} from '../../src/providers/apple.js';
import type { AppleLoginParams } from '../../src/types.js';

// ─── buildAppleAuthUrl Tests ───────────────────────────────────

describe('Apple Provider - buildAppleAuthUrl', () => {
  const baseParams: Pick<AppleLoginParams, 'clientId' | 'redirectUri'> = {
    clientId: 'com.example.app',
    redirectUri: 'https://example.com/callback',
  };

  it('should build a valid Apple auth URL with required params', () => {
    const url = buildAppleAuthUrl(baseParams);

    expect(url).toContain('https://appleid.apple.com/auth/authorize');
    expect(url).toContain('client_id=com.example.app');
    expect(url).toContain(
      'redirect_uri=' + encodeURIComponent('https://example.com/callback')
    );
    expect(url).toContain('response_type=code+id_token');
    expect(url).toContain('response_mode=form_post');
    expect(url).toContain('scope=openid+email+name');
    expect(url).toContain('state=');
  });

  it('should use custom state when provided', () => {
    const params: AppleLoginParams = {
      ...baseParams,
      teamId: 'ABC123',
      keyId: 'KEY123',
      privateKey: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
      state: 'my-custom-state',
    };
    const url = buildAppleAuthUrl(params);

    expect(url).toContain('state=my-custom-state');
  });

  it('should use custom scopes when provided', () => {
    const params: AppleLoginParams = {
      ...baseParams,
      teamId: 'ABC123',
      keyId: 'KEY123',
      privateKey: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
      scopes: ['openid', 'email'],
    };
    const url = buildAppleAuthUrl(params);

    expect(url).toContain('scope=openid+email');
    expect(url).not.toContain('name');
  });

  it('should include response_mode=form_post by default', () => {
    const url = buildAppleAuthUrl(baseParams);

    expect(url).toContain('response_mode=form_post');
  });
});

// ─── decodeAppleIdToken Tests ──────────────────────────────────

describe('Apple Provider - decodeAppleIdToken', () => {
  /** Helper to create a fake JWT with a given payload. */
  function makeFakeJwt(payload: Record<string, unknown>): string {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = Buffer.from('fake-signature').toString('base64url');
    return `${header}.${body}.${sig}`;
  }

  it('should decode a valid Apple ID token and extract sub', () => {
    const jwt = makeFakeJwt({
      sub: '001234.abc5678def90',
      email: 'user@privaterelay.appleid.com',
      email_verified: true,
    });

    const profile = decodeAppleIdToken(jwt);

    expect(profile.sub).toBe('001234.abc5678def90');
    expect(profile.email).toBe('user@privaterelay.appleid.com');
    expect(profile.emailVerified).toBe(true);
  });

  it('should decode name fields when present', () => {
    const jwt = makeFakeJwt({
      sub: 'user-123',
      email: 'user@example.com',
      name: { firstName: 'John', lastName: 'Doe' },
    });

    const profile = decodeAppleIdToken(jwt);

    expect(profile.name).toBe('John Doe');
  });

  it('should throw on invalid JWT (wrong number of parts)', () => {
    expect(() => decodeAppleIdToken('not-a-jwt')).toThrow(
      'Invalid Apple ID token: not a valid JWT'
    );
    expect(() => decodeAppleIdToken('header.payload')).toThrow(
      'Invalid Apple ID token: not a valid JWT'
    );
  });

  it('should handle missing name gracefully', () => {
    const jwt = makeFakeJwt({
      sub: 'user-456',
    });

    const profile = decodeAppleIdToken(jwt);

    expect(profile.name).toBeUndefined();
    expect(profile.email).toBeUndefined();
  });
});
