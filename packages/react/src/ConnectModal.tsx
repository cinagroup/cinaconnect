import React, { useRef, useEffect, type CSSProperties } from 'react';
import { useCinaCoinContext } from './CinaCoinProvider.js';

/** Props for the React ConnectModal wrapper. */
export interface ConnectModalProps {
  /** Whether the modal is open. */
  isOpen: boolean;
  /** Close callback. */
  onClose: () => void;
  /** Available views. */
  views?: Array<'wallets' | 'social' | 'email' | 'scan'>;
  /** Default view. */
  defaultView?: string;
  /** Recommended wallet IDs. */
  recommendedWalletIds?: string[];
  /** Theme override. */
  theme?: Record<string, string>;
  /** CSS class name. */
  className?: string;
  /** Inline styles. */
  style?: CSSProperties;
}

/**
 * ConnectModal — React wrapper for the OCX ConnectModal Web Component.
 *
 * ```tsx
 * <ConnectModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
 * ```
 */
export function ConnectModal({
  isOpen,
  onClose,
  defaultView = 'wallets',
  recommendedWalletIds,
  className,
  style,
}: ConnectModalProps): JSX.Element {
  const ref = useRef<HTMLElement>(null);
  const { connect } = useCinaCoinContext();

  useEffect(() => {
    const el = ref.current as HTMLElement & { recommendedWalletIds?: string[] } | null;
    if (!el) return;

    // Set recommended wallet IDs as property (not attribute)
    if (recommendedWalletIds) {
      el.recommendedWalletIds = recommendedWalletIds;
    }

    const handleClose = () => onClose();
    const handleWalletSelect = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id) {
        connect(detail.id).catch(() => {});
      }
      onClose();
    };

    el.addEventListener('ocx-close', handleClose);
    el.addEventListener('ocx-wallet-select', handleWalletSelect);
    return () => {
      el.removeEventListener('ocx-close', handleClose);
      el.removeEventListener('ocx-wallet-select', handleWalletSelect);
    };
  }, [connect, onClose]);

  return (
    <ocx-connect-modal
      ref={ref as React.RefObject<HTMLElement>}
      is-open={isOpen}
      default-view={defaultView}
      recommended-wallet-ids={recommendedWalletIds?.join(',')}
      className={className}
      style={style}
    />
  );
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ocx-connect-modal': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'is-open'?: boolean;
          'default-view'?: string;
          'recommended-wallet-ids'?: string;
          className?: string;
          style?: CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}
