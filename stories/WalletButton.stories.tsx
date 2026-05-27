import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { WalletButton } from '../packages/wallet-buttons/src/WalletButton';

/* ── Mock useWalletButtons hook via module override ───────────────── */

const WALLET_DATA: Record<string, { name: string; icon: string; brandColor: string }> = {
  metamask: {
    name: 'MetaMask',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
    brandColor: 'f6851b',
  },
  walletconnect: {
    name: 'WalletConnect',
    icon: 'https://avatars.githubusercontent.com/u/37784886?s=200&v=4',
    brandColor: '3b99fc',
  },
  coinbase: {
    name: 'Coinbase Wallet',
    icon: 'https://www.coinbase.com/img/favicon/favicon-196.png',
    brandColor: '0052ff',
  },
  rainbow: {
    name: 'Rainbow',
    icon: 'https://rainbow.me/favicon.ico',
    brandColor: '091936',
  },
  phantom: {
    name: 'Phantom',
    icon: 'https://cryptologos.cc/logos/phantom-phantom-logo.png',
    brandColor: 'ab9ff2',
  },
};

// We render a direct inline mock since the hook requires a provider context.
// For Storybook, we render the visual component directly.

function MockWalletButton({
  walletId,
  variant = 'default',
  size = 'md',
  isLoading = false,
  disabled = false,
  label,
  showConnectedBadge = true,
  isConnected = false,
  onClick,
  className = '',
}: any) {
  const wallet = WALLET_DATA[walletId];
  if (!wallet) return null;

  const sizeMap: Record<string, { padding: string; icon: string; fontSize: string; gap: string; borderRadius: string }> = {
    sm: { padding: '6px 10px', icon: '20px', fontSize: '13px', gap: '6px', borderRadius: '8px' },
    md: { padding: '10px 16px', icon: '24px', fontSize: '15px', gap: '8px', borderRadius: '10px' },
    lg: { padding: '14px 24px', icon: '28px', fontSize: '16px', gap: '10px', borderRadius: '12px' },
  };
  const sizes = sizeMap[size];
  const isRound = variant === 'round';
  const isBrand = variant === 'brand';
  const isMinimal = variant === 'minimal';

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isRound ? '0' : sizes.gap,
    padding: isRound ? '8px' : sizes.padding,
    fontSize: sizes.fontSize,
    borderRadius: isRound ? '50%' : sizes.borderRadius,
    border: isMinimal ? 'none' : '1px solid #e2e8f0',
    backgroundColor: isBrand ? `#${wallet.brandColor}` : 'var(--cc-wb-bg, #ffffff)',
    color: isBrand ? '#ffffff' : 'var(--cc-wb-text, #1e293b)',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.6 : 1,
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
    fontWeight: 500,
    width: isRound ? sizes.icon : 'auto',
    height: isRound ? sizes.icon : 'auto',
    position: 'relative',
  };

  return (
    <button
      type="button"
      className={`cc-wallet-button cc-wallet-button--${variant} cc-wallet-button--${size} ${className}`}
      style={baseStyle}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label={`Connect with ${label ?? wallet.name}`}
    >
      {isLoading ? (
        <span
          style={{
            width: sizes.icon,
            height: sizes.icon,
            border: `2px solid ${isBrand ? 'rgba(255,255,255,0.3)' : '#e2e8f0'}`,
            borderTopColor: isBrand ? '#ffffff' : `#${wallet.brandColor}`,
            borderRadius: '50%',
            animation: 'cc-wb-spin 0.6s linear infinite',
            display: 'block',
          }}
        />
      ) : (
        <img
          src={wallet.icon}
          alt=""
          style={{ width: sizes.icon, height: sizes.icon, borderRadius: isRound ? '50%' : '4px', flexShrink: 0 }}
        />
      )}
      {!isRound && !isMinimal && <span>{label ?? wallet.name}</span>}
      {!isRound && isMinimal && (
        <span style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>
          {label ?? wallet.name}
        </span>
      )}
      {showConnectedBadge && isConnected && !isLoading && (
        <span
          style={{
            position: 'absolute',
            top: isRound ? '-2px' : '-4px',
            right: isRound ? '-2px' : '-4px',
            width: isRound ? '10px' : '12px',
            height: isRound ? '10px' : '12px',
            borderRadius: '50%',
            backgroundColor: '#22c55e',
            border: `2px solid ${isBrand ? '#' + wallet.brandColor : '#ffffff'}`,
          }}
        />
      )}
    </button>
  );
}

/* ── Meta ─────────────────────────────────────────────────────────── */

const meta: Meta<typeof MockWalletButton> = {
  title: 'CinaCoin/WalletButton',
  component: MockWalletButton,
  argTypes: {
    walletId: {
      control: 'select',
      options: ['metamask', 'walletconnect', 'coinbase', 'rainbow', 'phantom'],
    },
    variant: {
      control: 'select',
      options: ['default', 'brand', 'minimal', 'round'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    isLoading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    isConnected: { control: 'boolean' },
    showConnectedBadge: { control: 'boolean' },
    label: { control: 'text' },
  },
  args: {
    walletId: 'metamask',
    variant: 'default',
    size: 'md',
    isLoading: false,
    disabled: false,
    isConnected: false,
    showConnectedBadge: true,
  },
};

export default meta;
type Story = StoryObj<typeof MockWalletButton>;

/* ── Individual wallet stories ────────────────────────────────────── */

export const MetaMask: Story = { args: { walletId: 'metamask' } };
export const WalletConnect: Story = { args: { walletId: 'walletconnect' } };
export const Coinbase: Story = { args: { walletId: 'coinbase' } };
export const Rainbow: Story = { args: { walletId: 'rainbow' } };
export const Phantom: Story = { args: { walletId: 'phantom' } };

/* ── Variants ─────────────────────────────────────────────────────── */

export const DefaultVariant: Story = {
  args: { walletId: 'metamask', variant: 'default' },
};

export const BrandVariant: Story = {
  args: { walletId: 'metamask', variant: 'brand' },
};

export const MinimalVariant: Story = {
  args: { walletId: 'metamask', variant: 'minimal' },
};

export const RoundVariant: Story = {
  args: { walletId: 'metamask', variant: 'round', showConnectedBadge: false },
};

/* ── States ───────────────────────────────────────────────────────── */

export const WithConnectedBadge: Story = {
  args: { walletId: 'metamask', isConnected: true },
};

export const Loading: Story = {
  args: { walletId: 'metamask', isLoading: true },
};

export const Disabled: Story = {
  args: { walletId: 'metamask', disabled: true },
};

/* ── Sizes ────────────────────────────────────────────────────────── */

export const Small: Story = { args: { walletId: 'metamask', size: 'sm' } };
export const Medium: Story = { args: { walletId: 'metamask', size: 'md' } };
export const Large: Story = { args: { walletId: 'metamask', size: 'lg' } };

/* ── All wallets grid ─────────────────────────────────────────────── */

export const AllWallets: Story = {
  args: {},
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
      {Object.keys(WALLET_DATA).map((id) => (
        <MockWalletButton key={id} walletId={id} />
      ))}
    </div>
  ),
};

export const AllWalletsBrand: Story = {
  args: {},
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
      {Object.keys(WALLET_DATA).map((id) => (
        <MockWalletButton key={id} walletId={id} variant="brand" />
      ))}
    </div>
  ),
};

export const AllWalletsRound: Story = {
  args: {},
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
      {Object.keys(WALLET_DATA).map((id) => (
        <MockWalletButton key={id} walletId={id} variant="round" showConnectedBadge={false} />
      ))}
    </div>
  ),
};
