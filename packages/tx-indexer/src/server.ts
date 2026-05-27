/**
 * REST API server for @cinacoin/tx-indexer.
 *
 * Minimal HTTP server exposing indexed events via REST endpoints.
 * Uses Node.js native `http` module — no framework dependency.
 */

import http from 'node:http';
import { TxIndexer } from './indexer.js';
import type { IndexerConfig, ApiHealthStatus, RestApiConfig } from './types.js';

// ---------------------------------------------------------------------------
// CORS Configuration (Production Security)
// ---------------------------------------------------------------------------

/** Allowed origins for CORS — restrict in production */
const ALLOWED_ORIGINS = [
  'https://cinacoin.com',
  'https://www.cinacoin.com',
  'https://dashboard.cinacoin.com',
  'http://localhost:3000',    // dev only
  'http://localhost:5173',    // dev only
];

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

function setCorsHeaders(res: http.ServerResponse, origin?: string): void {
  const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24h cache preflight
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
}

function verifyApiKey(req: http.IncomingMessage, apiKey: string | undefined): boolean {
  if (!apiKey) return true; // skip if not configured
  const auth = req.headers.authorization;
  if (!auth) return false;
  return auth === `Bearer ${apiKey}` || auth === apiKey;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(res: http.ServerResponse, status: number, body: unknown, origin?: string): void {
  const payload = JSON.stringify(body);
  setCorsHeaders(res, origin);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function parseUrl(url: string): { pathname: string; searchParams: URLSearchParams } {
  const u = new URL(url, 'http://localhost');
  return { pathname: u.pathname, searchParams: u.searchParams };
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

export class IndexerServer {
  private indexer: TxIndexer;
  private config: RestApiConfig;
  private httpServer: http.Server | null = null;

  constructor(indexerConfig: IndexerConfig, serverConfig: RestApiConfig) {
    this.indexer = new TxIndexer(indexerConfig);
    this.config = serverConfig;
  }

  /** Start the HTTP server and the indexer. */
  async start(): Promise<void> {
    await this.indexer.start();

    this.httpServer = http.createServer((req, res) => this.handleRequest(req, res));

    const host = this.config.host ?? '0.0.0.0';
    const port = this.config.port;

    await new Promise<void>((resolve) => {
      this.httpServer!.listen(port, host, () => {
        console.log(`[IndexerServer] Listening on ${host}:${port}${this.config.basePath ?? '/api/v1'}`);
        resolve();
      });
    });
  }

  /** Stop the server and indexer. */
  stop(): void {
    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }
    this.indexer.close();
  }

  /** Get the underlying indexer instance. */
  getIndexer(): TxIndexer {
    return this.indexer;
  }

  // -- Request handling ----------------------------------------------------

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const origin = req.headers.origin;

    // CORS preflight
    if (req.method === 'OPTIONS') {
      if (!isAllowedOrigin(origin)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      setCorsHeaders(res, origin);
      res.writeHead(204);
      res.end();
      return;
    }

    const { pathname, searchParams } = parseUrl(req.url ?? '/');
    const basePath = this.config.basePath ?? '/api/v1';

    // Reject non-GET/POST methods
    if (req.method !== 'GET' && req.method !== 'POST') {
      setCorsHeaders(res, origin);
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
      return;
    }

    try {
      // Health endpoint is public
      if (pathname === `${basePath}/health`) {
        await this.handleHealth(res, origin);
        return;
      }

      // All other endpoints require auth if API key is configured
      if (!verifyApiKey(req, this.config.apiKey)) {
        setCorsHeaders(res, origin);
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      // Events
      if (pathname === `${basePath}/events`) {
        await this.handleEvents(searchParams, res, origin);
        return;
      }

      // Single event
      const eventMatch = pathname.match(/^\/api\/v1\/events\/([a-zA-Z0-9_-]+)$/);
      if (eventMatch) {
        this.handleEventById(eventMatch[1], res, origin);
        return;
      }

      // Chain states
      if (pathname === `${basePath}/chains`) {
        this.handleChains(res, origin);
        return;
      }

      // Not found
      jsonResponse(res, 404, { error: 'Not found', path: pathname }, origin);
    } catch (err) {
      console.error('[IndexerServer] Error:', err);
      jsonResponse(res, 500, { error: 'Internal server error' }, origin);
    }
  }

  // -- Handlers ------------------------------------------------------------

  private async handleHealth(res: http.ServerResponse, origin?: string): Promise<void> {
    const states = this.indexer.getChainStates();
    const status: ApiHealthStatus = {
      status: this.indexer.isRunning() ? 'ok' : 'error',
      indexedChains: states.map((s) => ({
        chainId: s.chainId,
        name: s.chainId === 1 ? 'Ethereum' : s.chainId === 137 ? 'Polygon' : s.chainId === 56 ? 'BSC' : `Chain ${s.chainId}`,
        latestIndexedBlock: s.latestBlock,
        chainHeadBlock: s.latestBlock, // would require RPC call for real head
        lag: 0,
        lastUpdated: s.lastUpdated,
      })),
      totalEvents: this.indexer.getTotalEvents(),
      uptime: this.indexer.getUptime(),
    };
    jsonResponse(res, 200, status, origin);
  }

  private handleEvents(params: URLSearchParams, res: http.ServerResponse, origin?: string): void {
    // Input validation & sanitization
    const limit = params.has('limit') ? Math.min(Math.max(Number(params.get('limit')), 1), 100) : 50;
    const offset = params.has('offset') ? Math.max(Number(params.get('offset')), 0) : 0;
    const chainId = params.has('chainId') ? Number(params.get('chainId')) : undefined;
    const blockFrom = params.has('blockFrom') ? Number(params.get('blockFrom')) : undefined;
    const blockTo = params.has('blockTo') ? Number(params.get('blockTo')) : undefined;
    const timeFrom = params.has('timeFrom') ? Number(params.get('timeFrom')) : undefined;
    const timeTo = params.has('timeTo') ? Number(params.get('timeTo')) : undefined;

    // Validate addresses are hex format
    const address = params.get('address');
    if (address && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      jsonResponse(res, 400, { error: 'Invalid address format' }, origin);
      return;
    }

    const tokenAddress = params.get('tokenAddress');
    if (tokenAddress && !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      jsonResponse(res, 400, { error: 'Invalid token address format' }, origin);
      return;
    }

    const q = {
      address: address,
      chainId,
      eventType: params.get('eventType') || undefined,
      tokenAddress,
      timeFrom,
      timeTo,
      blockFrom,
      blockTo,
      limit,
      offset,
      sortOrder: (params.get('sortOrder') as 'asc' | 'desc') ?? 'desc',
    };

    const result = this.indexer.queryEvents(q);
    jsonResponse(res, 200, result, origin);
  }

  private handleEventById(id: string, res: http.ServerResponse, origin?: string): void {
    // Validate ID format (alphanumeric + underscores + hyphens only)
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
      jsonResponse(res, 400, { error: 'Invalid event ID format' }, origin);
      return;
    }
    const result = this.indexer.queryEvents({});
    const event = result.events.find((e) => e.id === id);
    if (!event) {
      jsonResponse(res, 404, { error: 'Event not found', id }, origin);
      return;
    }
    jsonResponse(res, 200, event, origin);
  }

  private handleChains(res: http.ServerResponse, origin?: string): void {
    const states = this.indexer.getChainStates();
    jsonResponse(res, 200, { chains: states }, origin);
  }
}

/** Convenience: create and start an indexer server. */
export async function createIndexerServer(
  indexerConfig: IndexerConfig,
  serverConfig: RestApiConfig,
): Promise<IndexerServer> {
  const server = new IndexerServer(indexerConfig, serverConfig);
  await server.start();
  return server;
}
