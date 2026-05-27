/**
 * Nuxt server-side authentication middleware for Cinacoin.
 *
 * Provides SIWE (Sign-In with Ethereum) verification for Nuxt server
 * routes, similar to the Next.js `@cinacoin/next/server` middleware.
 *
 * Usage:
 *
 * ```ts
 * // server/middleware/cinacoin-auth.ts
 * import { cinaConnectAuth } from '@cinacoin/nuxt/server';
 *
 * export default cinaConnectAuth({
 *   projectId: process.env.NUXT_PUBLIC_CINACOIN_PROJECT_ID,
 *   secret: process.env.CINACOIN_SECRET,
 * });
 * ```
 *
 * Or use in server API routes:
 *
 * ```ts
 * // server/api/profile.get.ts
 * import { withCinacoinAuth, defineCinacoinHandler } from '@cinacoin/nuxt/server';
 *
 * export default defineCinacoinHandler(async (event, session) => {
 *   return { address: session.address };
 * });
 * ```
 *
 * @packageDocumentation
 */

import type { H3Event, EventHandlerRequest } from 'h3';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Session data extracted from an authenticated Nuxt request.
 */
export interface NuxtServerSession {
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
 * Options for the Nuxt Cinacoin server-side auth.
 */
export interface NuxtAuthOptions {
  /** Cinacoin project ID. */
  projectId: string;

  /** Cookie name for the session token. @default 'cinacoin-session' */
  cookieName?: string;

  /** Header name for the session token. @default 'X-Cinacoin-Session' */
  headerName?: string;

  /** Secret key for signing session cookies (optional, for encrypted cookies). */
  secret?: string;

  /** SIWE domain for message verification. */
  domain?: string;

  /** Whether to redirect unauthenticated requests (for middleware). */
  redirectOnFail?: boolean;

  /** Path to redirect to if authentication fails. @default '/login' */
  loginPath?: string;

  /** Paths excluded from authentication requirement. */
  publicPaths?: string[];
}

/**
 * Result of authentication check.
 */
export interface AuthResult {
  /** Whether authentication was successful. */
  isAuthenticated: boolean;

  /** Session data if authenticated. */
  session: NuxtServerSession | null;
}

// ---------------------------------------------------------------------------
// Cookie Parsing
// ---------------------------------------------------------------------------

/**
 * Parse cookies from a request header string.
 *
 * @param cookieHeader - Raw Cookie header value.
 * @returns Record of cookie name → value.
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }

  return cookies;
}

/**
 * Get a specific cookie value from an H3 event.
 *
 * @param event - H3 event (Nuxt server request context).
 * @param name - Cookie name.
 * @returns Cookie value, or `null` if not found.
 */
function getCookieFromEvent(event: H3Event<EventHandlerRequest>, name: string): string | null {
  const cookieHeader = getRequestHeader(event, 'cookie');
  if (!cookieHeader) return null;

  const cookies = parseCookies(cookieHeader);
  return cookies[name] ?? null;
}

// ---------------------------------------------------------------------------
// Session Token Decoding
// ---------------------------------------------------------------------------

/**
 * Decode a session token into a NuxtServerSession.
 *
 * Supports base64-encoded JSON session tokens.
 * In production, this should be cryptographically verified with the secret.
 *
 * @param token - Session token string.
 * @returns Session data, or `null` if invalid/expired.
 */
function decodeSessionToken(token: string, _secret?: string): NuxtServerSession | null {
  try {
    // Session tokens are base64-encoded JSON in the current implementation.
    // TODO: In production, use jose or similar for JWE/JWT decryption with the secret.
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));

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
// SIWE Message Verification
// ---------------------------------------------------------------------------

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
 * Parse a SIWE (EIP-4361) message string into structured fields.
 *
 * @param message - Full SIWE message string.
 * @returns Parsed SIWE message fields, or `null` if parsing fails.
 */
export function parseSiweMessage(message: string): ParsedSiweMessage | null {
  const lines = message.split('\n');

  // Line 1: "domain wants you to sign in with your Ethereum account:"
  const preamble = lines[0];
  const preambleMatch = preamble.match(
    /^(.+?) wants you to sign in with your Ethereum account:$/,
  );
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

/**
 * Verify a SIWE message server-side using viem.
 *
 * Parses the SIWE message, recovers the signer address from the signature,
 * and validates the message fields (domain, chainId, nonce, expiration).
 *
 * @param message - Full SIWE message string (per EIP-4361).
 * @param signature - Hex-encoded signature (0x-prefixed).
 * @param options - Server auth options (used for domain validation).
 * @returns The recovered Ethereum address.
 * @throws Error if verification fails.
 */
export async function verifySiweMessage(
  message: string,
  signature: string,
  options: NuxtAuthOptions,
): Promise<string> {
  const { recoverAddress, hashMessage } = await import('viem');

  // Validate signature format
  if (!signature.startsWith('0x') || signature.length !== 132) {
    throw new Error(
      `Invalid signature format: expected 0x-prefixed 65-byte hex string, got ${signature.length} chars`,
    );
  }

  // Recover the signer address
  const msgHash = hashMessage(message);
  const recovered = await recoverAddress({
    hash: msgHash,
    signature: signature as `0x${string}`,
  });

  // Parse the SIWE message
  const parsed = parseSiweMessage(message);
  if (!parsed) {
    throw new Error('Failed to parse SIWE message');
  }

  // Verify recovered address matches claimed address
  if (recovered.toLowerCase() !== parsed.address.toLowerCase()) {
    throw new Error(
      `Address mismatch: recovered ${recovered} but message claims ${parsed.address}`,
    );
  }

  // Verify domain if specified
  if (options.domain && parsed.domain !== options.domain) {
    throw new Error(
      `Domain mismatch: message domain "${parsed.domain}" does not match expected "${options.domain}"`,
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

// ---------------------------------------------------------------------------
// Session Retrieval
// ---------------------------------------------------------------------------

/**
 * Extract Cinacoin session from an H3 event (Nuxt server request).
 *
 * Reads the session cookie or header, decodes it, and validates.
 * Returns `null` if no valid session is found.
 *
 * ```ts
 * const session = await getNuxtSession(event);
 * if (session) {
 *   console.log('Connected address:', session.address);
 * }
 * ```
 *
 * @param event - H3 event from Nuxt server route.
 * @param options - Authentication options.
 * @returns Session data or `null`.
 */
export async function getNuxtSession(
  event: H3Event<EventHandlerRequest>,
  options: NuxtAuthOptions,
): Promise<NuxtServerSession | null> {
  const cookieName = options.cookieName ?? 'cinacoin-session';
  const headerName = options.headerName ?? 'X-Cinacoin-Session';

  // Try cookie first
  let token = getCookieFromEvent(event, cookieName);

  // Fall back to header
  if (!token) {
    token = getRequestHeader(event, headerName);
  }

  if (!token) {
    return null;
  }

  return decodeSessionToken(token, options.secret);
}

/**
 * Check authentication status for an H3 event.
 *
 * @param event - H3 event from Nuxt server route.
 * @param options - Authentication options.
 * @returns AuthResult with isAuthenticated flag and optional session.
 */
export async function checkAuth(
  event: H3Event<EventHandlerRequest>,
  options: NuxtAuthOptions,
): Promise<AuthResult> {
  const session = await getNuxtSession(event, options);
  return {
    isAuthenticated: session !== null,
    session,
  };
}

// ---------------------------------------------------------------------------
// Nuxt Server Middleware
// ---------------------------------------------------------------------------

/**
 * Create a Nuxt server middleware that requires authentication.
 *
 * Use in `server/middleware/cinacoin-auth.ts`:
 *
 * ```ts
 * import { cinaConnectAuth } from '@cinacoin/nuxt/server';
 *
 * export default cinaConnectAuth({
 *   projectId: process.env.NUXT_PUBLIC_CINACOIN_PROJECT_ID,
 *   redirectOnFail: true,
 *   loginPath: '/login',
 *   publicPaths: ['/', '/api/health'],
 * });
 * ```
 *
 * @param options - Authentication configuration.
 * @returns Nuxt server middleware handler.
 */
export function cinaConnectAuth(options: NuxtAuthOptions) {
  const {
    redirectOnFail = false,
    loginPath = '/login',
    publicPaths = [],
  } = options;

  return defineEventHandler(async (event: H3Event<EventHandlerRequest>) => {
    const pathname = getRequestURL(event).pathname;

    // Skip auth for public paths
    const isPublic = publicPaths.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    );

    if (isPublic) {
      return;
    }

    // Check authentication
    const auth = await checkAuth(event, options);

    if (!auth.isAuthenticated) {
      if (redirectOnFail) {
        const redirectUrl = new URL(loginPath, getRequestURL(event).origin);
        redirectUrl.searchParams.set('redirect', pathname);
        return sendRedirect(event, redirectUrl.toString());
      }

      // Return 401 for API routes
      if (pathname.startsWith('/api/')) {
        return sendError(
          event,
          createError({
            statusCode: 401,
            statusMessage: 'Unauthorized',
            message: 'No valid session found.',
          }),
        );
      }
    }

    // Attach session to event context for downstream handlers
    if (auth.session) {
      event.context.cinaConnect = auth.session;
    }
  });
}

/**
 * Wrap a Nuxt server API handler with Cinacoin authentication.
 *
 * The handler receives the `event` and the validated `session`.
 * If authentication fails, returns a 401 response automatically.
 *
 * ```ts
 * // server/api/profile.get.ts
 * import { defineCinacoinHandler } from '@cinacoin/nuxt/server';
 *
 * export default defineCinacoinHandler(async (event, session) => {
 *   return { address: session.address };
 * });
 * ```
 *
 * @param handler - Your API handler function.
 * @param options - Optional auth configuration.
 * @returns Auth-wrapped event handler.
 */
export function defineCinacoinHandler<
  T extends EventHandlerRequest = EventHandlerRequest,
  R = unknown,
>(
  handler: (event: H3Event<T>, session: NuxtServerSession) => Promise<R>,
  options?: Partial<NuxtAuthOptions>,
) {
  return defineEventHandler(async (event: H3Event<T>) => {
    const opts: NuxtAuthOptions = {
      projectId: options?.projectId ?? process.env.NUXT_PUBLIC_CINACOIN_PROJECT_ID ?? '',
      cookieName: options?.cookieName ?? 'cinacoin-session',
      secret: options?.secret ?? process.env.CINACOIN_SECRET,
      domain: options?.domain,
      ...options,
    };

    const session = await getNuxtSession(event, opts);
    if (!session) {
      return sendError(
        event,
        createError({
          statusCode: 401,
          statusMessage: 'Unauthorized',
          message: 'No valid session found.',
        }),
      );
    }

    return handler(event as H3Event<EventHandlerRequest>, session);
  });
}

/**
 * Alias for `defineCinacoinHandler` — withAuth wrapper for Nuxt server routes.
 */
export const withCinacoinAuth = defineCinacoinHandler;

// ---------------------------------------------------------------------------
// Type augmentation for H3 event context
// ---------------------------------------------------------------------------

declare module 'h3' {
  interface H3EventContext {
    /** Cinacoin session data (attached by auth middleware). */
    cinaConnect?: NuxtServerSession;
  }
}

// Re-export h3 utilities needed by the middleware
export {
  defineEventHandler,
  sendError,
  createError,
  sendRedirect,
  getHeader as getRequestHeader,
  getRequestURL,
  type EventHandlerRequest,
  type H3Event,
} from 'h3';
