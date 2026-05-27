/**
 * Cinacoin Keys Server — Cloudflare Worker
 *
 * Manages encrypted key pairs and sessions using D1 (SQLite) + KV.
 * Replaces the PostgreSQL + Redis architecture.
 */
export default {
    async fetch(request, env) {
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
                    if (request.method === 'GET')
                        return listKeypairs(request, env);
                    if (request.method === 'POST')
                        return createKeypair(request, env);
                    return methodNotAllowed();
                }
                case '/api/v1/sessions': {
                    if (request.method === 'POST')
                        return createSession(request, env);
                    return methodNotAllowed();
                }
                default:
                    return notFound();
            }
        }
        catch (err) {
            return jsonResponse({ error: 'Internal error', message: String(err) }, 500);
        }
    },
};
async function listKeypairs(request, env) {
    const url = new URL(request.url);
    const address = url.searchParams.get('address');
    let query = 'SELECT id, address, chain_id, public_key, created_at, updated_at FROM keypairs';
    const params = [];
    if (address) {
        query += ' WHERE address = ?';
        params.push(address);
    }
    const result = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse({ keypairs: result.results });
}
async function createKeypair(request, env) {
    const body = await request.json();
    const { address, chainId, encryptedKey, publicKey } = body;
    if (!address || !chainId || !encryptedKey || !publicKey) {
        return jsonResponse({ error: 'Missing required fields' }, 400);
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    await env.DB.prepare('INSERT INTO keypairs (id, address, chain_id, encrypted_key, public_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, address, chainId, encryptedKey, publicKey, now, now).run();
    return jsonResponse({ id, address, chainId, publicKey, createdAt: now }, 201);
}
async function createSession(request, env) {
    const body = await request.json();
    const { address, nonce, expiresIn } = body;
    if (!address || !nonce) {
        return jsonResponse({ error: 'Missing required fields' }, 400);
    }
    const id = crypto.randomUUID();
    const expiresAt = Date.now() + (expiresIn || 86400) * 1000;
    await env.DB.prepare('INSERT INTO sessions (id, address, nonce, expires_at) VALUES (?, ?, ?, ?)').bind(id, address, nonce, expiresAt).run();
    return jsonResponse({ id, address, expiresAt }, 201);
}
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
}
function methodNotAllowed() {
    return jsonResponse({ error: 'Method not allowed' }, 405);
}
function notFound() {
    return jsonResponse({ error: 'Not found' }, 404);
}
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}
//# sourceMappingURL=worker.js.map