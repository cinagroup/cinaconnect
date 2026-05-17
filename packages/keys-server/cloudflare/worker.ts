/**
 * CinaConnect Keys Server — Cloudflare Worker
 *
 * Manages encrypted key pairs and sessions using D1 (SQLite) + KV.
 * Replaces the PostgreSQL + Redis architecture.
 */

interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  ENCRYPTION_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    try {
      switch (url.pathname) {
        case '/health':
          return jsonResponse({ status: 'ok', timestamp: Date.now() });

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
      return jsonResponse({ error: 'Internal error', message: String(err) }, 500);
    }
  },
};

async function listKeypairs(request: Request, env: Env): Promise<Response> {
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
