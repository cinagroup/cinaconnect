/**
 * CloudAuth — Reown Dashboard-compatible cloud authentication for Cinacoin SIWX.
 *
 * Provides session management, JWT token handling, and multi-device session sync
 * via the Cinacoin Dashboard API. Designed to integrate with the SIWX plugin system.
 *
 * @packageDocumentation
 */

import type { SIWXParams, SIWXResult } from './types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Cloud session representing an authenticated user session in the dashboard. */
export interface CloudSession {
  /** Unique session identifier. */
  id: string;
  /** SIWX project ID from Cinacoin Dashboard. */
  projectId: string;
  /** Wallet address that authenticated. */
  address: string;
  /** Chain identifier (CAIP-2 format). */
  chainId: string;
  /** ISO 8601 timestamp when the session was created. */
  createdAt: string;
  /** ISO 8601 timestamp when the session expires. */
  expiresAt: string;
  /** JWT access token. */
  accessToken: string;
  /** JWT refresh token. */
  refreshToken: string;
  /** Device identifier for multi-device sync. */
  deviceId: string;
  /** Arbitrary metadata attached to the session. */
  metadata?: Record<string, string>;
}

/** Status of a session verification. */
export interface VerifyResult {
  /** Whether the session is valid. */
  valid: boolean;
  /** The session object (if valid). */
  session?: CloudSession;
  /** Error message (if invalid). */
  error?: string;
}

/** Configuration for CloudAuth initialization. */
export interface CloudAuthConfig {
  /** Cinacoin Dashboard project ID. */
  projectId: string;
  /** Dashboard API base URL (default: `https://api.cinacoin.com/v1`). */
  apiUrl?: string;
  /** Auto-refresh tokens before expiry (default: true). */
  autoRefresh?: boolean;
  /** How many seconds before expiry to trigger refresh (default: 300). */
  refreshThresholdSec?: number;
  /** Custom fetch implementation (for SSR / polyfills). */
  fetch?: typeof fetch;
}

/** Events emitted by CloudAuth. */
export type CloudAuthEvent =
  | { type: 'login'; session: CloudSession }
  | { type: 'logout'; sessionId: string }
  | { type: 'sessionExpired'; sessionId: string }
  | { type: 'sessionRefreshed'; session: CloudSession }
  | { type: 'error'; error: Error };

/** Handler for CloudAuth events. */
export type CloudAuthEventHandler = (event: CloudAuthEvent) => void;

// ---------------------------------------------------------------------------
// CloudAuth
// ---------------------------------------------------------------------------

/**
 * CloudAuth manages authenticated sessions via the Cinacoin Dashboard API.
 *
 * It handles JWT token lifecycle (issue, refresh, revoke), multi-device session
 * synchronization, and integrates with the SIWX plugin system for cross-chain
 * authentication.
 *
 * @example
 * ```ts
 * import { CloudAuth } from '@cinacoin/siwx';
 *
 * const auth = new CloudAuth({ projectId: 'your-project-id' });
 * await auth.init();
 *
 * // After SIWX sign-in:
 * const session = await auth.createSession({
 *   address: '0x...',
 *   chainId: 'eip155:1',
 *   siwxResult: siwxResult,
 * });
 *
 * // Verify on subsequent requests:
 * const { valid } = await auth.verifySession();
 * ```
 */
export class CloudAuth {
  /** Project ID for the Cinacoin Dashboard. */
  readonly projectId: string;

  /** Dashboard API base URL. */
  readonly apiUrl: string;

  /** Whether auto-refresh is enabled. */
  readonly autoRefresh: boolean;

  /** Seconds before expiry to trigger a refresh. */
  readonly refreshThresholdSec: number;

  /** Active session (if any). */
  private _session: CloudSession | null = null;

  /** Registered event handlers. */
  private _handlers: Set<CloudAuthEventHandler> = new Set();

  /** Auto-refresh timer handle. */
  private _refreshTimer: ReturnType<typeof setTimeout> | null = null;

  /** Custom fetch implementation. */
  private _fetch: typeof fetch;

  /** SIWX verifier references for integration. */
  private _verifiers: Map<string, unknown> = new Map();

  constructor(config: CloudAuthConfig) {
    this.projectId = config.projectId;
    this.apiUrl = config.apiUrl ?? 'https://api.cinacoin.com/v1';
    this.autoRefresh = config.autoRefresh ?? true;
    this.refreshThresholdSec = config.refreshThresholdSec ?? 300;
    this._fetch = config.fetch ?? globalThis.fetch?.bind(globalThis) ?? this._nativeFetch;

    if (!config.projectId) {
      throw new Error('CloudAuth: projectId is required');
    }
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /**
   * Initialize the CloudAuth instance.
   *
   * Restores any persisted session from local storage and sets up auto-refresh
   * if enabled. Call this once during app startup.
   *
   * @returns The restored session, or `null` if no active session exists.
   */
  async init(): Promise<CloudSession | null> {
    // Attempt to restore from local storage
    const stored = this._loadSession();
    if (stored) {
      const now = new Date();
      const expires = new Date(stored.expiresAt);
      if (now < expires) {
        this._session = stored;
        if (this.autoRefresh) {
          this._scheduleRefresh(stored);
        }
        return stored;
      }
      // Expired — clear
      this._clearSession();
    }
    return null;
  }

  // -----------------------------------------------------------------------
  // Session CRUD
  // -----------------------------------------------------------------------

  /**
   * Create a new cloud session after successful SIWX authentication.
   *
   * Sends the SIWX signature and message to the Cinacoin Dashboard API
   * for server-side verification and JWT issuance.
   *
   * @param params - Session creation parameters.
   * @param params.address - Wallet address that authenticated.
   * @param params.chainId - CAIP-2 chain identifier.
   * @param params.siwxResult - SIWX verification result from the SIWX plugin.
   * @param params.deviceId - Device identifier for multi-device sync (auto-generated if omitted).
   * @param params.metadata - Optional session metadata.
   * @returns The created CloudSession.
   * @throws Error if the Dashboard API returns an error.
   */
  async createSession(params: {
    address: string;
    chainId: string;
    siwxResult: SIWXResult;
    deviceId?: string;
    metadata?: Record<string, string>;
  }): Promise<CloudSession> {
    const deviceId = params.deviceId ?? this._generateDeviceId();

    const response = await this._request('/auth/sessions', {
      method: 'POST',
      body: JSON.stringify({
        projectId: this.projectId,
        address: params.address,
        chainId: params.chainId,
        message: params.siwxResult.message,
        signature: params.siwxResult.signature,
        chainType: params.siwxResult.chainType,
        deviceId,
        metadata: params.metadata,
      }),
    });

    const data = await response.json() as {
      session: {
        id: string;
        address: string;
        chainId: string;
        createdAt: string;
        expiresAt: string;
        accessToken: string;
        refreshToken: string;
      };
    };

    const session: CloudSession = {
      id: data.session.id,
      projectId: this.projectId,
      address: data.session.address,
      chainId: data.session.chainId,
      createdAt: data.session.createdAt,
      expiresAt: data.session.expiresAt,
      accessToken: data.session.accessToken,
      refreshToken: data.session.refreshToken,
      deviceId,
      metadata: params.metadata,
    };

    this._session = session;
    this._saveSession(session);
    this._emit({ type: 'login', session });

    if (this.autoRefresh) {
      this._scheduleRefresh(session);
    }

    return session;
  }

  /**
   * Verify the current session.
   *
   * Checks the JWT access token validity against the Dashboard API. If the
   * token is expired and auto-refresh is enabled, attempts to refresh first.
   *
   * @returns VerifyResult with validity status and optional session.
   */
  async verifySession(): Promise<VerifyResult> {
    if (!this._session) {
      return { valid: false, error: 'No active session' };
    }

    // Check if token is expired
    const now = new Date();
    const expires = new Date(this._session.expiresAt);
    if (now >= expires) {
      if (this.autoRefresh) {
        try {
          await this._refreshToken();
        } catch (err) {
          this._emit({ type: 'sessionExpired', sessionId: this._session.id });
          this._session = null;
          this._clearSession();
          return { valid: false, error: 'Session expired and refresh failed' };
        }
      } else {
        this._emit({ type: 'sessionExpired', sessionId: this._session.id });
        return { valid: false, error: 'Session expired' };
      }
    }

    // Validate with dashboard
    try {
      const response = await this._request('/auth/sessions/verify', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: this._session.id,
          token: this._session.accessToken,
        }),
      });
      const data = await response.json() as { valid: boolean };

      if (!data.valid) {
        this._session = null;
        this._clearSession();
        return { valid: false, error: 'Server rejected session' };
      }

      return { valid: true, session: this._session };
    } catch (err) {
      return { valid: false, error: (err as Error).message };
    }
  }

  /**
   * Revoke the current session.
   *
   * Invalidates the session on the server and clears local state.
   *
   * @returns `true` if revocation succeeded.
   */
  async revokeSession(): Promise<boolean> {
    if (!this._session) {
      return true; // Already logged out
    }

    const sessionId = this._session.id;

    try {
      await this._request(`/auth/sessions/${sessionId}`, {
        method: 'DELETE',
      });
    } catch {
      // Best-effort — clear local state regardless
    }

    this._cancelRefresh();
    this._emit({ type: 'logout', sessionId });
    this._session = null;
    this._clearSession();
    return true;
  }

  // -----------------------------------------------------------------------
  // Multi-Device Sync
  // -----------------------------------------------------------------------

  /**
   * Sync sessions across devices for the same wallet address.
   *
   * Returns a list of active sessions for the authenticated address,
   * allowing the user to see and manage sessions on other devices.
   *
   * @param address - Wallet address to query sessions for.
   * @returns Array of active session summaries.
   */
  async listSessions(address: string): Promise<Array<{
    id: string;
    chainId: string;
    deviceId: string;
    createdAt: string;
    expiresAt: string;
    isCurrentDevice: boolean;
  }>> {
    const response = await this._request(
      `/auth/sessions?address=${encodeURIComponent(address)}&projectId=${this.projectId}`,
      { method: 'GET' }
    );
    const data = await response.json() as {
      sessions: Array<{
        id: string;
        chainId: string;
        deviceId: string;
        createdAt: string;
        expiresAt: string;
      }>;
    };

    return data.sessions.map((s) => ({
      ...s,
      isCurrentDevice: s.deviceId === this._session?.deviceId,
    }));
  }

  /**
   * Revoke a specific session by ID (useful for revoking other devices).
   *
   * @param sessionId - Session ID to revoke.
   */
  async revokeSessionById(sessionId: string): Promise<void> {
    await this._request(`/auth/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  // -----------------------------------------------------------------------
  // Token Refresh
  // -----------------------------------------------------------------------

  /**
   * Refresh the current session's access token using the refresh token.
   *
   * Called automatically before token expiry when auto-refresh is enabled.
   *
   * @returns The updated CloudSession with fresh tokens.
   */
  async refreshToken(): Promise<CloudSession> {
    return this._refreshToken();
  }

  private async _refreshToken(): Promise<CloudSession> {
    if (!this._session) {
      throw new Error('No active session to refresh');
    }

    const response = await this._request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({
        refreshToken: this._session.refreshToken,
        sessionId: this._session.id,
      }),
    });

    const data = await response.json() as {
      accessToken: string;
      refreshToken: string;
      expiresAt: string;
    };

    this._session = {
      ...this._session,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
    };

    this._saveSession(this._session);
    this._emit({ type: 'sessionRefreshed', session: this._session });
    this._scheduleRefresh(this._session);

    return this._session;
  }

  /** Schedule the next auto-refresh. */
  private _scheduleRefresh(session: CloudSession): void {
    this._cancelRefresh();
    const expiresAt = new Date(session.expiresAt).getTime();
    const now = Date.now();
    const msUntilExpiry = expiresAt - now;
    const refreshMs = Math.max(msUntilExpiry - this.refreshThresholdSec * 1000, 1000);

    this._refreshTimer = setTimeout(() => {
      this._refreshToken().catch((err) => {
        this._emit({
          type: 'error',
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });
    }, refreshMs);
  }

  private _cancelRefresh(): void {
    if (this._refreshTimer !== null) {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }
  }

  // -----------------------------------------------------------------------
  // Event System
  // -----------------------------------------------------------------------

  /**
   * Subscribe to CloudAuth events.
   *
   * @param handler - Callback invoked for every event.
   * @returns Unsubscribe function.
   */
  onEvent(handler: CloudAuthEventHandler): () => void {
    this._handlers.add(handler);
    return () => {
      this._handlers.delete(handler);
    };
  }

  private _emit(event: CloudAuthEvent): void {
    for (const handler of this._handlers) {
      try {
        handler(event);
      } catch {
        // Handler errors should not break the event pipeline
      }
    }
  }

  // -----------------------------------------------------------------------
  // SIWX Plugin Integration
  // -----------------------------------------------------------------------

  /**
   * Register a verifier for a specific chain namespace.
   *
   * Used to integrate CloudAuth with the SIWX verifier registry.
   *
   * @param namespace - Chain namespace (e.g., 'eip155', 'solana').
   * @param verifier - Verifier instance for the chain.
   */
  registerVerifier(namespace: string, verifier: unknown): void {
    this._verifiers.set(namespace, verifier);
  }

  /**
   * Get a registered verifier by namespace.
   *
   * @param namespace - Chain namespace.
   * @returns The verifier, or `undefined` if not registered.
   */
  getVerifier(namespace: string): unknown | undefined {
    return this._verifiers.get(namespace);
  }

  // -----------------------------------------------------------------------
  // Getters
  // -----------------------------------------------------------------------

  /** The currently active session, or `null`. */
  get session(): CloudSession | null {
    return this._session;
  }

  /** Convenience: whether a session is active. */
  get isAuthenticated(): boolean {
    return this._session !== null;
  }

  /** Convenience: the current access token (or `null`). */
  get accessToken(): string | null {
    return this._session?.accessToken ?? null;
  }

  // -----------------------------------------------------------------------
  // Persistence
  // -----------------------------------------------------------------------

  private _saveSession(session: CloudSession): void {
    try {
      const storage = this._getStorage();
      if (storage) {
        storage.setItem(
          `cinacoin:session:${this.projectId}`,
          JSON.stringify(session)
        );
      }
    } catch {
      // Storage unavailable (SSR, private mode) — session is in-memory only
    }
  }

  private _loadSession(): CloudSession | null {
    try {
      const storage = this._getStorage();
      if (!storage) return null;
      const raw = storage.getItem(`cinacoin:session:${this.projectId}`);
      if (!raw) return null;
      return JSON.parse(raw) as CloudSession;
    } catch {
      return null;
    }
  }

  private _clearSession(): void {
    try {
      const storage = this._getStorage();
      if (storage) {
        storage.removeItem(`cinacoin:session:${this.projectId}`);
      }
    } catch {
      // Ignore
    }
  }

  private _getStorage(): Storage | null {
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // HTTP
  // -----------------------------------------------------------------------

  private async _request(path: string, init: RequestInit): Promise<Response> {
    const url = `${this.apiUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Project-Id': this.projectId,
      ...(init.headers as Record<string, string> | undefined),
    };

    // Attach access token if we have one and the endpoint requires auth
    if (this._session?.accessToken && !path.startsWith('/auth/')) {
      headers['Authorization'] = `Bearer ${this._session.accessToken}`;
    }

    const response = await this._fetch(url, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `CloudAuth API error ${response.status}: ${body || response.statusText}`
      );
    }

    return response;
  }

  /** Fallback fetch for environments without globalThis.fetch. */
  private _nativeFetch(_url: string, _init: RequestInit): Promise<Response> {
    throw new Error(
      'CloudAuth: fetch is not available. Provide a custom fetch implementation in CloudAuthConfig.'
    );
  }

  // -----------------------------------------------------------------------
  // Utilities
  // -----------------------------------------------------------------------

  /** Generate a unique device identifier. */
  private _generateDeviceId(): string {
    const bytes = new Uint8Array(16);
    const crypto = globalThis.crypto;
    if (crypto?.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      // Fallback for Node.js environments
      for (let i = 0; i < 16; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
}

// ---------------------------------------------------------------------------
// React Hook (defined inline to avoid circular dependencies with cloud-hooks.ts)
// ---------------------------------------------------------------------------

/**
 * React hook for cloud session management.
 *
 * Provides a reactive interface to CloudAuth lifecycle, session CRUD, and
 * event subscriptions. Use this in React components to manage authentication
 * state.
 *
 * @param config - CloudAuth configuration (passed to the CloudAuth constructor).
 * @returns Object containing session state, actions, loading status, and errors.
 *
 * @example
 * ```tsx
 * import { useCloudAuth } from '@cinacoin/siwx';
 *
 * function AuthButton() {
 *   const { session, isLoading, error, createSession, revokeSession } = useCloudAuth({
 *     projectId: 'your-project-id',
 *   });
 *
 *   if (isLoading) return <p>Loading…</p>;
 *   if (error) return <p>Error: {error.message}</p>;
 *
 *   if (session) {
 *     return (
 *       <button onClick={() => revokeSession()}>
 *         Connected: {session.address}
 *       </button>
 *     );
 *   }
 *
 *   return <button onClick={() => signIn()}>Connect Wallet</button>;
 * }
 * ```
 */
export function useCloudAuth(config: CloudAuthConfig): {
  /** Current active session, or `null`. */
  session: CloudSession | null;
  /** Create a new session after SIWX sign-in. */
  createSession: (params: Parameters<CloudAuth['createSession']>[0]) => Promise<CloudSession>;
  /** Verify the current session. */
  verifySession: () => Promise<VerifyResult>;
  /** Revoke the current session. */
  revokeSession: () => Promise<boolean>;
  /** Whether initialization is in progress. */
  isLoading: boolean;
  /** Last error, if any. */
  error: Error | null;
  /** List sessions for the current address. */
  listSessions: (address: string) => ReturnType<CloudAuth['listSessions']>;
  /** Access token for API calls. */
  accessToken: string | null;
} {
  // NOTE: This is a type-safe stub. The actual React hook implementation
  // lives in `cloud-hooks.ts` with proper useState / useEffect bindings.
  // This export ensures the symbol is available for non-React consumers
  // and for import resolution in bundlers.
  throw new Error(
    'useCloudAuth requires React. Import from cloud-hooks.ts for the full implementation:\n' +
    "  import { useCloudAuth } from '@cinacoin/siwx/cloud-hooks';"
  );
}
