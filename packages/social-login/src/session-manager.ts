/**
 * JWT-based session management for social login.
 *
 * Handles session creation, validation, refresh, and revocation
 * with localStorage persistence (browser-side) and in-memory
 * session tracking (server-side).
 *
 * @packageDocumentation
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

// ─── Types ──────────────────────────────────────────────────────────────

/**
 * Session payload included in the JWT.
 */
export interface SessionPayload extends JWTPayload {
  /** Unique session ID. */
  sid: string;
  /** Provider that authenticated this session. */
  provider: string;
  /** Provider-specific user ID. */
  providerUserId: string;
  /** User's email (if available). */
  email?: string;
  /** Derived wallet address. */
  walletAddress: string;
  /** Whether this is the user's first login. */
  isNewUser: boolean;
  /** Session version for rotation. */
  v?: number;
}

/**
 * Result of a session creation operation.
 */
export interface SessionCreateResult {
  /** Access token (JWT). */
  accessToken: string;
  /** Refresh token (opaque string). */
  refreshToken: string;
  /** Session payload. */
  payload: SessionPayload;
  /** Access token expiration (Unix seconds). */
  expiresAt: number;
}

/**
 * Result of a session validation operation.
 */
export interface SessionValidateResult {
  /** Whether the session is valid. */
  valid: boolean;
  /** Decoded session payload (on success). */
  payload?: SessionPayload;
  /** Error message (on failure). */
  error?: string;
}

/**
 * Configuration for the SessionManager.
 */
export interface SessionManagerConfig {
  /** Secret key for signing JWTs (at least 256 bits). */
  secret: string;
  /** Access token TTL in seconds (default: 3600 = 1 hour). */
  accessTokenTtlSeconds?: number;
  /** Refresh token TTL in seconds (default: 604800 = 7 days). */
  refreshTokenTtlSeconds?: number;
  /** Issuer claim for JWTs. */
  issuer?: string;
  /** Audience claim for JWTs. */
  audience?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────

const DEFAULT_ACCESS_TTL = 3600;
const DEFAULT_REFRESH_TTL = 604800;
const DEFAULT_ISSUER = 'cinacoin-social-login';
const LOCAL_STORAGE_ACCESS_KEY = '@cinacoin/session';
const LOCAL_STORAGE_REFRESH_KEY = '@cinacoin/refresh';

// ─── In-memory session store (server-side) ──────────────────────────────

interface SessionRecord {
  refreshToken: string;
  payload: SessionPayload;
  createdAt: number;
  expiresAt: number;
  accessExpiresAt: number;
  revoked: boolean;
}

const ACTIVE_SESSIONS = new Map<string, SessionRecord>();

// ─── SessionManager Class ───────────────────────────────────────────────

/**
 * Manages JWT-based sessions for authenticated users.
 *
 * Supports:
 * - Session creation with access + refresh tokens
 * - Token validation and signature verification
 * - Token refresh (rotation)
 * - Session revocation
 * - Browser localStorage persistence
 *
 * @example
 * ```ts
 * const sessionManager = new SessionManager({
 *   secret: process.env.SESSION_SECRET!,
 *   issuer: 'my-app',
 *   audience: 'my-app-users',
 * });
 *
 * // Create a session after successful auth
 * const session = await sessionManager.create({
 *   provider: 'google',
 *   providerUserId: '123456',
 *   email: 'user@gmail.com',
 *   walletAddress: '0x...',
 *   isNewUser: false,
 * });
 *
 * // Later, validate a request
 * const result = await sessionManager.validate(session.accessToken);
 * if (result.valid) {
 *   console.log('User:', result.payload?.email);
 * }
 * ```
 */
export class SessionManager {
  private config: Required<SessionManagerConfig>;
  private secretKey: Uint8Array;

  constructor(config: SessionManagerConfig) {
    if (!config.secret || config.secret.length < 32) {
      throw new Error('SessionManager requires a secret of at least 32 characters');
    }
    this.config = {
      secret: config.secret,
      accessTokenTtlSeconds: config.accessTokenTtlSeconds ?? DEFAULT_ACCESS_TTL,
      refreshTokenTtlSeconds: config.refreshTokenTtlSeconds ?? DEFAULT_REFRESH_TTL,
      issuer: config.issuer ?? DEFAULT_ISSUER,
      audience: config.audience ?? DEFAULT_ISSUER,
    };
    this.secretKey = new TextEncoder().encode(config.secret);
  }

  // ─── Session Creation ─────────────────────────────────────────────

  /**
   * Create a new session with access and refresh tokens.
   *
   * @param data - Session data (provider, userId, wallet, etc.).
   * @returns Session tokens and payload.
   */
  async create(data: {
    provider: string;
    providerUserId: string;
    email?: string;
    walletAddress: string;
    isNewUser: boolean;
  }): Promise<SessionCreateResult> {
    const sid = generateId();
    const now = Math.floor(Date.now() / 1000);
    const accessExpiresAt = now + this.config.accessTokenTtlSeconds;
    const refreshExpiresAt = now + this.config.refreshTokenTtlSeconds;

    // Build the session payload
    const payload: SessionPayload = {
      sid,
      provider: data.provider,
      providerUserId: data.providerUserId,
      email: data.email,
      walletAddress: data.walletAddress,
      isNewUser: data.isNewUser,
      v: 1,
      iat: now,
      exp: accessExpiresAt,
      iss: this.config.issuer,
      aud: this.config.audience,
    };

    // Sign access token
    const accessToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime(accessExpiresAt)
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .sign(this.secretKey);

    // Generate refresh token (opaque, stored server-side)
    const refreshToken = generateId();

    // Store session server-side
    ACTIVE_SESSIONS.set(sid, {
      refreshToken,
      payload,
      createdAt: now,
      expiresAt: refreshExpiresAt,
      accessExpiresAt: accessExpiresAt,
      revoked: false,
    });

    return {
      accessToken,
      refreshToken,
      payload,
      expiresAt: accessExpiresAt,
    };
  }

  // ─── Session Validation ───────────────────────────────────────────

  /**
   * Validate an access token.
   *
   * Checks JWT signature, expiration, issuer, audience, and
   * server-side revocation status.
   *
   * @param accessToken - The JWT access token to validate.
   * @returns Validation result with payload.
   */
  async validate(accessToken: string): Promise<SessionValidateResult> {
    try {
      const { payload } = await jwtVerify(accessToken, this.secretKey, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: ['HS256'],
      });

      const sessionPayload = payload as unknown as SessionPayload;

      // Check server-side revocation
      const session = ACTIVE_SESSIONS.get(sessionPayload.sid);
      if (session && session.revoked) {
        return { valid: false, error: 'Session has been revoked' };
      }

      return { valid: true, payload: sessionPayload };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { valid: false, error: `Token validation failed: ${message}` };
    }
  }

  // ─── Token Refresh ────────────────────────────────────────────────

  /**
   * Refresh an access token using a refresh token.
   *
   * Performs token rotation: issues new access and refresh tokens,
   * and revokes the old refresh token.
   *
   * @param refreshToken - The current refresh token.
   * @returns New session tokens and payload, or error.
   */
  async refresh(refreshToken: string): Promise<SessionCreateResult | { error: string }> {
    // Find the session by refresh token
    let foundSid: string | undefined;
    let foundSession: SessionRecord | undefined;

    for (const [sid, record] of ACTIVE_SESSIONS.entries()) {
      if (record.refreshToken === refreshToken) {
        foundSid = sid;
        foundSession = record;
        break;
      }
    }

    if (!foundSid || !foundSession) {
      return { error: 'Invalid refresh token' };
    }

    if (foundSession.revoked) {
      return { error: 'Session has been revoked' };
    }

    const now = Math.floor(Date.now() / 1000);
    if (now >= foundSession.expiresAt) {
      ACTIVE_SESSIONS.delete(foundSid);
      return { error: 'Refresh token has expired' };
    }

    // Revoke old session
    foundSession.revoked = true;

    // Create new session with rotated tokens
    const newSid = generateId();
    const accessExpiresAt = now + this.config.accessTokenTtlSeconds;
    const refreshExpiresAt = now + this.config.refreshTokenTtlSeconds;

    const newPayload: SessionPayload = {
      ...foundSession.payload,
      sid: newSid,
      v: (foundSession.payload.v || 1) + 1,
      iat: now,
      exp: accessExpiresAt,
      iss: this.config.issuer,
      aud: this.config.audience,
    };

    const accessToken = await new SignJWT(newPayload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime(accessExpiresAt)
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .sign(this.secretKey);

    const newRefreshToken = generateId();

    ACTIVE_SESSIONS.set(newSid, {
      refreshToken: newRefreshToken,
      payload: newPayload,
      createdAt: now,
      expiresAt: refreshExpiresAt,
      accessExpiresAt: accessExpiresAt,
      revoked: false,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      payload: newPayload,
      expiresAt: accessExpiresAt,
    };
  }

  // ─── Session Revocation ───────────────────────────────────────────

  /**
   * Revoke a session by its session ID.
   *
   * Marks the session as revoked but keeps it in the store
   * so that validation can still detect the revocation.
   *
   * @param sessionId - The session ID (sid claim from the JWT).
   * @returns True if the session was found and revoked.
   */
  async revoke(sessionId: string): Promise<boolean> {
    const session = ACTIVE_SESSIONS.get(sessionId);
    if (!session) return false;

    session.revoked = true;
    // Keep in map so validate() can check revoked flag
    return true;
  }

  /**
   * Revoke all sessions for a specific user.
   *
   * @param providerUserId - The provider-specific user ID.
   * @returns Number of sessions revoked.
   */
  async revokeAllForUser(providerUserId: string): Promise<number> {
    let count = 0;
    for (const [sid, record] of ACTIVE_SESSIONS.entries()) {
      if (record.payload.providerUserId === providerUserId) {
        record.revoked = true;
        ACTIVE_SESSIONS.delete(sid);
        count++;
      }
    }
    return count;
  }

  // ─── Browser localStorage Persistence ─────────────────────────────

  /**
   * Save session tokens to browser localStorage.
   *
   * Should be called after successful authentication.
   *
   * @param session - Session tokens to persist.
   * @param storage - Optional custom Storage interface (defaults to window.localStorage).
   */
  static saveToLocalStorage(
    session: { accessToken: string; refreshToken: string; expiresAt: number },
    storage?: Storage
  ): void {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!store) return;

    store.setItem(LOCAL_STORAGE_ACCESS_KEY, JSON.stringify({
      token: session.accessToken,
      expiresAt: session.expiresAt,
    }));
    store.setItem(LOCAL_STORAGE_REFRESH_KEY, session.refreshToken);
  }

  /**
   * Load session tokens from browser localStorage.
   *
   * Returns null if no session is stored or the access token has expired.
   *
   * @param storage - Optional custom Storage interface.
   * @returns Session data or null.
   */
  static loadFromLocalStorage(storage?: Storage): {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    expired: boolean;
  } | null {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!store) return null;

    const accessRaw = store.getItem(LOCAL_STORAGE_ACCESS_KEY);
    const refreshRaw = store.getItem(LOCAL_STORAGE_REFRESH_KEY);

    if (!accessRaw || !refreshRaw) return null;

    try {
      const access = JSON.parse(accessRaw) as { token: string; expiresAt: number };
      const expired = Date.now() / 1000 >= access.expiresAt;

      return {
        accessToken: access.token,
        refreshToken: refreshRaw,
        expiresAt: access.expiresAt,
        expired,
      };
    } catch {
      return null;
    }
  }

  /**
   * Clear session tokens from browser localStorage.
   *
   * @param storage - Optional custom Storage interface.
   */
  static clearFromLocalStorage(storage?: Storage): void {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!store) return;

    store.removeItem(LOCAL_STORAGE_ACCESS_KEY);
    store.removeItem(LOCAL_STORAGE_REFRESH_KEY);
  }

  // ─── Utility ──────────────────────────────────────────────────────

  /**
   * Get active session count (for debugging/monitoring).
   */
  get activeSessionCount(): number {
    return ACTIVE_SESSIONS.size;
  }

  /**
   * Clean up expired sessions (call periodically in production).
   *
   * Removes sessions whose access token and refresh token have both
   * expired, or that have been revoked for more than 1 hour.
   *
   * @returns Number of sessions cleaned up.
   */
  cleanup(): number {
    const now = Math.floor(Date.now() / 1000);
    const revokeGraceSeconds = 3600; // keep revoked sessions for 1h
    let count = 0;
    for (const [sid, record] of ACTIVE_SESSIONS.entries()) {
      // Remove if both tokens expired
      if (now >= record.accessExpiresAt && now >= record.expiresAt) {
        ACTIVE_SESSIONS.delete(sid);
        count++;
      } else if (record.revoked && now >= record.expiresAt + revokeGraceSeconds) {
        ACTIVE_SESSIONS.delete(sid);
        count++;
      }
    }
    return count;
  }
}

/**
 * Generate a random ID (hex-encoded, 32 bytes).
 */
function generateId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
