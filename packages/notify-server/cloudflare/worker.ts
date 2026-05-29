/**
 * Cinacoin Notify Server — Cloudflare Worker
 *
 * Notification delivery service supporting push, email, and webhook channels.
 */

import { NotifyServer } from '../dist/NotifyServer.js';
import { validateCsrf, CSRF_ALLOWED_ORIGINS, createLogger, extractRequestId } from '@cinacoin/config';

const logger = createLogger('notify-server');
const START_TIME = Date.now();

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

// ---------------------------------------------------------------------------
// Security Configuration
// ---------------------------------------------------------------------------

const KNOWN_CHANNELS = ['push', 'email', 'webhook', 'sms'] as const;
const MAX_PAYLOAD_DEPTH = 5;
const MAX_CHANNELS_PER_SUBSCRIPTION = 10;

const ALLOWED_ORIGINS = [
  'https://cinacoin.com',
  'https://dashboard.cinacoin.com',
  'http://localhost:3000',
  'http://localhost:5173',
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

function makeCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  };
}

function verifyApiKey(request: Request, env: Env): boolean {
  const apiKey = env.API_KEY;
  if (!apiKey) return true; // skip if not configured
  const auth = request.headers.get('Authorization');
  if (!auth) return false;
  const expected = `Bearer ${apiKey}`;
  return constantTimeCompare(auth, expected) || constantTimeCompare(auth, apiKey);
}

function jsonOk(data: unknown, origin: string | null): Response {
  return Response.json(data, { headers: makeCorsHeaders(origin) });
}

function jsonError(message: string, status: number, origin: string | null): Response {
  return Response.json({ error: message }, { status, headers: makeCorsHeaders(origin) });
}

const server = new NotifyServer();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get('Origin');

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: makeCorsHeaders(origin) });
    }

    // CSRF protection for state-changing requests
    const csrfError = validateCsrf(request, {
      allowedOrigins: [...CSRF_ALLOWED_ORIGINS],
    });
    if (csrfError) {
      const headers = new Headers(csrfError.headers);
      const cors = makeCorsHeaders(origin);
      for (const [k, v] of Object.entries(cors)) {
        headers.set(k, v);
      }
      return new Response(csrfError.body, { status: csrfError.status, headers });
    }

    try {
      // Health check (no auth)
      if (path === '/health') {
        const uptimeSec = Math.floor((Date.now() - START_TIME) / 1000);
        return jsonOk({ status: 'ok', uptime: uptimeSec, version: '1.0.0', timestamp: new Date().toISOString() }, origin);
      }

      // Metrics (no auth)
      if (path === '/metrics' && request.method === 'GET') {
        return jsonOk(server.getMetrics(), origin);
      }

      // All write endpoints require auth
      if (!verifyApiKey(request, env)) {
        return jsonError('Unauthorized', 401, origin);
      }

      // Send notification
      if (path === '/send' && request.method === 'POST') {
        const contentLength = request.headers.get('Content-Length');
        if (contentLength && parseInt(contentLength) > 65536) {
          return jsonError('Request too large', 413, origin);
        }
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonError('Invalid JSON', 400, origin);
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return jsonError('Request body must be a JSON object', 400, origin);
        }
        const req = body as Record<string, unknown>;
        const address = req.address;
        const payload = req.payload;
        if (typeof address !== 'string' || address.length === 0) {
          return jsonError('Missing or invalid field: address', 400, origin);
        }
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
          return jsonError('Invalid address format', 400, origin);
        }
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          return jsonError('payload must be a JSON object (not a primitive or array)', 400, origin);
        }
        const result = await server.sendNotification(address, payload as Record<string, unknown>);
        return jsonOk(result, origin);
      }

      // Subscribe
      if (path === '/subscribe' && request.method === 'POST') {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonError('Invalid JSON', 400, origin);
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return jsonError('Request body must be a JSON object', 400, origin);
        }
        const req = body as Record<string, unknown>;
        const address = req.address;
        const channels = req.channels;
        if (typeof address !== 'string' || address.length === 0) {
          return jsonError('Missing or invalid field: address', 400, origin);
        }
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
          return jsonError('Invalid address format', 400, origin);
        }
        if (!channels || !Array.isArray(channels)) {
          return jsonError('Missing or invalid field: channels', 400, origin);
        }
        if (channels.length === 0) {
          return jsonError('channels array must not be empty', 400, origin);
        }
        if (channels.length > MAX_CHANNELS_PER_SUBSCRIPTION) {
          return jsonError(`Too many channels (max ${MAX_CHANNELS_PER_SUBSCRIPTION})`, 400, origin);
        }
        for (let i = 0; i < channels.length; i++) {
          if (typeof channels[i] !== 'string' || channels[i].length === 0) {
            return jsonError(`Invalid channel name at index ${i}`, 400, origin);
          }
          if (!(KNOWN_CHANNELS as readonly string[]).includes(channels[i])) {
            return jsonError(`Unknown channel "${channels[i]}". Must be one of: ${KNOWN_CHANNELS.join(', ')}`, 400, origin);
          }
        }
        const result = await server.subscribe(address, channels as string[]);
        return jsonOk(result, origin);
      }

      // Unsubscribe
      if (path === '/unsubscribe' && request.method === 'POST') {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonError('Invalid JSON', 400, origin);
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return jsonError('Request body must be a JSON object', 400, origin);
        }
        const req = body as Record<string, unknown>;
        const address = req.address;
        if (typeof address !== 'string' || address.length === 0) {
          return jsonError('Missing or invalid field: address', 400, origin);
        }
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
          return jsonError('Invalid address format', 400, origin);
        }
        const result = await server.unsubscribe(address);
        return jsonOk(result, origin);
      }

      // Get subscriptions
      if (path === '/subscriptions' && request.method === 'GET') {
        const address = url.searchParams.get('address');
        if (!address) {
          return jsonError('Missing address parameter', 400, origin);
        }
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
          return jsonError('Invalid address format', 400, origin);
        }
        const result = await server.getSubscriptions(address);
        return jsonOk(result, origin);
      }

      // 404
      return jsonError('Not found', 404, origin);
    } catch (error) {
      const requestId = extractRequestId(request);
      logger.error('Internal error', { requestId, error: String(error) });
      return jsonError('Internal server error', 500, origin);
    }
  },
};

interface Env {
  LOG_LEVEL?: string;
  MAX_SUBSCRIPTIONS_PER_USER?: string;
  DEFAULT_RETENTION_DAYS?: string;
  API_KEY?: string;
}