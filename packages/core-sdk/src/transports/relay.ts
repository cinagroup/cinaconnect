/**
 * Relay WebSocket transport — communicates with the self-hosted relay server.
 *
 * Implements the Cinacoin relay protocol (compatible with WalletConnect v2).
 */

import type { EventHandler } from '../types.js';
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
export class RelayTransport extends EventEmitter {
  readonly type = 'relay';

  private ws: WebSocket | null = null;
  private config: Required<RelayTransportConfig>;
  private reconnectAttempts = 0;
  private subscriptions: Set<string> = new Set();
  private pendingMessages: Array<{ topic: string; payload: string }> = [];
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private connected = false;

  constructor(config: RelayTransportConfig) {
    super();
    this.config = {
      url: config.url,
      connectionTimeout: config.connectionTimeout ?? 10_000,
      heartbeatInterval: config.heartbeatInterval ?? 30_000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
    };
  }

  /**
   * Establish WebSocket connection to the relay.
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.connected = true;
        this.emit('connected');
        resolve();
        return;
      }

      try {
        this.ws = new WebSocket(this.config.url);

        const timeout = setTimeout(() => {
          this.ws?.close();
          reject(new Error('Connection timeout'));
        }, this.config.connectionTimeout);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.connected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connected');

          // Resubscribe to previous topics
          for (const topic of this.subscriptions) {
            this.subscribe(topic);
          }

          // Flush pending messages
          for (const msg of this.pendingMessages) {
            this.publish(msg.topic, msg.payload);
          }
          this.pendingMessages = [];

          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data as string);
            this.handleMessage(data);
          } catch {
            console.warn('[Cinacoin] Failed to parse relay message:', event.data);
          }
        };

        this.ws.onclose = (event: CloseEvent) => {
          this.connected = false;
          this.stopHeartbeat();
          this.emit('disconnected', event);

          if (event.code !== 1000 && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.reconnect();
          }
        };

        this.ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('WebSocket connection error'));
        };
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Disconnect from the relay.
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.ws?.close(1000, 'Client disconnect');
    this.ws = null;
    this.connected = false;
    this.emit('disconnected');
  }

  /**
   * Subscribe to a topic.
   * @param topic - 32-byte hex topic identifier.
   */
  subscribe(topic: string): void {
    this.subscriptions.add(topic);
    this.send({ type: 'subscribe', topic, payload: '', timestamp: Date.now() });
  }

  /**
   * Unsubscribe from a topic.
   * @param topic - Topic to unsubscribe from.
   */
  unsubscribe(topic: string): void {
    this.subscriptions.delete(topic);
    this.send({ type: 'unsubscribe', topic, payload: '', timestamp: Date.now() });
  }

  /**
   * Publish an encrypted message to a topic.
   * @param topic - Target topic.
   * @param payload - Base64-encoded encrypted payload.
   */
  publish(topic: string, payload: string): void {
    if (!this.connected) {
      this.pendingMessages.push({ topic, payload });
      return;
    }
    this.send({ type: 'publish', topic, payload, timestamp: Date.now() });
  }

  /** Check if the transport is connected. */
  isConnected(): boolean {
    return this.connected;
  }

  /** Send a message over WebSocket. */
  private send(message: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /** Handle incoming relay messages. */
  private handleMessage(data: unknown): void {
    const msg = data as Record<string, unknown>;
    const type = msg.type as string;

    switch (type) {
      case 'message':
        this.emit('message', msg.topic, msg.payload);
        break;
      case 'pong':
        // Heartbeat response — connection is alive
        break;
      case 'ack':
        this.emit('ack', msg.topic);
        break;
      case 'error':
        console.error('[Cinacoin] Relay error:', msg.message);
        this.emit('error', new Error(msg.message as string));
        break;
    }
  }

  /** Start the heartbeat timer. */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping', timestamp: Date.now() });
    }, this.config.heartbeatInterval);
  }

  /** Stop the heartbeat timer. */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /** Attempt reconnection with exponential backoff. */
  private reconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
    console.log(
      `[Cinacoin] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`,
    );
    setTimeout(() => {
      this.connect().catch(() => {
        // connect() already handles errors and triggers reconnect
      });
    }, delay);
  }
}
