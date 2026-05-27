import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

/* ── AccountButton mock (no separate source file exists; inline mock) ──── */

interface AccountButtonProps {
  /** Wallet address to display. */
  address?: string;
  /** Account balance string. */
  balance?: string;
  /** Chain symbol (ETH, MATIC, etc.). */
  chainSymbol?: string;
  /** Visual size. */
  size?: 'sm' | 'md' | 'lg';
  /** Show balance. */
  showBalance?: boolean;
  /** Show avatar. */
  showAvatar?: boolean;
  /** Whether account is in loading state. */
  isLoading?: boolean;
  /** Custom class. */
  className?: string;
  /** Click handler. */
  onClick?: () => void;
}

function AccountButton({
  address,
  balance,
  chainSymbol,
  size = 'md',
  showBalance = false,
  showAvatar = false,
  isLoading = false,
  className = '',
  onClick,
}: AccountButtonProps) {
  const sizeMap: Record<string, { padding: string; fontSize: string; avatarSize: string }> = {
    sm: { padding: '4px 8px', fontSize: '13px', avatarSize: '20px' },
    md: { padding: '6px 12px', fontSize: '14px', avatarSize: '24px' },
    lg: { padding: '8px 16px', fontSize: '15px', avatarSize: '28px' },
  };
  const s = sizeMap[size];

  return (
    <button
      type="button"
      className={`cc-account-button ${className}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: s.padding,
        fontSize: s.fontSize,
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '9999px',
        border: '1px solid #e2e8f0',
        background: '#ffffff',
        color: '#0f172a',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        opacity: isLoading ? 0.6 : 1,
      }}
    >
      {showAvatar && (
        <div
          style={{
            width: s.avatarSize,
            height: s.avatarSize,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: parseInt(s.avatarSize) * 0.5,
            fontWeight: 600,
          }}
        >
          {address ? address.slice(2, 4) : '?'}
        </div>
      )}
      {isLoading ? (
        <span style={{ opacity: 0.5 }}>Loading…</span>
      ) : (
        <span>
          {address ?? 'No Account'}
          {showBalance && balance && (
            <span style={{ color: '#64748b', marginLeft: '6px' }}>
              {balance} {chainSymbol}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

const meta: Meta<typeof AccountButton> = {
  title: 'CinaCoin/AccountButton',
  component: AccountButton,
  argTypes: {
    address: { control: 'text' },
    balance: { control: 'text' },
    chainSymbol: { control: 'text' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    showBalance: { control: 'boolean' },
    showAvatar: { control: 'boolean' },
    isLoading: { control: 'boolean' },
  },
  args: {
    size: 'md',
    showBalance: false,
    showAvatar: false,
    isLoading: false,
  },
};

export default meta;
type Story = StoryObj<typeof AccountButton>;

/** Default — no account connected. */
export const Default: Story = {
  args: {},
};

/** With address only. */
export const WithAddress: Story = {
  args: {
    address: '0x1234…5678',
    showAvatar: true,
  },
};

/** With balance. */
export const WithBalance: Story = {
  args: {
    address: '0x1234…5678',
    balance: '2.456',
    chainSymbol: 'ETH',
    showBalance: true,
    showAvatar: true,
  },
  play: async ({ canvasElement }) => {
    const btn = canvasElement.querySelector('button') as HTMLButtonElement;
    if (btn) btn.click();
  },
};

/** Without balance (address only). */
export const WithoutBalance: Story = {
  args: {
    address: '0xAbCd…Ef01',
    showBalance: false,
    showAvatar: true,
  },
};

/** Loading state. */
export const Loading: Story = {
  args: {
    isLoading: true,
    showAvatar: true,
  },
};

/** Small size. */
export const Small: Story = {
  args: {
    address: '0x1234…5678',
    size: 'sm',
    showAvatar: true,
  },
};

/** Large size. */
export const Large: Story = {
  args: {
    address: '0x1234…5678',
    size: 'lg',
    showBalance: true,
    balance: '10.5',
    chainSymbol: 'ETH',
    showAvatar: true,
  },
};
