/**
 * Cinacoin Push Server — Cloudflare Worker
 *
 * Push notification delivery via APNs (iOS) and FCM (Android).
 */

import { PushServer } from '../dist/PushServer.js';
// --- Inlined from @cinacoin/config ---
function createLogger(serviceName: string) {
  return {
    debug: (msg: string, ctx?: Record<string, unknown>) => console.debug(`[${serviceName}] ${msg}`, ctx ? JSON.stringify(ctx) : ''),
    info: (msg: string, ctx?: Record<string, unknown>) => console.log(`[${serviceName}] ${msg}`, ctx ? JSON.stringify(ctx) : ''),
    warn: (msg: string, ctx?: Record<string, unknown>) => console.warn(`[${serviceName}] ${msg}`, ctx ? JSON.stringify(ctx) : ''),
    error: (msg: string, ctx?: Record<string, unknown>) => console.error(`[${serviceName}] ${msg}`, ctx ? JSON.stringify(ctx) : ''),
  };
}
function extractRequestId(request: Request): string {
  return request.headers.get('x-request-id') || request.headers.get('x-correlation-id') || request.headers.get('cf-ray') || crypto.randomUUID();
}
const CSRF_ALLOWED_ORIGINS: string[] = [];
function validateCsrf(request: Request): boolean {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') return true;
  if (CSRF_ALLOWED_ORIGINS.length === 0) return true;
  const origin = request.headers.get('origin');
  return origin ? CSRF_ALLOWED_ORIGINS.includes(origin) : false;
}
// ------------------------------------

const logger = createLogger('push-server');
const START_TIME = Date.now();

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------

interface RateEntry { count: number; resetAt: number }
const rateLimits = new Map<string, RateEntry>();

function getClientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';
}

function checkRate(ip: string, limit: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

const DEFAULT_RATE_LIMIT = 100; // requests per minute

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
// Input Validation Constants
// ---------------------------------------------------------------------------

const MAX_DEVICE_TOKEN_LENGTH = 4096;
const MAX_TITLE_LENGTH = 256;
const MAX_BODY_LENGTH = 4096;
const MAX_DATA_FIELD_VALUE_LENGTH = 1024;
const MAX_BATCH_SIZE = 100;
const ALLOWED_PLATFORMS = ['apns', 'fcm'] as const;

// ---------------------------------------------------------------------------
// Security Configuration
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = [
  'https://cinacoin.com',
  'https://dash.cinacoin.com',
  'https://demo.cinacoin.com',
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
  if (!apiKey) return true; // skip if not configured (dev mode)
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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const server = new PushServer({
      timeoutMs: parseInt(env.DEFAULT_TIMEOUT_MS || '5000'),
    });

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

    // Rate limiting (skip health check)
    if (path !== '/health') {
      const ip = getClientIp(request);
      if (!checkRate(ip, DEFAULT_RATE_LIMIT)) {
        return jsonError('rate_limit_exceeded', 429, origin);
      }
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

      // Send single notification
      if (path === '/send' && request.method === 'POST') {
        const contentLength = request.headers.get('Content-Length');
        if (contentLength && parseInt(contentLength) > 65536) {
          return jsonError('Request too large', 413, origin);
        }
        let body: unknown;
        try {
          body = await request.json();
        } catch (err) {
          logger.error('Failed to parse request body', { error: String(err) });
          return jsonError('Invalid JSON', 400, origin);
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return jsonError('Request body must be a JSON object', 400, origin);
        }
        const req = body as Record<string, unknown>;
        const deviceToken = req.deviceToken;
        const title = req.title;
        const msgBody = req.body;
        const data = req.data;

        if (typeof deviceToken !== 'string' || deviceToken.length === 0) {
          return jsonError('Missing or invalid field: deviceToken', 400, origin);
        }
        if (deviceToken.length > MAX_DEVICE_TOKEN_LENGTH) {
          return jsonError('deviceToken too long (max 4096)', 400, origin);
        }
        if (typeof title !== 'string' || title.length === 0) {
          return jsonError('Missing or invalid field: title', 400, origin);
        }
        if (title.length > MAX_TITLE_LENGTH) {
          return jsonError('title too long (max 256)', 400, origin);
        }
        if (msgBody !== undefined) {
          if (typeof msgBody !== 'string') {
            return jsonError('body must be a string', 400, origin);
          }
          if (msgBody.length > MAX_BODY_LENGTH) {
            return jsonError('body too long (max 4096)', 400, origin);
          }
        }
        if (data !== undefined) {
          if (typeof data !== 'object' || data === null || Array.isArray(data)) {
            return jsonError('data must be a JSON object', 400, origin);
          }
          for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
            if (typeof v !== 'string') {
              return jsonError('data values must be strings', 400, origin);
            }
            if (v.length > MAX_DATA_FIELD_VALUE_LENGTH) {
              return jsonError(`data value too long for key "${k}" (max 1024)`, 400, origin);
            }
          }
        }
        const result = await server.send({ deviceToken, title, body: msgBody, data: data as Record<string, string> | undefined });
        return jsonOk(result, origin);
      }

      // Send batch notifications
      if (path === '/send-batch' && request.method === 'POST') {
        const contentLength = request.headers.get('Content-Length');
        if (contentLength && parseInt(contentLength) > 262144) {
          return jsonError('Request too large (max 256KB)', 413, origin);
        }
        let body: unknown;
        try {
          body = await request.json();
        } catch (err) {
          logger.error('Failed to parse batch request body', { error: String(err) });
          return jsonError('Invalid JSON', 400, origin);
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return jsonError('Request body must be a JSON object', 400, origin);
        }
        const req = body as Record<string, unknown>;
        const notifications = req.notifications;
        if (!notifications || !Array.isArray(notifications)) {
          return jsonError('Missing notifications array', 400, origin);
        }
        if (notifications.length > MAX_BATCH_SIZE) {
          return jsonError('Batch size exceeded (max 100)', 400, origin);
        }
        if (notifications.length === 0) {
          return jsonError('Notifications array must not be empty', 400, origin);
        }
        // Validate each notification item
        const validated: Array<{ deviceToken: string; title: string; body?: string }> = [];
        for (let i = 0; i < notifications.length; i++) {
          const item = notifications[i] as Record<string, unknown> | null;
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return jsonError(`Invalid notification at index ${i}`, 400, origin);
          }
          const dt = item.deviceToken;
          const ti = item.title;
          const bi = item.body;
          if (typeof dt !== 'string' || dt.length === 0) {
            return jsonError(`Missing deviceToken at index ${i}`, 400, origin);
          }
          if (dt.length > MAX_DEVICE_TOKEN_LENGTH) {
            return jsonError(`deviceToken too long at index ${i}`, 400, origin);
          }
          if (typeof ti !== 'string' || ti.length === 0) {
            return jsonError(`Missing title at index ${i}`, 400, origin);
          }
          if (ti.length > MAX_TITLE_LENGTH) {
            return jsonError(`title too long at index ${i}`, 400, origin);
          }
          if (bi !== undefined) {
            if (typeof bi !== 'string') {
              return jsonError(`body must be a string at index ${i}`, 400, origin);
            }
            if (bi.length > MAX_BODY_LENGTH) {
              return jsonError(`body too long at index ${i}`, 400, origin);
            }
          }
          validated.push({ deviceToken: dt, title: ti, body: bi });
        }
        const result = await server.sendBatch(validated);
        return jsonOk(result, origin);
      }

      // Register device token
      if (path === '/register' && request.method === 'POST') {
        let body: unknown;
        try {
          body = await request.json();
        } catch (err) {
          logger.error('Failed to parse register request body', { error: String(err) });
          return jsonError('Invalid JSON', 400, origin);
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return jsonError('Request body must be a JSON object', 400, origin);
        }
        const req = body as Record<string, unknown>;
        const deviceToken = req.deviceToken;
        const platform = req.platform;
        if (typeof deviceToken !== 'string' || deviceToken.length === 0) {
          return jsonError('Missing or invalid field: deviceToken', 400, origin);
        }
        if (deviceToken.length > MAX_DEVICE_TOKEN_LENGTH) {
          return jsonError('deviceToken too long (max 4096)', 400, origin);
        }
        if (typeof platform !== 'string' || !ALLOWED_PLATFORMS.includes(platform as typeof ALLOWED_PLATFORMS[number])) {
          return jsonError('Invalid platform. Must be "apns" or "fcm"', 400, origin);
        }
        const result = await server.registerDevice({ deviceToken, platform: platform as 'apns' | 'fcm' });
        return jsonOk(result, origin);
      }

      // Unregister device token
      if (path === '/unregister' && request.method === 'POST') {
        let body: unknown;
        try {
          body = await request.json();
        } catch (err) {
          logger.error('Failed to parse unregister request body', { error: String(err) });
          return jsonError('Invalid JSON', 400, origin);
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return jsonError('Request body must be a JSON object', 400, origin);
        }
        const req = body as Record<string, unknown>;
        const deviceToken = req.deviceToken;
        if (typeof deviceToken !== 'string' || deviceToken.length === 0) {
          return jsonError('Missing or invalid field: deviceToken', 400, origin);
        }
        if (deviceToken.length > MAX_DEVICE_TOKEN_LENGTH) {
          return jsonError('deviceToken too long (max 4096)', 400, origin);
        }
        const result = await server.unregisterDevice(deviceToken);
        return jsonOk(result, origin);
      }

      // Get delivery logs
      if (path === '/logs' && request.method === 'GET') {
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
        const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);
        const result = server.getDeliveryLog(limit, offset);
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
  MAX_QUEUE_SIZE?: string;
  DEFAULT_RETRY_ATTEMPTS?: string;
  DEFAULT_TIMEOUT_MS?: string;
  API_KEY?: string;
}