import { createServer, type Server, type ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';

export interface RelayServerConfig {
  port: number;
  host?: string;
  ssl?: { key: string; cert: string };
  maxConnections?: number;
  /** Maximum messages per IP per minute (0 = disabled) */
  rateLimitPerMinute?: number;
  /** Allowed WebSocket origin patterns (empty = all allowed) */
  allowedOrigins?: string[] | RegExp;
  /** Maximum message size in bytes (default 1 MB) */
  maxMessageSize?: number;
  /** Idle connection timeout in milliseconds (default 5 minutes, 0 = disabled) */
  idleTimeoutMs?: number;
}

export interface RelayMessage {
  type: 'message' | 'ping' | 'pong' | 'close';
  topic: string;
  data: string;
  timestamp: number;
}

/** Raw shape before validation — fields may be missing or wrong-typed. */
interface RawMessage {
  type?: unknown;
  topic?: unknown;
  data?: unknown;
  timestamp?: unknown;
}

/** Result of validating a raw incoming message. */
interface ValidationResult {
  ok: boolean;
  msg?: RelayMessage;
  error?: string;
}

/** Valid values for the `type` field. */
const VALID_TYPES: ReadonlySet<string> = new Set(['message', 'ping', 'pong', 'close']);

/**
 * Sanitize a topic name: keep only alphanumeric chars and hyphens,
 * trim to 128 characters, and collapse consecutive hyphens.
 */
function sanitizeTopic(raw: string): string {
  return raw
    .replace(/[^a-zA-Z0-9-]/g, '-') // replace invalid chars with hyphens
    .replace(/-+/g, '-')             // collapse consecutive hyphens
    .replace(/^-|-$/g, '')           // strip leading/trailing hyphens
    .slice(0, 128);                   // enforce max length
}

/**
 * Validate an incoming WebSocket message.
 *
 * Checks:
 *  - Must be a plain object with required `type`, `topic`, and `data` fields.
 *  - `type` must be one of 'message', 'ping', 'pong', 'close'.
 *  - `topic` must be a non-empty string.
 *  - `data` must be a string.
 *
 * Returns a validated `RelayMessage` with topic sanitization applied.
 */
function validateMessage(raw: unknown): ValidationResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'message must be a JSON object' };
  }

  const obj = raw as RawMessage;

  // --- required fields ---
  if (typeof obj.type !== 'string') {
    return { ok: false, error: 'missing or invalid "type" field' };
  }
  if (!VALID_TYPES.has(obj.type)) {
    return { ok: false, error: `invalid type "${obj.type}" — expected one of: message, ping, pong, close` };
  }
  if (typeof obj.topic !== 'string' || obj.topic.length === 0) {
    return { ok: false, error: 'missing or empty "topic" field' };
  }
  if (typeof obj.data !== 'string') {
    return { ok: false, error: 'missing or invalid "data" field' };
  }

  return {
    ok: true,
    msg: {
      type: obj.type as RelayMessage['type'],
      topic: sanitizeTopic(obj.topic),
      data: obj.data,
      timestamp: typeof obj.timestamp === 'number' ? obj.timestamp : Date.now(),
    },
  };
}

export interface RelayStats {
  connections: number;
  messagesReceived: number;
  messagesSent: number;
  uptime: number;
}

/**
 * Simple sliding-window rate limiter for per-IP tracking.
 */
class RateLimiter {
  private windows: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxHits: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(maxHits: number, windowMs: number = 60_000) {
    this.maxHits = maxHits;
    this.windowMs = windowMs;
  }

  /** Start periodic cleanup of expired entries. */
  startCleanup(intervalMs: number = 60_000): void {
    this.cleanupInterval = setInterval(() => this.evict(), intervalMs);
    this.cleanupInterval.unref();
  }

  /** Stop the cleanup interval. */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /** Record a hit and return whether the request is allowed. */
  allow(ip: string): boolean {
    const now = Date.now();
    const timestamps = this.windows.get(ip) ?? [];
    const cutoff = now - this.windowMs;
    const recent = timestamps.filter((t) => t > cutoff);
    if (recent.length >= this.maxHits) {
      this.windows.set(ip, recent); // still persist pruned window
      return false;
    }
    recent.push(now);
    this.windows.set(ip, recent);
    return true;
  }

  /** Remove expired entries from all IPs. */
  evict(): void {
    const cutoff = Date.now() - this.windowMs;
    for (const [ip, timestamps] of this.windows) {
      const recent = timestamps.filter((t) => t > cutoff);
      if (recent.length === 0) {
        this.windows.delete(ip);
      } else {
        this.windows.set(ip, recent);
      }
    }
  }
}

/** Check whether the given Origin header matches the allowed patterns. */
function isOriginAllowed(origin: string | undefined, allowed: string[] | RegExp): boolean {
  if (!origin) return false;
  if (Array.isArray(allowed)) {
    return allowed.some((pattern) => {
      if (pattern.startsWith('*')) {
        // Wildcard suffix match: *.example.com matches foo.example.com
        const suffix = pattern.slice(1);
        return origin.endsWith(suffix);
      }
      return origin === pattern;
    });
  }
  return allowed.test(origin);
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
  private readonly config: Required<
    Omit<RelayServerConfig, 'ssl' | 'allowedOrigins'>
  > &
    Pick<RelayServerConfig, 'ssl' | 'allowedOrigins'>;
  private readonly rateLimiter: RateLimiter;
  private readonly idleTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(config: RelayServerConfig) {
    this.config = {
      port: config.port,
      host: config.host ?? '0.0.0.0',
      maxConnections: config.maxConnections ?? 1000,
      ssl: config.ssl,
      rateLimitPerMinute: config.rateLimitPerMinute ?? 100,
      allowedOrigins: config.allowedOrigins,
      maxMessageSize: config.maxMessageSize ?? 1_048_576, // 1 MB
      idleTimeoutMs: config.idleTimeoutMs ?? 300_000, // 5 minutes
    };

    this.rateLimiter = new RateLimiter(this.config.rateLimitPerMinute);
    this.rateLimiter.startCleanup();
  }

  /** Start the relay server */
  async start(): Promise<void> {
    this.server = createServer(this.handleHttp.bind(this));
    this.wss = new WebSocketServer({
      server: this.server,
      verifyClient: this.verifyClient.bind(this),
    });
    this.wss.on('connection', this.handleConnection.bind(this));

    return new Promise((resolve, reject) => {
      this.server!.listen(this.config.port, this.config.host, resolve);
      this.server!.on('error', reject);
    });
  }

  /** Stop the relay server */
  async stop(): Promise<void> {
    this.rateLimiter.stopCleanup();
    this.clients.forEach((ws) => ws.close());
    this.idleTimeouts.forEach((timer) => clearTimeout(timer));
    this.idleTimeouts.clear();
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

  /** Verify client origin on WebSocket upgrade */
  private verifyClient(info: { req: IncomingMessage }, cb: (ok: boolean, code?: number, msg?: string) => void): void {
    const allowed = this.config.allowedOrigins;
    if (!allowed) {
      // No origin restriction — allow all
      cb(true);
      return;
    }
    const origin = info.req.headers.origin;
    if (isOriginAllowed(origin, allowed)) {
      cb(true);
    } else {
      cb(false, 403, 'Forbidden: origin not allowed');
    }
  }

  /** Reset the idle timeout for a given client */
  private resetIdleTimeout(clientId: string, ws: WebSocket): void {
    const existing = this.idleTimeouts.get(clientId);
    if (existing) clearTimeout(existing);

    if (this.config.idleTimeoutMs > 0) {
      const timer = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1001, 'Idle timeout');
        }
        this.idleTimeouts.delete(clientId);
        this.clients.delete(clientId);
      }, this.config.idleTimeoutMs);
      timer.unref();
      this.idleTimeouts.set(clientId, timer);
    }
  }

  private handleHttp(req: IncomingMessage, res: ServerResponse): void {
    // Security headers on all HTTP responses
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'no-referrer');

    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const uptimeSec = Math.floor((Date.now() - this.stats.startTime) / 1000);
      res.end(JSON.stringify({
        status: 'ok',
        uptime: uptimeSec,
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const clientId = req.headers['sec-websocket-key'] ?? crypto.randomUUID();
    const ip = req.socket.remoteAddress ?? 'unknown';
    this.clients.set(clientId, ws);
    this.resetIdleTimeout(clientId, ws);

    ws.on('message', (raw: Buffer) => {
      // Message size limit
      if (raw.byteLength > this.config.maxMessageSize) {
        ws.send(
          JSON.stringify({
            type: 'message',
            topic: '',
            data: 'message too large',
            timestamp: Date.now(),
          } satisfies RelayMessage),
        );
        return;
      }

      // Per-IP rate limit
      if (this.config.rateLimitPerMinute > 0 && !this.rateLimiter.allow(ip)) {
        ws.send(
          JSON.stringify({
            type: 'message',
            topic: '',
            data: 'rate limit exceeded',
            timestamp: Date.now(),
          } satisfies RelayMessage),
        );
        return;
      }

      this.stats.messagesReceived++;
      this.resetIdleTimeout(clientId, ws);

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        ws.send(
          JSON.stringify({
            type: 'message',
            topic: '',
            data: 'invalid json',
            timestamp: Date.now(),
          } satisfies RelayMessage),
        );
        return;
      }

      const result = validateMessage(parsed);
      if (!result.ok) {
        ws.send(
          JSON.stringify({
            type: 'message',
            topic: '',
            data: `invalid message: ${result.error}`,
            timestamp: Date.now(),
          } satisfies RelayMessage),
        );
        return;
      }

      const msg = result.msg!;
      if (msg.type === 'message') {
        this.publish(msg.topic, msg.data);
      }
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      const timer = this.idleTimeouts.get(clientId);
      if (timer) {
        clearTimeout(timer);
        this.idleTimeouts.delete(clientId);
      }
      this.topics.forEach((subs, topic) => {
        if (subs.has(clientId)) this.unsubscribe(clientId, topic);
      });
    });

    ws.on('error', () => {
      // Error handler to prevent uncaught exceptions
    });
  }
}
