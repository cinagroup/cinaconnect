/**
 * @cinacoin/config — CSRF Protection Middleware
 *
 * Cloudflare Worker compatible CSRF validation. Checks Origin/Referer
 * against a whitelist of allowed origins for state-changing requests.
 *
 * Usage:
 *   const csrfError = validateCsrf(request, ALLOWED_ORIGINS);
 *   if (csrfError) return csrfError;
 */

export interface CsrfOptions {
  /** Allowed origin strings (e.g. "https://cinacoin.com") */
  allowedOrigins: string[];
  /** Extra headers to inspect for origin (default: ['Origin', 'Referer']) */
  originHeaders?: string[];
}

/** Default headers inspected for origin detection */
const DEFAULT_ORIGIN_HEADERS = ['Origin', 'Referer'];

/**
 * Extract the origin string from a request by checking configured headers.
 * Returns null if no usable origin was found.
 */
export function extractOrigin(
  request: Request,
  headers: string[] = DEFAULT_ORIGIN_HEADERS
): string | null {
  for (const header of headers) {
    const value = request.headers.get(header);
    if (!value) continue;

    // Origin header is already a clean origin
    if (header === 'Origin') return value;

    // Referer: parse to origin (protocol + host)
    try {
      const url = new URL(value);
      return `${url.protocol}//${url.host}`;
    } catch {
      // Malformed Referer — skip
      continue;
    }
  }
  return null;
}

/**
 * Validate CSRF for a state-changing request.
 *
 * - Safe methods (GET, HEAD, OPTIONS) pass through.
 * - For unsafe methods, the request origin must be in allowedOrigins.
 *
 * @returns null if valid, or a Response with 403 if CSRF check fails.
 */
export function validateCsrf(
  request: Request,
  options: CsrfOptions
): Response | null {
  // Safe methods don't need CSRF protection
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null;
  }

  const origin = extractOrigin(request, options.originHeaders);
  if (!origin) {
    return new Response(
      JSON.stringify({ error: 'Forbidden: missing origin header' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (!options.allowedOrigins.includes(origin)) {
    return new Response(
      JSON.stringify({ error: 'Forbidden: origin not allowed' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return null;
}

/** Shared origin whitelist for all Cinacoin services */
export const CSRF_ALLOWED_ORIGINS = [
  'https://cinacoin.com',
  'https://dash.cinacoin.com',
  'http://localhost:3000',
  'http://localhost:5173',
] as const;
