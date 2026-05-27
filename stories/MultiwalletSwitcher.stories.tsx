import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { MultiwalletSwitcher } from '../packages/multiwallet/src/components/MultiwalletSwitcher';
import { MultiwalletStore } from '../packages/multiwallet/src/store';

/* ── Mock provider wrapper ─────────────────────────────────────────── */

function MockMultiwalletProvider({
  initialConnections,
  children,
}: {
  initialConnections: Record<string, any[]>;
  children: React.ReactNode;
}) {
  const [store] = useState(() => {
    const s = new MultiwalletStore();
    for (const [ns, conns] of Object.entries(initialConnections)) {
      for (const c of conns) {
        s.addConnection(c.walletId, c.walletName, ns as any, c.address, null, null);
        if (c.isActive) {
          s.setActiveConnection(c.walletId, ns as any);
        }
      }
    }
    return s;
  });

  // Expose store globally so useMultiwallet picks it up
  React.useEffect(() => {
    (window as any).__mockMultiwalletStore = store;
  }, [store]);

  return <>{children}</>;
}

/* ── Storybook meta ───────────────────────────────────────────────── */

const meta: Meta<typeof MultiwalletSwitcher> = {
  title: 'CinaCoin/MultiwalletSwitcher',
  component: MultiwalletSwitcher,
  argTypes: {
    className: { control: 'text' },
    namespaces: {
      control: 'check',
      options: ['eip155', 'solana', 'bip122'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof MultiwalletSwitcher>;

/* ── With connections ─────────────────────────────────────────────── */

const sampleConnections = {
  eip155: [
    {
      walletId: 'metamask',
      walletName: 'MetaMask',
      address: '0x1234567890abcdef1234567890abcdef12345678',
      isActive: true,
      icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
    },
    {
      walletId: 'walletconnect',
      walletName: 'WalletConnect',
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      isActive: false,
    },
  ],
  solana: [
    {
      walletId: 'phantom',
      walletName: 'Phantom',
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      isActive: true,
      icon: 'https://cryptologos.cc/logos/phantom-phantom-logo.png',
    },
  ],
  bip122: [
    {
      walletId: 'xverse',
      walletName: 'Xverse',
      address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      isActive: false,
    },
  ],
};

export const WithConnections: Story = {
  args: {},
  decorators: [
    (StoryComp: any) => (
      <div style={{ maxWidth: 400, background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <MockMultiwalletProvider initialConnections={sampleConnections}>
          <StoryComp />
        </MockMultiwalletProvider>
      </div>
    ),
  ],
  play: async () => {
    // Expand first namespace
  },
};

/* ── Without connections ──────────────────────────────────────────── */

export const WithoutConnections: Story = {
  args: {},
  decorators: [
    (StoryComp: any) => (
      <div style={{ maxWidth: 400, background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <MockMultiwalletProvider initialConnections={{ eip155: [], solana: [], bip122: [] }}>
          <StoryComp />
        </MockMultiwalletProvider>
      </div>
    ),
  ],
};

/* ── EVM only ─────────────────────────────────────────────────────── */

export const EVMOnly: Story = {
  args: {
    namespaces: ['eip155'],
  },
  decorators: [
    (StoryComp: any) => (
      <div style={{ maxWidth: 400, background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <MockMultiwalletProvider initialConnections={sampleConnections}>
          <StoryComp />
        </MockMultiwalletProvider>
      </div>
    ),
  ],
};

/* ── Switching wallets ────────────────────────────────────────────── */

export const Switching: Story = {
  args: {},
  decorators: [
    (StoryComp: any) => (
      <div style={{ maxWidth: 400, background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <MockMultiwalletProvider initialConnections={sampleConnections}>
          <StoryComp />
        </MockMultiwalletProvider>
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    // Click "Switch" on the non-active wallet
    const switchBtns = canvasElement.querySelectorAll('button');
    for (const btn of Array.from(switchBtns)) {
      if (btn.textContent?.includes('Switch')) {
        (btn as HTMLButtonElement).click();
        break;
      }
    }
  },
};

/* ── Custom render ────────────────────────────────────────────────── */

export const CustomRender: Story = {
  args: {
    renderWallet: (wallet: any) => (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '4px 0',
        }}
      >
        {wallet.icon && (
          <img
            src={wallet.icon}
            alt=""
            style={{ width: 20, height: 20, borderRadius: 4 }}
          />
        )}
        <span style={{ fontSize: 14, fontWeight: wallet.isActive ? 600 : 400 }}>
          {wallet.walletName}
        </span>
        {wallet.isActive && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              color: '#16a34a',
              fontWeight: 500,
            }}
          >
            ● Active
          </span>
        )}
      </div>
    ),
  },
  decorators: [
    (StoryComp: any) => (
      <div style={{ maxWidth: 400, background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <MockMultiwalletProvider initialConnections={sampleConnections}>
          <StoryComp />
        </MockMultiwalletProvider>
      </div>
    ),
  ],
};
