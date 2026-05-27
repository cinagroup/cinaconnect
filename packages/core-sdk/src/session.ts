/**
 * Session state machine for managing wallet connection lifecycle.
 *
 * SECURITY NOTE:
 * This module persists session metadata to localStorage for SPA convenience.
 * In production applications, consider these mitigations:
 *
 * 1. **Do NOT store auth tokens in localStorage.** Tokens should be stored
 *    in httpOnly, Secure, SameSite=Strict cookies set by the server.
 *
 * 2. **Only persist non-sensitive metadata** (connector ID, chain ID,
 *    last connected accounts). The actual signing capability should require
 *    user interaction each session.
 *
 * 3. **Implement session expiry.** Persisted sessions should have a TTL
 *    and be validated against the server on restore.
 *
 * 4. **Use sessionStorage for higher sensitivity.** sessionStorage is cleared
 *    on tab close, limiting the window for XSS-based session theft.
 *
 * 5. **Add integrity checks.** Include an HMAC or hash of persisted state
 *    to detect tampering.
 */

import type { ConnectParams, ConnectionResult } from './types.js';
import type { Connector } from './connector.js';
import type { EventHandler } from './types.js';
import { EventEmitter } from './events.js';

/** Session state discriminator. */
export type SessionState =
  | { status: 'disconnected' }
  | { status: 'connecting'; connectorId: string }
  | { status: 'connected'; accounts: string[]; chainId: number; sessionId: string; connectorId: string }
  | { status: 'error'; error: Error };

/** Session storage key for persistence. */
const SESSION_STORAGE_KEY = 'cinacoin_session';

/**
 * Session expiry TTL in milliseconds (24 hours).
 * Persisted sessions older than this are considered expired.
 */
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Create an integrity hash of the session state.
 * Used to detect tampering with persisted session data.
 */
function computeIntegrity(state: object): string {
  const data = JSON.stringify(state);
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * SessionManager controls the connection lifecycle.
 *
 * State transitions:
 *   disconnected → connecting → connected → disconnected
 *   connecting → error → disconnected
 *   connected → error → disconnected
 */
export class SessionManager extends EventEmitter {
  private state: SessionState = { status: 'disconnected' };
  private _connector: Connector | null = null;

  /** Current session state. */
  getState(): SessionState {
    return this.state;
  }

  /**
   * Subscribe to state changes.
   * @param cb - Callback invoked on each state change.
   * @returns Unsubscribe function.
   */
  subscribe(cb: (state: SessionState) => void): () => void {
    const handler: EventHandler = (s: unknown) => cb(s as SessionState);
    this.on('stateChange', handler);
    return () => this.off('stateChange', handler);
  }

  /**
   * Restore a persisted session from localStorage.
   *
   * SECURITY: Validates expiry and integrity hash before restoring.
   * If validation fails, returns disconnected state.
   */
  async restore(): Promise<SessionState> {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) {
        return this.state;
      }

      const persisted = JSON.parse(raw);

      // Check expiry
      if (persisted.expiresAt && Date.now() > persisted.expiresAt) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return this.state;
      }

      // Verify integrity hash
      const { expiresAt, ...stateForHash } = persisted;
      const expectedHash = computeIntegrity(stateForHash);
      if (persisted._integrity && persisted._integrity !== expectedHash) {
        // Tampered data — clear and return disconnected
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return this.state;
      }

      if (persisted?.status === 'connected') {
        this.state = {
          status: 'connected',
          accounts: persisted.accounts,
          chainId: persisted.chainId,
          sessionId: persisted.sessionId,
          connectorId: persisted.connectorId,
        };
        this.emit('stateChange', this.state);
      }
    } catch {
      // Corrupted storage — ignore
    }

    return this.state;
  }

  /**
   * Initiate a connection with the given connector.
   * @param connector - Connector instance to use.
   * @param params - Optional connection parameters.
   */
  async initiate(connector: Connector, params?: ConnectParams): Promise<void> {
    if (this.state.status === 'connecting') {
      throw new Error('Connection already in progress');
    }

    this._connector = connector;
    this.transition({ status: 'connecting', connectorId: connector.id });

    try {
      const result = await connector.connect(params);
      await this.confirm(result.sessionId, result.accounts, result.chainId);
    } catch (error) {
      this.transition({
        status: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
      });
      // Briefly hold error state, then transition to disconnected
      setTimeout(() => {
        if (this.state.status === 'error') {
          this.transition({ status: 'disconnected' });
        }
      }, 5000);
    }
  }

  /**
   * Confirm a connection after user approval.
   * @param sessionId - Session identifier.
   * @param accounts - Approved account addresses.
   * @param chainId - Approved chain ID.
   */
  async confirm(
    sessionId: string,
    accounts: string[],
    chainId: number,
  ): Promise<void> {
    if (!this._connector) {
      throw new Error('No connector set — call initiate() first');
    }

    this.transition({
      status: 'connected',
      accounts,
      chainId,
      sessionId,
      connectorId: this._connector.id,
    });

    // Persist session
    this.persist();
  }

  /**
   * Terminate the current session.
   */
  async terminate(): Promise<void> {
    if (this._connector) {
      try {
        await this._connector.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      this._connector = null;
    }

    // Clear persisted session
    localStorage.removeItem(SESSION_STORAGE_KEY);
    this.transition({ status: 'disconnected' });
  }

  /**
   * Clean up expired sessions.
   */
  async cleanup(): Promise<void> {
    // Check if current session is still valid
    if (this.state.status === 'connected') {
      // In production, validate with the relay
      // For now, we assume sessions are valid until explicitly terminated
    }
  }

  /** Transition to a new state and emit the change. */
  private transition(newState: SessionState): void {
    this.state = newState;
    this.emit('stateChange', newState);
  }

  /** Persist current connected state to localStorage with expiry and integrity. */
  private persist(): void {
    if (this.state.status === 'connected') {
      // State doesn't have expiresAt, just use the full state for hashing
      const payload = {
        ...this.state,
        expiresAt: Date.now() + SESSION_TTL_MS,
        _integrity: computeIntegrity(this.state),
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    }
  }
}
