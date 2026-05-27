import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

/* ── NetworkButton mock ─────────────────────────────────────────────── */

interface NetworkButtonProps {
  /** Network identifier (eth, arb, base, polygon, etc.). */
  network: string;
  /** Network name override. */
  label?: string;
  /** Whether the network is currently active/connected. */
  isActive?: boolean;
  /** Show chain ID. */
  showChainId?: boolean;
  /** Visual size. */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class. */
  className?: string;
  /** Click handler. */
  onClick?: () => void;
}

const NETWORK_META: Record<string, { name: string; chainId: number; color: string; symbol: string }> = {
  eth: { name: 'Ethereum', chainId: 1, color: '#627eea', symbol: 'ETH' },
  arb: { name: 'Arbitrum', chainId: 42161, color: '#28a0f0', symbol: 'ETH' },
  base: { name: 'Base', chainId: 8453, color: '#0052ff', symbol: 'ETH' },
  polygon: { name: 'Polygon', chainId: 137, color: '#8247e5', symbol: 'MATIC' },
  optimism: { name: 'Optimism', chainId: 10, color: '#ff0420', symbol: 'ETH' },
  bsc: { name: 'BNB Chain', chainId: 56, color: '#f0b90b', symbol: 'BNB' },
  solana: { name: 'Solana', chainId: 0, color: '#9945ff', symbol: 'SOL' },
};

function NetworkButton({
  network,
  label,
  isActive = false,
  showChainId = false,
  size = 'md',
  className = '',
  onClick,
}: NetworkButtonProps) {
  const meta = NETWORK_META[network] ?? { name: network, chainId: 0, color: '#6b7280', symbol: '?' };
  const displayName = label ?? meta.name;
  const sizeMap: Record<string, { padding: string; fontSize: string; dotSize: string }> = {
    sm: { padding: '4px 10px', fontSize: '12px', dotSize: '8px' },
    md: { padding: '6px 14px', fontSize: '13px', dotSize: '10px' },
    lg: { padding: '8px 18px', fontSize: '14px', dotSize: '12px' },
  };
  const s = sizeMap[size];

  return (
    <button
      type="button"
      className={`cc-network-button ${className}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: s.padding,
        fontSize: s.fontSize,
        fontFamily: 'system-ui, sans-serif',
        fontWeight: 500,
        borderRadius: '8px',
        border: isActive ? `2px solid ${meta.color}` : '1px solid #e2e8f0',
        background: isActive ? `${meta.color}15` : '#ffffff',
        color: isActive ? meta.color : '#374151',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <span
        style={{
          width: s.dotSize,
          height: s.dotSize,
          borderRadius: '50%',
          background: meta.color,
          flexShrink: 0,
        }}
      />
      {displayName}
      {showChainId && <span style={{ opacity: 0.6, fontSize: parseInt(s.fontSize) - 2 }}>#{meta.chainId}</span>}
    </button>
  );
}

const meta: Meta<typeof NetworkButton> = {
  title: 'CinaCoin/NetworkButton',
  component: NetworkButton,
  argTypes: {
    network: {
      control: 'select',
      options: ['eth', 'arb', 'base', 'polygon', 'optimism', 'bsc', 'solana'],
    },
    label: { control: 'text' },
    isActive: { control: 'boolean' },
    showChainId: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: {
    network: 'eth',
    isActive: false,
    showChainId: false,
    size: 'md',
  },
};

export default meta;
type Story = StoryObj<typeof NetworkButton>;

/** Default — Ethereum. */
export const Default: Story = {
  args: {
    network: 'eth',
  },
};

/** Ethereum (active). */
export const Ethereum: Story = {
  args: {
    network: 'eth',
    isActive: true,
    showChainId: true,
  },
};

/** Arbitrum. */
export const Arbitrum: Story = {
  args: {
    network: 'arb',
    showChainId: true,
  },
};

/** Base. */
export const Base: Story = {
  args: {
    network: 'base',
    showChainId: true,
  },
};

/** Polygon. */
export const Polygon: Story = {
  args: {
    network: 'polygon',
    showChainId: true,
  },
};

/** Optimism. */
export const Optimism: Story = {
  args: {
    network: 'optimism',
    showChainId: true,
  },
};

/** BNB Chain. */
export const BSC: Story = {
  args: {
    network: 'bsc',
    showChainId: true,
  },
};

/** Solana. */
export const Solana: Story = {
  args: {
    network: 'solana',
    showChainId: false,
  },
};

/** Custom label. */
export const CustomLabel: Story = {
  args: {
    network: 'eth',
    label: 'Mainnet',
    isActive: true,
  },
};

/** All networks grid. */
export const AllNetworks: Story = {
  args: {},
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {Object.keys(NETWORK_META).map((n) => (
        <NetworkButton key={n} network={n} showChainId />
      ))}
    </div>
  ),
};

/** All networks active — Ethereum. */
export const AllNetworksActive: Story = {
  args: {},
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {Object.keys(NETWORK_META).map((n) => (
        <NetworkButton key={n} network={n} isActive={n === 'eth'} showChainId />
      ))}
    </div>
  ),
};
