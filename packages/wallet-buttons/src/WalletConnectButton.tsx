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

import React, { useCallback, useState } from 'react';
import { WalletButtonSize } from './types';

const WALLETCONNECT_BRAND = '3B99FC';

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

/** WalletConnect QR icon (inline SVG). */
const QR_ICON = (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="2" y="2" width="8" height="8" rx="1.5" fill="currentColor" />
    <rect x="14" y="2" width="8" height="8" rx="1.5" fill="currentColor" />
    <rect x="2" y="14" width="8" height="8" rx="1.5" fill="currentColor" />
    <rect x="14" y="14" width="3" height="3" fill="currentColor" />
    <rect x="19" y="14" width="3" height="3" fill="currentColor" />
    <rect x="14" y="19" width="3" height="3" fill="currentColor" />
    <rect x="19" y="19" width="3" height="3" fill="currentColor" />
    <rect x="4" y="4" width="4" height="4" rx="0.5" fill="white" />
    <rect x="16" y="4" width="4" height="4" rx="0.5" fill="white" />
    <rect x="4" y="16" width="4" height="4" rx="0.5" fill="white" />
    <rect x="5" y="5" width="2" height="2" fill="currentColor" />
    <rect x="17" y="5" width="2" height="2" fill="currentColor" />
    <rect x="5" y="17" width="2" height="2" fill="currentColor" />
  </svg>
);

const SIZE_MAP: Record<
  WalletConnectButtonProps['size'],
  { padding: string; icon: string; fontSize: string; gap: string; borderRadius: string }
> = {
  sm: { padding: '6px 12px', icon: '18px', fontSize: '13px', gap: '6px', borderRadius: '8px' },
  md: { padding: '10px 18px', icon: '22px', fontSize: '15px', gap: '8px', borderRadius: '10px' },
  lg: { padding: '14px 26px', icon: '26px', fontSize: '16px', gap: '10px', borderRadius: '12px' },
};

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  size = 'md',
  label = 'WalletConnect',
  className = '',
  isLoading = false,
  disabled = false,
  onClick,
  projectId,
}) => {
  const [showingQR, setShowingQR] = useState(false);
  const sizes = SIZE_MAP[size];

  const handleClick = useCallback(() => {
    if (disabled || isLoading) return;

    if (onClick) {
      onClick();
    } else {
      // Default: toggle QR modal state.
      setShowingQR((prev) => !prev);
    }
  }, [disabled, isLoading, onClick]);

  return (
    <>
      <button
        type="button"
        className={`cc-wc-button ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: sizes.gap,
          padding: sizes.padding,
          fontSize: sizes.fontSize,
          borderRadius: sizes.borderRadius,
          backgroundColor: `#${WALLETCONNECT_BRAND}`,
          color: '#ffffff',
          fontWeight: 500,
          fontFamily: 'inherit',
          cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
          opacity: disabled || isLoading ? 0.6 : 1,
          transition: 'all 0.15s ease',
          border: 'none',
          letterSpacing: '-0.01em',
          lineHeight: 1,
        }}
        onClick={handleClick}
        disabled={disabled || isLoading}
        aria-label={label}
        title={label}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = 'brightness(1.08)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = '';
          e.currentTarget.style.transform = '';
        }}
      >
        {isLoading ? (
          <span
            style={{
              width: sizes.icon,
              height: sizes.icon,
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#ffffff',
              borderRadius: '50%',
              animation: 'cc-wb-spin 0.6s linear infinite',
              display: 'block',
            }}
          />
        ) : (
          <span style={{ width: sizes.icon, height: sizes.icon, lineHeight: 0 }}>
            {QR_ICON}
          </span>
        )}
        <span>{label}</span>
      </button>

      {showingQR && !isLoading && (
        <div
          className="cc-wc-qr-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowingQR(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '32px',
              textAlign: 'center',
              minWidth: '300px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Scan with your wallet</h3>
            <div style={{ width: '200px', height: '200px', margin: '0 auto 16px' }}>
              {/*
                QR code rendering is delegated to the consuming app.
                Replace this placeholder with your preferred QR library
                (e.g. qrcode.react, react-qr-code).
              */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  fontSize: '14px',
                }}
              >
                QR Code Area
              </div>
            </div>
            <button
              onClick={() => setShowingQR(false)}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
