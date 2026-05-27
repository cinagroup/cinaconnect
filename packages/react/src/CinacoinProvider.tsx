/**
 * Barrel re-export — alias for OnChainUXProvider.
 *
 * All internal components import from './CinaCoinProvider.js';
 * this file re-exports everything from OnChainUXProvider.tsx
 * so those imports resolve correctly.
 */

export {
  CinaCoinProvider,
  useCinaCoinContext,
} from './OnChainUXProvider.js';

export type {
  CinaCoinConfig,
  CinaCoinContextValue,
  ChainConfig,
  ThemeMode,
  AccountState,
  CinaCoinProviderProps,
  Connector,
} from './OnChainUXProvider.js';
