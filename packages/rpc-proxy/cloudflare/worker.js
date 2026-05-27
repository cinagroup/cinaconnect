// Cinacoin RPC Proxy — Cloudflare Worker
// Routes: POST /rpc/:chainId, GET /health
// Caches read-only JSON-RPC calls in KV with configurable TTL.
const CHAIN_RPC_URLS = {
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
function corsHeaders(origin) {
    const headers = {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
    };
    return headers;
}
function cacheKey(chainId, body) {
    const payload = JSON.stringify({ chainId, method: body.method, params: body.params ?? [] });
    const hash = null;
    return `rpc:${btoa(unescape(encodeURIComponent(payload)))}`;
}
async function handleRpc(request, env, chainId) {
    const origin = request.headers.get("Origin");
    const headers = { "Content-Type": "application/json", ...corsHeaders(origin) };
    const rpcUrl = CHAIN_RPC_URLS[chainId];
    if (!rpcUrl) {
        return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32601, message: `Unsupported chain: ${chainId}` }, id: null }), { status: 400, headers });
    }
    let body;
    try {
        body = await request.json();
    }
    catch {
        return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Invalid JSON" }, id: null }), { status: 400, headers });
    }
    if (!body.method || body.jsonrpc !== "2.0") {
        return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32600, message: "Invalid request" }, id: body.id ?? null }), { status: 400, headers });
    }
    const isReadOnly = READ_ONLY_METHODS.has(body.method);
    const ttl = Number(env.CACHE_TTL) || 300;
    // Try cache for read-only methods
    if (isReadOnly && env.RPC_CACHE) {
        const key = cacheKey(chainId, body);
        const cached = await env.RPC_CACHE.get(key);
        if (cached) {
            return new Response(cached, { headers });
        }
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
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Upstream request failed";
        return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message }, id: body.id ?? null }), { status: 502, headers });
    }
}
function handleHealth(origin) {
    return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
}
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const origin = request.headers.get("Origin");
        // Health check
        if (url.pathname === "/health" && request.method === "GET") {
            return handleHealth(origin);
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
//# sourceMappingURL=worker.js.map