// Cinacoin RPC Proxy — Cloudflare Worker
// Routes: POST /rpc/:chainId, GET /health, GET /metrics
// Caches read-only JSON-RPC calls in KV with configurable TTL.

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

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  return headers;
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
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
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
  env: { RPC_CACHE: KVNamespace; CACHE_TTL?: string | number },
  chainId: string
): Promise<Response> {
  const origin = request.headers.get("Origin");
  const headers = { "Content-Type": "application/json", ...corsHeaders(origin) };

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
    const message = err instanceof Error ? err.message : "Upstream request failed";
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message }, id: body.id ?? null } as JsonRpcResponse),
      { status: 502, headers }
    );
  }
}

function handleHealth(origin: string | null): Response {
  return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request: Request, env: { RPC_CACHE: KVNamespace; CACHE_TTL?: string | number }): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    // Health check
    if (url.pathname === "/health" && request.method === "GET") {
      return handleHealth(origin);
    }

    // Metrics endpoint
    if (url.pathname === "/metrics" && request.method === "GET") {
      return handleMetrics(origin);
    }

    // RPC proxy: POST /rpc/:chainId
    const rpcMatch = url.pathname.match(/^\/rpc\/([\w-]+)$/);
    if (rpcMatch && request.method === "POST") {
      return handleRpc(request, env, rpcMatch[1]);
    }

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: { "Content-Length": "0", ...corsHeaders(origin) },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  },
};