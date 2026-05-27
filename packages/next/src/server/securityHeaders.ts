/**
 * Content Security Policy (CSP) and security headers middleware.
 *
 * Adds protective HTTP response headers to all responses:
 * - Content-Security-Policy (CSP)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - Referrer-Policy
 * - Permissions-Policy
 * - Strict-Transport-Security (HSTS)
 *
 * Usage in middleware.ts:
 * ```ts
 * import { securityHeadersMiddleware } from '@cinacoin/next/server';
 *
 * export const middleware = securityHeadersMiddleware({
 *   cspOverrides: {
 *     'connect-src': ["'self'", 'https://*.walletconnect.com'],
 *   },
 * });
 * ```
 */

import type { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SecurityHeadersOptions {
  /** CSP directive overrides. E.g. { 'connect-src': ["'self'", 'https://api.example.com'] } */
  cspOverrides?: Record<string, string[]>;
  /** CSP nonce for inline scripts/styles (only if you need them). */
  nonce?: string;
  /** Enable HSTS. @default true */
  hsts?: boolean;
  /** HSTS max-age in seconds. @default 31536000 (1 year) */
  hstsMaxAge?: number;
  /** Include HSTS includeSubDomains. @default true */
  hstsIncludeSubDomains?: boolean;
  /** Include HSTS preload. @default false */
  hstsPreload?: boolean;
}

// ---------------------------------------------------------------------------
// Default CSP
// ---------------------------------------------------------------------------

const DEFAULT_CSP: Record<string, string[]> = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],       // no inline scripts
  'style-src': ["'self'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'", 'https://*.walletconnect.com'],
  'frame-src': ["'none'"],
  'frame-ancestors': ["'none'"],  // anti-clickjacking
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
  'upgrade-insecure-requests': [],
};

// ---------------------------------------------------------------------------
// CSP builder
// ---------------------------------------------------------------------------

export function buildCspString(
  overrides: Record<string, string[]> = {},
  nonce?: string,
): string {
  const directives: Record<string, string[]> = { ...DEFAULT_CSP };

  for (const [key, values] of Object.entries(overrides)) {
    directives[key] = values;
  }

  if (nonce) {
    const n = `'nonce-${nonce}'`;
    directives['script-src'] = (directives['script-src'] || ["'self'"]).concat(n);
    directives['style-src'] = (directives['style-src'] || ["'self'"]).concat(n);
  }

  return Object.entries(directives)
    .map(([key, values]) => (values.length === 0 ? key : `${key} ${values.join(' ')}`))
    .join('; ');
}

// ---------------------------------------------------------------------------
// Apply headers
// ---------------------------------------------------------------------------

/**
 * Apply security headers to a NextResponse.
 */
export function withSecurityHeaders(
  response: NextResponse,
  options: SecurityHeadersOptions = {},
): NextResponse {
  const csp = buildCspString(options.cspOverrides, options.nonce);
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '0');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  if (options.hsts !== false) {
    const maxAge = options.hstsMaxAge ?? 31536000;
    let hsts = `max-age=${maxAge}`;
    if (options.hstsIncludeSubDomains !== false) hsts += '; includeSubDomains';
    if (options.hstsPreload) hsts += '; preload';
    response.headers.set('Strict-Transport-Security', hsts);
  }

  return response;
}

/**
 * Create a middleware that applies security headers to every response.
 */
export function securityHeadersMiddleware(options?: SecurityHeadersOptions) {
  return async function middleware(req: NextRequest) {
    const { NextResponse } = await import('next/server');
    const nonce = options?.nonce ?? crypto.randomUUID();
    const res = NextResponse.next();
    return withSecurityHeaders(res, { ...options, nonce });
  };
}

/**
 * Apply security headers to a raw Response (useful in API routes).
 */
export function applySecurityHeadersToResponse(
  response: Response,
  options: SecurityHeadersOptions = {},
): Response {
  const headers = new Headers(response.headers);
  const csp = buildCspString(options.cspOverrides, options.nonce);
  headers.set('Content-Security-Policy', csp);
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-XSS-Protection', '0');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  if (options.hsts !== false) {
    const maxAge = options.hstsMaxAge ?? 31536000;
    let hsts = `max-age=${maxAge}`;
    if (options.hstsIncludeSubDomains !== false) hsts += '; includeSubDomains';
    if (options.hstsPreload) hsts += '; preload';
    headers.set('Strict-Transport-Security', hsts);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
