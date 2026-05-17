/**
 * @onchainux/react-native
 *
 * React Native adapter for OnChainUX — native UI components, not Web Components.
 */

export { OnChainUXProvider, useOnChainUXContext } from './OnChainUXProvider.js';
export type { OnChainUXConfig, OnChainUXContextValue, ThemeMode, ChainConfig } from './OnChainUXProvider.js';

export { ConnectButton } from './ConnectButton.js';
export type { ConnectButtonProps } from './ConnectButton.js';

export { ConnectModal } from './ConnectModal.js';
export type { ConnectModalProps, WalletInfo } from './ConnectModal.js';

export { QRScanner } from './QRScanner.js';
export type { QRScannerProps } from './QRScanner.js';
