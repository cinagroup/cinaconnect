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
/**
 * WcRelay manages the WebSocket connection to the relay server.
 *
 * It handles:
 * - Connection lifecycle with auto-reconnect
 * - Topic subscription management
 * - Publish/subscribe of encrypted payloads
 * - Heartbeat keepalive
 */
export class WcRelay extends EventEmitter {
    constructor(config) {
        super();
        this.ws = null;
        this.state = 'disconnected';
        this.subscriptions = new Set();
        this.pendingPublish = [];
        this.heartbeatTimer = null;
        this.reconnectAttempts = 0;
        this.messageHandlers = new Map();
        this.config = {
            url: config.url,
            connectionTimeout: config.connectionTimeout ?? 10000,
            heartbeatInterval: config.heartbeatInterval ?? 30000,
            maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
        };
    }
    /** Current relay connection state. */
    getState() {
        return this.state;
    }
    /** Whether the relay is currently connected. */
    isConnected() {
        return this.state === 'connected';
    }
    /**
     * Establish WebSocket connection to the relay server.
     * Resolves when the connection is ready.
     */
    connect() {
        return new Promise((resolve, reject) => {
            if (this.state === 'connected') {
                resolve();
                return;
            }
            if (this.state === 'connecting') {
                // Already connecting — wait for it
                const handler = () => {
                    this.off('connected', handler);
                    resolve();
                };
                this.on('connected', handler);
                return;
            }
            this.state = 'connecting';
            try {
                this.ws = new WebSocket(this.config.url);
                const timeout = setTimeout(() => {
                    this.ws?.close();
                    this.state = 'error';
                    reject(new Error('Relay connection timeout'));
                }, this.config.connectionTimeout);
                this.ws.onopen = () => {
                    clearTimeout(timeout);
                    this.state = 'connected';
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();
                    this.emit('connected');
                    // Resubscribe to all topics
                    for (const topic of this.subscriptions) {
                        this.subscribeTopic(topic);
                    }
                    // Flush pending publishes
                    this.flushPending();
                    resolve();
                };
                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleMessage(data);
                    }
                    catch {
                        console.warn('[WcRelay] Failed to parse relay message:', event.data);
                    }
                };
                this.ws.onclose = (event) => {
                    this.state = 'disconnected';
                    this.stopHeartbeat();
                    this.emit('disconnected', event);
                    if (event.code !== 1000 && this.reconnectAttempts < this.config.maxReconnectAttempts) {
                        this.reconnect();
                    }
                };
                this.ws.onerror = () => {
                    clearTimeout(timeout);
                    this.state = 'error';
                    reject(new Error('WebSocket connection error'));
                };
            }
            catch (error) {
                this.state = 'error';
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }
    /**
     * Disconnect from the relay server.
     */
    disconnect() {
        this.stopHeartbeat();
        this.ws?.close(1000, 'Client disconnect');
        this.ws = null;
        this.state = 'disconnected';
        this.emit('disconnected');
    }
    /**
     * Subscribe to a topic and listen for incoming messages.
     *
     * @param topic - 64-character hex topic.
     * @param handler - Callback invoked when a message arrives on this topic.
     */
    subscribe(topic, handler) {
        this.subscriptions.add(topic);
        if (handler) {
            if (!this.messageHandlers.has(topic)) {
                this.messageHandlers.set(topic, new Set());
            }
            this.messageHandlers.get(topic).add(handler);
        }
        if (this.state === 'connected') {
            this.subscribeTopic(topic);
        }
    }
    /**
     * Unsubscribe from a topic.
     *
     * @param topic - Topic to unsubscribe from.
     * @param handler - Optional specific handler to remove. If omitted, all handlers for this topic are removed.
     */
    unsubscribe(topic, handler) {
        if (handler) {
            this.messageHandlers.get(topic)?.delete(handler);
        }
        else {
            this.messageHandlers.delete(topic);
        }
        this.subscriptions.delete(topic);
        if (this.state === 'connected') {
            this.send({ type: 'unsubscribe', topic, payload: '', timestamp: Date.now() });
        }
    }
    /**
     * Publish an encrypted payload to a topic.
     *
     * @param topic - Target topic.
     * @param payload - Base64-encoded encrypted payload.
     * @returns Promise that resolves when the relay acknowledges the publish.
     */
    publish(topic, payload) {
        return new Promise((resolve, reject) => {
            if (this.state === 'connected') {
                this.send({ type: 'publish', topic, payload, timestamp: Date.now() });
                resolve();
            }
            else {
                // Queue for later
                this.pendingPublish.push({ topic, payload, resolve, reject });
            }
        });
    }
    /** Flush pending publish messages. */
    flushPending() {
        for (const { topic, payload, resolve } of this.pendingPublish) {
            this.send({ type: 'publish', topic, payload, timestamp: Date.now() });
            resolve();
        }
        this.pendingPublish = [];
    }
    /** Subscribe to a topic on the relay (internal). */
    subscribeTopic(topic) {
        this.send({ type: 'subscribe', topic, payload: '', timestamp: Date.now() });
    }
    /** Send a JSON message over WebSocket. */
    send(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
    /** Handle incoming relay messages. */
    handleMessage(data) {
        switch (data.type) {
            case 'message':
                // Deliver to topic-specific handlers
                const handlers = this.messageHandlers.get(data.topic);
                if (handlers) {
                    for (const h of handlers) {
                        h(data.payload, data.topic);
                    }
                }
                this.emit('message', data.payload, data.topic);
                break;
            case 'pong':
                break;
            case 'ack':
                this.emit('ack', data.topic);
                break;
            case 'error':
                console.error('[WcRelay] Relay error:', data.message);
                this.emit('error', new Error(data.message));
                break;
        }
    }
    /** Start heartbeat keepalive. */
    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            this.send({ type: 'ping', timestamp: Date.now() });
        }, this.config.heartbeatInterval);
    }
    /** Stop heartbeat. */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    /** Attempt reconnection with exponential backoff. */
    reconnect() {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
        console.log(`[WcRelay] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
        setTimeout(() => {
            this.connect().catch(() => {
                // Already handled by onerror/onclose
            });
        }, delay);
    }
}
//# sourceMappingURL=relay.js.map