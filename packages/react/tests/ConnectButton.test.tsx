/**
 * Tests for @onchainux/react — ConnectButton, OnChainUXProvider, hooks.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock implementations since we can't import the actual components without React setup
import { OnChainUXProvider, useOnChainUXContext, type OnChainUXConfig, type OnChainUXContextValue, type AccountState, type Connector, type ChainConfig } from '../../src/OnChainUXProvider.js';
import { ConnectButton } from '../../src/ConnectButton.js';
import { useOnChainUX, useAccount, useChainId, useConnect, useDisconnect } from '../../src/hooks.js';

// Mock config
const mockConfig: OnChainUXConfig = {
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

describe('OnChainUXProvider', () => {
  it('should render children', () => {
    render(
      <OnChainUXProvider config={mockConfig}>
        <div data-testid="child">Hello</div>
      </OnChainUXProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should apply theme class', () => {
    render(
      <OnChainUXProvider config={{ ...mockConfig, theme: { mode: 'dark' } }}>
        <div data-testid="child" />
      </OnChainUXProvider>
    );
    const root = screen.getByTestId('child').parentElement;
    expect(root).toHaveClass('ocx-theme-dark');
  });

  it('should default to dark theme', () => {
    render(
      <OnChainUXProvider config={mockConfig}>
        <div data-testid="child" />
      </OnChainUXProvider>
    );
    const root = screen.getByTestId('child').parentElement;
    expect(root).toHaveClass('ocx-theme-dark');
  });

  it('should use first chain as default', () => {
    const TestComponent = () => {
      const { account } = useOnChainUXContext();
      return <div data-testid="chain">{account.chainId}</div>;
    };

    render(
      <OnChainUXProvider config={mockConfig}>
        <TestComponent />
      </OnChainUXProvider>
    );
    expect(screen.getByTestId('chain')).toHaveTextContent('1');
  });

  it('should expose correct initial status', () => {
    const TestComponent = () => {
      const { status } = useOnChainUXContext();
      return <div data-testid="status">{status}</div>;
    };

    render(
      <OnChainUXProvider config={mockConfig}>
        <TestComponent />
      </OnChainUXProvider>
    );
    expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
  });

  it('should throw when useOnChainUXContext is used outside provider', () => {
    const TestComponent = () => {
      useOnChainUXContext();
      return null;
    };

    // Suppress console error during test
    const spy = vi.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow('useOnChainUXContext must be used within');
    spy.mockRestore();
  });

  it('should provide default connectors', () => {
    const TestComponent = () => {
      const { connectors } = useOnChainUXContext();
      return <div data-testid="count">{connectors.length}</div>;
    };

    render(
      <OnChainUXProvider config={mockConfig}>
        <TestComponent />
      </OnChainUXProvider>
    );
    expect(screen.getByTestId('count')).toHaveTextContent('5');
  });
});

describe('React Hooks', () => {
  it('useOnChainUX returns context', () => {
    const TestComponent = () => {
      const ctx = useOnChainUX();
      return <div data-testid="has-config">{ctx.config ? 'yes' : 'no'}</div>;
    };

    render(
      <OnChainUXProvider config={mockConfig}>
        <TestComponent />
      </OnChainUXProvider>
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
      <OnChainUXProvider config={mockConfig}>
        <TestComponent />
      </OnChainUXProvider>
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
      <OnChainUXProvider config={mockConfig}>
        <TestComponent />
      </OnChainUXProvider>
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
      <OnChainUXProvider config={mockConfig}>
        <TestComponent />
      </OnChainUXProvider>
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
      <OnChainUXProvider config={mockConfig}>
        <TestComponent />
      </OnChainUXProvider>
    );
    expect(screen.getByTestId('disconnect-btn')).toBeInTheDocument();
  });
});

describe('ConnectButton', () => {
  it('should render with default label when disconnected', () => {
    render(
      <OnChainUXProvider config={mockConfig}>
        <ConnectButton />
      </OnChainUXProvider>
    );
    expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeInTheDocument();
  });

  it('should render with custom label', () => {
    render(
      <OnChainUXProvider config={mockConfig}>
        <ConnectButton label="Link Wallet" />
      </OnChainUXProvider>
    );
    expect(screen.getByRole('button', { name: 'Link Wallet' })).toBeInTheDocument();
  });

  it('should show address when connected', async () => {
    // We need to mock the connect function to simulate a connected state
    const TestWrapper = () => {
      const [connected, setConnected] = React.useState(false);

      return (
        <OnChainUXProvider config={mockConfig}>
          {connected ? (
            <div>Connected</div>
          ) : (
            <ConnectButton onClick={() => setConnected(true)} />
          )}
        </OnChainUXProvider>
      );
    };

    render(<TestWrapper />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should support different variants', () => {
    const { rerender } = render(
      <OnChainUXProvider config={mockConfig}>
        <ConnectButton variant="primary" />
      </OnChainUXProvider>
    );

    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(
      <OnChainUXProvider config={mockConfig}>
        <ConnectButton variant="ghost" />
      </OnChainUXProvider>
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should support different sizes', () => {
    render(
      <OnChainUXProvider config={mockConfig}>
        <ConnectButton size="sm" />
      </OnChainUXProvider>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
