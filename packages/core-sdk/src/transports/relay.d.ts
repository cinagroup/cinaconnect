/**
 * Relay WebSocket transport — communicates with the self-hosted relay server.
 *
 * Implements the Cinacoin relay protocol (compatible with WalletConnect v2).
 */
import { EventEmitter } from '../events.js';
/** Relay transport configuration. */
export interface RelayTransportConfig {
    /** WebSocket endpoint (e.g., wss://relay.example.com/v1). */
    url: string;
    /** Connection timeout in milliseconds. */
    connectionTimeout?: number;
    /** Heartbeat interval in milliseconds. */
    heartbeatInterval?: number;
    /** Maximum reconnection attempts. */
    maxReconnectAttempts?: number;
}
/**
 * RelayTransport manages the WebSocket connection to the relay server.
 *
 * It handles:
 * - Connection lifecycle (connect, disconnect, reconnect)
 * - Topic subscription management
 * - Message encryption/decryption (at the transport level)
 * - Heartbeat/keepalive
 */
export declare class RelayTransport extends EventEmitter {
    readonly type = "relay";
    private ws;
    private config;
    private reconnectAttempts;
    private subscriptions;
    private pendingMessages;
    private heartbeatTimer;
    private connected;
    constructor(config: RelayTransportConfig);
    /**
     * Establish WebSocket connection to the relay.
     */
    connect(): Promise<void>;
    /**
     * Disconnect from the relay.
     */
    disconnect(): void;
    /**
     * Subscribe to a topic.
     * @param topic - 32-byte hex topic identifier.
     */
    subscribe(topic: string): void;
    /**
     * Unsubscribe from a topic.
     * @param topic - Topic to unsubscribe from.
     */
    unsubscribe(topic: string): void;
    /**
     * Publish an encrypted message to a topic.
     * @param topic - Target topic.
     * @param payload - Base64-encoded encrypted payload.
     */
    publish(topic: string, payload: string): void;
    /** Check if the transport is connected. */
    isConnected(): boolean;
    /** Send a message over WebSocket. */
    private send;
    /** Handle incoming relay messages. */
    private handleMessage;
    /** Start the heartbeat timer. */
    private startHeartbeat;
    /** Stop the heartbeat timer. */
    private stopHeartbeat;
    /** Attempt reconnection with exponential backoff. */
    private reconnect;
}
//# sourceMappingURL=relay.d.ts.map