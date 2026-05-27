/**
 * WalletConnect v2 Client.
 *
 * Full client implementation that unifies pairing, session management,
 * relay connection, and request/response handling into a single
 * easy-to-use API. Compatible with the Reown/WalletConnect v2 API surface.
 */
import { EventEmitter } from '@cinacoin/core-sdk';
import { WcRelay } from './relay.js';
import { WcSessionManager } from './session.js';
import { parseWcUri, isValidWcUri, deletePairing, pairingPing } from './pairing.js';
import { getDefaultRequiredNamespaces } from './methods.js';
// ============================================================
// WC Client Error
// ============================================================
/** Extended error with WC v2 error code. */
export class WcClientError extends Error {
    constructor(code, message, data) {
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
    constructor(config) {
        super();
        this.sessionManager = null;
        this.relay = null;
        this.initialized = false;
        this.pairings = new Map();
        this.eventListeners = new Map();
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
    async init() {
        if (this.initialized)
            return;
        this.relay = new WcRelay({
            url: this.config.relayUrl,
            ...this.config.relay,
        });
        await this.relay.connect();
        this.initialized = true;
        this.emit('wcEvent', { type: 'connected' });
    }
    /**
     * Whether the client is initialized and connected to the relay.
     */
    isInitialized() {
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
    async connect(options) {
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
            this.sessionManager.on('wcEvent', (event) => {
                this.emit('wcEvent', event);
            });
            const session = await this.sessionManager.connectWithUri(options.uri);
            // Store pairing info
            const parsed = parseWcUri(options.uri);
            this.pairings.set(parsed.topic, {
                topic: parsed.topic,
                uri: options.uri,
                active: true,
                expiry: Date.now() + 300000,
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
        this.sessionManager.on('wcEvent', (event) => {
            this.emit('wcEvent', event);
        });
        const uri = await this.sessionManager.initiatePairing();
        // Store pairing
        const parsed = parseWcUri(uri);
        this.pairings.set(parsed.topic, {
            topic: parsed.topic,
            uri,
            active: true,
            expiry: Date.now() + 300000,
            symKey: parsed.symKey,
        });
        return uri;
    }
    /**
     * Disconnect from the current session.
     *
     * Sends disconnect notifications, unsubscribes, and cleans up state.
     */
    async disconnect() {
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
        this.emit('wcEvent', { type: 'disconnected', reason: 'User disconnected' });
    }
    // ============================================================
    // Pairing management
    // ============================================================
    /**
     * Get all active pairings.
     */
    getPairings() {
        return Array.from(this.pairings.values()).filter((p) => p.active);
    }
    /**
     * Get a pairing by topic.
     */
    getPairing(topic) {
        return this.pairings.get(topic);
    }
    /**
     * Delete a pairing by topic.
     */
    async deletePairing(topic) {
        const pairing = this.pairings.get(topic);
        if (!pairing || !pairing.symKey || !this.relay)
            return;
        await deletePairing(this.relay, topic, pairing.symKey);
        this.pairings.delete(topic);
        this.emit('wcEvent', { type: 'pairing_delete', topic });
    }
    /**
     * Send a pairing ping to check if the peer is alive.
     */
    async pingPairing(topic, timeoutMs) {
        const pairing = this.pairings.get(topic);
        if (!pairing || !pairing.symKey || !this.relay)
            return false;
        return pairingPing(this.relay, topic, pairing.symKey, timeoutMs);
    }
    // ============================================================
    // Session management
    // ============================================================
    /**
     * Get the currently active session.
     */
    getSession() {
        return this.sessionManager?.getSession() ?? null;
    }
    /**
     * Whether there's an active session.
     */
    isConnected() {
        return this.sessionManager?.isConnected() ?? false;
    }
    /**
     * Extend the session TTL.
     *
     * @param newExpiry - New expiry timestamp (seconds from epoch).
     */
    async extendSession(newExpiry) {
        if (!this.sessionManager)
            throw new WcClientError(5000, 'No active session');
        await this.sessionManager.extendSession(newExpiry);
    }
    /**
     * Update session namespaces.
     *
     * @param namespaces - Updated namespaces.
     */
    async updateSession(namespaces) {
        if (!this.sessionManager)
            throw new WcClientError(5000, 'No active session');
        await this.sessionManager.updateSession(namespaces);
    }
    /**
     * Emit a session notification event.
     *
     * @param chainId - CAIP-2 chain ID.
     * @param name - Event name.
     * @param data - Event data.
     */
    async emitSessionEvent(chainId, name, data) {
        if (!this.sessionManager)
            throw new WcClientError(5000, 'No active session');
        await this.sessionManager.emitSessionEvent(chainId, name, data);
    }
    /**
     * Send a session ping to check if the peer is alive.
     */
    async pingSession(timeoutMs) {
        if (!this.sessionManager)
            return false;
        return this.sessionManager.sessionPing(timeoutMs);
    }
    async request(methodOrRequest, params) {
        if (!this.sessionManager) {
            throw new WcClientError(5000, 'No active session — connect first');
        }
        if (typeof methodOrRequest === 'string') {
            return this.sessionManager.request(methodOrRequest, params);
        }
        return this.sessionManager.request(methodOrRequest.method, methodOrRequest.params);
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
    on(event, handler) {
        super.on(event, handler);
    }
    /**
     * Register a one-time event listener.
     */
    once(event, handler) {
        super.once(event, handler);
    }
    /**
     * Remove an event listener.
     */
    off(event, handler) {
        super.off(event, handler);
    }
    /**
     * Remove all event listeners.
     */
    removeAllListeners(event) {
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
    async cleanup() {
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
    static isValidUri(uri) {
        return isValidWcUri(uri);
    }
    /**
     * Parse a WalletConnect v2 URI into its components.
     */
    static parseUri(uri) {
        return parseWcUri(uri);
    }
    /**
     * Build default required namespaces for a set of chains.
     */
    static getDefaultNamespaces(config) {
        return getDefaultRequiredNamespaces(config);
    }
}
/** SDK version. */
WalletConnectClient.VERSION = '0.1.0';
//# sourceMappingURL=client.js.map