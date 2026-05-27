/**
 * WalletConnect v2 Client.
 *
 * Full client implementation that unifies pairing, session management,
 * relay connection, and request/response handling into a single
 * easy-to-use API. Compatible with the Reown/WalletConnect v2 API surface.
 */

import { EventEmitter } from '@cinacoin/core-sdk';
import type { AppMetadata, RequiredNamespace } from '@cinacoin/core-sdk';
import type {
  Pairing,
  Session,
  WcClientEvent,
  SessionProposal,
  SessionNamespace,
  SessionNotification,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  RelayConfig,
} from './types.js';
import { WcRelay } from './relay.js';
import { WcSessionManager } from './session.js';
import { parseWcUri, isValidWcUri, createPairing, approvePairing, deletePairing, pairingPing } from './pairing.js';
import { getDefaultRequiredNamespaces } from './methods.js';

// ============================================================
// Client Configuration
// ============================================================

/** Configuration for WalletConnectClient. */
export interface WalletConnectClientConfig {
  /** Relay server URL. */
  relayUrl: string;
  /** dApp metadata (name, description, url, icons). */
  metadata: AppMetadata;
  /** Chains to request (CAIP-2, e.g., 'eip155:1'). */
  chains?: string[];
  /** Methods to request (defaults to all standard EVM methods). */
  methods?: string[];
  /** Events to subscribe to (defaults to standard EVM events). */
  events?: string[];
  /** Session TTL in seconds (default: 7 days). */
  sessionTtl?: number;
  /** Relay connection settings. */
  relay?: Pick<RelayConfig, 'connectionTimeout' | 'heartbeatInterval' | 'maxReconnectAttempts'>;
}

// ============================================================
// WC Client Error
// ============================================================

/** Extended error with WC v2 error code. */
export class WcClientError extends Error {
  /** WC v2 error code. */
  public code: number;
  /** Optional error data. */
  public data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'WcClientError';
    this.code = code;
    this.data = data;
  }
}

// ============================================================
// WalletConnectClient
// ============================================================

/**
 * WalletConnect v2 client — the main entry point for dApps.
 *
 * Provides a unified API for:
 * - Initializing the client
 * - Creating pairings (QR codes / URIs)
 * - Connecting via URI scan
 * - Sending JSON-RPC requests
 * - Managing sessions (extend, update, disconnect)
 * - Listening for events (proposals, updates, notifications)
 *
 * @example
 * ```ts
 * const client = new WalletConnectClient({
 *   relayUrl: 'wss://relay.example.com',
 *   metadata: {
 *     name: 'My dApp',
 *     description: 'A decentralized app',
 *     url: 'https://mydapp.com',
 *     icons: ['https://mydapp.com/icon.png'],
 *   },
 *   chains: ['eip155:1', 'eip155:137'],
 * });
 *
 * // Create a pairing QR code
 * const uri = await client.connect();
 * console.log(uri); // wc:abc123...@2?...
 *
 * // Or connect from a scanned URI
 * const session = await client.connect({ uri: 'wc:...' });
 *
 * // Send a request
 * const accounts = await client.request('eth_accounts', []);
 *
 * // Listen for events
 * client.on('session_proposal', (proposal) => { ... });
 * client.on('connected', (session) => { ... });
 * ```
 */
export class WalletConnectClient extends EventEmitter {
  /** SDK version. */
  static readonly VERSION = '0.1.0';

  private config: WalletConnectClientConfig;
  private sessionManager: WcSessionManager | null = null;
  private relay: WcRelay | null = null;
  private initialized = false;
  private pairings: Map<string, Pairing> = new Map();
  private eventListeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  constructor(config: WalletConnectClientConfig) {
    super();
    this.config = config;
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  /**
   * Initialize the client (connect to relay).
   *
   * Called automatically on first `connect()` call, but can be
   * called explicitly for early initialization.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    this.relay = new WcRelay({
      url: this.config.relayUrl,
      ...this.config.relay,
    });
    await this.relay.connect();
    this.initialized = true;

    this.emit('wcEvent', { type: 'connected' } as WcClientEvent);
  }

  /**
   * Whether the client is initialized and connected to the relay.
   */
  isInitialized(): boolean {
    return this.initialized && this.relay?.isConnected() === true;
  }

  // ============================================================
  // Connection
  // ============================================================

  /**
   * Connect to a wallet.
   *
   * If no options are provided, creates a new pairing and returns
   * the WC URI (for QR code display).
   *
   * If a URI is provided, connects using that URI and returns the
   * established session.
   *
   * @param options - Optional connection parameters.
   * @returns WC URI string (if creating pairing) or Session (if connecting via URI).
   */
  async connect(options?: { uri?: string }): Promise<string | Session> {
    await this.init();

    if (options?.uri) {
      // Connect via existing URI
      if (!isValidWcUri(options.uri)) {
        throw new WcClientError(1000, 'Invalid WalletConnect URI');
      }

      this.sessionManager = new WcSessionManager({
        relayUrl: this.config.relayUrl,
        metadata: this.config.metadata,
        requiredChains: this.config.chains,
        requiredMethods: this.config.methods,
        requiredEvents: this.config.events,
        sessionTtl: this.config.sessionTtl,
      });

      // Forward events from session manager
      this.sessionManager.on('wcEvent', (event: WcClientEvent) => {
        this.emit('wcEvent', event);
      });

      const session = await this.sessionManager.connectWithUri(options.uri);

      // Store pairing info
      const parsed = parseWcUri(options.uri);
      this.pairings.set(parsed.topic, {
        topic: parsed.topic,
        uri: options.uri,
        active: true,
        expiry: Date.now() + 300_000,
        symKey: parsed.symKey,
      });

      return session;
    }

    // Create new pairing
    this.sessionManager = new WcSessionManager({
      relayUrl: this.config.relayUrl,
      metadata: this.config.metadata,
      requiredChains: this.config.chains,
      requiredMethods: this.config.methods,
      requiredEvents: this.config.events,
      sessionTtl: this.config.sessionTtl,
    });

    this.sessionManager.on('wcEvent', (event: WcClientEvent) => {
      this.emit('wcEvent', event);
    });

    const uri = await this.sessionManager.initiatePairing();

    // Store pairing
    const parsed = parseWcUri(uri);
    this.pairings.set(parsed.topic, {
      topic: parsed.topic,
      uri,
      active: true,
      expiry: Date.now() + 300_000,
      symKey: parsed.symKey,
    });

    return uri;
  }

  /**
   * Disconnect from the current session.
   *
   * Sends disconnect notifications, unsubscribes, and cleans up state.
   */
  async disconnect(): Promise<void> {
    if (this.sessionManager) {
      await this.sessionManager.disconnect();
      this.sessionManager = null;
    }

    // Mark all pairings as inactive
    for (const [topic, pairing] of this.pairings) {
      this.pairings.set(topic, { ...pairing, active: false });
    }

    if (this.relay) {
      this.relay.disconnect();
      this.relay = null;
    }

    this.initialized = false;
    this.emit('wcEvent', { type: 'disconnected', reason: 'User disconnected' } as WcClientEvent);
  }

  // ============================================================
  // Pairing management
  // ============================================================

  /**
   * Get all active pairings.
   */
  getPairings(): Pairing[] {
    return Array.from(this.pairings.values()).filter((p) => p.active);
  }

  /**
   * Get a pairing by topic.
   */
  getPairing(topic: string): Pairing | undefined {
    return this.pairings.get(topic);
  }

  /**
   * Delete a pairing by topic.
   */
  async deletePairing(topic: string): Promise<void> {
    const pairing = this.pairings.get(topic);
    if (!pairing || !pairing.symKey || !this.relay) return;

    await deletePairing(this.relay, topic, pairing.symKey);
    this.pairings.delete(topic);
    this.emit('wcEvent', { type: 'pairing_delete', topic } as WcClientEvent);
  }

  /**
   * Send a pairing ping to check if the peer is alive.
   */
  async pingPairing(topic: string, timeoutMs?: number): Promise<boolean> {
    const pairing = this.pairings.get(topic);
    if (!pairing || !pairing.symKey || !this.relay) return false;

    return pairingPing(this.relay, topic, pairing.symKey, timeoutMs);
  }

  // ============================================================
  // Session management
  // ============================================================

  /**
   * Get the currently active session.
   */
  getSession(): Session | null {
    return this.sessionManager?.getSession() ?? null;
  }

  /**
   * Whether there's an active session.
   */
  isConnected(): boolean {
    return this.sessionManager?.isConnected() ?? false;
  }

  /**
   * Extend the session TTL.
   *
   * @param newExpiry - New expiry timestamp (seconds from epoch).
   */
  async extendSession(newExpiry: number): Promise<void> {
    if (!this.sessionManager) throw new WcClientError(5000, 'No active session');
    await this.sessionManager.extendSession(newExpiry);
  }

  /**
   * Update session namespaces.
   *
   * @param namespaces - Updated namespaces.
   */
  async updateSession(namespaces: Record<string, SessionNamespace>): Promise<void> {
    if (!this.sessionManager) throw new WcClientError(5000, 'No active session');
    await this.sessionManager.updateSession(namespaces);
  }

  /**
   * Emit a session notification event.
   *
   * @param chainId - CAIP-2 chain ID.
   * @param name - Event name.
   * @param data - Event data.
   */
  async emitSessionEvent(chainId: string, name: string, data: unknown): Promise<void> {
    if (!this.sessionManager) throw new WcClientError(5000, 'No active session');
    await this.sessionManager.emitSessionEvent(chainId, name, data);
  }

  /**
   * Send a session ping to check if the peer is alive.
   */
  async pingSession(timeoutMs?: number): Promise<boolean> {
    if (!this.sessionManager) return false;
    return this.sessionManager.sessionPing(timeoutMs);
  }

  // ============================================================
  // JSON-RPC requests
  // ============================================================

  /**
   * Send a JSON-RPC request to the connected wallet.
   *
   * @param request - JSON-RPC request object.
   * @returns Promise resolving with the wallet's response.
   *
   * @example
   * ```ts
   * const result = await client.request({
   *   method: 'eth_accounts',
   *   params: [],
   * });
   * ```
   */
  async request<T = unknown>(request: { method: string; params?: unknown }): Promise<T>;

  /**
   * Send a JSON-RPC request (shorthand).
   *
   * @param method - RPC method name.
   * @param params - Method parameters.
   * @returns Promise resolving with the wallet's response.
   *
   * @example
   * ```ts
   * const accounts = await client.request('eth_accounts', []);
   * ```
   */
  async request<T = unknown>(method: string, params?: unknown): Promise<T>;

  async request<T = unknown>(
    methodOrRequest: string | { method: string; params?: unknown },
    params?: unknown,
  ): Promise<T> {
    if (!this.sessionManager) {
      throw new WcClientError(5000, 'No active session — connect first');
    }

    if (typeof methodOrRequest === 'string') {
      return this.sessionManager.request<T>(methodOrRequest, params);
    }

    return this.sessionManager.request<T>(methodOrRequest.method, methodOrRequest.params);
  }

  // ============================================================
  // Events
  // ============================================================

  /**
   * Register an event listener.
   *
   * Supported events:
   * - `session_proposal` — Incoming session proposal
   * - `session_approved` — Session was approved
   * - `session_update` — Session namespaces updated
   * - `session_delete` — Session was deleted
   * - `session_extend` — Session TTL extended
   * - `session_notification` — Wallet emitted an event
   * - `pairing_created` — New pairing created
   * - `pairing_delete` — Pairing was deleted
   * - `connected` — Session established (alias for session_approved)
   * - `disconnected` — Session disconnected
   * - `error` — Error occurred
   */
  on(event: string, handler: (...args: unknown[]) => void): void {
    super.on(event, handler);
  }

  /**
   * Register a one-time event listener.
   */
  once(event: string, handler: (...args: unknown[]) => void): void {
    super.once(event, handler);
  }

  /**
   * Remove an event listener.
   */
  off(event: string, handler: (...args: unknown[]) => void): void {
    super.off(event, handler);
  }

  /**
   * Remove all event listeners.
   */
  removeAllListeners(event?: string): void {
    super.removeAllListeners(event);
  }

  // ============================================================
  // Cleanup
  // ============================================================

  /**
   * Clean up all resources.
   *
   * Disconnects session, deletes pairings, and closes relay connection.
   */
  async cleanup(): Promise<void> {
    await this.disconnect();
    this.pairings.clear();
    this.removeAllListeners();
  }

  // ============================================================
  // Static helpers
  // ============================================================

  /**
   * Validate a WalletConnect v2 URI.
   */
  static isValidUri(uri: string): boolean {
    return isValidWcUri(uri);
  }

  /**
   * Parse a WalletConnect v2 URI into its components.
   */
  static parseUri(uri: string) {
    return parseWcUri(uri);
  }

  /**
   * Build default required namespaces for a set of chains.
   */
  static getDefaultNamespaces(config?: {
    chains?: string[];
    methods?: string[];
    events?: string[];
  }): Record<string, RequiredNamespace> {
    return getDefaultRequiredNamespaces(config);
  }
}
