/**
 * Tests for @cinacoin/vue composables.
 * Tests useCinacoin, useAccount, useChainId, useConnect, useDisconnect.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
// ─── Mock Vue inject ─────────────────────────────────────────────────────────
const mockContext = {
    config: {
        projectId: 'test-project',
        chains: [
            {
                id: 1,
                name: 'Ethereum',
                rpcUrl: 'https://eth.llamarpc.com',
                nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            },
            {
                id: 137,
                name: 'Polygon',
                rpcUrl: 'https://polygon-rpc.com',
                nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            },
        ],
        theme: { mode: 'dark' },
    },
    connectors: { value: [{ id: 'metamask', name: 'MetaMask', type: 'injected' }] },
    account: {
        value: {
            address: '0x1234567890abcdef1234567890abcdef12345678',
            balance: '1.5000',
            chainId: 1,
            chainSymbol: 'ETH',
        },
    },
    status: { value: 'connected' },
    isSwitchingChain: { value: false },
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    switchChain: vi.fn().mockResolvedValue(undefined),
};
vi.mock('vue', () => ({
    inject: vi.fn(() => mockContext),
}));
// ─── Tests ───────────────────────────────────────────────────────────────────
describe('useCinacoin', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('should return the injected Cinacoin context', async () => {
        const { useCinacoin } = await import('../src/composables.js');
        const ctx = useCinacoin();
        expect(ctx.config.chains).toHaveLength(2);
        expect(ctx.config.chains[0].id).toBe(1);
        expect(ctx.account.value.address).toBe('0x1234567890abcdef1234567890abcdef12345678');
    });
    it('should expose connect and disconnect functions', async () => {
        const { useCinacoin } = await import('../src/composables.js');
        const ctx = useCinacoin();
        expect(typeof ctx.connect).toBe('function');
        expect(typeof ctx.disconnect).toBe('function');
    });
    it('should expose switchChain function', async () => {
        const { useCinacoin } = await import('../src/composables.js');
        const ctx = useCinacoin();
        expect(typeof ctx.switchChain).toBe('function');
    });
    it('should throw when context is not available', async () => {
        const vueModule = await import('vue');
        vueModule.inject.mockReturnValueOnce(null);
        const { useCinacoin } = await import('../src/composables.js');
        expect(() => useCinacoin()).toThrow('useCinacoin must be used within <CinacoinProvider>');
    });
});
describe('useAccount', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('should return the account ref from context', async () => {
        const { useAccount } = await import('../src/composables.js');
        const account = useAccount();
        expect(account.value.address).toBe('0x1234567890abcdef1234567890abcdef12345678');
        expect(account.value.balance).toBe('1.5000');
        expect(account.value.chainSymbol).toBe('ETH');
    });
    it('should return chainId from account', async () => {
        const { useAccount } = await import('../src/composables.js');
        const account = useAccount();
        expect(account.value.chainId).toBe(1);
    });
    it('should throw when used outside provider', async () => {
        const vueModule = await import('vue');
        vueModule.inject.mockReturnValueOnce(null);
        const { useAccount } = await import('../src/composables.js');
        expect(() => useAccount()).toThrow('useCinacoin must be used within <CinacoinProvider>');
    });
});
describe('useChainId', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('should return the current chainId number', async () => {
        const { useChainId } = await import('../src/composables.js');
        const chainId = useChainId();
        expect(chainId).toBe(1);
    });
    it('should throw when used outside provider', async () => {
        const vueModule = await import('vue');
        vueModule.inject.mockReturnValueOnce(null);
        const { useChainId } = await import('../src/composables.js');
        expect(() => useChainId()).toThrow('useCinacoin must be used within <CinacoinProvider>');
    });
});
describe('useConnect', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('should return connect function and status', async () => {
        const { useConnect } = await import('../src/composables.js');
        const { connect, status, isSwitchingChain } = useConnect();
        expect(typeof connect).toBe('function');
        expect(status.value).toBe('connected');
        expect(isSwitchingChain.value).toBe(false);
    });
});
//# sourceMappingURL=composables.test.js.map