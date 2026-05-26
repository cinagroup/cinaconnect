/**
 * @cinaconnect/react
 *
 * React adapter for CinaConnect white-label UI toolkit.
 *
 * Provides:
 * - CinaConnectProvider (React context)
 * - React wrapper components for OCX Web Components
 * - React hooks for on-chain state access
 */

export { CinaConnectProvider, useCinaConnectContext } from './CinaConnectProvider.js';
export type { CinaConnectConfig, CinaConnectContextValue, ChainConfig, ThemeMode } from './CinaConnectProvider.js';

export { ConnectButton } from './ConnectButton.js';
export type { ConnectButtonProps } from './ConnectButton.js';

export { ConnectModal } from './ConnectModal.js';
export type { ConnectModalProps } from './ConnectModal.js';

export { ChainSwitcher } from './ChainSwitcher.js';
export type { ChainSwitcherProps } from './ChainSwitcher.js';

export { useCinaConnect, useAccount, useChainId, useConnect, useDisconnect } from './hooks.js';

// EIP-5792 Wallet Call API hooks
export {
  useWalletCapabilities,
  useSendCalls,
  useAtomicBatch,
  useCallsStatus,
} from './hooks.js';

export type {
  UseWalletCapabilitiesReturn,
  UseSendCallsReturn,
  UseAtomicBatchReturn,
  UseCallsStatusReturn,
  SendCallsOptions,
  AtomicBatchOptions,
} from './hooks.js';
