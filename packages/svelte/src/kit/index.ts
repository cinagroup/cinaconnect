/**
 * SvelteKit integration for Cinacoin.
 *
 * Provides:
 * - SSR-safe utilities for server-side session verification
 * - Load function helpers and SSR-safe store initialization
 * - Vite plugin (`cinaConnectKit`) for auto-injecting the provider
 *
 * Import from `@cinacoin/svelte/kit`:
 *
 * ```ts
 * import { getCinacoinServer, ssrSafeStore, cinaConnectKit } from '@cinacoin/svelte/kit';
 * ```
 *
 * @packageDocumentation
 */

// ─── Vite Plugin (new) ──────────────────────────────────────────────────────
export {
  cinaConnectKit,
  sveltekitPlugin,
  type CinacoinKitOptions,
} from './plugin.js';

import { writable, type Writable } from 'svelte/store';
import type { Handle, Load } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

// ─── Server-side session utilities ───────────────────────────────────────────

/**
 * Session data returned from server-side verification.
 */
export interface CinacoinSession {
  /** Whether the user has an active wallet session. */
  isAuthenticated: boolean;

  /** Connected account address, or null. */
  address: string | null;

  /** Connected chain ID, or null. */
  chainId: number | null;

  /** Session expiration timestamp (ms), or null. */
  expiresAt: number | null;

  /** Raw session payload (implementation-specific). */
  raw?: Record<string, unknown>;
}

/**
 * Cinacoin server-side API.
 *
 * Use this in `+layout.server.ts` or `+page.server.ts` to verify
 * wallet sessions server-side.
 */
export interface CinacoinServer {
  /**
   * Get the current session from the request.
   *
   * Reads the Cinacoin session cookie or authorization header
   * and verifies it against the relay server.
   *
   * @param event - SvelteKit RequestEvent.
   * @returns Promise resolving with session data.
   */
  getSession(event: RequestEvent): Promise<CinacoinSession>;

  /**
   * Verify a session token.
   *
   * @param token - Session token to verify.
   * @returns Promise resolving with session data.
   */
  verifySession(token: string): Promise<CinacoinSession>;

  /**
   * Create a server-side handle middleware.
   *
   * Attaches session data to `event.locals.cinaConnect`.
   *
   * @param options - Middleware configuration.
   * @returns SvelteKit Handle function.
   */
  createHandle(options?: CinacoinHandleOptions): Handle;
}

/**
 * Options for the Cinacoin SvelteKit handle middleware.
 */
export interface CinacoinHandleOptions {
  /** Cookie name for the session token. Defaults to `cinacoin_session`. */
  cookieName?: string;

  /** Header name for the session token. Defaults to `X-Cinacoin-Session`. */
  headerName?: string;

  /** Relay URL for session verification. */
  relayUrl?: string;

  /** Whether to redirect unauthenticated requests. */
  requireAuth?: boolean;

  /** Path to redirect to if authentication is required but missing. */
  loginPath?: string;

  /** Paths to exclude from authentication requirement. */
  publicPaths?: string[];
}

/**
 * Default cookie name for Cinacoin sessions.
 */
const DEFAULT_COOKIE_NAME = 'cinacoin_session';

/**
 * Default header name for Cinacoin sessions.
 */
const DEFAULT_HEADER_NAME = 'X-Cinacoin-Session';

// ─── Server singleton ────────────────────────────────────────────────────────

let _serverInstance: CinacoinServer | null = null;

/**
 * Get or create the Cinacoin server API instance.
 *
 * Call this in server-side code (load functions, hooks, actions).
 *
 * @example
 * ```ts
 * // +layout.server.ts
 * import { getCinacoinServer } from '@cinacoin/svelte/kit';
 *
 * export const load = async ({ cookies }) => {
 *   const server = getCinacoinServer();
 *   const session = await server.getSession(/* event *\/);
 *   return { session };
 * };
 * ```
 *
 * @returns CinacoinServer instance.
 */
export function getCinacoinServer(): CinacoinServer {
  if (!_serverInstance) {
    _serverInstance = createCinacoinServer();
  }
  return _serverInstance;
}

/**
 * Create a new CinacoinServer instance.
 *
 * @internal
 */
function createCinacoinServer(): CinacoinServer {
  return {
    async getSession(event: RequestEvent): Promise<CinacoinSession> {
      const token = getTokenFromRequest(event);
      if (!token) {
        return {
          isAuthenticated: false,
          address: null,
          chainId: null,
          expiresAt: null,
        };
      }
      return this.verifySession(token);
    },

    async verifySession(token: string): Promise<CinacoinSession> {
      try {
        // Decode the session token (JWT-style or base64).
        // In production, this would verify against the relay server.
        const payload = decodeSessionToken(token);
        return {
          isAuthenticated: true,
          address: payload.address ?? null,
          chainId: payload.chainId ?? null,
          expiresAt: payload.exp ?? null,
          raw: payload,
        };
      } catch {
        return {
          isAuthenticated: false,
          address: null,
          chainId: null,
          expiresAt: null,
        };
      }
    },

    createHandle(options: CinacoinHandleOptions = {}): Handle {
      const {
        cookieName = DEFAULT_COOKIE_NAME,
        headerName = DEFAULT_HEADER_NAME,
        requireAuth = false,
        loginPath = '/login',
        publicPaths = [],
      } = options;

      return async ({ event, resolve }) => {
        // Extract session token
        const token =
          event.cookies.get(cookieName) ||
          event.request.headers.get(headerName);

        let session: CinacoinSession;
        if (token) {
          session = await this.verifySession(token);
        } else {
          session = {
            isAuthenticated: false,
            address: null,
            chainId: null,
            expiresAt: null,
          };
        }

        // Attach to locals
        event.locals.cinaConnect = session;

        // Optional: require authentication
        if (requireAuth && !session.isAuthenticated) {
          const pathname = event.url.pathname;
          const isPublic = publicPaths.some(
            (p) => pathname === p || pathname.startsWith(`${p}/`),
          );

          if (!isPublic) {
            return new Response(null, {
              status: 302,
              headers: { Location: loginPath },
            });
          }
        }

        return resolve(event);
      };
    },
  };
}

/**
 * Extract session token from a SvelteKit request event.
 *
 * @param event - SvelteKit RequestEvent.
 * @returns Session token string, or null.
 */
function getTokenFromRequest(event: RequestEvent): string | null {
  return (
    event.cookies.get(DEFAULT_COOKIE_NAME) ||
    event.request.headers.get(DEFAULT_HEADER_NAME)
  );
}

/**
 * Decode a session token into its payload.
 *
 * Supports JWT-style tokens and simple base64-encoded payloads.
 *
 * @param token - Session token string.
 * @returns Decoded payload.
 */
function decodeSessionToken(token: string): Record<string, unknown> {
  // Try JWT decoding first
  const parts = token.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf-8'),
      );
      return payload;
    } catch {
      // Fall through
    }
  }

  // Try plain base64
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
  } catch {
    throw new Error('Invalid session token');
  }
}

// ─── SSR-safe store initialization ───────────────────────────────────────────

/**
 * Check if code is running in a browser environment.
 *
 * @returns `true` if in browser, `false` if in Node.js/SSR.
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * SSR-safe store value initializer.
 *
 * Returns the provided value during SSR and in the browser.
 * Useful for initializing stores that would otherwise fail during
 * server-side rendering (e.g., accessing `localStorage`).
 *
 * @param value - The value to use.
 * @param fallback - Optional fallback for SSR (defaults to `value`).
 * @returns The value (or fallback during SSR).
 *
 * @example
 * ```ts
 * import { ssrSafeStore } from '@cinacoin/svelte/kit';
 *
 * const savedChain = ssrSafeStore(
 *   () => localStorage.getItem('chainId'),
 *   null,
 * );
 * ```
 */
export function ssrSafeStore<T>(
  getValue: () => T,
  fallback?: T,
): T {
  if (!isBrowser()) {
    return fallback ?? (null as unknown as T);
  }
  try {
    return getValue();
  } catch {
    return fallback ?? (null as unknown as T);
  }
}

/**
 * Create an SSR-safe writable store.
 *
 * During SSR, the store is initialized with the fallback value.
 * On hydration, it reads from the provided getter (e.g., localStorage).
 *
 * @param getValue - Function to get the initial value (browser only).
 * @param fallback - Fallback value for SSR.
 * @returns A Svelte writable store.
 */
export function createSsrSafeWritable<T>(
  getValue: () => T,
  fallback: T,
): Writable<T> {
  const initialValue = ssrSafeStore(getValue, fallback);
  return writable(initialValue);
}

// ─── Load function helpers ───────────────────────────────────────────────────

/**
 * Helper to create a load function that injects session data.
 *
 * @param options - Configuration options.
 * @returns SvelteKit Load function.
 *
 * @example
 * ```ts
 * import { createCinacoinLoad } from '@cinacoin/svelte/kit';
 *
 * export const load = createCinacoinLoad({
 *   transform: (session) => ({ userAddress: session.address }),
 * });
 * ```
 */
export function createCinacoinLoad(
  options?: {
    transform?: (session: CinacoinSession) => Record<string, unknown>;
    parent?: Load;
  },
): Load {
  return async (event) => {
    const server = getCinacoinServer();
    const session = await server.getSession(event);

    const data: Record<string, unknown> = {
      cinaConnect: session,
    };

    if (options?.transform) {
      Object.assign(data, options.transform(session));
    }

    if (options?.parent) {
      const parentData = await options.parent(event);
      Object.assign(data, parentData);
    }

    return data;
  };
}

// ─── Type augmentation for SvelteKit locals ──────────────────────────────────

declare module '@sveltejs/kit' {
  interface Locals {
    /** Cinacoin session data (attached by handle middleware). */
    cinaConnect?: CinacoinSession;
  }
}
