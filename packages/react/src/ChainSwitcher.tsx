import React, { useRef, useEffect, type CSSProperties } from 'react';
import { useCinaCoinContext } from './CinaCoinProvider.js';

/** Props for the React ChainSwitcher wrapper. */
export interface ChainSwitcherProps {
  /** CSS class name. */
  className?: string;
  /** Inline styles. */
  style?: CSSProperties;
  /** Chain change callback. */
  onChainChange?: (chainId: number) => void;
}

/**
 * ChainSwitcher — React wrapper for the OCX ChainSwitcher Web Component.
 *
 * Automatically reads available chains and active chain from context.
 *
 * ```tsx
 * <ChainSwitcher onChainChange={(id) => console.log('switched to', id)} />
 * ```
 */
export function ChainSwitcher({
  className,
  style,
  onChainChange,
}: ChainSwitcherProps): JSX.Element {
  const ref = useRef<HTMLElement>(null);
  const { config, account, switchChain } = useCinaCoinContext();

  const chains = config.chains ?? [];
  const activeChainId = account.chainId ?? chains[0]?.id ?? 1;

  useEffect(() => {
    const el = ref.current as HTMLElement & { chains?: unknown; activeChainId?: number } | null;
    if (!el) return;

    // Set chains as property
    el.chains = chains;
    el.activeChainId = activeChainId;

    const handleChainChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.chainId) {
        switchChain(detail.chainId).catch(() => {});
        onChainChange?.(detail.chainId);
      }
    };

    el.addEventListener('ocx-chain-change', handleChainChange);
    return () => {
      el.removeEventListener('ocx-chain-change', handleChainChange);
    };
  }, [chains, activeChainId, switchChain, onChainChange]);

  return (
    <ocx-chain-switcher
      ref={ref as React.RefObject<HTMLElement>}
      active-chain-id={activeChainId}
      className={className}
      style={style}
    />
  );
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ocx-chain-switcher': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'active-chain-id'?: number;
          className?: string;
          style?: CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}
