import React, { useRef, useEffect, type CSSProperties } from 'react';
import { useCinaCoinContext } from './CinaCoinProvider.js';

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
 * Automatically reads connection state from CinaCoinProvider context.
 *
 * ```tsx
 * <ConnectButton variant="primary" size="md" />
 * ```
 */
export function ConnectButton({
  label = 'Connect Wallet',
  variant = 'primary',
  size = 'md',
  showBalance = false,
  showAvatar = false,
  showNetwork = false,
  className,
  style,
  onClick,
  onDisconnect,
}: ConnectButtonProps): JSX.Element {
  const ref = useRef<HTMLElement>(null);
  const { account, status, connect, disconnect } = useCinaCoinContext();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleOCXClick = () => {
      if (status === 'disconnected' || status === 'error') {
        connect('metamask').catch(() => {});
      }
      onClick?.();
    };
    const handleOCXDisconnect = () => {
      disconnect().catch(() => {});
      onDisconnect?.();
    };

    el.addEventListener('ocx-click', handleOCXClick);
    el.addEventListener('ocx-disconnect', handleOCXDisconnect);
    return () => {
      el.removeEventListener('ocx-click', handleOCXClick);
      el.removeEventListener('ocx-disconnect', handleOCXDisconnect);
    };
  }, [status, connect, disconnect, onClick, onDisconnect]);

  const stateMap: Record<string, string> = {
    disconnected: 'disconnected',
    connecting: 'connecting',
    connected: 'connected',
    error: 'error',
  };

  return (
    <ocx-connect-button
      ref={ref as React.RefObject<HTMLElement>}
      variant={variant}
      size={size}
      label={label}
      state={stateMap[status] ?? 'disconnected'}
      address={account.address ?? ''}
      balance={showBalance ? account.balance : ''}
      chain-symbol={showBalance ? account.chainSymbol : ''}
      show-balance={showBalance}
      show-avatar={showAvatar}
      show-network={showNetwork}
      className={className}
      style={style}
    />
  );
}

// Type declaration for the custom element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ocx-connect-button': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
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
        },
        HTMLElement
      >;
    }
  }
}
