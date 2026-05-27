/**
 * WalletConnect v2 Client.
 *
 * Full client implementation that unifies pairing, session management,
 * relay connection, and request/response handling into a single
 * easy-to-use API. Compatible with the Reown/WalletConnect v2 API surface.
 */
import { EventEmitter } from '@cinacoin/core-sdk';
import type { AppMetadata, RequiredNamespace } from '@cinacoin/core-sdk';
import type { Pairing, Session, SessionNamespace, RelayConfig } from './types.js';
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
/** Extended error with WC v2 error code. */
export declare class WcClientError extends Error {
    /** WC v2 error code. */
    code: number;
    /** Optional error data. */
    data?: unknown;
    constructor(code: number, message: string, data?: unknown);
}
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
export declare class WalletConnectClient extends EventEmitter {
    /** SDK version. */
    static readonly VERSION = "0.1.0";
    private config;
    private sessionManager;
    private relay;
    private initialized;
    private pairings;
    private eventListeners;
    constructor(config: WalletConnectClientConfig);
    /**
     * Initialize the client (connect to relay).
     *
     * Called automatically on first `connect()` call, but can be
     * called explicitly for early initialization.
     */
    init(): Promise<void>;
    /**
     * Whether the client is initialized and connected to the relay.
     */
    isInitialized(): boolean;
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
    connect(options?: {
        uri?: string;
    }): Promise<string | Session>;
    /**
     * Disconnect from the current session.
     *
     * Sends disconnect notifications, unsubscribes, and cleans up state.
     */
    disconnect(): Promise<void>;
    /**
     * Get all active pairings.
     */
    getPairings(): Pairing[];
    /**
     * Get a pairing by topic.
     */
    getPairing(topic: string): Pairing | undefined;
    /**
     * Delete a pairing by topic.
     */
    deletePairing(topic: string): Promise<void>;
    /**
     * Send a pairing ping to check if the peer is alive.
     */
    pingPairing(topic: string, timeoutMs?: number): Promise<boolean>;
    /**
     * Get the currently active session.
     */
    getSession(): Session | null;
    /**
     * Whether there's an active session.
     */
    isConnected(): boolean;
    /**
     * Extend the session TTL.
     *
     * @param newExpiry - New expiry timestamp (seconds from epoch).
     */
    extendSession(newExpiry: number): Promise<void>;
    /**
     * Update session namespaces.
     *
     * @param namespaces - Updated namespaces.
     */
    updateSession(namespaces: Record<string, SessionNamespace>): Promise<void>;
    /**
     * Emit a session notification event.
     *
     * @param chainId - CAIP-2 chain ID.
     * @param name - Event name.
     * @param data - Event data.
     */
    emitSessionEvent(chainId: string, name: string, data: unknown): Promise<void>;
    /**
     * Send a session ping to check if the peer is alive.
     */
    pingSession(timeoutMs?: number): Promise<boolean>;
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
    request<T = unknown>(request: {
        method: string;
        params?: unknown;
    }): Promise<T>;
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
    request<T = unknown>(method: string, params?: unknown): Promise<T>;
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
    on(event: string, handler: (...args: unknown[]) => void): void;
    /**
     * Register a one-time event listener.
     */
    once(event: string, handler: (...args: unknown[]) => void): void;
    /**
     * Remove an event listener.
     */
    off(event: string, handler: (...args: unknown[]) => void): void;
    /**
     * Remove all event listeners.
     */
    removeAllListeners(event?: string): void;
    /**
     * Clean up all resources.
     *
     * Disconnects session, deletes pairings, and closes relay connection.
     */
    cleanup(): Promise<void>;
    /**
     * Validate a WalletConnect v2 URI.
     */
    static isValidUri(uri: string): boolean;
    /**
     * Parse a WalletConnect v2 URI into its components.
     */
    static parseUri(uri: string): import("./types.js").ParsedWcUri;
    /**
     * Build default required namespaces for a set of chains.
     */
    static getDefaultNamespaces(config?: {
        chains?: string[];
        methods?: string[];
        events?: string[];
    }): Record<string, RequiredNamespace>;
}
//# sourceMappingURL=client.d.ts.map