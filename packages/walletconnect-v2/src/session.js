/**
 * Session management for WalletConnect v2.
 *
 * Handles the full session lifecycle: propose, approve, reject, update,
 * extend, delete, emit (notifications). Uses X25519 key exchange for
 * establishing an encrypted session channel on top of pairing.
 */
import { EventEmitter } from '@cinacoin/core-sdk';
import { generateKeypair, sharedSecret, bytesToHex, hexToBytes, encrypt, decrypt } from './crypto.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { WcRelay } from './relay.js';
import { createPairing, parseWcUri, encryptPairingMessage, decryptPairingMessage, deletePairing } from './pairing.js';
import { getDefaultRequiredNamespaces } from './methods.js';
/**
 * WcSessionManager handles the WC v2 session lifecycle.
 *
 * Flow:
 * 1. Create a pairing (QR code or URI)
 * 2. Wait for wallet to scan/connect
 * 3. Send session proposal over pairing channel
 * 4. Receive session proposal response
 * 5. Derive session topic and key
 * 6. Subscribe to session topic for ongoing communication
 */
export class WcSessionManager extends EventEmitter {
    constructor(config) {
        super();
        this.relay = null;
        this.activeSession = null;
        this.pairingTopic = null;
        this.pairingSymKey = null;
        this.sessionKeypair = generateKeypair();
        /** Peer's session public key (hex), set after proposal response. */
        this.peerSessionPublicKey = null;
        /** Cached session shared secret. */
        this.sessionSharedSecret = null;
        this.pendingRequests = new Map();
        this.config = {
            relayUrl: config.relayUrl,
            metadata: config.metadata,
            requiredChains: config.requiredChains,
            requiredMethods: config.requiredMethods,
            requiredEvents: config.requiredEvents,
            sessionTtl: config.sessionTtl ?? 7 * 24 * 60 * 60,
        };
        this.nextRpcId = config.nextId ?? 1;
    }
    /** Currently active session, or null. */
    getSession() {
        return this.activeSession;
    }
    /** Whether there's an active session. */
    isConnected() {
        return this.activeSession !== null && Date.now() < (this.activeSession?.expiry ?? 0);
    }
    // ============================================================
    // Pairing
    // ============================================================
    /**
     * Initiate a new pairing and return the URI to display.
     *
     * @returns Pairing URI string.
     */
    async initiatePairing() {
        const { pairing, relay } = await createPairing({
            relayUrl: this.config.relayUrl,
            expiry: 300,
        });
        this.relay = relay;
        this.pairingTopic = pairing.topic;
        this.pairingSymKey = pairing.symKey ?? this.generatePairingSymKey();
        // Listen for messages on the pairing topic
        relay.subscribe(pairing.topic, (payload) => {
            this.handlePairingMessage(payload);
        });
        this.emitEvent({ type: 'pairing_created', pairing });
        return pairing.uri;
    }
    /**
     * Connect using an existing WC URI (e.g., scanned from QR).
     *
     * @param uri - WalletConnect v2 URI.
     * @returns The established session.
     */
    async connectWithUri(uri) {
        const parsed = parseWcUri(uri);
        this.relay = new WcRelay({ url: parsed.relayUrl || this.config.relayUrl });
        await this.relay.connect();
        this.pairingTopic = parsed.topic;
        this.pairingSymKey = parsed.symKey;
        this.relay.subscribe(parsed.topic, (payload) => {
            this.handlePairingMessage(payload);
        });
        // Send session proposal over pairing channel
        await this.sendSessionProposal();
        return new Promise((resolve, reject) => {
            const handler = (event) => {
                if (event.type === 'connected') {
                    this.off('wcEvent', handler);
                    resolve(event.session);
                }
                else if (event.type === 'error') {
                    this.off('wcEvent', handler);
                    reject(event.error);
                }
            };
            this.on('wcEvent', handler);
            // Timeout after 5 minutes
            setTimeout(() => {
                this.off('wcEvent', handler);
                reject(new Error('Session establishment timed out'));
            }, 300000);
        });
    }
    /**
     * Disconnect the current session.
     *
     * Sends wc_sessionDelete notification, unsubscribes, and cleans up state.
     */
    async disconnect() {
        if (this.activeSession && this.relay) {
            try {
                await this.sendSessionDelete(this.activeSession.topic, 6000, 'User disconnected');
            }
            catch {
                // Best effort
            }
            this.relay.unsubscribe(this.activeSession.topic);
        }
        if (this.pairingTopic && this.relay && this.pairingSymKey) {
            try {
                await deletePairing(this.relay, this.pairingTopic, this.pairingSymKey);
            }
            catch {
                // Best effort
            }
        }
        if (this.relay) {
            this.relay.disconnect();
            this.relay = null;
        }
        this.activeSession = null;
        this.pairingTopic = null;
        this.pairingSymKey = null;
        this.peerSessionPublicKey = null;
        this.sessionSharedSecret = null;
        // Reject all pending requests
        for (const [id, pending] of this.pendingRequests) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Session disconnected'));
            this.pendingRequests.delete(id);
        }
        this.emitEvent({ type: 'disconnected', reason: 'User disconnected' });
    }
    // ============================================================
    // Session operations
    // ============================================================
    /**
     * Extend the session TTL.
     *
     * @param newExpiry - New expiry timestamp (seconds from epoch).
     */
    async extendSession(newExpiry) {
        if (!this.activeSession || !this.relay)
            return;
        const id = this.nextRpcId++;
        const notification = {
            jsonrpc: '2.0',
            method: 'wc_sessionExtend',
            params: {
                expiry: newExpiry,
            },
        };
        const encrypted = this.encryptSessionMessage(id, notification);
        await this.relay.publish(this.activeSession.topic, encrypted);
        this.activeSession.expiry = newExpiry * 1000;
        this.emitEvent({ type: 'session_extend', topic: this.activeSession.topic, newExpiry: this.activeSession.expiry });
    }
    /**
     * Update session namespaces (add/remove methods, events, accounts).
     *
     * @param namespaces - Updated namespaces.
     */
    async updateSession(namespaces) {
        if (!this.activeSession || !this.relay)
            return;
        const id = this.nextRpcId++;
        const notification = {
            jsonrpc: '2.0',
            method: 'wc_sessionUpdate',
            params: { namespaces },
        };
        const encrypted = this.encryptSessionMessage(id, notification);
        await this.relay.publish(this.activeSession.topic, encrypted);
        this.activeSession.namespaces = namespaces;
        this.emitEvent({ type: 'session_update', session: this.activeSession });
    }
    /**
     * Emit a session notification (wallet → dApp event).
     *
     * @param chainId - CAIP-2 chain ID.
     * @param name - Event name.
     * @param data - Event data.
     */
    async emitSessionEvent(chainId, name, data) {
        if (!this.activeSession || !this.relay)
            return;
        const id = this.nextRpcId++;
        const notification = {
            id,
            jsonrpc: '2.0',
            method: 'wc_sessionEmit',
            params: { chainId, name, data },
        };
        const encrypted = this.encryptSessionMessage(id, notification);
        await this.relay.publish(this.activeSession.topic, encrypted);
        this.emitEvent({
            type: 'session_notification',
            notification: { chainId, name, data },
        });
    }
    /**
     * Send a session ping and wait for pong.
     *
     * @param timeoutMs - Timeout in milliseconds (default: 5000).
     * @returns Whether the peer responded.
     */
    async sessionPing(timeoutMs = 5000) {
        if (!this.activeSession || !this.relay || !this.sessionSharedSecret) {
            return false;
        }
        return new Promise((resolve) => {
            const id = this.nextRpcId++;
            const request = {
                id,
                jsonrpc: '2.0',
                method: 'wc_sessionPing',
                params: {},
            };
            const handler = (payload) => {
                try {
                    const decrypted = decrypt(this.sessionSharedSecret, payload);
                    const msg = JSON.parse(new TextDecoder().decode(decrypted));
                    if (msg.id === id && msg.result !== undefined) {
                        this.relay.unsubscribe(this.activeSession.topic, handler);
                        resolve(true);
                    }
                    // Handle incoming ping from peer
                    if (msg.method === 'wc_sessionPing' && msg.id !== id) {
                        const pong = {
                            id: msg.id,
                            jsonrpc: '2.0',
                            result: {},
                        };
                        const pongEncrypted = encrypt(this.sessionSharedSecret, new TextEncoder().encode(JSON.stringify(pong)));
                        this.relay.publish(this.activeSession.topic, pongEncrypted).catch(() => { });
                    }
                }
                catch {
                    // Ignore
                }
            };
            this.relay.subscribe(this.activeSession.topic, handler);
            const encrypted = encrypt(this.sessionSharedSecret, new TextEncoder().encode(JSON.stringify(request)));
            this.relay.publish(this.activeSession.topic, encrypted).catch(() => { });
            setTimeout(() => {
                this.relay.unsubscribe(this.activeSession.topic, handler);
                resolve(false);
            }, timeoutMs);
        });
    }
    // ============================================================
    // JSON-RPC requests
    // ============================================================
    /**
     * Send a JSON-RPC request to the connected wallet.
     *
     * @param method - RPC method name.
     * @param params - Method parameters.
     * @returns Promise resolving with the wallet's response.
     */
    async request(method, params) {
        if (!this.activeSession) {
            throw new Error('No active session — connect first');
        }
        const id = this.nextRpcId++;
        const request = {
            id,
            jsonrpc: '2.0',
            method,
            params,
        };
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`Request '${method}' timed out`));
            }, 60000);
            this.pendingRequests.set(id, { resolve, reject, timeout });
            this.publishToSession(request).catch(reject);
        });
    }
    /**
     * Handle an incoming JSON-RPC request from the wallet.
     * Override this in subclasses for custom request handling.
     *
     * @param request - The incoming request.
     * @returns Response data.
     */
    async handleRequest(_request) {
        throw new Error('Unhandled request');
    }
    // ============================================================
    // Internal: session proposal
    // ============================================================
    /** Send a session proposal over the pairing channel. */
    async sendSessionProposal() {
        if (!this.pairingTopic || !this.pairingSymKey || !this.relay) {
            throw new Error('No pairing established');
        }
        const requiredNamespaces = getDefaultRequiredNamespaces({
            chains: this.config.requiredChains,
            methods: this.config.requiredMethods,
            events: this.config.requiredEvents,
        });
        const proposal = {
            id: this.nextRpcId++,
            requiredNamespaces,
            optionalNamespaces: {},
            relays: [{ protocol: 'waku' }],
            proposer: {
                publicKey: bytesToHex(this.sessionKeypair.publicKey),
                metadata: this.config.metadata,
            },
        };
        const encrypted = encryptPairingMessage(this.pairingSymKey, {
            id: proposal.id,
            jsonrpc: '2.0',
            method: 'wc_sessionPropose',
            params: {
                requiredNamespaces: proposal.requiredNamespaces,
                optionalNamespaces: proposal.optionalNamespaces,
                relays: proposal.relays,
                proposer: proposal.proposer,
            },
        });
        await this.relay.publish(this.pairingTopic, encrypted);
    }
    // ============================================================
    // Internal: message handlers
    // ============================================================
    /** Handle a decrypted message from the pairing channel. */
    async handlePairingMessage(encryptedPayload) {
        if (!this.pairingSymKey)
            return;
        try {
            const decrypted = decryptPairingMessage(this.pairingSymKey, encryptedPayload);
            const msg = decrypted;
            if (msg.method === 'wc_sessionProposeResp' || (msg.result && typeof msg.result === 'object')) {
                const result = msg.result;
                if (result && 'responderPublicKey' in result) {
                    await this.handleSessionProposalResponse(result);
                }
            }
            else if (msg.method === 'wc_sessionPropose') {
                this.emitEvent({
                    type: 'session_proposal',
                    proposal: msg,
                });
            }
            else if (msg.method === 'wc_sessionEvent') {
                this.emitEvent({
                    type: 'session_notification',
                    notification: msg.params,
                });
            }
            else if (msg.method === 'wc_pairingDelete') {
                this.emitEvent({ type: 'pairing_delete', topic: this.pairingTopic ?? '' });
            }
        }
        catch (error) {
            console.warn('[WcSessionManager] Failed to handle pairing message:', error);
        }
    }
    /** Handle the wallet's response to our session proposal. */
    async handleSessionProposalResponse(result) {
        if (!this.relay)
            return;
        const responderPublicKey = result.responderPublicKey ?? '';
        if (!responderPublicKey) {
            this.emitEvent({ type: 'error', error: new Error('Missing responder public key') });
            return;
        }
        // Store peer public key for later encryption
        this.peerSessionPublicKey = responderPublicKey;
        // Derive the session topic from our public key and the wallet's public key
        const peerPub = hexToBytes(responderPublicKey);
        const sessionTopic = this.deriveSessionTopicFromKeys(responderPublicKey);
        // Derive and store the session shared secret
        this.sessionSharedSecret = sharedSecret(this.sessionKeypair.privateKey, peerPub);
        // Subscribe to the session topic
        this.relay.subscribe(sessionTopic, (payload) => {
            this.handleSessionMessage(payload);
        });
        // Build session object
        const accounts = result.accounts ?? [];
        const sessionExpiry = result.expiry ?? Date.now() + this.config.sessionTtl * 1000;
        this.activeSession = {
            topic: sessionTopic,
            peerMetadata: result.peerMetadata ?? {
                name: 'Unknown Wallet',
                description: '',
                url: '',
                icons: [],
            },
            accounts,
            namespaces: result.namespaces ?? {},
            requiredNamespaces: this.buildRequiredNamespaces(),
            expiry: sessionExpiry,
            relay: { protocol: 'waku' },
        };
        this.emitEvent({ type: 'connected', session: this.activeSession });
    }
    /** Handle messages on the session topic. */
    async handleSessionMessage(encryptedPayload) {
        if (!this.sessionSharedSecret)
            return;
        try {
            const plaintext = decrypt(this.sessionSharedSecret, encryptedPayload);
            const msg = JSON.parse(new TextDecoder().decode(plaintext));
            if ('result' in msg || 'error' in msg) {
                // This is a response to one of our requests
                const pending = this.pendingRequests.get(msg.id);
                if (pending) {
                    clearTimeout(pending.timeout);
                    this.pendingRequests.delete(msg.id);
                    if ('error' in msg && msg.error) {
                        pending.reject(new Error(msg.error.message));
                    }
                    else {
                        pending.resolve(msg.result);
                    }
                }
            }
            else if ('method' in msg) {
                // This is a request or notification from the wallet
                const request = msg;
                switch (request.method) {
                    case 'wc_sessionUpdate':
                        if (this.activeSession) {
                            this.activeSession.namespaces = request.params.namespaces;
                            this.emitEvent({ type: 'session_update', session: this.activeSession });
                        }
                        break;
                    case 'wc_sessionDelete':
                        if (this.activeSession) {
                            this.emitEvent({ type: 'session_delete', topic: this.activeSession.topic });
                            this.activeSession = null;
                            this.sessionSharedSecret = null;
                            this.peerSessionPublicKey = null;
                        }
                        break;
                    case 'wc_sessionExtend':
                        if (this.activeSession) {
                            const expiry = request.params.expiry;
                            this.activeSession.expiry = expiry * 1000;
                            this.emitEvent({ type: 'session_extend', topic: this.activeSession.topic, newExpiry: this.activeSession.expiry });
                        }
                        break;
                    case 'wc_sessionEmit':
                        this.emitEvent({
                            type: 'session_notification',
                            notification: request.params,
                        });
                        break;
                    case 'wc_sessionPing': {
                        const pong = {
                            id: request.id,
                            jsonrpc: '2.0',
                            result: {},
                        };
                        const encrypted = encrypt(this.sessionSharedSecret, new TextEncoder().encode(JSON.stringify(pong)));
                        await this.relay?.publish(this.activeSession?.topic ?? '', encrypted);
                        break;
                    }
                    default:
                        // Forward to subclass handler
                        try {
                            const result = await this.handleRequest(request);
                            const response = {
                                id: request.id,
                                jsonrpc: '2.0',
                                result,
                            };
                            const encrypted = encrypt(this.sessionSharedSecret, new TextEncoder().encode(JSON.stringify(response)));
                            await this.relay?.publish(this.activeSession?.topic ?? '', encrypted);
                        }
                        catch (error) {
                            const errorResponse = {
                                id: request.id,
                                jsonrpc: '2.0',
                                error: {
                                    code: -32603,
                                    message: error instanceof Error ? error.message : String(error),
                                },
                            };
                            const encrypted = encrypt(this.sessionSharedSecret, new TextEncoder().encode(JSON.stringify(errorResponse)));
                            await this.relay?.publish(this.activeSession?.topic ?? '', encrypted);
                        }
                }
            }
        }
        catch (error) {
            console.warn('[WcSessionManager] Failed to handle session message:', error);
        }
    }
    // ============================================================
    // Internal: helpers
    // ============================================================
    /** Publish a JSON-RPC message to the session topic. */
    async publishToSession(request) {
        if (!this.activeSession || !this.relay || !this.sessionSharedSecret)
            return;
        const encrypted = encrypt(this.sessionSharedSecret, new TextEncoder().encode(JSON.stringify(request)));
        await this.relay.publish(this.activeSession.topic, encrypted);
    }
    /** Encrypt a message for the session topic. */
    encryptSessionMessage(id, message) {
        if (!this.sessionSharedSecret) {
            throw new Error('No session shared secret');
        }
        return encrypt(this.sessionSharedSecret, new TextEncoder().encode(JSON.stringify({ id, jsonrpc: '2.0', ...message })));
    }
    /** Send a session delete notification. */
    async sendSessionDelete(topic, code, message) {
        if (!this.relay || !this.sessionSharedSecret)
            return;
        const notification = {
            jsonrpc: '2.0',
            method: 'wc_sessionDelete',
            params: { code, message },
        };
        const encrypted = encrypt(this.sessionSharedSecret, new TextEncoder().encode(JSON.stringify(notification)));
        await this.relay.publish(topic, encrypted);
    }
    /** Derive session topic from peer's public key. */
    deriveSessionTopicFromKeys(peerPublicKey) {
        const myPub = this.sessionKeypair.publicKey;
        const peerPub = hexToBytes(peerPublicKey);
        const combined = new Uint8Array(myPub.length + peerPub.length);
        combined.set(myPub);
        combined.set(peerPub);
        return this.hashToHex(combined);
    }
    /** Build required namespaces from config. */
    buildRequiredNamespaces() {
        return getDefaultRequiredNamespaces({
            chains: this.config.requiredChains,
            methods: this.config.requiredMethods,
            events: this.config.requiredEvents,
        });
    }
    /** Generate a random symmetric key for the pairing channel. */
    generatePairingSymKey() {
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    /** Emit a typed event. */
    emitEvent(event) {
        this.emit('wcEvent', event);
    }
    /** Hash bytes to hex string. */
    hashToHex(data) {
        const hash = sha256(data);
        return Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('');
    }
}
//# sourceMappingURL=session.js.map