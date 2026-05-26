/**
 * @cinaconnect/next/server
 *
 * Server-side utilities for Next.js API routes, middleware, server components, and Edge Runtime.
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

// Edge Runtime
export {
  getEdgeSession,
  withCinaConnectAuthEdge,
  requireAuthEdge,
  createSessionCookieHeader,
} from './edge.js';

export type {
  EdgeServerSession,
  EdgeAuthOptions,
} from './edge.js';

// EIP-5792 Server Utilities
export {
  getWalletCapabilitiesOnServer,
  verifyBatchCallOnServer,
} from './eip5792.js';

export type {
  EIP5792ServerOptions,
  ServerWalletCapabilities,
  ServerBatchVerification,
} from './eip5792.js';

// Server Actions
export {
  createSiweSession,
  authenticateWithWallet,
  createServerAction,
} from './actions.js';

export type {
  CreateSiweSessionResult,
  AuthenticateWithWalletParams,
  AuthenticateResult,
} from './actions.js';
