import React, { type CSSProperties } from 'react';
/** Props for the React ConnectButton wrapper. */
export interface ConnectButtonProps {
    /** Button text when disconnected. */
    label?: string;
    /** Button visual variant. */
    variant?: 'primary' | 'secondary' | 'ghost';
    /** Button size. */
    size?: 'sm' | 'md' | 'lg';
    /** Show account balance when connected. */
    showBalance?: boolean;
    /** Show avatar when connected. */
    showAvatar?: boolean;
    /** Show network badge when connected. */
    showNetwork?: boolean;
    /** CSS class name. */
    className?: string;
    /** Inline styles. */
    style?: CSSProperties;
    /** Click handler. */
    onClick?: () => void;
    /** Disconnect handler. */
    onDisconnect?: () => void;
}
/**
 * ConnectButton — React wrapper for the OCX ConnectButton Web Component.
 *
 * Automatically reads connection state from CinacoinProvider context.
 *
 * ```tsx
 * <ConnectButton variant="primary" size="md" />
 * ```
 */
export declare function ConnectButton({ label, variant, size, showBalance, showAvatar, showNetwork, className, style, onClick, onDisconnect, }: ConnectButtonProps): JSX.Element;
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'ocx-connect-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
                variant?: string;
                size?: string;
                label?: string;
                state?: string;
                address?: string;
                balance?: string;
                'chain-symbol'?: string;
                'show-balance'?: boolean;
                'show-avatar'?: boolean;
                'show-network'?: boolean;
                className?: string;
                style?: CSSProperties;
            }, HTMLElement>;
        }
    }
}
//# sourceMappingURL=ConnectButton.d.ts.map