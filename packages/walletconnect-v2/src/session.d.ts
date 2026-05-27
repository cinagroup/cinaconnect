/**
 * Session management for WalletConnect v2.
 *
 * Handles the full session lifecycle: propose, approve, reject, update,
 * extend, delete, emit (notifications). Uses X25519 key exchange for
 * establishing an encrypted session channel on top of pairing.
 */
import { EventEmitter } from '@cinacoin/core-sdk';
import type { Session, AppMetadata, JsonRpcRequest, SessionNamespace } from './types.js';
/** Session manager configuration. */
export interface SessionManagerConfig {
    /** Relay server URL. */
    relayUrl: string;
    /** dApp metadata. */
    metadata: AppMetadata;
    /** Chains the dApp wants to connect to (CAIP-2, e.g., 'eip155:1'). */
    requiredChains?: string[];
    /** Required methods (defaults to standard EVM methods). */
    requiredMethods?: string[];
    /** Required events. */
    requiredEvents?: string[];
    /** Session TTL in seconds (default: 7 days). */
    sessionTtl?: number;
    /** JSON-RPC ID counter (optional). */
    nextId?: number;
}
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
export declare class WcSessionManager extends EventEmitter {
    private config;
    private relay;
    private activeSession;
    private pairingTopic;
    private pairingSymKey;
    private sessionKeypair;
    /** Peer's session public key (hex), set after proposal response. */
    private peerSessionPublicKey;
    /** Cached session shared secret. */
    private sessionSharedSecret;
    private nextRpcId;
    private pendingRequests;
    constructor(config: SessionManagerConfig);
    /** Currently active session, or null. */
    getSession(): Session | null;
    /** Whether there's an active session. */
    isConnected(): boolean;
    /**
     * Initiate a new pairing and return the URI to display.
     *
     * @returns Pairing URI string.
     */
    initiatePairing(): Promise<string>;
    /**
     * Connect using an existing WC URI (e.g., scanned from QR).
     *
     * @param uri - WalletConnect v2 URI.
     * @returns The established session.
     */
    connectWithUri(uri: string): Promise<Session>;
    /**
     * Disconnect the current session.
     *
     * Sends wc_sessionDelete notification, unsubscribes, and cleans up state.
     */
    disconnect(): Promise<void>;
    /**
     * Extend the session TTL.
     *
     * @param newExpiry - New expiry timestamp (seconds from epoch).
     */
    extendSession(newExpiry: number): Promise<void>;
    /**
     * Update session namespaces (add/remove methods, events, accounts).
     *
     * @param namespaces - Updated namespaces.
     */
    updateSession(namespaces: Record<string, SessionNamespace>): Promise<void>;
    /**
     * Emit a session notification (wallet → dApp event).
     *
     * @param chainId - CAIP-2 chain ID.
     * @param name - Event name.
     * @param data - Event data.
     */
    emitSessionEvent(chainId: string, name: string, data: unknown): Promise<void>;
    /**
     * Send a session ping and wait for pong.
     *
     * @param timeoutMs - Timeout in milliseconds (default: 5000).
     * @returns Whether the peer responded.
     */
    sessionPing(timeoutMs?: number): Promise<boolean>;
    /**
     * Send a JSON-RPC request to the connected wallet.
     *
     * @param method - RPC method name.
     * @param params - Method parameters.
     * @returns Promise resolving with the wallet's response.
     */
    request<T = unknown>(method: string, params: unknown): Promise<T>;
    /**
     * Handle an incoming JSON-RPC request from the wallet.
     * Override this in subclasses for custom request handling.
     *
     * @param request - The incoming request.
     * @returns Response data.
     */
    protected handleRequest(_request: JsonRpcRequest): Promise<unknown>;
    /** Send a session proposal over the pairing channel. */
    private sendSessionProposal;
    /** Handle a decrypted message from the pairing channel. */
    private handlePairingMessage;
    /** Handle the wallet's response to our session proposal. */
    private handleSessionProposalResponse;
    /** Handle messages on the session topic. */
    private handleSessionMessage;
    /** Publish a JSON-RPC message to the session topic. */
    private publishToSession;
    /** Encrypt a message for the session topic. */
    private encryptSessionMessage;
    /** Send a session delete notification. */
    private sendSessionDelete;
    /** Derive session topic from peer's public key. */
    private deriveSessionTopicFromKeys;
    /** Build required namespaces from config. */
    private buildRequiredNamespaces;
    /** Generate a random symmetric key for the pairing channel. */
    private generatePairingSymKey;
    /** Emit a typed event. */
    private emitEvent;
    /** Hash bytes to hex string. */
    private hashToHex;
}
//# sourceMappingURL=session.d.ts.map