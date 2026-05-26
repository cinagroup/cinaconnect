/**
 * Session manager tests — JWT creation, validation, refresh, revocation, localStorage.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../session-manager';

const TEST_SECRET = 'test-session-secret-key-that-is-long-enough-for-hs256';

describe('SessionManager', () => {
  let sm: SessionManager;

  beforeEach(() => {
    sm = new SessionManager({ secret: TEST_SECRET });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Creation ──────────────────────────────────────────────────────

  it('throws on short secret', () => {
    expect(() => new SessionManager({ secret: 'short' })).toThrow('at least 32 characters');
  });

  it('creates a session with access + refresh tokens', async () => {
    const result = await sm.create({
      provider: 'google',
      providerUserId: 'user-123',
      email: 'user@gmail.com',
      walletAddress: '0xabc123',
      isNewUser: true,
    });

    expect(result.accessToken).toBeDefined();
    expect(result.accessToken.length).toBeGreaterThan(50);
    expect(result.refreshToken).toBeDefined();
    expect(result.refreshToken.length).toBeGreaterThan(10);
    expect(result.payload.provider).toBe('google');
    expect(result.payload.providerUserId).toBe('user-123');
    expect(result.payload.email).toBe('user@gmail.com');
    expect(result.payload.walletAddress).toBe('0xabc123');
    expect(result.payload.isNewUser).toBe(true);
    expect(result.expiresAt).toBeGreaterThan(Date.now() / 1000);
  });

  it('generates unique session IDs', async () => {
    const s1 = await sm.create({
      provider: 'google',
      providerUserId: 'user-1',
      walletAddress: '0x1',
      isNewUser: true,
    });
    const s2 = await sm.create({
      provider: 'apple',
      providerUserId: 'user-2',
      walletAddress: '0x2',
      isNewUser: false,
    });

    expect(s1.payload.sid).not.toBe(s2.payload.sid);
  });

  // ─── Validation ────────────────────────────────────────────────────

  it('validates a valid access token', async () => {
    const session = await sm.create({
      provider: 'google',
      providerUserId: 'user-123',
      walletAddress: '0xabc',
      isNewUser: false,
    });

    const result = await sm.validate(session.accessToken);
    expect(result.valid).toBe(true);
    expect(result.payload?.providerUserId).toBe('user-123');
  });

  it('rejects tampered tokens', async () => {
    const session = await sm.create({
      provider: 'google',
      providerUserId: 'user-123',
      walletAddress: '0xabc',
      isNewUser: false,
    });

    // Tamper with the token (change a character in the payload)
    const parts = session.accessToken.split('.');
    const tamperedPayload = Buffer.from(parts[1], 'base64url').toString('utf-8').replace('google', 'facebook');
    const tamperedToken = `${parts[0]}.${Buffer.from(tamperedPayload).toString('base64url')}.${parts[2]}`;

    const result = await sm.validate(tamperedToken);
    expect(result.valid).toBe(false);
  });

  it('rejects expired tokens', async () => {
    // Create a session manager with a very short TTL
    const shortSm = new SessionManager({
      secret: TEST_SECRET,
      accessTokenTtlSeconds: 1,
    });

    const session = await shortSm.create({
      provider: 'google',
      providerUserId: 'user-123',
      walletAddress: '0xabc',
      isNewUser: false,
    });

    // Wait for expiry
    await new Promise(r => setTimeout(r, 1100));

    const result = await shortSm.validate(session.accessToken);
    expect(result.valid).toBe(false);
  });

  it('rejects tokens from wrong issuer', async () => {
    const sm1 = new SessionManager({ secret: TEST_SECRET, issuer: 'app-a' });
    const sm2 = new SessionManager({ secret: TEST_SECRET, issuer: 'app-b' });

    const session = await sm1.create({
      provider: 'google',
      providerUserId: 'user-123',
      walletAddress: '0xabc',
      isNewUser: false,
    });

    const result = await sm2.validate(session.accessToken);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('iss');
  });

  // ─── Refresh ───────────────────────────────────────────────────────

  it('refreshes an access token with token rotation', async () => {
    const session = await sm.create({
      provider: 'google',
      providerUserId: 'user-123',
      walletAddress: '0xabc',
      isNewUser: false,
    });

    const refreshed = await sm.refresh(session.refreshToken);
    if ('error' in refreshed) {
      throw new Error(`Refresh failed: ${refreshed.error}`);
    }

    expect(refreshed.accessToken).not.toBe(session.accessToken);
    expect(refreshed.refreshToken).not.toBe(session.refreshToken);
    expect(refreshed.payload.providerUserId).toBe('user-123');
    expect(refreshed.payload.v).toBe(2); // version incremented
  });

  it('rejects invalid refresh tokens', async () => {
    const result = await sm.refresh('invalid-refresh-token');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('Invalid refresh token');
    }
  });

  it('rejects refresh after revocation', async () => {
    const session = await sm.create({
      provider: 'google',
      providerUserId: 'user-123',
      walletAddress: '0xabc',
      isNewUser: false,
    });

    await sm.revoke(session.payload.sid);

    const result = await sm.refresh(session.refreshToken);
    expect('error' in result).toBe(true);
  });

  // ─── Revocation ────────────────────────────────────────────────────

  it('revokes a session by ID', async () => {
    const session = await sm.create({
      provider: 'google',
      providerUserId: 'user-123',
      walletAddress: '0xabc',
      isNewUser: false,
    });

    const revoked = await sm.revoke(session.payload.sid);
    expect(revoked).toBe(true);

    // Validation should fail after revocation
    const result = await sm.validate(session.accessToken);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('revoked');
  });

  it('returns false for unknown session ID', async () => {
    const result = await sm.revoke('nonexistent-sid');
    expect(result).toBe(false);
  });

  it('revokes all sessions for a user', async () => {
    await sm.create({
      provider: 'google',
      providerUserId: 'user-123',
      walletAddress: '0x1',
      isNewUser: false,
    });

    await sm.create({
      provider: 'apple',
      providerUserId: 'user-123',
      walletAddress: '0x2',
      isNewUser: false,
    });

    const count = await sm.revokeAllForUser('user-123');
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ─── localStorage Persistence ──────────────────────────────────────

  it('saves and loads from localStorage', async () => {
    // Mock localStorage
    const store = new Map<string, string>();
    const mockStorage: Storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      length: store.size,
      key: () => null,
    };

    const session = await sm.create({
      provider: 'google',
      providerUserId: 'user-123',
      walletAddress: '0xabc',
      isNewUser: false,
    });

    SessionManager.saveToLocalStorage(session, mockStorage);

    const loaded = SessionManager.loadFromLocalStorage(mockStorage);
    expect(loaded).not.toBeNull();
    expect(loaded!.accessToken).toBe(session.accessToken);
    expect(loaded!.refreshToken).toBe(session.refreshToken);
    expect(loaded!.expired).toBe(false);
  });

  it('marks loaded tokens as expired', async () => {
    const store = new Map<string, string>();
    const mockStorage: Storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      length: store.size,
      key: () => null,
    };

    // Create an expired session
    const shortSm = new SessionManager({
      secret: TEST_SECRET,
      accessTokenTtlSeconds: 1,
    });
    const session = await shortSm.create({
      provider: 'google',
      providerUserId: 'user-123',
      walletAddress: '0xabc',
      isNewUser: false,
    });

    await new Promise(r => setTimeout(r, 1100));

    SessionManager.saveToLocalStorage(session, mockStorage);
    const loaded = SessionManager.loadFromLocalStorage(mockStorage);
    expect(loaded).not.toBeNull();
    expect(loaded!.expired).toBe(true);
  });

  it('clears from localStorage', () => {
    const store = new Map<string, string>();
    const mockStorage: Storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      length: store.size,
      key: () => null,
    };

    SessionManager.saveToLocalStorage({
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() / 1000 + 3600,
    }, mockStorage);

    SessionManager.clearFromLocalStorage(mockStorage);
    expect(SessionManager.loadFromLocalStorage(mockStorage)).toBeNull();
  });

  // ─── Cleanup ───────────────────────────────────────────────────────

  it('cleans up expired sessions', async () => {
    const shortSm = new SessionManager({
      secret: TEST_SECRET,
      accessTokenTtlSeconds: 1,
      refreshTokenTtlSeconds: 1, // Also short TTL for cleanup test
    });

    await shortSm.create({
      provider: 'google',
      providerUserId: 'user-1',
      walletAddress: '0x1',
      isNewUser: false,
    });

    await new Promise(r => setTimeout(r, 1100));

    const beforeClean = shortSm.activeSessionCount;
    const cleaned = shortSm.cleanup();
    expect(cleaned).toBeGreaterThanOrEqual(1);
    // After cleanup, count should have decreased by the number cleaned
    expect(shortSm.activeSessionCount).toBeLessThan(beforeClean);
  });
});
