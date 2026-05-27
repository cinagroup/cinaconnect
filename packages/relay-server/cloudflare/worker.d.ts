/**
 * Cinacoin Relay Server — Cloudflare Worker + Durable Objects
 *
 * Handles WalletConnect relay signaling via Durable Objects
 * for WebSocket session management.
 */
interface Env {
    RELAY_SESSION: DurableObjectNamespace;
    RELAY_CACHE: KVNamespace;
}
declare const _default: {
    fetch(request: Request, env: Env): Promise<Response>;
};
export default _default;
/**
 * Durable Object for managing individual relay sessions.
 * Each session gets its own isolated state.
 */
export declare class RelaySession {
    private state;
    private connections;
    private messages;
    constructor(state: DurableObjectState);
    fetch(request: Request): Promise<Response>;
    webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void>;
    webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void>;
}
//# sourceMappingURL=worker.d.ts.map