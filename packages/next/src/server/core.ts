/**
 * @cinacoin/next/server — Core server client.
 *
 * Provides `createServerClient` and `getCinacoinServer` for creating
 * server-side Cinacoin SDK instances.
 */

import type { NextRequest, NextResponse } from 'next/server';
import type { ChainConfig } from '@cinacoin/react';
import { getSession, verifySiweMessage } from './middleware.js';

// Re-export types so consumers of core.ts get the full type surface
export type { ServerSession } from './middleware.js';
export type { ServerClientOptions } from './middleware.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Server-side Cinacoin client instance.
 */
export interface ServerClient {
  /**
   * Extract session data from a Next.js request.
   *
   * @param req - NextRequest or standard Web Request object.
   * @returns The session if valid, or `null` if no session is found.
   */
  getSession(req: NextRequest | Request): Promise<import('./middleware.js').ServerSession | null>;

  /**
   * Verify a SIWE message signature server-side.
   *
   * @param message - The full SIWE message string.
   * @param signature - The hex-encoded signature (0x-prefixed).
   * @returns The recovered address if verification succeeds.
   * @throws Error if verification fails.
   */
  verifySiweMessage(message: string, signature: string): Promise<string>;

  /**
   * Create an authenticated Next.js API route handler.
   *
   * Wraps the handler and injects the session as the second argument.
   * If no valid session is found, returns 401 Unauthorized.
   */
  withAuth<T extends NextRequest | Request, R extends NextResponse | Response>(
    handler: (req: T, session: import('./middleware.js').ServerSession) => Promise<R>
  ): (req: T) => Promise<R>;

  /** Access resolved client options. */
  readonly options: import('./middleware.js').ServerClientOptions;
}

// ---------------------------------------------------------------------------
// Default chain
// ---------------------------------------------------------------------------

const defaultChain: ChainConfig = {
  id: 1,
  name: 'Ethereum',
  rpcUrl: 'https://eth.llamarpc.com',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  blockExplorerUrl: 'https://etherscan.io',
};

// ---------------------------------------------------------------------------
// createServerClient
// ---------------------------------------------------------------------------

/**
 * Create a server-side Cinacoin client for use in API routes, middleware,
 * and server components.
 *
 * ```ts
 * const client = createServerClient({
 *   projectId: process.env.CINACOIN_PROJECT_ID!,
 *   secret: process.env.CINACOIN_SECRET,
 * });
 *
 * const session = await client.getSession(req);
 * ```
 *
 * @param options - Configuration options for the server client.
 * @returns A ServerClient instance with auth utilities.
 */
export function createServerClient(options: import('./middleware.js').ServerClientOptions): ServerClient {
  const resolvedOptions: import('./middleware.js').ServerClientOptions = {
    projectId: options.projectId,
    chains: options.chains ?? [defaultChain],
    cookieName: options.cookieName ?? 'cinacoin-session',
    domain: options.domain ?? process.env.NEXT_PUBLIC_URL ?? 'localhost',
    secret: options.secret ?? '',
  };

  return {
    options: resolvedOptions,

    async getSession(req: NextRequest | Request) {
      return getSession(req, {
        cookieName: resolvedOptions.cookieName!,
        secret: resolvedOptions.secret,
      });
    },

    async verifySiweMessage(message: string, signature: string) {
      return verifySiweMessage(message, signature, resolvedOptions);
    },

    withAuth<T extends NextRequest | Request, R extends NextResponse | Response>(
      handler: (req: T, session: import('./middleware.js').ServerSession) => Promise<R>
    ): (req: T) => Promise<R> {
      return async (req: T) => {
        const session = await this.getSession(req);
        if (!session) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized', message: 'No valid session found.' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          ) as R;
        }
        return handler(req, session);
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _serverClient: ServerClient | null = null;

/**
 * Get (or lazily create) the singleton server-side Cinacoin client.
 *
 * Call this once during initialization. Subsequent calls return the same instance.
 *
 * ```ts
 * import { getCinacoinServer } from '@cinacoin/next/server';
 *
 * // In an API route:
 * export async function GET(req: Request) {
 *   const client = getCinacoinServer({ projectId: 'your-id' });
 *   const session = await client.getSession(req);
 *   return Response.json({ address: session?.address });
 * }
 * ```
 *
 * @param options - Configuration options (used only on first call).
 * @returns The singleton ServerClient instance.
 */
export function getCinacoinServer(options: import('./middleware.js').ServerClientOptions): ServerClient {
  if (!_serverClient) {
    _serverClient = createServerClient(options);
  }
  return _serverClient;
}
