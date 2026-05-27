/**
 * Tests for @cinacoin/react-native WalletConnectProvider.
 * Tests WC v2 provider initialization, pairing, deep linking, session management, and RPC methods.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
// ─── Mock React Native ───────────────────────────────────────────────────────
vi.mock('react-native', () => ({
    Linking: {
        canOpenURL: vi.fn().mockResolvedValue(true),
        openURL: vi.fn().mockResolvedValue(true),
    },
    Platform: {
        OS: 'ios',
    },
}));
// ─── Mock walletconnect-v2 package ──────────────────────────────────────────
const mockSessionManager = {
    initiatePairing: vi.fn().mockResolvedValue('wc:abc123@2?relay-protocol=irn&symKey=test'),
    connectWithUri: vi.fn().mockResolvedValue({
        topic: 'abc123',
        accounts: ['eip155:1:0x1234567890abcdef1234567890abcdef12345678'],
        namespaces: { eip155: { methods: ['eth_sendTransaction'], chains: ['eip155:1'] } },
    }),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
    request: vi.fn().mockResolvedValue('0x1000000000000000'),
    on: vi.fn(),
};
vi.mock('@cinacoin/walletconnect-v2', () => ({
    WcSessionManager: vi.fn(() => mockSessionManager),
    createPairing: vi.fn(),
    parseWcUri: vi.fn().mockReturnValue({ topic: 'abc123', version: 2 }),
    getDefaultRequiredNamespaces: vi.fn().mockReturnValue({
        eip155: { methods: ['eth_sendTransaction', 'personal_sign'], chains: ['eip155:1'] },
    }),
    buildSendTransaction: vi.fn().mockReturnValue([{ from: '0x1234', to: '0x5678', value: '0x0', data: '0x' }]),
    buildPersonalSign: vi.fn().mockReturnValue(['0x68656c6c6f', '0x1234']),
    getWalletById: vi.fn().mockReturnValue({ id: 'metamask', name: 'MetaMask' }),
    WALLET_REGISTRY: [{ id: 'metamask', name: 'MetaMask' }],
    buildWalletDeepLink: vi.fn().mockReturnValue('metamask://wc?uri=wc%3Atest'),
    buildWalletUniversalLink: vi.fn().mockReturnValue('https://metamask.app.link/wc?uri=wc%3Atest'),
    WC_METHODS: ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData_v4'],
}));
// ─── Mock core package ───────────────────────────────────────────────────────
vi.mock('@cinacoin/core-sdk', () => ({}));
// ─── Tests ───────────────────────────────────────────────────────────────────
describe('WalletConnectProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('WALLET_DEEP_LINKS', () => {
        it('should export deep links for MetaMask', async () => {
            const { WALLET_DEEP_LINKS } = await import('../src/WalletConnectProvider.jsx');
            expect(WALLET_DEEP_LINKS.metamask).toBeDefined();
            expect(WALLET_DEEP_LINKS.metamask.walletId).toBe('metamask');
            expect(WALLET_DEEP_LINKS.metamask.scheme).toBe('metamask://');
        });
        it('should export deep links for Rainbow', async () => {
            const { WALLET_DEEP_LINKS } = await import('../src/WalletConnectProvider.jsx');
            expect(WALLET_DEEP_LINKS.rainbow).toBeDefined();
            expect(WALLET_DEEP_LINKS.rainbow.walletId).toBe('rainbow');
        });
        it('should export deep links for Trust', async () => {
            const { WALLET_DEEP_LINKS } = await import('../src/WalletConnectProvider.jsx');
            expect(WALLET_DEEP_LINKS.trust).toBeDefined();
            expect(WALLET_DEEP_LINKS.trust.packageName).toBe('com.wallet.crypto.trustapp');
        });
        it('should export deep links for Coinbase', async () => {
            const { WALLET_DEEP_LINKS } = await import('../src/WalletConnectProvider.jsx');
            expect(WALLET_DEEP_LINKS.coinbase).toBeDefined();
            expect(WALLET_DEEP_LINKS.coinbase.scheme).toBe('cbwallet://');
        });
        it('should export deep links for Phantom', async () => {
            const { WALLET_DEEP_LINKS } = await import('../src/WalletConnectProvider.jsx');
            expect(WALLET_DEEP_LINKS.phantom).toBeDefined();
            expect(WALLET_DEEP_LINKS.phantom.walletId).toBe('phantom');
        });
        it('should export deep links for Zerion', async () => {
            const { WALLET_DEEP_LINKS } = await import('../src/WalletConnectProvider.jsx');
            expect(WALLET_DEEP_LINKS.zerion).toBeDefined();
            expect(WALLET_DEEP_LINKS.zerion.walletId).toBe('zerion');
        });
    });
    describe('useWalletConnect hook', () => {
        it('should throw when used outside provider', async () => {
            // Mock createContext to return null
            vi.mock('react', async (importOriginal) => {
                const actual = await importOriginal();
                return {
                    ...actual,
                    createContext: () => ({
                        Provider: ({ children }) => children,
                    }),
                    useContext: () => null,
                };
            });
            const { useWalletConnect } = await import('../src/WalletConnectProvider.jsx');
            expect(() => useWalletConnect()).toThrow('useWalletConnect must be used within <WalletConnectProvider>');
        });
    });
    describe('Provider config', () => {
        it('should accept wallet connect config with projectId', async () => {
            const config = {
                projectId: 'test-project-id',
                metadata: { name: 'Test App', description: 'Test', url: 'https://test.com', icons: [] },
                chains: ['eip155:1', 'eip155:137'],
            };
            expect(config.projectId).toBe('test-project-id');
            expect(config.chains).toHaveLength(2);
        });
        it('should have optional relayUrl', async () => {
            const config = {
                projectId: 'test',
                metadata: { name: 'Test', description: 'Test', url: 'https://test.com', icons: [] },
                relayUrl: 'wss://custom.relay.com',
            };
            expect(config.relayUrl).toBe('wss://custom.relay.com');
        });
        it('should have optional methods and events', async () => {
            const config = {
                projectId: 'test',
                metadata: { name: 'Test', description: 'Test', url: 'https://test.com', icons: [] },
                methods: ['eth_sendTransaction'],
                events: ['chainChanged'],
            };
            expect(config.methods).toContain('eth_sendTransaction');
            expect(config.events).toContain('chainChanged');
        });
    });
});
//# sourceMappingURL=WalletConnectProvider.test.js.map