/**
 * Mock WebSocket relay for integration tests.
 * Provides an in-memory WebSocket server for testing relay message flows
 * without needing a live Cloudflare Durable Object.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer, type Server } from 'http';

export interface MockRelayMessage {
  type: 'message' | 'ping' | 'pong' | 'close' | 'subscribe';
  topic: string;
  data: string;
  timestamp: number;
}

export class MockRelayServer {
  private server: Server | null = null;
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private topics: Map<string, Set<string>> = new Map();
  private messageLog: MockRelayMessage[] = [];
  private _url: string = '';

  /** Start the mock relay on a random available port. */
  async start(): Promise<string> {
    this.server = createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', clients: this.clients.size }));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', (ws, req) => {
      const clientId = (req.headers['sec-websocket-key'] as string) ?? `client-${Date.now()}`;
      this.clients.set(clientId, ws);

      ws.on('message', (raw: Buffer) => {
        try {
          const msg: MockRelayMessage = JSON.parse(raw.toString());
          this.messageLog.push({ ...msg, timestamp: Date.now() });

          if (msg.type === 'subscribe') {
            this.subscribe(clientId, msg.topic);
          } else if (msg.type === 'message') {
            this.publish(msg.topic, msg.data);
          }
        } catch {
          ws.send(JSON.stringify({ type: 'message', topic: 'error', data: 'invalid json', timestamp: Date.now() }));
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        this.topics.forEach((subs, topic) => {
          subs.delete(clientId);
          if (subs.size === 0) this.topics.delete(topic);
        });
      });
    });

    return new Promise((resolve, reject) => {
      this.server!.listen(0, '127.0.0.1', () => {
        const addr = this.server!.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        this._url = `ws://127.0.0.1:${port}`;
        resolve(this._url);
      });
      this.server!.on('error', reject);
    });
  }

  /** Stop the mock relay and clean up. */
  async stop(): Promise<void> {
    this.clients.forEach((ws) => ws.close());
    this.clients.clear();
    this.topics.clear();
    this.messageLog = [];

    return new Promise((resolve, reject) => {
      this.wss?.close(() => {
        this.server?.close((err?: Error) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  get url(): string {
    return this._url;
  }

  /** Get the HTTP health URL. */
  get healthUrl(): string {
    return this._url.replace('ws://', 'http://').replace(/^ws/, 'http') + '/health';
  }

  /** Connect a test client WebSocket. */
  connectClient(): Promise<{ ws: WebSocket; clientId: string }> {
    const ws = new WebSocket(this._url);
    return new Promise((resolve, reject) => {
      ws.on('open', () => {
        // clientId isn't directly available from client side; use a placeholder
        resolve({ ws, clientId: `test-client-${Date.now()}` });
      });
      ws.on('error', reject);
    });
  }

  /** Subscribe a client to a topic. */
  subscribe(clientId: string, topic: string): void {
    const subscribers = this.topics.get(topic) ?? new Set();
    subscribers.add(clientId);
    this.topics.set(topic, subscribers);
  }

  /** Publish a message to all subscribers of a topic. */
  publish(topic: string, data: string): void {
    const subscribers = this.topics.get(topic);
    if (!subscribers) return;

    const message: MockRelayMessage = {
      type: 'message',
      topic,
      data,
      timestamp: Date.now(),
    };

    subscribers.forEach((clientId) => {
      const ws = this.clients.get(clientId);
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  /** Get all logged messages. */
  getMessageLog(): ReadonlyArray<MockRelayMessage> {
    return [...this.messageLog];
  }

  /** Get active topic subscriptions. */
  getTopics(): ReadonlyMap<string, Set<string>> {
    return this.topics;
  }

  /** Get connected client count. */
  get clientCount(): number {
    return this.clients.size;
  }

  /** Reset state. */
  reset(): void {
    this.clients.clear();
    this.topics.clear();
    this.messageLog = [];
  }
}

/** Singleton mock relay instance. */
export const mockRelay = new MockRelayServer();
