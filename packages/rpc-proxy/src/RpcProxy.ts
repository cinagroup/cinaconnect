import { createServer, type Server, IncomingMessage, ServerResponse } from 'http';

export interface RpcProxyConfig {
  port: number;
  host?: string;
  /** Map of chain name → RPC URL */
  chains: Record<string, string>;
  /** Default chain for requests without chain routing */
  defaultChain?: string;
  /** Cache TTL in milliseconds (0 = disabled) */
  cacheTtlMs?: number;
  /** Max requests per IP per minute (0 = disabled) */
  rateLimitPerMinute?: number;
}

interface CacheEntry {
  response: unknown;
  timestamp: number;
}

interface RateEntry {
  count: number;
  resetAt: number;
}

/**
 * RpcProxy — Multi-chain RPC proxy with routing, caching, and rate limiting.
 * Forwards JSON-RPC requests to the appropriate chain backend.
 */
export class RpcProxy {
  private server: Server | null = null;
  private cache: Map<string, CacheEntry> = new Map();
  private rateLimits: Map<string, RateEntry> = new Map();
  private readonly config: Required<Omit<RpcProxyConfig, 'host'>> & Pick<RpcProxyConfig, 'host'>;

  constructor(config: RpcProxyConfig) {
    this.config = {
      port: config.port,
      host: config.host ?? '0.0.0.0',
      chains: config.chains,
      defaultChain: config.defaultChain ?? Object.keys(config.chains)[0] ?? 'mainnet',
      cacheTtlMs: config.cacheTtlMs ?? 0,
      rateLimitPerMinute: config.rateLimitPerMinute ?? 0,
    };
  }

  /** Start the proxy server */
  async start(): Promise<void> {
    this.server = createServer(this.handleRequest.bind(this));
    return new Promise((resolve, reject) => {
      this.server!.listen(this.config.port, this.config.host, resolve);
      this.server!.on('error', reject);
    });
  }

  /** Stop the proxy server */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server?.close((err?: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /** Get configured chains */
  getChains(): Record<string, string> {
    return { ...this.config.chains };
  }

  /** Forward a JSON-RPC request to a specific chain */
  async forwardRpc(chain: string, body: unknown): Promise<unknown> {
    const rpcUrl = this.config.chains[chain];
    if (!rpcUrl) {
      throw new Error(`Unknown chain: ${chain}`);
    }

    const bodyStr = JSON.stringify(body);
    const cacheKey = `${chain}:${bodyStr}`;

    // Check cache for read-only methods
    if (this.config.cacheTtlMs > 0 && this.isReadOnly(body)) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTtlMs) {
        return cached.response;
      }
    }

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
    });

    if (!response.ok) {
      throw new Error(`RPC error from ${chain}: ${response.status}`);
    }

    const result = await response.json();

    // Cache read-only responses
    if (this.config.cacheTtlMs > 0 && this.isReadOnly(body)) {
      this.cache.set(cacheKey, { response: result, timestamp: Date.now() });
      // Clean expired entries
      this.pruneCache();
    }

    return result;
  }

  private isReadOnly(body: unknown): boolean {
    if (typeof body !== 'object' || body === null) return false;
    const method = (body as Record<string, unknown>).method;
    if (typeof method !== 'string') return false;
    // Cache eth_call, eth_blockNumber, eth_getBalance, etc.
    return method.startsWith('eth_get') || method === 'eth_call' || method === 'eth_blockNumber';
  }

  private pruneCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.config.cacheTtlMs) {
        this.cache.delete(key);
      }
    }
  }

  private checkRateLimit(ip: string): boolean {
    if (this.config.rateLimitPerMinute === 0) return true;
    const entry = this.rateLimits.get(ip);
    const now = Date.now();
    if (!entry || now > entry.resetAt) {
      this.rateLimits.set(ip, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    if (entry.count >= this.config.rateLimitPerMinute) return false;
    entry.count++;
    return true;
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    if (req.method !== 'POST') {
      res.writeHead(405);
      res.end('Method Not Allowed');
      return;
    }

    const ip = req.socket.remoteAddress ?? 'unknown';
    if (!this.checkRateLimit(ip)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Rate limit exceeded' }, id: null }));
      return;
    }

    let body = '';
    req.on('data', (chunk: Buffer) => (body += chunk));
    req.on('end', async () => {
      try {
        const chain = this.resolveChain(req);
        const parsed = JSON.parse(body);
        const result = await this.forwardRpc(chain, parsed);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: (err as Error).message }, id: null }));
      }
    });
  }

  private resolveChain(req: IncomingMessage): string {
    // Try X-Chain-Id header first, then fall back to default
    const chainHeader = req.headers['x-chain-id'];
    if (chainHeader && this.config.chains[chainHeader as string]) {
      return chainHeader as string;
    }
    return this.config.defaultChain;
  }
}
