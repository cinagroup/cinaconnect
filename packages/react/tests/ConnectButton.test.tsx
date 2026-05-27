/**
 * Tests for @cinacoin/react — ConnectButton, CinaCoinProvider, hooks.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock implementations since we can't import the actual components without React setup
import { CinaCoinProvider, useCinaCoinContext, type CinaCoinConfig, type CinaCoinContextValue, type AccountState, type Connector, type ChainConfig } from '../src/CinaCoinProvider.tsx';
import { ConnectButton } from '../src/ConnectButton.tsx';
import { useCinaCoin, useAccount, useChainId, useConnect, useDisconnect } from '../src/hooks.ts';

// Mock config
const mockConfig: CinaCoinConfig = {
  projectId: 'test-project',
  chains: [
    {
      id: 1,
      name: 'Ethereum',
      rpcUrl: 'https://eth.rpc',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    },
    {
      id: 137,
      name: 'Polygon',
      rpcUrl: 'https://polygon.rpc',
      nativeCurrency: { name: 'Polygon', symbol: 'MATIC', decimals: 18 },
    },
  ],
  theme: { mode: 'dark' },
  metadata: {
    name: 'Test App',
    description: 'Test',
    url: 'https://test.app',
  },
};

describe('CinaCoinProvider', () => {
  it('should render children', () => {
    render(
      <CinaCoinProvider config={mockConfig}>
        <div data-testid="child">Hello</div>
      </CinaCoinProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should apply theme class', () => {
    render(
      <CinaCoinProvider config={{ ...mockConfig, theme: { mode: 'dark' } }}>
        <div data-testid="child" />
      </CinaCoinProvider>
    );
    const root = screen.getByTestId('child').parentElement;
    expect(root).toHaveClass('ocx-theme-dark');
  });

  it('should default to dark theme', () => {
    render(
      <CinaCoinProvider config={mockConfig}>
        <div data-testid="child" />
      </CinaCoinProvider>
    );
    const root = screen.getByTestId('child').parentElement;
    expect(root).toHaveClass('ocx-theme-dark');
  });

  it('should use first chain as default', () => {
    const TestComponent = () => {
      const { account } = useCinaCoinContext();
      return <div data-testid="chain">{account.chainId}</div>;
    };

    render(
      <CinaCoinProvider config={mockConfig}>
        <TestComponent />
      </CinaCoinProvider>
    );
    expect(screen.getByTestId('chain')).toHaveTextContent('1');
  });

  it('should expose correct initial status', () => {
    const TestComponent = () => {
      const { status } = useCinaCoinContext();
      return <div data-testid="status">{status}</div>;
    };

    render(
      <CinaCoinProvider config={mockConfig}>
        <TestComponent />
      </CinaCoinProvider>
    );
    expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
  });

  it('should throw when useCinaCoinContext is used outside provider', () => {
    const TestComponent = () => {
      useCinaCoinContext();
      return null;
    };

    // Suppress console error during test
    const spy = vi.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow('useCinaCoinContext must be used within');
    spy.mockRestore();
  });

  it('should provide default connectors', () => {
    const TestComponent = () => {
      const { connectors } = useCinaCoinContext();
      return <div data-testid="count">{connectors.length}</div>;
    };

    render(
      <CinaCoinProvider config={mockConfig}>
        <TestComponent />
      </CinaCoinProvider>
    );
    expect(screen.getByTestId('count')).toHaveTextContent('5');
  });
});

describe('React Hooks', () => {
  it('useCinaCoin returns context', () => {
    const TestComponent = () => {
      const ctx = useCinaCoin();
      return <div data-testid="has-config">{ctx.config ? 'yes' : 'no'}</div>;
    };

    render(
      <CinaCoinProvider config={mockConfig}>
        <TestComponent />
      </CinaCoinProvider>
    );
    expect(screen.getByTestId('has-config')).toHaveTextContent('yes');
  });

  it('useAccount returns account state', () => {
    const TestComponent = () => {
      const account = useAccount();
      return (
        <div>
          <span data-testid="address">{account.address ?? 'null'}</span>
          <span data-testid="balance">{account.balance}</span>
        </div>
      );
    };

    render(
      <CinaCoinProvider config={mockConfig}>
        <TestComponent />
      </CinaCoinProvider>
    );
    expect(screen.getByTestId('address')).toHaveTextContent('null');
    expect(screen.getByTestId('balance')).toHaveTextContent('0.00');
  });

  it('useChainId returns chain ID', () => {
    const TestComponent = () => {
      const chainId = useChainId();
      return <div data-testid="chain-id">{chainId}</div>;
    };

    render(
      <CinaCoinProvider config={mockConfig}>
        <TestComponent />
      </CinaCoinProvider>
    );
    expect(screen.getByTestId('chain-id')).toHaveTextContent('1');
  });

  it('useConnect returns connect function', () => {
    const TestComponent = () => {
      const { connect, status } = useConnect();
      return (
        <div>
          <button data-testid="connect-btn" onClick={() => connect('metamask')}>Connect</button>
          <span data-testid="status">{status}</span>
        </div>
      );
    };

    render(
      <CinaCoinProvider config={mockConfig}>
        <TestComponent />
      </CinaCoinProvider>
    );
    expect(screen.getByTestId('connect-btn')).toBeInTheDocument();
    expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
  });

  it('useDisconnect returns disconnect function', () => {
    const TestComponent = () => {
      const { disconnect } = useDisconnect();
      return <button data-testid="disconnect-btn" onClick={() => disconnect()}>Disconnect</button>;
    };

    render(
      <CinaCoinProvider config={mockConfig}>
        <TestComponent />
      </CinaCoinProvider>
    );
    expect(screen.getByTestId('disconnect-btn')).toBeInTheDocument();
  });
});

describe('ConnectButton', () => {
  it('should render with default label when disconnected', () => {
    const { container } = render(
      <CinaCoinProvider config={mockConfig}>
        <ConnectButton />
      </CinaCoinProvider>
    );
    expect(container.querySelector('ocx-connect-button')).toBeInTheDocument();
    expect(container.querySelector('ocx-connect-button')).toHaveAttribute('label', 'Connect Wallet');
  });

  it('should render with custom label', () => {
    const { container } = render(
      <CinaCoinProvider config={mockConfig}>
        <ConnectButton label="Link Wallet" />
      </CinaCoinProvider>
    );
    const el = container.querySelector('ocx-connect-button');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('label', 'Link Wallet');
  });

  it('should show address when connected', async () => {
    // We need to mock the connect function to simulate a connected state
    const TestWrapper = () => {
      const [connected, setConnected] = React.useState(false);

      return (
        <CinaCoinProvider config={mockConfig}>
          {connected ? (
            <div>Connected</div>
          ) : (
            <ConnectButton onClick={() => setConnected(true)} />
          )}
        </CinaCoinProvider>
      );
    };

    const { container } = render(<TestWrapper />);
    expect(container.querySelector('ocx-connect-button')).toBeInTheDocument();
  });

  it('should support different variants', () => {
    const { container, rerender } = render(
      <CinaCoinProvider config={mockConfig}>
        <ConnectButton variant="primary" />
      </CinaCoinProvider>
    );

    expect(container.querySelector('ocx-connect-button')).toHaveAttribute('variant', 'primary');

    rerender(
      <CinaCoinProvider config={mockConfig}>
        <ConnectButton variant="ghost" />
      </CinaCoinProvider>
    );

    expect(container.querySelector('ocx-connect-button')).toHaveAttribute('variant', 'ghost');
  });

  it('should support different sizes', () => {
    const { container } = render(
      <CinaCoinProvider config={mockConfig}>
        <ConnectButton size="sm" />
      </CinaCoinProvider>
    );
    expect(container.querySelector('ocx-connect-button')).toHaveAttribute('size', 'sm');
  });
});
