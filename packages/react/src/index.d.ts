/**
 * @cinacoin/react
 *
 * React adapter for Cinacoin white-label UI toolkit.
 *
 * Provides:
 * - CinacoinProvider (React context)
 * - React wrapper components for OCX Web Components
 * - React hooks for on-chain state access
 */
export { CinacoinProvider, useCinacoinContext } from './CinacoinProvider.js';
export type { CinacoinConfig, CinacoinContextValue, ChainConfig, ThemeMode } from './CinacoinProvider.js';
export { ConnectButton } from './ConnectButton.js';
export type { ConnectButtonProps } from './ConnectButton.js';
export { ConnectModal } from './ConnectModal.js';
export type { ConnectModalProps } from './ConnectModal.js';
export { ChainSwitcher } from './ChainSwitcher.js';
export type { ChainSwitcherProps } from './ChainSwitcher.js';
export { useCinacoin, useAccount, useChainId, useConnect, useDisconnect } from './hooks.js';
//# sourceMappingURL=index.d.ts.map