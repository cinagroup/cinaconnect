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
declare const _default: {
    fetch(request: Request, env: Env): Promise<Response>;
};
export default _default;
//# sourceMappingURL=worker.d.ts.map