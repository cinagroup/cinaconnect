/**
 * Cinacoin Relay Server — Cloudflare Worker + Durable Objects
 *
 * Handles WalletConnect relay signaling via Durable Objects
 * for WebSocket session management.
 */

import { validateCsrf, CSRF_ALLOWED_ORIGINS, createLogger, extractRequestId } from '@cinacoin/config';

const logger = createLogger('relay-server');

// ---------------------------------------------------------------------------
// Security Utilities
// ---------------------------------------------------------------------------

/** Constant-time string comparison to prevent timing attacks on API key validation. */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBuf = new TextEncoder().encode(a);
  const bBuf = new TextEncoder().encode(b);
  let result = 0;
  for (let i = 0; i < aBuf.length; i++) {
    result |= aBuf[i] ^ bBuf[i];
  }
  return result === 0;
}

interface Env {
  RELAY_SESSION: DurableObjectNamespace;
  RELAY_CACHE: KVNamespace;
  API_KEY?: string;
}

interface Metrics {
  requestCount: number;
  errorCount: number;
  messageStoreCount: number;
  messageRetrieveCount: number;
  activeSessions: number;
  startTime: number;
}

// Global metrics storage
let metrics: Metrics = {
  requestCount: 0,
  errorCount: 0,
  messageStoreCount: 0,
  messageRetrieveCount: 0,
  activeSessions: 0,
  startTime: Date.now(),
};

// ---------------------------------------------------------------------------
// Security Configuration
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = [
  'https://cinacoin.com',
  'https://dashboard.cinacoin.com',
  'http://localhost:3000',
  'http://localhost:5173',
];

const MAX_POST_BODY_BYTES = 65536; // 64 KB
const MAX_KV_TTL_SECONDS = 3600;   // max 1 hour

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function jsonResponse(data: unknown, status = 200, origin: string | null = null): Response {
  const headers: Record<string, string> = {
    ...corsHeaders(origin),
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  };
  return new Response(JSON.stringify(data), { status, headers });
}

/** Verify API key from Authorization header */
function verifyApiKey(request: Request, env: Env): boolean {
  const apiKey = env.API_KEY;
  if (!apiKey) return true; // skip if not configured (dev)
  const auth = request.headers.get('Authorization');
  if (!auth) return false;
  const expected = `Bearer ${apiKey}`;
  return constantTimeCompare(auth, expected) || constantTimeCompare(auth, apiKey);
}

/** Enforce POST body size limit */
async function enforceBodySizeLimit(request: Request, origin: string | null): Promise<Response | null> {
  const contentLength = request.headers.get('Content-Length');
  if (contentLength && parseInt(contentLength, 10) > MAX_POST_BODY_BYTES) {
    return jsonResponse({ error: 'Request too large' }, 413, origin);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Request Handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    metrics.requestCount++;
    const origin = request.headers.get('Origin');

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    // CSRF protection for state-changing requests
    const csrfError = validateCsrf(request, {
      allowedOrigins: [...CSRF_ALLOWED_ORIGINS],
    });
    if (csrfError) {
      const headers = new Headers(csrfError.headers);
      const cors = corsHeaders(origin);
      for (const [k, v] of Object.entries(cors)) {
        headers.set(k, v);
      }
      return new Response(csrfError.body, { status: csrfError.status, headers });
    }

    // Route to Durable Object by session ID
    if (url.pathname.startsWith('/relay/')) {
      const sessionId = url.pathname.split('/')[2];
      const id = env.RELAY_SESSION.idFromName(sessionId);
      const stub = env.RELAY_SESSION.get(id);
      return stub.fetch(request);
    }

    // Health check
    if (url.pathname === '/health') {
      return jsonResponse({ status: 'ok', timestamp: Date.now() }, 200, origin);
    }

    // Metrics endpoint
    if (url.pathname === '/metrics') {
      return handleMetrics(origin);
    }

    // Store message in KV
    if (url.pathname === '/api/v1/messages' && request.method === 'POST') {
      // Require API key
      if (!verifyApiKey(request, env)) {
        return jsonResponse({ error: 'Unauthorized' }, 401, origin);
      }

      // Enforce body size limit
      const sizeError = await enforceBodySizeLimit(request, origin);
      if (sizeError) return sizeError;

      metrics.messageStoreCount++;

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        metrics.errorCount++;
        const requestId = extractRequestId(request);
        logger.warn('Invalid JSON in message store request', { requestId });
        return jsonResponse({ error: 'Invalid JSON' }, 400, origin);
      }

      const parsed = body as Record<string, unknown>;

      // Validate required fields
      const topic = parsed.topic;
      const messageId = parsed.messageId;

      if (typeof topic !== 'string' || topic.length === 0) {
        return jsonResponse({ error: 'Missing or invalid topic' }, 400, origin);
      }
      if (typeof messageId !== 'string' || messageId.length === 0) {
        return jsonResponse({ error: 'Missing or invalid messageId' }, 400, origin);
      }

      const key = `msg:${topic}:${messageId}`;
      // Clamp TTL to max 3600 seconds
      const ttl = typeof parsed.ttl === 'number'
        ? Math.min(Math.max(parsed.ttl, 1), MAX_KV_TTL_SECONDS)
        : 300;

      await env.RELAY_CACHE.put(key, JSON.stringify(body), {
        expirationTtl: ttl,
      });
      return jsonResponse({ stored: true }, 201, origin);
    }

    // Retrieve message from KV
    if (url.pathname.startsWith('/api/v1/messages/')) {
      metrics.messageRetrieveCount++;
      const messageId = url.pathname.split('/').pop();
      if (!messageId || messageId.length === 0) {
        return jsonResponse({ error: 'Missing messageId' }, 400, origin);
      }
      const msg = await env.RELAY_CACHE.get(messageId);
      if (msg) return jsonResponse(JSON.parse(msg), 200, origin);
      metrics.errorCount++;
      logger.warn('Message not found in KV', { messageId });
      return jsonResponse({ error: 'Not found' }, 404, origin);
    }

    return jsonResponse({ error: 'Not found' }, 404, origin);
  },
};

function handleMetrics(origin: string | null): Response {
  const uptime = Date.now() - metrics.startTime;
  const errorRate = metrics.requestCount > 0
    ? ((metrics.errorCount / metrics.requestCount) * 100).toFixed(2)
    : "0.00";

  return jsonResponse({
    service: "cinacoin-relay-server",
    uptime_ms: uptime,
    uptime_readable: formatUptime(uptime),
    request_count: metrics.requestCount,
    error_count: metrics.errorCount,
    error_rate_percent: parseFloat(errorRate),
    message_store_count: metrics.messageStoreCount,
    message_retrieve_count: metrics.messageRetrieveCount,
    active_sessions: metrics.activeSessions,
    timestamp: new Date().toISOString(),
  }, 200, origin);
}

/**
 * Durable Object for managing individual relay sessions.
 * Each session gets its own isolated state.
 */
export class RelaySession {
  private state: DurableObjectState;
  private connections: Map<string, WebSocket>;
  private messages: string[];
  private messageTimestamps: number[]; // for rate limiting

  // Constants
  private static readonly MAX_MESSAGE_SIZE = 65536; // 64 KB
  private static readonly MAX_MESSAGES_PER_SECOND = 10;
  private static readonly MAX_CONNECTIONS = 50;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.connections = new Map();
    this.messages = [];
    this.messageTimestamps = [];
  }

  async fetch(request: Request): Promise<Response> {
    // Enforce connection limit per session
    if (this.connections.size >= RelaySession.MAX_CONNECTIONS) {
      logger.warn('Connection limit reached for session', { connections: this.connections.size });
      return new Response(JSON.stringify({ error: 'Connection limit reached' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Upgrade to WebSocket
    const [client, server] = Object.freeze(new WebSocketPair());

    // Track this connection for limit enforcement and broadcasting
    const connId = crypto.randomUUID();
    this.connections.set(connId, client);

    // Decrement on close and remove from tracked connections
    server.addEventListener('close', () => {
      this.connections.delete(connId);
      metrics.activeSessions--;
    });

    // Increment active sessions counter
    metrics.activeSessions++;

    this.state.acceptWebSocket(server);

    // Decrement on close
    server.addEventListener('close', () => {
      metrics.activeSessions--;
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // Enforce message size limit (64 KB)
    const size = typeof message === 'string' ? new TextEncoder().encode(message).length : message.byteLength;
    if (size > RelaySession.MAX_MESSAGE_SIZE) {
      // Silently drop oversized messages
      return;
    }

    const data = typeof message === 'string' ? message : new TextDecoder().decode(message);

    // Validate that message is valid JSON before processing
    try {
      JSON.parse(data);
    } catch {
      // Silently drop invalid JSON
      return;
    }

    // Rate limiting: max 10 messages per second per session
    const now = Date.now();
    // Remove timestamps older than 1 second
    this.messageTimestamps = this.messageTimestamps.filter(ts => now - ts < 1000);
    if (this.messageTimestamps.length >= RelaySession.MAX_MESSAGES_PER_SECOND) {
      // Rate limited — drop the message
      return;
    }
    this.messageTimestamps.push(now);

    // Store message
    this.messages.push(data);
    if (this.messages.length > 100) this.messages.shift();

    // Broadcast to all connected clients except sender
    for (const [id, conn] of this.connections.entries()) {
      if (conn !== ws && conn.readyState === WebSocket.OPEN) {
        conn.send(data);
      }
    }
  }

  async webSocketClose(_ws: WebSocket, code: number, reason: string): Promise<void> {
    // Connection tracking is cleaned up via the client 'close' event listener
    // registered in fetch(). The server-side ws passed here is different from
    // the client WebSocket we track in this.connections.
    logger.debug('WebSocket closed', { code, reason });
  }
}
