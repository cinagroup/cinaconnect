/**
 * @cinacoin/wallet-buttons
 *
 * Direct wallet connection buttons — no modal, no bloat.
 * Connect wallets individually with beautiful, customizable buttons.
 *
 * @packageDocumentation
 * @example
 * ```tsx
 * import { WalletButton, WalletButtonGroup, WalletConnectButton } from '@cinacoin/wallet-buttons';
 * import { useWalletButtons } from '@cinacoin/wallet-buttons';
 *
 * function App() {
 *   return (
 *     <div>
 *       <WalletButton walletId="metamask" variant="brand" size="lg" />
 *       <WalletButtonGroup walletIds={['metamask', 'walletconnect', 'coinbase']} layout="grid" />
 *       <WalletConnectButton size="md" />
 *     </div>
 *   );
 * }
 * ```
 */
export { WalletButton } from './WalletButton';
export { WalletButtonGroup } from './WalletButtonGroup';
export { WalletConnectButton } from './WalletConnectButton';
export { useWalletButtons } from './hooks/useWalletButtons';
export type { WalletButtonProps, WalletButtonVariant, WalletButtonSize, WalletButtonGroupProps, WalletButtonGroupLayout, WalletButtonData, } from './types';
//# sourceMappingURL=index.d.ts.map