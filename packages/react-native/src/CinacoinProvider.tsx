/**
 * CinaCoinProvider — Re-export from OnChainUXProvider for backward compatibility.
 *
 * The actual implementation lives in OnChainUXProvider.tsx. This barrel
 * preserves existing import paths used by ConnectButton, ConnectModal,
 * QRScanner, index.ts, and EIP-5792/ENS hooks.
 */

export {
  CinaCoinProvider,
  useCinaCoinContext,
} from './OnChainUXProvider.js';

export type {
  CinaCoinConfig,
  CinaCoinContextValue,
  ThemeMode,
  ChainConfig,
  Connector,
  WalletInfo,
  AccountState,
  ThemeColors,
  CinaCoinProviderProps,
} from './OnChainUXProvider.js';
