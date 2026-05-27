/**
 * @cinacoin/next/server — Edge Runtime auth helpers.
 *
 * Provides Edge-compatible middleware and auth utilities that work on
 * Vercel Edge Runtime, Cloudflare Workers, and other edge environments.
 *
 * Key differences from the Node.js middleware:
 * - Uses only Web Crypto API (no Node.js `crypto` module)
 * - Cookie-based session that works on edge
 * - No filesystem or process access
 *
 * ```ts
 * // middleware.ts (edge runtime)
 * export const config = { runtime: 'edge', matcher: ['/api/:path*'] };
 *
 * import { withCinacoinAuthEdge } from '@cinacoin/next/server/edge';
 *
 * export const GET = withCinacoinAuthEdge(async (req, session) => {
 *   return Response.json({ address: session.address });
 * });
 * ```
 */

import type { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Session data extracted from an edge-compatible request. */
export interface EdgeServerSession {
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

/** Options for edge auth middleware. */
export interface EdgeAuthOptions {
  /** Cookie name for the session token. @default 'cinacoin-session' */
  cookieName?: string;
  /** SIWE domain for message verification. */
  domain?: string;
  /** Secret key for signing session cookies. */
  secret?: string;
  /** Paths that do not require authentication. */
  publicPaths?: string[];
  /** Path to redirect unauthenticated users to. */
  loginUrl?: string;
}

// ---------------------------------------------------------------------------
// Edge-compatible cookie parsing
// ---------------------------------------------------------------------------

/**
 * Parse the session cookie from a NextRequest (edge-compatible).
 */
function parseSessionCookie(
  req: NextRequest,
  cookieName: string,
): string | null {
  return req.cookies.get(cookieName)?.value ?? null;
}

/**
 * Decode a base64-encoded session token into an EdgeServerSession.
 * Uses the Web API `atob` which is available in edge runtimes.
 */
function decodeEdgeSessionToken(token: string): EdgeServerSession | null {
  try {
    const decoded = JSON.parse(atob(token));
    if (
      typeof decoded.address === 'string' &&
      typeof decoded.chainId === 'number' &&
      typeof decoded.nonce === 'string' &&
      typeof decoded.expiresAt === 'number'
    ) {
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

/**
 * Extract a Cinacoin session from an edge request.
 *
 * Works on Vercel Edge Runtime, Cloudflare Workers, and other edge
 * environments that support the Web API.
 *
 * ```ts
 * const session = await getEdgeSession(req, { cookieName: 'cinacoin-session' });
 * ```
 */
export async function getEdgeSession(
  req: NextRequest,
  options: { cookieName?: string; secret?: string } = {},
): Promise<EdgeServerSession | null> {
  const cookieName = options.cookieName ?? 'cinacoin-session';
  const cookieValue = parseSessionCookie(req, cookieName);

  if (!cookieValue) return null;

  return decodeEdgeSessionToken(cookieValue);
}

// ---------------------------------------------------------------------------
// Edge auth wrapper
// ---------------------------------------------------------------------------

/**
 * Wrap an App Router API route handler with Edge-compatible authentication.
 *
 * The handler receives the `req` and the validated `session` as arguments.
 * If authentication fails, returns a 401 response automatically.
 *
 * Works on Edge Runtime (`runtime: 'edge'`).
 *
 * ```ts
 * // app/api/profile/route.ts
 * export const runtime = 'edge';
 *
 * import { withCinacoinAuthEdge } from '@cinacoin/next/server/edge';
 *
 * export const GET = withCinacoinAuthEdge(async (req, session) => {
 *   return Response.json({ address: session.address });
 * });
 * ```
 *
 * @param handler - Your API route handler function.
 * @param options - Optional auth configuration.
 * @returns A wrapped handler that enforces authentication.
 */
export function withCinacoinAuthEdge<
  T extends NextRequest,
  R extends Response,
>(
  handler: (req: T, session: EdgeServerSession) => Promise<R>,
  options?: EdgeAuthOptions,
): (req: T) => Promise<R> {
  const cookieName = options?.cookieName ?? 'cinacoin-session';

  return async (req: T): Promise<R> => {
    const session = await getEdgeSession(req, { cookieName });
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'No valid session found.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      ) as R;
    }
    return handler(req, session);
  };
}

// ---------------------------------------------------------------------------
// Edge middleware (for Next.js middleware.ts)
// ---------------------------------------------------------------------------

/**
 * Edge-compatible Next.js middleware for route protection.
 *
 * Use in `middleware.ts` at the project root with `runtime: 'edge'`.
 *
 * ```ts
 * // middleware.ts
 * export const runtime = 'edge';
 *
 * import { requireAuthEdge } from '@cinacoin/next/server/edge';
 *
 * export const middleware = requireAuthEdge({
 *   loginUrl: '/login',
 *   publicPaths: ['/', '/api/health'],
 * });
 *
 * export const config = {
 *   matcher: ['/dashboard/:path*', '/api/:path*'],
 * };
 * ```
 */
export function requireAuthEdge(options?: EdgeAuthOptions) {
  const loginUrl = options?.loginUrl ?? '/login';
  const publicPaths = options?.publicPaths ?? [];
  const cookieName = options?.cookieName ?? 'cinacoin-session';

  return async function edgeMiddleware(req: NextRequest) {
    const { NextResponse } = await import('next/server');

    const pathname = req.nextUrl.pathname;
    if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      return NextResponse.next();
    }

    const sessionCookie = req.cookies.get(cookieName);
    if (!sessionCookie) {
      const loginUrlObj = new URL(loginUrl, req.nextUrl.origin);
      loginUrlObj.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrlObj);
    }

    return NextResponse.next();
  };
}

// ---------------------------------------------------------------------------
// Edge-compatible cookie setter for server components / API routes
// ---------------------------------------------------------------------------

/**
 * Create a Set-Cookie header value for the session cookie.
 * Works on Edge Runtime (no Node.js dependencies).
 *
 * ```ts
 * const cookieHeader = createSessionCookieHeader(sessionToken, {
 *   domain: process.env.NEXT_PUBLIC_URL,
 *   secure: process.env.NODE_ENV === 'production',
 * });
 *
 * return NextResponse.json({ ok: true }, {
 *   headers: { 'Set-Cookie': cookieHeader },
 * });
 * ```
 */
export function createSessionCookieHeader(
  token: string,
  options: {
    cookieName?: string;
    domain?: string;
    maxAge?: number;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    path?: string;
  } = {},
): string {
  const name = options.cookieName ?? 'cinacoin-session';
  const maxAge = options.maxAge ?? 86400; // 24 hours
  const secure = options.secure ?? true;
  const httpOnly = options.httpOnly ?? true;
  const sameSite = options.sameSite ?? 'lax';
  const path = options.path ?? '/';

  const parts = [
    `${name}=${encodeURIComponent(token)}`,
    `Max-Age=${maxAge}`,
    `Path=${path}`,
    `SameSite=${sameSite}`,
  ];

  if (secure) parts.push('Secure');
  if (httpOnly) parts.push('HttpOnly');
  if (options.domain) parts.push(`Domain=${options.domain}`);

  return parts.join('; ');
}
