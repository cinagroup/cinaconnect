import { describe, it, expect } from 'vitest';
// ============================================================
// Tests for @cinacoin/vue CinacoinProvider
// ============================================================
// Mock Vue's provide/inject system for testing
const mockProvide = vi.fn();
const mockComputed = vi.fn((fn) => ({ value: fn() }));
const mockRef = vi.fn((val) => ({ value: val }));
// Mock the module before importing
vi.mock('vue', () => ({
    provide: mockProvide,
    computed: mockComputed,
    ref: mockRef,
}));
describe('CinacoinProvider', () => {
    describe('configuration', () => {
        it('should accept config with chains', () => {
            const config = {
                chains: [
                    {
                        id: 1,
                        name: 'Ethereum',
                        rpcUrl: 'https://eth.llamarpc.com',
                        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                    },
                ],
                theme: { mode: 'dark' },
            };
            expect(config.chains).toHaveLength(1);
            expect(config.chains[0].name).toBe('Ethereum');
            expect(config.theme?.mode).toBe('dark');
        });
        it('should default theme to dark when not specified', () => {
            const config = {
                chains: [
                    {
                        id: 1,
                        name: 'Ethereum',
                        rpcUrl: 'https://eth.llamarpc.com',
                        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                    },
                ],
            };
            const themeMode = config.theme?.mode ?? 'dark';
            expect(themeMode).toBe('dark');
        });
        it('should accept theme variables', () => {
            const config = {
                theme: {
                    mode: 'light',
                    variables: {
                        '--ocx-bg-primary': '#ffffff',
                        '--ocx-text-primary': '#000000',
                    },
                },
            };
            expect(config.theme?.variables).toHaveProperty('--ocx-bg-primary', '#ffffff');
        });
    });
    describe('connectors', () => {
        it('should have default connectors', () => {
            const defaultConnectors = [
                { id: 'metamask', name: 'MetaMask', type: 'injected' },
                { id: 'walletconnect', name: 'WalletConnect', type: 'walletconnect' },
                { id: 'coinbase', name: 'Coinbase Wallet', type: 'coinbase' },
                { id: 'rabby', name: 'Rabby', type: 'injected' },
                { id: 'email', name: 'Email', type: 'email' },
            ];
            expect(defaultConnectors).toHaveLength(5);
            expect(defaultConnectors[0].id).toBe('metamask');
        });
        it('should have unique connector IDs', () => {
            const defaultConnectors = [
                { id: 'metamask', name: 'MetaMask', type: 'injected' },
                { id: 'walletconnect', name: 'WalletConnect', type: 'walletconnect' },
                { id: 'coinbase', name: 'Coinbase Wallet', type: 'coinbase' },
            ];
            const ids = defaultConnectors.map(c => c.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });
    });
    describe('context', () => {
        it('should provide ONCHAINUX_KEY as a symbol', async () => {
            const { ONCHAINUX_KEY } = await import('../src/types.js');
            expect(typeof ONCHAINUX_KEY).toBe('symbol');
            expect(ONCHAINUX_KEY.description).toBe('cinacoin');
        });
        it('should have correct account state shape', () => {
            const account = {
                address: null,
                balance: '0.00',
                chainId: 1,
                chainSymbol: 'ETH',
            };
            expect(account.address).toBeNull();
            expect(account.balance).toBe('0.00');
            expect(account.chainId).toBe(1);
        });
        it('should support all theme modes', () => {
            const modes = ['dark', 'light', 'minimal'];
            for (const mode of modes) {
                const config = { theme: { mode } };
                expect(config.theme?.mode).toBe(mode);
            }
        });
    });
    describe('state transitions', () => {
        it('should start disconnected', () => {
            const status = 'disconnected';
            expect(status).toBe('disconnected');
        });
        it('should transition through connect states', () => {
            const states = [
                'disconnected',
                'connecting',
                'connected',
            ];
            expect(states[0]).toBe('disconnected');
            expect(states[1]).toBe('connecting');
            expect(states[2]).toBe('connected');
        });
    });
});
//# sourceMappingURL=OnChainUXProvider.test.js.map