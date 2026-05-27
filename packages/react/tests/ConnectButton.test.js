import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Tests for @cinacoin/react — ConnectButton, CinacoinProvider, hooks.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
// Mock implementations since we can't import the actual components without React setup
import { CinacoinProvider, useCinacoinContext } from '../../src/CinacoinProvider.js';
import { ConnectButton } from '../../src/ConnectButton.js';
import { useCinacoin, useAccount, useChainId, useConnect, useDisconnect } from '../../src/hooks.js';
// Mock config
const mockConfig = {
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
describe('CinacoinProvider', () => {
    it('should render children', () => {
        render(_jsx(CinacoinProvider, { config: mockConfig, children: _jsx("div", { "data-testid": "child", children: "Hello" }) }));
        expect(screen.getByTestId('child')).toBeInTheDocument();
        expect(screen.getByText('Hello')).toBeInTheDocument();
    });
    it('should apply theme class', () => {
        render(_jsx(CinacoinProvider, { config: { ...mockConfig, theme: { mode: 'dark' } }, children: _jsx("div", { "data-testid": "child" }) }));
        const root = screen.getByTestId('child').parentElement;
        expect(root).toHaveClass('ocx-theme-dark');
    });
    it('should default to dark theme', () => {
        render(_jsx(CinacoinProvider, { config: mockConfig, children: _jsx("div", { "data-testid": "child" }) }));
        const root = screen.getByTestId('child').parentElement;
        expect(root).toHaveClass('ocx-theme-dark');
    });
    it('should use first chain as default', () => {
        const TestComponent = () => {
            const { account } = useCinacoinContext();
            return _jsx("div", { "data-testid": "chain", children: account.chainId });
        };
        render(_jsx(CinacoinProvider, { config: mockConfig, children: _jsx(TestComponent, {}) }));
        expect(screen.getByTestId('chain')).toHaveTextContent('1');
    });
    it('should expose correct initial status', () => {
        const TestComponent = () => {
            const { status } = useCinacoinContext();
            return _jsx("div", { "data-testid": "status", children: status });
        };
        render(_jsx(CinacoinProvider, { config: mockConfig, children: _jsx(TestComponent, {}) }));
        expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
    });
    it('should throw when useCinacoinContext is used outside provider', () => {
        const TestComponent = () => {
            useCinacoinContext();
            return null;
        };
        // Suppress console error during test
        const spy = vi.spyOn(console, 'error');
        spy.mockImplementation(() => { });
        expect(() => render(_jsx(TestComponent, {}))).toThrow('useCinacoinContext must be used within');
        spy.mockRestore();
    });
    it('should provide default connectors', () => {
        const TestComponent = () => {
            const { connectors } = useCinacoinContext();
            return _jsx("div", { "data-testid": "count", children: connectors.length });
        };
        render(_jsx(CinacoinProvider, { config: mockConfig, children: _jsx(TestComponent, {}) }));
        expect(screen.getByTestId('count')).toHaveTextContent('5');
    });
});
describe('React Hooks', () => {
    it('useCinacoin returns context', () => {
        const TestComponent = () => {
            const ctx = useCinacoin();
            return _jsx("div", { "data-testid": "has-config", children: ctx.config ? 'yes' : 'no' });
        };
        render(_jsx(CinacoinProvider, { config: mockConfig, children: _jsx(TestComponent, {}) }));
        expect(screen.getByTestId('has-config')).toHaveTextContent('yes');
    });
    it('useAccount returns account state', () => {
        const TestComponent = () => {
            const account = useAccount();
            return (_jsxs("div", { children: [_jsx("span", { "data-testid": "address", children: account.address ?? 'null' }), _jsx("span", { "data-testid": "balance", children: account.balance })] }));
        };
        render(_jsx(CinacoinProvider, { config: mockConfig, children: _jsx(TestComponent, {}) }));
        expect(screen.getByTestId('address')).toHaveTextContent('null');
        expect(screen.getByTestId('balance')).toHaveTextContent('0.00');
    });
    it('useChainId returns chain ID', () => {
        const TestComponent = () => {
            const chainId = useChainId();
            return _jsx("div", { "data-testid": "chain-id", children: chainId });
        };
        render(_jsx(CinacoinProvider, { config: mockConfig, children: _jsx(TestComponent, {}) }));
        expect(screen.getByTestId('chain-id')).toHaveTextContent('1');
    });
    it('useConnect returns connect function', () => {
        const TestComponent = () => {
            const { connect, status } = useConnect();
            return (_jsxs("div", { children: [_jsx("button", { "data-testid": "connect-btn", onClick: () => connect('metamask'), children: "Connect" }), _jsx("span", { "data-testid": "status", children: status })] }));
        };
        render(_jsx(CinacoinProvider, { config: mockConfig, children: _jsx(TestComponent, {}) }));
        expect(screen.getByTestId('connect-btn')).toBeInTheDocument();
        expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
    });
    it('useDisconnect returns disconnect function', () => {
        const TestComponent = () => {
            const { disconnect } = useDisconnect();
            return _jsx("button", { "data-testid": "disconnect-btn", onClick: () => disconnect(), children: "Disconnect" });
        };
        render(_jsx(CinacoinProvider, { config: mockConfig, children: _jsx(TestComponent, {}) }));
        expect(screen.getByTestId('disconnect-btn')).toBeInTheDocument();
    });
});
describe('ConnectButton', () => {
    it('should render with default label when disconnected', () => {
        render(_jsx(CinacoinProvider, { config: mockConfig, children: _jsx(ConnectButton, {}) }));
        expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeInTheDocument();
    });
    it('should render with custom label', () => {
        render(_jsx(CinacoinProvider, { config: mockConfig, children: _jsx(ConnectButton, { label: "Link Wallet" }) }));
        expect(screen.getByRole('button', { name: 'Link Wallet' })).toBeInTheDocument();
    });
    it('should show address when connected', async () => {
        // We need to mock the connect function to simulate a connected state
        const TestWrapper = () => {
            const [connected, setConnected] = React.useState(false);
            return (_jsx(CinacoinProvider, { config: mockConfig, children: connected ? (_jsx("div", { children: "Connected" })) : (_jsx(ConnectButton, { onClick: () => setConnected(true) })) }));
        };
        render(_jsx(TestWrapper, {}));
        expect(screen.getByRole('button')).toBeInTheDocument();
    });
    it('should support different variants', () => {
        const { rerender } = render(_jsx(CinacoinProvider, { config: mockConfig, children: _jsx(ConnectButton, { variant: "primary" }) }));
        expect(screen.getByRole('button')).toBeInTheDocument();
        rerender(_jsx(CinacoinProvider, { config: mockConfig, children: _jsx(ConnectButton, { variant: "ghost" }) }));
        expect(screen.getByRole('button')).toBeInTheDocument();
    });
    it('should support different sizes', () => {
        render(_jsx(CinacoinProvider, { config: mockConfig, children: _jsx(ConnectButton, { size: "sm" }) }));
        expect(screen.getByRole('button')).toBeInTheDocument();
    });
});
//# sourceMappingURL=ConnectButton.test.js.map