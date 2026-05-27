/**
 * @cinacoin/core-ui
 *
 * Main exports for Cinacoin Web Components.
 * Import this module to register all custom elements.
 */

// ── Foundation ─────────────────────────────────────────────
export { BaseLitElement } from './foundation/base-element.js';
export type { OCXTheme } from './foundation/base-element.js';
export { SlotManager, getAssignedNodes, getAssignedElement, hasSlotContent } from './foundation/slot-manager.js';
export { animate, animateOutAndRemove, transition, getAnimationTiming } from './foundation/animation-engine.js';
export type { AnimationConfig, AnimationPreset } from './foundation/animation-engine.js';

// ── Components ─────────────────────────────────────────────
export { ConnectButton } from './components/connect-button.js';
export type { ConnectButtonVariant, ConnectButtonSize, ConnectButtonState } from './components/connect-button.js';

export { ConnectModal } from './components/connect-modal.js';
export type { WalletInfo as ConnectModalWalletInfo, ConnectModalView } from './components/connect-modal.js';

export { WalletList } from './components/wallet-list.js';
export type { WalletInfo as WalletListWalletInfo } from './components/wallet-list.js';

export { WalletCard } from './components/wallet-card.js';
export type { WalletInfo as WalletCardWalletInfo } from './components/wallet-card.js';

export { ChainSwitcher } from './components/chain-switcher.js';
export type { ChainInfo } from './components/chain-switcher.js';

export { AccountModal } from './components/account-modal.js';
export type { AccountInfo, ConnectedAppInfo } from './components/account-modal.js';

export { TransactionToast } from './components/transaction-toast.js';
export type { TxStatus } from './components/transaction-toast.js';

export { NetworkBadge } from './components/network-badge.js';

// ── Styles ─────────────────────────────────────────────────
export { defaultStyles, truncateAddress, formatNumber, addressAvatarGradient } from './styles/default.js';

// ── Re-export for side-effect registration ─────────────────
// When this module is imported, all custom elements are defined automatically.
// No manual customElements.define() calls are needed.
