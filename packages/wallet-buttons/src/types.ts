/**
 * Type definitions for @cinacoin/wallet-buttons
 */

import type { ReactNode } from 'react';

/**
 * Visual style variant for a wallet button.
 *
 * - `'default'` — Standard outlined button with icon + label.
 * - `'brand'` — Solid fill using the wallet's official brand color.
 * - `'minimal'` — Text-only, subtle underline on hover.
 * - `'round'` — Circular icon button (avatar style).
 */
export type WalletButtonVariant = 'default' | 'brand' | 'minimal' | 'round';

/** Size preset for wallet buttons. */
export type WalletButtonSize = 'sm' | 'md' | 'lg';

/** Layout style for button groups. */
export type WalletButtonGroupLayout = 'grid' | 'list';

/**
 * Props for an individual wallet button.
 */
export interface WalletButtonProps {
  /** The wallet identifier (e.g. `'metamask'`, `'walletconnect'`). */
  walletId: string;

  /** Visual style variant. Default: `'default'`. */
  variant?: WalletButtonVariant;

  /** Button size. Default: `'md'`. */
  size?: WalletButtonSize;

  /** Optional click handler that receives the wallet ID. */
  onClick?: (walletId: string) => void;

  /** Optional class name for custom styling. */
  className?: string;

  /** Whether the button is in a loading/connecting state. */
  isLoading?: boolean;

  /** Whether the button is disabled. */
  disabled?: boolean;

  /** Optional override for the button label text. */
  label?: string;

  /** Show a checkmark icon when the wallet is connected. Default: `true`. */
  showConnectedBadge?: boolean;
}

/**
 * Props for a group of wallet buttons.
 */
export interface WalletButtonGroupProps {
  /**
   * Array of wallet IDs to display.
   * Default: popular wallets (MetaMask, WalletConnect, Coinbase, Rainbow, Trust, Phantom).
   */
  walletIds?: string[];

  /** Layout style. Default: `'grid'`. */
  layout?: WalletButtonGroupLayout;

  /** Visual variant applied to all buttons. Default: `'default'`. */
  variant?: WalletButtonVariant;

  /** Size applied to all buttons. Default: `'md'`. */
  size?: WalletButtonSize;

  /** Number of columns in grid layout. Default: `3`. */
  columns?: number;

  /** Optional click handler that receives the wallet ID. */
  onClick?: (walletId: string) => void;

  /** Optional class name for the group container. */
  className?: string;
}

/**
 * Internal data shape for a single wallet button configuration.
 */
export interface WalletButtonData {
  /** Unique wallet identifier. */
  walletId: string;

  /** Human-readable wallet name. */
  name: string;

  /** Icon URL (SVG or PNG, recommended 48x48 minimum). */
  icon: string;

  /** Official brand hex color (without `#`). */
  brandColor?: string;
}
