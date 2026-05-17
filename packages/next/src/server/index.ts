/**
 * @cinaconnect/next/server
 *
 * Server-side utilities for Next.js API routes, middleware, and server components.
 */

export {
  createServerClient,
  getCinaConnectServer,
} from './core.js';

export type {
  ServerClientOptions,
  ServerSession,
  ServerClient,
} from './core.js';

export {
  getSession,
  verifySiweMessage,
  withCinaConnectAuth,
  requireAuth,
} from './middleware.js';
