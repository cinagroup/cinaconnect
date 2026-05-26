import { AppKitProvider, type AppKitProviderOptions } from './AppKitProvider';
import { AppKitPagesRouter, type AppKitPagesRouterOptions } from './AppKitPagesRouter';

export { AppKitProvider, AppKitPagesRouter };
export type { AppKitProviderOptions, AppKitPagesRouterOptions };

// Server utilities
export { getCinaConnectServer, getSession, verifySiweMessage, createServerClient } from './server';
export { withCinaConnectAuth, requireAuth } from './server/middleware';

// Edge Runtime
export {
  getEdgeSession,
  withCinaConnectAuthEdge,
  requireAuthEdge,
  createSessionCookieHeader,
} from './server/edge';

export type {
  EdgeServerSession,
  EdgeAuthOptions,
} from './server/edge';

// EIP-5792 Server Utilities
export {
  getWalletCapabilitiesOnServer,
  verifyBatchCallOnServer,
} from './server/eip5792';

export type {
  EIP5792ServerOptions,
  ServerWalletCapabilities,
  ServerBatchVerification,
} from './server/eip5792';

// Server Actions
export {
  createSiweSession,
  authenticateWithWallet,
  createServerAction,
} from './server/actions';

export type {
  CreateSiweSessionResult,
  AuthenticateWithWalletParams,
  AuthenticateResult,
} from './server/actions';

// Client hooks (re-exports from @cinaconnect/react)
export {
  useCinaConnect,
  useCinaConnectAccount,
  useCinaConnectNetwork,
  useDisconnect,
  useWalletInfo,
  useBalance,
  useAppKit,
} from './hooks';

// SSR-safe hooks
export {
  useAppKitState,
  useHydratedAppKit,
  useOnChainReady,
} from './hooks/ssr';

export type {
  AppKitInitialState,
  UseAppKitStateReturn,
  UseHydratedAppKitReturn,
} from './hooks/ssr';

// Components
export {
  OnuxProvider,
  ConnectButton,
  AccountButton,
  NetworkButton,
} from './components';
