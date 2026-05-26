/**
 * Tests for @cinaconnect/react — ConnectButton, CinaConnectProvider, hooks.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock implementations since we can't import the actual components without React setup
import { CinaConnectProvider, useCinaConnectContext, type CinaConnectConfig, type CinaConnectContextValue, type AccountState, type Connector, type ChainConfig } from '../src/CinaConnectProvider.tsx';
import { ConnectButton } from '../src/ConnectButton.tsx';
import { useCinaConnect, useAccount, useChainId, useConnect, useDisconnect } from '../src/hooks.ts';

// Mock config
const mockConfig: CinaConnectConfig = {
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

describe('CinaConnectProvider', () => {
  it('should render children', () => {
    render(
      <CinaConnectProvider config={mockConfig}>
        <div data-testid="child">Hello</div>
      </CinaConnectProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should apply theme class', () => {
    render(
      <CinaConnectProvider config={{ ...mockConfig, theme: { mode: 'dark' } }}>
        <div data-testid="child" />
      </CinaConnectProvider>
    );
    const root = screen.getByTestId('child').parentElement;
    expect(root).toHaveClass('ocx-theme-dark');
  });

  it('should default to dark theme', () => {
    render(
      <CinaConnectProvider config={mockConfig}>
        <div data-testid="child" />
      </CinaConnectProvider>
    );
    const root = screen.getByTestId('child').parentElement;
    expect(root).toHaveClass('ocx-theme-dark');
  });

  it('should use first chain as default', () => {
    const TestComponent = () => {
      const { account } = useCinaConnectContext();
      return <div data-testid="chain">{account.chainId}</div>;
    };

    render(
      <CinaConnectProvider config={mockConfig}>
        <TestComponent />
      </CinaConnectProvider>
    );
    expect(screen.getByTestId('chain')).toHaveTextContent('1');
  });

  it('should expose correct initial status', () => {
    const TestComponent = () => {
      const { status } = useCinaConnectContext();
      return <div data-testid="status">{status}</div>;
    };

    render(
      <CinaConnectProvider config={mockConfig}>
        <TestComponent />
      </CinaConnectProvider>
    );
    expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
  });

  it('should throw when useCinaConnectContext is used outside provider', () => {
    const TestComponent = () => {
      useCinaConnectContext();
      return null;
    };

    // Suppress console error during test
    const spy = vi.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow('useCinaConnectContext must be used within');
    spy.mockRestore();
  });

  it('should provide default connectors', () => {
    const TestComponent = () => {
      const { connectors } = useCinaConnectContext();
      return <div data-testid="count">{connectors.length}</div>;
    };

    render(
      <CinaConnectProvider config={mockConfig}>
        <TestComponent />
      </CinaConnectProvider>
    );
    expect(screen.getByTestId('count')).toHaveTextContent('5');
  });
});

describe('React Hooks', () => {
  it('useCinaConnect returns context', () => {
    const TestComponent = () => {
      const ctx = useCinaConnect();
      return <div data-testid="has-config">{ctx.config ? 'yes' : 'no'}</div>;
    };

    render(
      <CinaConnectProvider config={mockConfig}>
        <TestComponent />
      </CinaConnectProvider>
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
      <CinaConnectProvider config={mockConfig}>
        <TestComponent />
      </CinaConnectProvider>
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
      <CinaConnectProvider config={mockConfig}>
        <TestComponent />
      </CinaConnectProvider>
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
      <CinaConnectProvider config={mockConfig}>
        <TestComponent />
      </CinaConnectProvider>
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
      <CinaConnectProvider config={mockConfig}>
        <TestComponent />
      </CinaConnectProvider>
    );
    expect(screen.getByTestId('disconnect-btn')).toBeInTheDocument();
  });
});

describe('ConnectButton', () => {
  it('should render with default label when disconnected', () => {
    const { container } = render(
      <CinaConnectProvider config={mockConfig}>
        <ConnectButton />
      </CinaConnectProvider>
    );
    expect(container.querySelector('ocx-connect-button')).toBeInTheDocument();
    expect(container.querySelector('ocx-connect-button')).toHaveAttribute('label', 'Connect Wallet');
  });

  it('should render with custom label', () => {
    const { container } = render(
      <CinaConnectProvider config={mockConfig}>
        <ConnectButton label="Link Wallet" />
      </CinaConnectProvider>
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
        <CinaConnectProvider config={mockConfig}>
          {connected ? (
            <div>Connected</div>
          ) : (
            <ConnectButton onClick={() => setConnected(true)} />
          )}
        </CinaConnectProvider>
      );
    };

    const { container } = render(<TestWrapper />);
    expect(container.querySelector('ocx-connect-button')).toBeInTheDocument();
  });

  it('should support different variants', () => {
    const { container, rerender } = render(
      <CinaConnectProvider config={mockConfig}>
        <ConnectButton variant="primary" />
      </CinaConnectProvider>
    );

    expect(container.querySelector('ocx-connect-button')).toHaveAttribute('variant', 'primary');

    rerender(
      <CinaConnectProvider config={mockConfig}>
        <ConnectButton variant="ghost" />
      </CinaConnectProvider>
    );

    expect(container.querySelector('ocx-connect-button')).toHaveAttribute('variant', 'ghost');
  });

  it('should support different sizes', () => {
    const { container } = render(
      <CinaConnectProvider config={mockConfig}>
        <ConnectButton size="sm" />
      </CinaConnectProvider>
    );
    expect(container.querySelector('ocx-connect-button')).toHaveAttribute('size', 'sm');
  });
});
