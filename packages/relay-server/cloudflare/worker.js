/**
 * Cinacoin Relay Server — Cloudflare Worker + Durable Objects
 *
 * Handles WalletConnect relay signaling via Durable Objects
 * for WebSocket session management.
 */
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
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
        // Store message in KV
        if (url.pathname === '/api/v1/messages' && request.method === 'POST') {
            const body = await request.json();
            const key = `msg:${body.topic}:${body.messageId}`;
            await env.RELAY_CACHE.put(key, JSON.stringify(body), {
                expirationTtl: body.ttl || 300,
            });
            return jsonResponse({ stored: true }, 201);
        }
        // Retrieve message from KV
        if (url.pathname.startsWith('/api/v1/messages/')) {
            const messageId = url.pathname.split('/').pop();
            const msg = await env.RELAY_CACHE.get(messageId);
            if (msg)
                return jsonResponse(JSON.parse(msg));
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
    constructor(state) {
        this.state = state;
        this.connections = new Map();
        this.messages = [];
    }
    async fetch(request) {
        // Upgrade to WebSocket
        const [client, server] = Object.freeze(new WebSocketPair());
        this.state.acceptWebSocket(server);
        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }
    async webSocketMessage(ws, message) {
        // Broadcast to all other connections in this session
        const data = typeof message === 'string' ? message : new TextDecoder().decode(message);
        // Store message
        this.messages.push(data);
        if (this.messages.length > 100)
            this.messages.shift();
        // Broadcast to all connected clients except sender
        for (const [id, conn] of this.connections.entries()) {
            if (conn !== ws && conn.readyState === WebSocket.OPEN) {
                conn.send(data);
            }
        }
    }
    async webSocketClose(ws, code, reason) {
        // Remove from connections
        for (const [id, conn] of this.connections) {
            if (conn === ws) {
                this.connections.delete(id);
                break;
            }
        }
    }
}
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
}
//# sourceMappingURL=worker.js.map