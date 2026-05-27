/**
 * Cinacoin Relay Server — Cloudflare Worker + Durable Objects
 *
 * Handles WalletConnect relay signaling via Durable Objects
 * for WebSocket session management.
 */

interface Env {
  RELAY_SESSION: DurableObjectNamespace;
  RELAY_CACHE: KVNamespace;
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

function handleMetrics(): Response {
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
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    metrics.requestCount++;

    // Route to Durable Object by session ID
    if (url.pathname.startsWith('/relay/')) {
      const sessionId = url.pathname.split('/')[2];
      const id = env.RELAY_SESSION.idFromName(sessionId);
      const stub = env.RELAY_SESSION.get(id);
      return stub.fetch(request);
    }

    // Health check
    if (url.pathname === '/health') {
      return jsonResponse({ status: 'ok', timestamp: Date.now() });
    }

    // Metrics endpoint
    if (url.pathname === '/metrics') {
      return handleMetrics();
    }

    // Store message in KV
    if (url.pathname === '/api/v1/messages' && request.method === 'POST') {
      metrics.messageStoreCount++;
      const body = await request.json();
      const key = `msg:${body.topic}:${body.messageId}`;
      await env.RELAY_CACHE.put(key, JSON.stringify(body), {
        expirationTtl: body.ttl || 300,
      });
      return jsonResponse({ stored: true }, 201);
    }

    // Retrieve message from KV
    if (url.pathname.startsWith('/api/v1/messages/')) {
      metrics.messageRetrieveCount++;
      const messageId = url.pathname.split('/').pop();
      const msg = await env.RELAY_CACHE.get(messageId);
      if (msg) return jsonResponse(JSON.parse(msg));
      metrics.errorCount++;
      return jsonResponse({ error: 'Not found' }, 404);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  },
};

/**
 * Durable Object for managing individual relay sessions.
 * Each session gets its own isolated state.
 */
export class RelaySession {
  private state: DurableObjectState;
  private connections: Map<string, WebSocket>;
  private messages: string[];

  constructor(state: DurableObjectState) {
    this.state = state;
    this.connections = new Map();
    this.messages = [];
  }

  async fetch(request: Request): Promise<Response> {
    // Upgrade to WebSocket
    const [client, server] = Object.freeze(new WebSocketPair());

    this.state.acceptWebSocket(server);

    // Increment active sessions counter
    metrics.activeSessions++;

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
    // Broadcast to all other connections in this session
    const data = typeof message === 'string' ? message : new TextDecoder().decode(message);

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

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    // Remove from connections
    for (const [id, conn] of this.connections) {
      if (conn === ws) {
        this.connections.delete(id);
        break;
      }
    }
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}