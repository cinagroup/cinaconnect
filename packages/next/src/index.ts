import { AppKitProvider, type AppKitProviderProps as AppKitProviderOptions } from './AppKitProvider';
import { AppKitPagesRouter, type AppKitPagesRouterProps as AppKitPagesRouterOptions } from './AppKitPagesRouter';

export { AppKitProvider, AppKitPagesRouter };
export type { AppKitProviderOptions, AppKitPagesRouterOptions };
export type { AppKitProviderProps } from './AppKitProvider';
export type { AppKitPagesRouterProps } from './AppKitPagesRouter';

// Server utilities
export { getCinacoinServer, getSession, verifySiweMessage, createServerClient } from './server';
export { withCinacoinAuth, requireAuth } from './server/middleware';

// Edge Runtime
export {
  getEdgeSession,
  withCinacoinAuthEdge,
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

// Client hooks (re-exports from @cinacoin/react)
export {
  useCinacoin,
  useCinacoinAccount,
  useCinacoinNetwork,
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
