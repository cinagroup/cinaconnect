/**
 * Cinacoin — Worker API Client
 *
 * Calls the 5 deployed Cloudflare Workers.
 * All endpoints are CORS-enabled on the Workers side.
 */

/* ── deployed worker URLs ── */
export const WORKER_URLS = {
  rpcProxy: 'https://cinacoin-rpc-proxy.cinagroup.workers.dev',
  keysServer: 'https://cinacoin-keys-server.cinagroup.workers.dev',
  relayServer: 'https://cinacoin-relay-server.cinagroup.workers.dev',
  notifyServer: 'https://cinacoin-notify-server.cinagroup.workers.dev',
  pushServer: 'https://cinacoin-push-server.cinagroup.workers.dev',
} as const;

export type WorkerName = keyof typeof WORKER_URLS;

/* ── types ── */
export interface WorkerHealthResult {
  name: WorkerName;
  url: string;
  healthy: boolean;
  status: number;
  latencyMs: number;
  data?: Record<string, unknown>;
  error?: string;
}

export interface WorkerMetricsResult {
  name: WorkerName;
  url: string;
  metrics?: Record<string, unknown>;
  error?: string;
  latencyMs: number;
}

/* ── helpers ── */
async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = 8000,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/* ── health checks ── */

/** Check all 5 workers via their /health endpoint. */
export async function checkWorkerHealth(): Promise<WorkerHealthResult[]> {
  const entries = Object.entries(WORKER_URLS) as [WorkerName, string][];
  return Promise.all(
    entries.map(async ([name, url]) => {
      const start = performance.now();
      try {
        const res = await fetchWithTimeout(`${url}/health`);
        const latencyMs = Math.round(performance.now() - start);
        let data: Record<string, unknown> | undefined;
        try {
          data = await res.json();
        } catch {
          /* not JSON */
        }
        return { name, url, healthy: res.ok, status: res.status, latencyMs, data };
      } catch (err) {
        const latencyMs = Math.round(performance.now() - start);
        return {
          name,
          url,
          healthy: false,
          status: 0,
          latencyMs,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    }),
  );
}

/** Fetch metrics from all workers. Tries /metrics, falls back to /health. */
export async function fetchWorkerMetrics(): Promise<WorkerMetricsResult[]> {
  const entries = Object.entries(WORKER_URLS) as [WorkerName, string][];
  return Promise.all(
    entries.map(async ([name, url]) => {
      const start = performance.now();
      try {
        let res = await fetchWithTimeout(`${url}/metrics`, undefined, 5000);
        if (res.ok) {
          const latencyMs = Math.round(performance.now() - start);
          let metrics: Record<string, unknown>;
          try {
            metrics = await res.json();
          } catch {
            metrics = { raw: await res.text() };
          }
          return { name, url, metrics, latencyMs };
        }
        // Fallback to /health
        res = await fetchWithTimeout(`${url}/health`, undefined, 5000);
        const latencyMs = Math.round(performance.now() - start);
        if (res.ok) {
          const metrics = await res.json();
          return { name, url, metrics, latencyMs };
        }
        return { name, url, latencyMs: Math.round(performance.now() - start), error: `HTTP ${res.status}` };
      } catch (err) {
        return { name, url, latencyMs: Math.round(performance.now() - start), error: err instanceof Error ? err.message : 'Unknown error' };
      }
    }),
  );
}

/* ── action helpers ── */

/** Send a notification via the Notify Server. POST /send { address, payload } */
export async function sendNotification(
  address: string,
  payload: Record<string, unknown>,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetchWithTimeout(`${WORKER_URLS.notifyServer}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, payload }),
    });
    const body = await res.json();
    if (!res.ok) return { success: false, data: body, error: body?.error || `HTTP ${res.status}` };
    return { success: true, data: body };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Register a push token via the Push Server. POST /register { deviceToken, platform } */
export async function registerPushToken(
  deviceToken: string,
  platform: 'ios' | 'android' | 'web',
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetchWithTimeout(`${WORKER_URLS.pushServer}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceToken, platform }),
    });
    const body = await res.json();
    if (!res.ok) return { success: false, data: body, error: body?.error || `HTTP ${res.status}` };
    return { success: true, data: body };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Create a keypair via the Keys Server. POST /api/v1/keypairs */
export async function createKeypair(
  address: string,
  chainId: number,
  encryptedKey: string,
  publicKey: string,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetchWithTimeout(`${WORKER_URLS.keysServer}/api/v1/keypairs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, chainId, encryptedKey, publicKey }),
    });
    const body = await res.json();
    if (!res.ok) return { success: false, data: body, error: body?.error || `HTTP ${res.status}` };
    return { success: true, data: body };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Create a session via the Keys Server. POST /api/v1/sessions */
export async function createSession(
  address: string,
  nonce: string,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetchWithTimeout(`${WORKER_URLS.keysServer}/api/v1/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, nonce }),
    });
    const body = await res.json();
    if (!res.ok) return { success: false, data: body, error: body?.error || `HTTP ${res.status}` };
    return { success: true, data: body };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Relay a message via the Relay Server. POST /api/v1/messages */
export async function relayMessage(
  topic: string,
  message: string,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetchWithTimeout(`${WORKER_URLS.relayServer}/api/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, message }),
    });
    const body = await res.json();
    if (!res.ok) return { success: false, data: body, error: body?.error || `HTTP ${res.status}` };
    return { success: true, data: body };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Proxy an EIP-1193 JSON-RPC request through the RPC Proxy Worker. */
export async function rpcProxyRequest(
  method: string,
  params?: unknown[],
): Promise<unknown> {
  const res = await fetchWithTimeout(WORKER_URLS.rpcProxy, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: params ?? [] }),
  });
  const body = await res.json();
  if (!res.ok || body.error) {
    throw new Error(body.error?.message || `RPC Proxy error: HTTP ${res.status}`);
  }
  return body.result;
}
