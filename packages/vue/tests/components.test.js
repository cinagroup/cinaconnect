/**
 * Tests for @cinacoin/vue components.
 * Tests OcxConnectButton, OcxConnectModal, OcxChainSwitcher rendering.
 */
import { describe, it, expect, vi } from 'vitest';
// Mock vue and composables
const mockEl = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
};
vi.mock('vue', () => ({
    defineComponent: vi.fn((def) => def),
    h: vi.fn((tag, props) => ({ tag, props })),
    ref: vi.fn((val) => ({ value: val })),
    watch: vi.fn(),
    onMounted: vi.fn((fn) => {
        // Execute immediately for testing
        try {
            fn();
        }
        catch { /* noop */ }
    }),
    onBeforeUnmount: vi.fn(),
}));
vi.mock('../src/composables.js', () => ({
    useCinacoin: vi.fn(() => ({
        account: { value: { address: '0x1234', balance: '1.0', chainSymbol: 'ETH', chainId: 1 } },
        status: { value: 'disconnected' },
        config: { chains: [{ id: 1, name: 'Ethereum' }] },
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        switchChain: vi.fn().mockResolvedValue(undefined),
        isSwitchingChain: { value: false },
    })),
}));
describe('OcxConnectButton', () => {
    it('should have correct component name', async () => {
        const { OcxConnectButton } = await import('../src/components.js');
        expect(OcxConnectButton.name).toBe('OcxConnectButton');
    });
    it('should define label prop with default "Connect Wallet"', async () => {
        const { OcxConnectButton } = await import('../src/components.js');
        expect(OcxConnectButton.props.label.default).toBe('Connect Wallet');
    });
    it('should define variant prop with default "primary"', async () => {
        const { OcxConnectButton } = await import('../src/components.js');
        expect(OcxConnectButton.props.variant.default).toBe('primary');
    });
    it('should define size prop with default "md"', async () => {
        const { OcxConnectButton } = await import('../src/components.js');
        expect(OcxConnectButton.props.size.default).toBe('md');
    });
    it('should define boolean props: showBalance, showAvatar, showNetwork', async () => {
        const { OcxConnectButton } = await import('../src/components.js');
        expect(OcxConnectButton.props.showBalance.type).toBe(Boolean);
        expect(OcxConnectButton.props.showAvatar.type).toBe(Boolean);
        expect(OcxConnectButton.props.showNetwork.type).toBe(Boolean);
    });
    it('should emit click and disconnect events', async () => {
        const { OcxConnectButton } = await import('../src/components.js');
        expect(OcxConnectButton.emits).toContain('click');
        expect(OcxConnectButton.emits).toContain('disconnect');
    });
});
describe('OcxConnectModal', () => {
    it('should have correct component name', async () => {
        const { OcxConnectModal } = await import('../src/components.js');
        expect(OcxConnectModal.name).toBe('OcxConnectModal');
    });
    it('should define isOpen prop with default false', async () => {
        const { OcxConnectModal } = await import('../src/components.js');
        expect(OcxConnectModal.props.isOpen.default).toBe(false);
    });
    it('should define defaultView prop with default "wallets"', async () => {
        const { OcxConnectModal } = await import('../src/components.js');
        expect(OcxConnectModal.props.defaultView.default).toBe('wallets');
    });
    it('should define recommendedWalletIds prop as array', async () => {
        const { OcxConnectModal } = await import('../src/components.js');
        expect(OcxConnectModal.props.recommendedWalletIds.type).toBe(Array);
    });
    it('should emit close and wallet-select events', async () => {
        const { OcxConnectModal } = await import('../src/components.js');
        expect(OcxConnectModal.emits).toContain('close');
        expect(OcxConnectModal.emits).toContain('wallet-select');
    });
});
describe('OcxChainSwitcher', () => {
    it('should have correct component name', async () => {
        const { OcxChainSwitcher } = await import('../src/components.js');
        expect(OcxChainSwitcher.name).toBe('OcxChainSwitcher');
    });
    it('should define onChainChange prop as Function', async () => {
        const { OcxChainSwitcher } = await import('../src/components.js');
        expect(OcxChainSwitcher.props.onChainChange.type).toBe(Function);
    });
    it('should emit chain-change event', async () => {
        const { OcxChainSwitcher } = await import('../src/components.js');
        expect(OcxChainSwitcher.emits).toContain('chain-change');
    });
});
//# sourceMappingURL=components.test.js.map