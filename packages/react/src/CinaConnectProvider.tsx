/**
 * Barrel re-export — alias for OnChainUXProvider.
 *
 * All internal components import from './CinaConnectProvider.js';
 * this file re-exports everything from OnChainUXProvider.tsx
 * so those imports resolve correctly.
 */

export {
  CinaConnectProvider,
  useCinaConnectContext,
} from './OnChainUXProvider.js';

export type {
  CinaConnectConfig,
  CinaConnectContextValue,
  ChainConfig,
  ThemeMode,
  AccountState,
  CinaConnectProviderProps,
  Connector,
} from './OnChainUXProvider.js';
