/**
 * Cinacoin Keys Server — Cloudflare Worker
 *
 * Manages encrypted key pairs and sessions using D1 (SQLite) + KV.
 * Replaces the PostgreSQL + Redis architecture.
 */

interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  ENCRYPTION_KEY?: string;
}

interface Metrics {
  requestCount: number;
  errorCount: number;
  keypairCreateCount: number;
  keypairListCount: number;
  sessionCreateCount: number;
  startTime: number;
}

// Global metrics storage
let metrics: Metrics = {
  requestCount: 0,
  errorCount: 0,
  keypairCreateCount: 0,
  keypairListCount: 0,
  sessionCreateCount: 0,
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
    service: "cinacoin-keys-server",
    uptime_ms: uptime,
    uptime_readable: formatUptime(uptime),
    request_count: metrics.requestCount,
    error_count: metrics.errorCount,
    error_rate_percent: parseFloat(errorRate),
    keypair_create_count: metrics.keypairCreateCount,
    keypair_list_count: metrics.keypairListCount,
    session_create_count: metrics.sessionCreateCount,
    timestamp: new Date().toISOString(),
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    metrics.requestCount++;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    try {
      switch (url.pathname) {
        case '/health':
          return jsonResponse({ status: 'ok', timestamp: Date.now() });

        case '/metrics':
          return handleMetrics();

        case '/api/v1/keypairs': {
          if (request.method === 'GET') return listKeypairs(request, env);
          if (request.method === 'POST') return createKeypair(request, env);
          return methodNotAllowed();
        }

        case '/api/v1/sessions': {
          if (request.method === 'POST') return createSession(request, env);
          return methodNotAllowed();
        }

        default:
          return notFound();
      }
    } catch (err) {
      metrics.errorCount++;
      return jsonResponse({ error: 'Internal error', message: String(err) }, 500);
    }
  },
};

async function listKeypairs(request: Request, env: Env): Promise<Response> {
  metrics.keypairListCount++;

  const url = new URL(request.url);
  const address = url.searchParams.get('address');

  let query = 'SELECT id, address, chain_id, public_key, created_at, updated_at FROM keypairs';
  const params: string[] = [];

  if (address) {
    query += ' WHERE address = ?';
    params.push(address);
  }

  const result = await env.DB.prepare(query).bind(...params).all();
  return jsonResponse({ keypairs: result.results });
}

async function createKeypair(request: Request, env: Env): Promise<Response> {
  metrics.keypairCreateCount++;

  const body = await request.json();
  const { address, chainId, encryptedKey, publicKey } = body;

  if (!address || !chainId || !encryptedKey || !publicKey) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }

  const id = crypto.randomUUID();
  const now = Date.now();

  await env.DB.prepare(
    'INSERT INTO keypairs (id, address, chain_id, encrypted_key, public_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, address, chainId, encryptedKey, publicKey, now, now).run();

  return jsonResponse({ id, address, chainId, publicKey, createdAt: now }, 201);
}

async function createSession(request: Request, env: Env): Promise<Response> {
  metrics.sessionCreateCount++;

  const body = await request.json();
  const { address, nonce, expiresIn } = body;

  if (!address || !nonce) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }

  const id = crypto.randomUUID();
  const expiresAt = Date.now() + (expiresIn || 86400) * 1000;

  await env.DB.prepare(
    'INSERT INTO sessions (id, address, nonce, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(id, address, nonce, expiresAt).run();

  return jsonResponse({ id, address, expiresAt }, 201);
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

function methodNotAllowed(): Response {
  return jsonResponse({ error: 'Method not allowed' }, 405);
}

function notFound(): Response {
  return jsonResponse({ error: 'Not found' }, 404);
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}