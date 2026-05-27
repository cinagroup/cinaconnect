/**
 * Direct WalletConnect button component.
 *
 * Renders a branded WalletConnect button that triggers a QR-code
 * connection flow via @cinacoin/core-sdk.
 *
 * @example
 * ```tsx
 * import { WalletConnectButton } from '@cinacoin/wallet-buttons';
 *
 * <WalletConnectButton size="lg" label="Connect with QR" />
 * ```
 */
import React from 'react';
import { WalletButtonSize } from './types';
interface WalletConnectButtonProps {
    /** Button size. Default: `'md'`. */
    size?: WalletButtonSize;
    /** Optional label override. Default: `'WalletConnect'`. */
    label?: string;
    /** Optional class name. */
    className?: string;
    /** Whether the button is in a loading state. */
    isLoading?: boolean;
    /** Whether the button is disabled. */
    disabled?: boolean;
    /** Called when the user clicks the button. */
    onClick?: () => void;
    /** WalletConnect project ID (optional if connector is pre-configured). */
    projectId?: string;
}
export declare const WalletConnectButton: React.FC<WalletConnectButtonProps>;
export {};
//# sourceMappingURL=WalletConnectButton.d.ts.map