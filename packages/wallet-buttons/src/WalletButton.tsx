/**
 * Individual wallet button component.
 *
 * Renders a styled button with the wallet's icon and name.
 * Supports four visual variants and three size presets.
 */

import React, { useCallback } from 'react';
import { WalletButtonProps } from './types';
import { useWalletButtons } from './hooks/useWalletButtons';
import './WalletButton.css';

/** Size preset → CSS sizing map. */
const SIZE_MAP: Record<
  NonNullable<WalletButtonProps['size']>,
  { padding: string; icon: string; fontSize: string; gap: string; borderRadius: string }
> = {
  sm: { padding: '6px 10px', icon: '20px', fontSize: '13px', gap: '6px', borderRadius: '8px' },
  md: { padding: '10px 16px', icon: '24px', fontSize: '15px', gap: '8px', borderRadius: '10px' },
  lg: { padding: '14px 24px', icon: '28px', fontSize: '16px', gap: '10px', borderRadius: '12px' },
};

export const WalletButton: React.FC<WalletButtonProps> = ({
  walletId,
  variant = 'default',
  size = 'md',
  onClick,
  className = '',
  isLoading = false,
  disabled = false,
  label,
  showConnectedBadge = true,
}) => {
  const { getWalletButtonData, isConnected } = useWalletButtons();
  const wallet = getWalletButtonData(walletId);
  const connected = isConnected(walletId);

  const handleClick = useCallback(() => {
    if (!disabled && !isLoading) {
      onClick?.(walletId);
    }
  }, [onClick, walletId, disabled, isLoading]);

  // Fallback if wallet data not found
  if (!wallet) {
    return null;
  }

  const sizes = SIZE_MAP[size];
  const isRound = variant === 'round';
  const isBrand = variant === 'brand';
  const isMinimal = variant === 'minimal';

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: isRound ? 'center' : 'center',
    gap: isRound ? '0' : sizes.gap,
    padding: isRound ? '8px' : sizes.padding,
    fontSize: isMinimal ? sizes.fontSize : sizes.fontSize,
    borderRadius: isRound ? '50%' : sizes.borderRadius,
    border: isMinimal ? 'none' : isRound ? 'none' : '1px solid var(--cc-wb-border, #e2e8f0)',
    backgroundColor: isBrand
      ? `#${wallet.brandColor ?? '3b3b3b'}`
      : isMinimal
        ? 'transparent'
        : isRound
          ? 'var(--cc-wb-bg, #f8fafc)'
          : 'var(--cc-wb-bg, #ffffff)',
    color: isBrand
      ? '#ffffff'
      : 'var(--cc-wb-text, #1e293b)',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.6 : 1,
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
    fontWeight: 500,
    letterSpacing: '-0.01em',
    lineHeight: 1,
    width: isRound ? sizes.icon : 'auto',
    height: isRound ? sizes.icon : 'auto',
    minWidth: isRound ? sizes.icon : undefined,
    overflow: 'hidden',
    position: 'relative',
  };

  const imgStyle: React.CSSProperties = {
    width: sizes.icon,
    height: sizes.icon,
    borderRadius: isRound ? '50%' : '4px',
    flexShrink: 0,
  };

  return (
    <button
      type="button"
      className={`cc-wallet-button cc-wallet-button--${variant} cc-wallet-button--${size} ${className}`}
      style={baseStyle}
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-label={`Connect with ${label ?? wallet.name}`}
      title={`Connect with ${wallet.name}`}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        if (isBrand) {
          el.style.filter = 'brightness(1.1)';
        } else {
          el.style.borderColor = `var(--cc-wb-border-hover, ${wallet.brandColor ? '#' + wallet.brandColor : '#94a3b8'})`;
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.filter = '';
        el.style.borderColor = isMinimal ? 'none' : '1px solid var(--cc-wb-border, #e2e8f0)';
      }}
    >
      {isLoading ? (
        <span
          className="cc-wallet-button__spinner"
          style={{
            width: sizes.icon,
            height: sizes.icon,
            border: `2px solid ${isBrand ? 'rgba(255,255,255,0.3)' : 'var(--cc-wb-border, #e2e8f0)'}`,
            borderTopColor: isBrand ? '#ffffff' : wallet.brandColor ? `#${wallet.brandColor}` : '#3b82f6',
            borderRadius: '50%',
            animation: 'cc-wb-spin 0.6s linear infinite',
            display: 'block',
          }}
        />
      ) : (
        <img
          src={wallet.icon}
          alt=""
          style={imgStyle}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      {!isRound && !isMinimal && (
        <span>{label ?? wallet.name}</span>
      )}
      {!isRound && isMinimal && (
        <span style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>
          {label ?? wallet.name}
        </span>
      )}
      {showConnectedBadge && connected && !isLoading && (
        <span
          className="cc-wallet-button__badge"
          style={{
            position: 'absolute',
            top: isRound ? '-2px' : '-4px',
            right: isRound ? '-2px' : '-4px',
            width: isRound ? '10px' : '12px',
            height: isRound ? '10px' : '12px',
            borderRadius: '50%',
            backgroundColor: '#22c55e',
            border: `2px solid ${isBrand ? '#' + wallet.brandColor : 'var(--cc-wb-bg, #ffffff)'}`,
          }}
        />
      )}
    </button>
  );
};
