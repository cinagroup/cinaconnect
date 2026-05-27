/**
 * Relay client for WalletConnect v2.
 *
 * Connects to the Cinacoin self-hosted relay server via WebSocket,
 * manages subscriptions to topics, and publishes encrypted payloads.
 *
 * This is a thin wrapper around the core SDK's RelayTransport that
 * provides a Promise-based API and auto-subscription management.
 */
import { EventEmitter } from '@cinacoin/core-sdk';
import type { RelayConfig } from './types.js';
/** Relay client state. */
export type RelayState = 'disconnected' | 'connecting' | 'connected' | 'error';
/**
 * WcRelay manages the WebSocket connection to the relay server.
 *
 * It handles:
 * - Connection lifecycle with auto-reconnect
 * - Topic subscription management
 * - Publish/subscribe of encrypted payloads
 * - Heartbeat keepalive
 */
export declare class WcRelay extends EventEmitter {
    private ws;
    private config;
    private state;
    private subscriptions;
    private pendingPublish;
    private heartbeatTimer;
    private reconnectAttempts;
    private messageHandlers;
    constructor(config: RelayConfig);
    /** Current relay connection state. */
    getState(): RelayState;
    /** Whether the relay is currently connected. */
    isConnected(): boolean;
    /**
     * Establish WebSocket connection to the relay server.
     * Resolves when the connection is ready.
     */
    connect(): Promise<void>;
    /**
     * Disconnect from the relay server.
     */
    disconnect(): void;
    /**
     * Subscribe to a topic and listen for incoming messages.
     *
     * @param topic - 64-character hex topic.
     * @param handler - Callback invoked when a message arrives on this topic.
     */
    subscribe(topic: string, handler?: (payload: string, topic: string) => void): void;
    /**
     * Unsubscribe from a topic.
     *
     * @param topic - Topic to unsubscribe from.
     * @param handler - Optional specific handler to remove. If omitted, all handlers for this topic are removed.
     */
    unsubscribe(topic: string, handler?: (payload: string, topic: string) => void): void;
    /**
     * Publish an encrypted payload to a topic.
     *
     * @param topic - Target topic.
     * @param payload - Base64-encoded encrypted payload.
     * @returns Promise that resolves when the relay acknowledges the publish.
     */
    publish(topic: string, payload: string): Promise<void>;
    /** Flush pending publish messages. */
    private flushPending;
    /** Subscribe to a topic on the relay (internal). */
    private subscribeTopic;
    /** Send a JSON message over WebSocket. */
    private send;
    /** Handle incoming relay messages. */
    private handleMessage;
    /** Start heartbeat keepalive. */
    private startHeartbeat;
    /** Stop heartbeat. */
    private stopHeartbeat;
    /** Attempt reconnection with exponential backoff. */
    private reconnect;
}
//# sourceMappingURL=relay.d.ts.map