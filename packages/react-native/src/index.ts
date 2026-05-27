/**
 * @cinacoin/react-native
 *
 * React Native adapter for Cinacoin — native UI components, not Web Components.
 */

export { CinacoinProvider, useCinacoinContext } from './CinacoinProvider.js';
export type { CinacoinConfig, CinacoinContextValue, ThemeMode, ChainConfig } from './CinacoinProvider.js';

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

// EIP-5792 Hooks
export {
  useWalletCapabilities,
  useSendCalls,
  useAtomicBatch,
  useCallsStatus,
} from './hooks/useEIP5792.js';
export type {
  UseWalletCapabilitiesReturn,
  UseSendCallsReturn,
  SendCallsOptions,
  UseAtomicBatchReturn,
  AtomicBatchOptions,
  UseCallsStatusReturn,
} from './hooks/useEIP5792.js';

// ENS Hooks
export {
  useENSName,
  useENSAddress,
  resolveENSAddress,
  lookupENSName,
} from './hooks/useENS.js';
export type {
  UseENSNameReturn,
  UseENSAddressReturn,
} from './hooks/useENS.js';

// Biometric Auth
export {
  useBiometricAuth,
  BiometricKeyStore,
} from './biometric.js';
export type {
  UseBiometricAuthReturn,
  BiometricAuthResult,
  BiometricAuthOptions,
  BiometricType,
  BiometricKeyStoreOptions,
} from './biometric.js';

// Push Notifications
export {
  PushNotificationManager,
  pushNotificationManager,
} from './push.js';
export type {
  PushProvider,
  WCRelayNotification,
  PushNotificationConfig,
  PushManagerState,
  UsePushNotificationReturn,
} from './push.js';
