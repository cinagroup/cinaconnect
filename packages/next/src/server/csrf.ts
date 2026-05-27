/**
 * CSRF (Cross-Site Request Forgery) protection for Next.js API routes.
 *
 * Implements Double-Submit Cookie pattern:
 * 1. A CSRF token is stored in a cookie (SameSite=Strict, Secure)
 * 2. The client must also send the token as an X-CSRF-Token header
 * 3. Server verifies both values match
 *
 * Since attackers cannot read cookies from other origins or set custom
 * headers on cross-origin requests, this provides robust CSRF protection.
 */

import type { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** CSRF token cookie name. */
export const CSRF_COOKIE_NAME = 'cinacoin-csrf';

/** CSRF token header name. */
export const CSRF_HEADER_NAME = 'x-csrf-token';

// ---------------------------------------------------------------------------
// Token generation
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically random CSRF token.
 * Compatible with both Node.js and Edge Runtime (Web Crypto API).
 */
export function generateCsrfToken(): string {
  const cryptoObj = typeof crypto !== 'undefined' ? crypto : globalThis.crypto;
  const bytes = new Uint8Array(32);
  cryptoObj.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

/**
 * Create a Set-Cookie header for the CSRF token.
 *
 * Key design: the CSRF cookie is NOT httpOnly because the client JS needs
 * to read its value to send as the X-CSRF-Token header. Security comes from:
 * - SameSite=Strict (no cross-site sending)
 * - Secure (HTTPS only)
 * - Token must also be sent as a custom header (which CORS blocks)
 */
export function createCsrfCookieHeader(
  token: string,
  options: {
    domain?: string;
    path?: string;
  } = {},
): string {
  const path = options.path ?? '/';
  const parts = [
    `${CSRF_COOKIE_NAME}=${token}`,
    'Max-Age=3600', // 1 hour
    `Path=${path}`,
    'SameSite=Strict',
    'Secure',
  ];
  if (options.domain) parts.push(`Domain=${options.domain}`);
  return parts.join('; ');
}

/**
 * Extract a cookie value from a raw Cookie header string.
 */
function extractCookieValue(cookieHeader: string, name: string): string | null {
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (key === name) return decodeURIComponent(value);
  }
  return null;
}

/**
 * Read CSRF token from request cookies.
 */
export function getCsrfTokenFromCookie(req: NextRequest | Request): string | null {
  if ('cookies' in req) {
    const reqAsAny = req as any;
    if (typeof reqAsAny.cookies === 'function') {
      return reqAsAny.cookies().get(CSRF_COOKIE_NAME)?.value ?? null;
    }
    if (reqAsAny.cookies && typeof reqAsAny.cookies.get === 'function') {
      return reqAsAny.cookies.get(CSRF_COOKIE_NAME)?.value ?? null;
    }
  }
  if ('headers' in req) {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) return extractCookieValue(cookieHeader, CSRF_COOKIE_NAME);
  }
  return null;
}

/**
 * Read CSRF token from request header.
 */
export function getCsrfTokenFromHeader(req: NextRequest | Request): string | null {
  return req.headers.get(CSRF_HEADER_NAME);
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * CSRF middleware for Next.js middleware.ts.
 *
 * Checks state-mutating methods (POST/PUT/DELETE/PATCH) for a valid
 * CSRF token. GET/HEAD/OPTIONS pass through.
 *
 * ```ts
 * import { csrfMiddleware } from '@cinacoin/next/server';
 *
 * export const middleware = csrfMiddleware({
 *   publicPaths: ['/api/health', '/api/public'],
 * });
 * ```
 */
export function csrfMiddleware(options?: {
  /** Paths that skip CSRF verification. */
  publicPaths?: string[];
  /** HTTP methods to protect. Defaults to state-mutating methods. */
  protectedMethods?: string[];
}) {
  const publicPaths = options?.publicPaths ?? [];
  const protectedMethods = options?.protectedMethods ?? ['POST', 'PUT', 'DELETE', 'PATCH'];

  return async function middleware(req: NextRequest) {
    const { NextResponse } = await import('next/server');
    const pathname = req.nextUrl.pathname;

    // Skip public paths
    if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      return NextResponse.next();
    }

    // Only protect state-mutating methods
    if (!protectedMethods.includes(req.method)) {
      return NextResponse.next();
    }

    // Verify CSRF token (double-submit cookie)
    const cookieToken = getCsrfTokenFromCookie(req);
    const headerToken = getCsrfTokenFromHeader(req);

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return new NextResponse(
        JSON.stringify({
          error: 'CSRF validation failed',
          message: 'The CSRF token is missing or invalid.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return NextResponse.next();
  };
}

/**
 * Wrap a single API route handler with CSRF protection.
 *
 * ```ts
 * export const POST = withCsrfProtection(async (req) => {
 *   return Response.json({ ok: true });
 * });
 * ```
 */
export function withCsrfProtection<T extends Request | NextRequest, R extends Response | NextResponse>(
  handler: (req: T) => Promise<R>,
): (req: T) => Promise<R> {
  return async (req: T): Promise<R> => {
    const cookieToken = getCsrfTokenFromCookie(req);
    const headerToken = getCsrfTokenFromHeader(req);

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return new Response(
        JSON.stringify({ error: 'CSRF validation failed' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ) as R;
    }

    return handler(req);
  };
}

// ---------------------------------------------------------------------------
// Client-side helper
// ---------------------------------------------------------------------------

/**
 * Read the CSRF token from document.cookie (browser only).
 * Use this to attach X-CSRF-Token to fetch requests.
 */
export function getClientCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  return extractCookieValue(document.cookie, CSRF_COOKIE_NAME);
}

/**
 * Fetch wrapper that automatically attaches CSRF token for
 * state-mutating requests.
 */
export async function csrfFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getClientCsrfToken();
  const headers = new Headers(init.headers || {});
  const method = (init.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && token) {
    headers.set(CSRF_HEADER_NAME, token);
  }
  return fetch(url, { ...init, headers });
}
