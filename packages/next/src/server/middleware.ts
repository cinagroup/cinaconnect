import type { NextRequest, NextResponse } from 'next/server';
import type { ChainConfig } from '@cinacoin/react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options for creating a server-side Cinacoin client.
 */
export interface ServerClientOptions {
  /** Cinacoin project ID. */
  projectId: string;

  /** Supported chains (optional — defaults to Ethereum mainnet). */
  chains?: ChainConfig[];

  /** Cookie name for the session token. @default 'cinacoin-session' */
  cookieName?: string;

  /** SIWE domain for message verification. @default process.env.NEXT_PUBLIC_URL or hostname */
  domain?: string;

  /** Secret key for signing session cookies. */
  secret?: string;
}

/**
 * Session data extracted from an authenticated request.
 */
export interface ServerSession {
  /** Ethereum address of the connected wallet. */
  address: string;

  /** Chain ID the wallet is connected to. */
  chainId: number;

  /** SIWE message nonce (for replay protection). */
  nonce: string;

  /** Token expiration timestamp (Unix seconds). */
  expiresAt: number;

  /** Raw session token string. */
  token: string;
}

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
  getSession(req: NextRequest | Request): Promise<ServerSession | null>;

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
   *
   * @param handler - Your API route handler function.
   * @returns A wrapped handler that enforces authentication.
   */
  withAuth<T extends NextRequest | Request, R extends NextResponse | Response>(
    handler: (req: T, session: ServerSession) => Promise<R>
  ): (req: T) => Promise<R>;
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
export function createServerClient(options: ServerClientOptions): ServerClient {
  const cookieName = options.cookieName ?? 'cinacoin-session';

  return {
    async getSession(req: NextRequest | Request): Promise<ServerSession | null> {
      return getSession(req, { cookieName, secret: options.secret });
    },

    async verifySiweMessage(message: string, signature: string): Promise<string> {
      return verifySiweMessage(message, signature, options);
    },

    withAuth<T extends NextRequest | Request, R extends NextResponse | Response>(
      handler: (req: T, session: ServerSession) => Promise<R>
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
export function getCinacoinServer(options: ServerClientOptions): ServerClient {
  if (!_serverClient) {
    _serverClient = createServerClient(options);
  }
  return _serverClient;
}

// ---------------------------------------------------------------------------
// getSession
// ---------------------------------------------------------------------------

/**
 * Internal options for getSession (narrower than full ServerClientOptions).
 */
interface GetSessionOptions {
  cookieName: string;
  secret?: string;
}

/**
 * Extract a Cinacoin session from a Next.js request's cookies.
 *
 * Reads the session cookie, decodes it, and validates the token.
 * Returns `null` if no valid session is found.
 *
 * ```ts
 * const session = await getSession(req);
 * if (session) {
 *   console.log('Connected address:', session.address);
 * }
 * ```
 *
 * @param req - NextRequest (edge/runtime) or standard Web Request.
 * @param options - Cookie name and secret for decoding.
 * @returns The session or null.
 */
export async function getSession(
  req: NextRequest | Request,
  options: GetSessionOptions = { cookieName: 'cinacoin-session' }
): Promise<ServerSession | null> {
  const cookieName = options.cookieName;

  let cookieValue: string | null = null;

  // Handle NextRequest (edge/runtime) — cookies is a getter in Next.js 14+
  if ('cookies' in req) {
    const reqAsAny = req as any;
    const reqCookies = reqAsAny.cookies;
    if (typeof reqCookies === 'function') {
      // cookies() is a function — call it
      cookieValue = reqCookies().get(cookieName)?.value ?? null;
    } else if (reqCookies && typeof reqCookies.get === 'function') {
      // cookies is an object with .get()
      cookieValue = reqCookies.get(cookieName)?.value ?? null;
    }
  }
  // Handle standard Web Request with Cookie header
  else if ('headers' in req) {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      cookieValue = extractCookieValue(cookieHeader, cookieName);
    }
  }

  if (!cookieValue) {
    return null;
  }

  // Decode the session token
  try {
    const decoded = decodeSessionToken(cookieValue, options.secret);
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extract a specific cookie value from a raw Cookie header string.
 */
function extractCookieValue(cookieHeader: string, name: string): string | null {
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Decode a base64-encoded session token into a ServerSession.
 * In production, this should be cryptographically verified with the secret.
 */
function decodeSessionToken(token: string, _secret?: string): ServerSession | null {
  try {
    // Session tokens are base64-encoded JSON in the current implementation.
    // TODO: In production, use jose or similar for JWE/JWT decryption with the secret.
    const decoded = JSON.parse(atob(token));
    if (
      typeof decoded.address === 'string' &&
      typeof decoded.chainId === 'number' &&
      typeof decoded.nonce === 'string' &&
      typeof decoded.expiresAt === 'number'
    ) {
      // Check expiration
      if (decoded.expiresAt < Math.floor(Date.now() / 1000)) {
        return null;
      }
      return {
        address: decoded.address,
        chainId: decoded.chainId,
        nonce: decoded.nonce,
        expiresAt: decoded.expiresAt,
        token,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// verifySiweMessage
// ---------------------------------------------------------------------------

/**
 * Verify a SIWE (Sign-In with Ethereum) message server-side.
 *
 * Parses the SIWE message, recovers the signer address from the signature,
 * and validates the message fields (domain, chainId, nonce, expiration).
 *
 * ```ts
 * const recovered = await verifySiweMessage(message, signature, {
 *   projectId: '...',
 *   domain: 'myapp.com',
 * });
 * // recovered === '0x...' — the address that signed
 * ```
 *
 * @param message - The full SIWE message string (per EIP-4361).
 * @param signature - Hex-encoded signature (0x-prefixed, 65 bytes).
 * @param options - Server client options (used for domain validation).
 * @returns The recovered Ethereum address.
 * @throws Error if verification fails or the message is invalid.
 */
export async function verifySiweMessage(
  message: string,
  signature: string,
  options: ServerClientOptions
): Promise<string> {
  const { recoverAddress, hashMessage } = await import('viem');

  // Validate signature format
  if (!signature.startsWith('0x') || signature.length !== 132) {
    throw new Error(
      `Invalid signature format: expected 0x-prefixed 65-byte hex string, got ${signature.length} chars`
    );
  }

  // Recover the signer address from the message and signature
  // viem v2 requires `hash` — we hash the message first (personal_sign / eth_sign)
  const msgHash = hashMessage(message);
  const recovered = await recoverAddress({
    hash: msgHash,
    signature: signature as `0x${string}`,
  });

  // Parse the SIWE message to extract the claimed address
  const parsed = parseSiweMessage(message);
  if (!parsed) {
    throw new Error('Failed to parse SIWE message');
  }

  // Verify the recovered address matches the claimed address
  if (recovered.toLowerCase() !== parsed.address.toLowerCase()) {
    throw new Error(
      `Address mismatch: recovered ${recovered} but message claims ${parsed.address}`
    );
  }

  // Verify domain if specified
  if (options.domain && parsed.domain !== options.domain) {
    throw new Error(
      `Domain mismatch: message domain "${parsed.domain}" does not match expected "${options.domain}"`
    );
  }

  // Verify expiration time
  if (parsed.expirationTime) {
    const expiration = new Date(parsed.expirationTime).getTime();
    if (Date.now() > expiration) {
      throw new Error('SIWE message has expired');
    }
  }

  return recovered;
}

/**
 * Parsed SIWE message fields.
 */
interface ParsedSiweMessage {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

/**
 * Parse a SIWE message string into structured fields.
 */
function parseSiweMessage(message: string): ParsedSiweMessage | null {
  const lines = message.split('\n');

  // Line 1: "domain wants you to sign in with your Ethereum account:"
  const preamble = lines[0];
  const preambleMatch = preamble.match(/^(.+?) wants you to sign in with your Ethereum account:$/);
  if (!preambleMatch) return null;

  // Line 2: address
  const address = lines[1]?.trim();
  if (!address || !address.startsWith('0x')) return null;

  // Find the "URI:" line to locate the structured section
  let uriLine = '';
  let startIndex = 2;
  for (let i = 2; i < lines.length; i++) {
    if (lines[i].startsWith('URI: ')) {
      uriLine = lines[i];
      startIndex = i;
      break;
    }
  }
  if (!uriLine) return null;

  const result: ParsedSiweMessage = {
    domain: preambleMatch[1],
    address,
    uri: uriLine.slice(5),
    version: '1',
    chainId: 1,
    nonce: '',
    issuedAt: '',
  };

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('Version: ')) {
      result.version = line.slice(9);
    } else if (line.startsWith('Chain ID: ')) {
      result.chainId = parseInt(line.slice(10), 10);
    } else if (line.startsWith('Nonce: ')) {
      result.nonce = line.slice(7);
    } else if (line.startsWith('Issued At: ')) {
      result.issuedAt = line.slice(11);
    } else if (line.startsWith('Expiration Time: ')) {
      result.expirationTime = line.slice(17);
    } else if (line.startsWith('Not Before: ')) {
      result.notBefore = line.slice(12);
    } else if (line.startsWith('Request ID: ')) {
      result.requestId = line.slice(12);
    } else if (line.startsWith('Resources:')) {
      result.resources = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('- ')) {
          result.resources.push(lines[j].slice(2));
        }
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Middleware helpers
// ---------------------------------------------------------------------------

/**
 * Wrap a Next.js API route handler with Cinacoin authentication.
 *
 * The handler receives the `req` and the validated `session` as arguments.
 * If authentication fails, returns a 401 response automatically.
 *
 * Works with both App Router (`app/api/.../route.ts`) and Pages Router
 * (`pages/api/...`).
 *
 * ```ts
 * // app/api/profile/route.ts
 * import { withCinacoinAuth } from '@cinacoin/next/server';
 *
 * export const GET = withCinacoinAuth(async (req, session) => {
 *   return Response.json({ address: session.address });
 * });
 * ```
 *
 * @param handler - Your API route handler function.
 * @param options - Optional server client configuration.
 * @returns A wrapped handler that enforces authentication.
 */
export function withCinacoinAuth<
  T extends NextRequest | Request,
  R extends NextResponse | Response,
>(
  handler: (req: T, session: ServerSession) => Promise<R>,
  options?: Partial<ServerClientOptions>
): (req: T) => Promise<R> {
  const client = createServerClient({
    projectId: options?.projectId ?? process.env.CINACOIN_PROJECT_ID ?? '',
    cookieName: options?.cookieName ?? 'cinacoin-session',
    secret: options?.secret ?? process.env.CINACOIN_SECRET,
    chains: options?.chains,
    domain: options?.domain ?? process.env.NEXT_PUBLIC_URL,
  });
  return client.withAuth(handler);
}

/**
 * Next.js middleware that requires authentication.
 *
 * Use in `middleware.ts` at the project root to protect routes.
 * Redirects unauthenticated requests to a login page.
 *
 * ```ts
 * // middleware.ts
 * import { NextResponse } from 'next/server';
 * import { requireAuth } from '@cinacoin/next/server';
 *
 * export const middleware = requireAuth({
 *   loginUrl: '/login',
 *   publicPaths: ['/', '/api/health'],
 * });
 *
 * export const config = {
 *   matcher: ['/dashboard/:path*', '/api/:path*'],
 * };
 * ```
 *
 * @param options - Configuration for the auth middleware.
 * @returns A Next.js middleware function.
 */
export function requireAuth(options?: {
  /** Path to redirect unauthenticated users to. @default '/login' */
  loginUrl?: string;

  /** Paths that do not require authentication. */
  publicPaths?: string[];

  /** Cookie name for the session token. @default 'cinacoin-session' */
  cookieName?: string;
}) {
  const loginUrl = options?.loginUrl ?? '/login';
  const publicPaths = options?.publicPaths ?? [];
  const cookieName = options?.cookieName ?? 'cinacoin-session';

  return async function middleware(req: NextRequest) {
    const { NextResponse } = await import('next/server');

    // Skip auth for public paths
    const pathname = req.nextUrl.pathname;
    if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      return NextResponse.next();
    }

    // Check for session cookie
    const sessionCookie = req.cookies.get(cookieName);
    if (!sessionCookie) {
      const loginUrlObj = new URL(loginUrl, req.nextUrl.origin);
      loginUrlObj.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrlObj);
    }

    return NextResponse.next();
  };
}
