/**
 * @cinaconnect/react-native
 *
 * React Native adapter for CinaConnect — native UI components, not Web Components.
 */

export { CinaConnectProvider, useCinaConnectContext } from './CinaConnectProvider.js';
export type { CinaConnectConfig, CinaConnectContextValue, ThemeMode, ChainConfig } from './CinaConnectProvider.js';

export { ConnectButton } from './ConnectButton.js';
export type { ConnectButtonProps } from './ConnectButton.js';

export { ConnectModal } from './ConnectModal.js';
export type { ConnectModalProps, WalletInfo } from './ConnectModal.js';

export { QRScanner } from './QRScanner.js';
export type { QRScannerProps } from './QRScanner.js';

// Deep Linking
export {
  DeepLinkManager,
  deepLinkManager,
} from './deepLink.js';
export type {
  WalletSchemeConfig,
  DeepLinkResult,
  ParsedDeepLink,
} from './deepLink.js';

// Link Mode
export {
  LinkModeManager,
  linkModeManager,
} from './linkMode.js';
export type {
  LinkConnectResult,
  WalletReturnCallback,
} from './linkMode.js';
