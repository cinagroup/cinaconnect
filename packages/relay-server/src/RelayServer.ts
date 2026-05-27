import { createServer, type Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';

export interface RelayServerConfig {
  port: number;
  host?: string;
  ssl?: { key: string; cert: string };
  maxConnections?: number;
}

export interface RelayMessage {
  type: 'message' | 'ping' | 'pong' | 'close';
  topic: string;
  data: string;
  timestamp: number;
}

export interface RelayStats {
  connections: number;
  messagesReceived: number;
  messagesSent: number;
  uptime: number;
}

/**
 * RelayServer — HTTP/WebSocket relay for WalletConnect bridge messaging.
 * Handles topic-based message routing between connected clients.
 */
export class RelayServer {
  private server: Server | null = null;
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private topics: Map<string, Set<string>> = new Map();
  private stats = { messagesReceived: 0, messagesSent: 0, startTime: Date.now() };
  private readonly config: Required<Omit<RelayServerConfig, 'ssl'>> & Pick<RelayServerConfig, 'ssl'>;

  constructor(config: RelayServerConfig) {
    this.config = {
      port: config.port,
      host: config.host ?? '0.0.0.0',
      maxConnections: config.maxConnections ?? 1000,
      ssl: config.ssl,
    };
  }

  /** Start the relay server */
  async start(): Promise<void> {
    this.server = createServer(this.handleHttp.bind(this));
    this.wss = new WebSocketServer({ server: this.server });
    this.wss.on('connection', this.handleConnection.bind(this));

    return new Promise((resolve, reject) => {
      this.server!.listen(this.config.port, this.config.host, resolve);
      this.server!.on('error', reject);
    });
  }

  /** Stop the relay server */
  async stop(): Promise<void> {
    this.clients.forEach((ws) => ws.close());
    this.clients.clear();
    this.topics.clear();
    return new Promise((resolve, reject) => {
      this.wss?.close(() => {
        this.server?.close((err?: Error) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  /** Get current relay statistics */
  getStats(): RelayStats {
    return {
      connections: this.clients.size,
      messagesReceived: this.stats.messagesReceived,
      messagesSent: this.stats.messagesSent,
      uptime: Date.now() - this.stats.startTime,
    };
  }

  /** Subscribe a client to a topic */
  subscribe(clientId: string, topic: string): void {
    const subscribers = this.topics.get(topic) ?? new Set();
    subscribers.add(clientId);
    this.topics.set(topic, subscribers);
  }

  /** Unsubscribe a client from a topic */
  unsubscribe(clientId: string, topic: string): void {
    const subscribers = this.topics.get(topic);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) this.topics.delete(topic);
    }
  }

  /** Publish a message to all subscribers of a topic */
  publish(topic: string, data: string): void {
    const subscribers = this.topics.get(topic);
    if (!subscribers) return;
    const message = JSON.stringify({
      type: 'message',
      topic,
      data,
      timestamp: Date.now(),
    } satisfies RelayMessage);
    subscribers.forEach((clientId) => {
      const ws = this.clients.get(clientId);
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(message);
        this.stats.messagesSent++;
      }
    });
  }

  private handleHttp(req: IncomingMessage, res: any): void {
    // Security headers on all HTTP responses
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'no-referrer');

    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', ...this.getStats() }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const clientId = req.headers['sec-websocket-key'] ?? crypto.randomUUID();
    this.clients.set(clientId, ws);

    ws.on('message', (raw: Buffer) => {
      this.stats.messagesReceived++;
      try {
        const msg = JSON.parse(raw.toString()) as RelayMessage;
        if (msg.type === 'message') {
          this.publish(msg.topic, msg.data);
        }
      } catch {
        ws.send(JSON.stringify({ type: 'message', topic: '', data: 'invalid json', timestamp: Date.now() }));
      }
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      this.topics.forEach((subs, topic) => {
        if (subs.has(clientId)) this.unsubscribe(clientId, topic);
      });
    });
  }
}
