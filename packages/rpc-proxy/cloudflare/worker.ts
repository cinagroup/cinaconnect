// Cinacoin RPC Proxy — Cloudflare Worker
// Routes: POST /rpc/:chainId, GET /health, GET /metrics
// Caches read-only JSON-RPC calls in KV with configurable TTL.

import { createLogger, extractRequestId } from '@cinacoin/config';

const logger = createLogger('rpc-proxy');

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

const CHAIN_RPC_URLS: Record<string, string> = {
  "1": "https://rpc.mevblocker.io",
  "42161": "https://arbitrum.llamarpc.com",
  "8453": "https://base.llamarpc.com",
  "137": "https://polygon.llamarpc.com",
  "10": "https://optimism.llamarpc.com",
  "56": "https://bsc-dataseed.binance.org",
};

const READ_ONLY_METHODS = new Set([
  "eth_call",
  "eth_getBalance",
  "eth_blockNumber",
  "eth_getBlockByHash",
  "eth_getBlockByNumber",
  "eth_getTransactionByHash",
  "eth_getTransactionReceipt",
  "eth_getTransactionCount",
  "eth_getCode",
  "eth_getLogs",
  "eth_getStorageAt",
  "eth_chainId",
  "eth_gasPrice",
  "eth_estimateGas",
  "eth_feeHistory",
  "net_version",
  "web3_clientVersion",
]);

interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params?: unknown[];
  id: string | number | null;
}

interface JsonRpcResponse {
  jsonrpc: string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  id: string | number | null;
}

interface Metrics {
  requestCount: number;
  errorCount: number;
  cacheHits: number;
  cacheMisses: number;
  chainUsage: Record<string, number>;
  startTime: number;
}

// Global metrics storage (shared across requests within the same worker instance)
let metrics: Metrics = {
  requestCount: 0,
  errorCount: 0,
  cacheHits: 0,
  cacheMisses: 0,
  chainUsage: {},
  startTime: Date.now(),
};

interface Env {
  RPC_CACHE: KVNamespace;
  CACHE_TTL?: string | number;
  API_KEY?: string;
  RATE_LIMIT_RPM?: number;  // requests per minute
}

// ---------------------------------------------------------------------------
// Security Configuration
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = [
  'https://cinacoin.com',
  'https://dashboard.cinacoin.com',
  'http://localhost:3000',
  'http://localhost:5173',
];

const WRITE_METHODS = new Set([
  'eth_sendRawTransaction',
  'eth_sendTransaction',
  'eth_sign',
  'eth_signTransaction',
  'personal_sign',
  'personal_sendTransaction',
  'eth_accounts',
]);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

function makeCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  };
}

function cacheKey(chainId: string, body: JsonRpcRequest): string {
  const payload = JSON.stringify({ chainId, method: body.method, params: body.params ?? [] });
  const hash: ArrayBuffer | null = null;
  return `rpc:${btoa(unescape(encodeURIComponent(payload)))}`;
}

function handleMetrics(origin: string | null): Response {
  const uptime = Date.now() - metrics.startTime;
  const errorRate = metrics.requestCount > 0
    ? ((metrics.errorCount / metrics.requestCount) * 100).toFixed(2)
    : "0.00";
  const cacheHitRate = metrics.cacheHits + metrics.cacheMisses > 0
    ? ((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(2)
    : "0.00";

  return new Response(JSON.stringify({
    service: "cinacoin-rpc-proxy",
    uptime_ms: uptime,
    uptime_readable: formatUptime(uptime),
    request_count: metrics.requestCount,
    error_count: metrics.errorCount,
    error_rate_percent: parseFloat(errorRate),
    cache_hits: metrics.cacheHits,
    cache_misses: metrics.cacheMisses,
    cache_hit_rate_percent: parseFloat(cacheHitRate),
    chain_usage: metrics.chainUsage,
    timestamp: new Date().toISOString(),
  }), {
    headers: { "Content-Type": "application/json", ...makeCorsHeaders(origin), "X-Frame-Options": "DENY" },
  });
}

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

async function handleRpc(
  request: Request,
  env: Env,
  chainId: string
): Promise<Response> {
  const origin = request.headers.get("Origin");
  const headers = { "Content-Type": "application/json", ...makeCorsHeaders(origin) };

  // Update metrics
  metrics.requestCount++;
  if (!metrics.chainUsage[chainId]) {
    metrics.chainUsage[chainId] = 0;
  }
  metrics.chainUsage[chainId]++;

  const rpcUrl = CHAIN_RPC_URLS[chainId];
  if (!rpcUrl) {
    metrics.errorCount++;
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", error: { code: -32601, message: `Unsupported chain: ${chainId}` }, id: null } as JsonRpcResponse),
      { status: 400, headers }
    );
  }

  let body: JsonRpcRequest;
  try {
    body = await request.json<JsonRpcRequest>();
  } catch {
    metrics.errorCount++;
    const requestId = extractRequestId(request);
    logger.warn('Invalid JSON in RPC request', { requestId });
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Invalid JSON" }, id: null } as JsonRpcResponse),
      { status: 400, headers }
    );
  }

  if (!body.method || body.jsonrpc !== "2.0") {
    metrics.errorCount++;
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", error: { code: -32600, message: "Invalid request" }, id: body.id ?? null } as JsonRpcResponse),
      { status: 400, headers }
    );
  }

  // Block write methods entirely
  if (WRITE_METHODS.has(body.method)) {
    metrics.errorCount++;
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Write methods not supported on this proxy" }, id: body.id ?? null } as JsonRpcResponse),
      { status: 403, headers }
    );
  }

  const isReadOnly = READ_ONLY_METHODS.has(body.method);
  const ttl = Number(env.CACHE_TTL) || 300;

  // Try cache for read-only methods
  if (isReadOnly && env.RPC_CACHE) {
    const key = cacheKey(chainId, body);
    const cached = await env.RPC_CACHE.get(key);
    if (cached) {
      metrics.cacheHits++;
      return new Response(cached, { headers });
    }
    metrics.cacheMisses++;
  }

  // Forward to upstream
  try {
    const upstream = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();

    // Cache successful read-only responses
    if (isReadOnly && env.RPC_CACHE && upstream.ok) {
      const key = cacheKey(chainId, body);
      await env.RPC_CACHE.put(key, text, { expirationTtl: ttl });
    }

    return new Response(text, {
      status: upstream.status,
      headers,
    });
  } catch (err) {
    metrics.errorCount++;
    const requestId = extractRequestId(request);
    logger.error('Upstream RPC request failed', { requestId, chainId, method: body.method, error: String(err) });
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: "Upstream request failed" }, id: body.id ?? null } as JsonRpcResponse),
      { status: 502, headers }
    );
  }
}

function handleHealth(origin: string | null): Response {
  return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
    headers: { "Content-Type": "application/json", ...makeCorsHeaders(origin), "X-Frame-Options": "DENY" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    // Rate limiting (skip health check)
    if (url.pathname !== "/health") {
      const ip = getClientIp(request);
      if (!checkRate(ip, DEFAULT_RATE_LIMIT)) {
        return new Response(JSON.stringify({ error: "rate_limit_exceeded" }), {
          status: 429,
          headers: { "Content-Type": "application/json", ...makeCorsHeaders(origin) },
        });
      }
    }

    // Health check
    if (url.pathname === "/health" && request.method === "GET") {
      return handleHealth(origin);
    }

    // Metrics endpoint
    if (url.pathname === "/metrics" && request.method === "GET") {
      return handleMetrics(origin);
    }

    // RPC proxy: POST /rpc/:chainId
    const rpcMatch = url.pathname.match(/^\/rpc\/([A-Za-z0-9-]+)$/);
    if (rpcMatch && request.method === "POST") {
      const chainId = rpcMatch[1];
      if (!(chainId in CHAIN_RPC_URLS)) {
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", error: { code: -32601, message: `Unsupported chain: ${chainId}` }, id: null } as JsonRpcResponse),
          { status: 400, headers: { "Content-Type": "application/json", ...makeCorsHeaders(origin) } }
        );
      }
      return handleRpc(request, env, chainId);
    }

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: { "Content-Length": "0", ...makeCorsHeaders(origin) },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...makeCorsHeaders(origin) },
    });
  },
};