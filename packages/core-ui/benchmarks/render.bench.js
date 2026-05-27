/**
 * Benchmark — Web Component Render Performance
 *
 * Measures Lit component render times for Cinacoin UI components.
 *
 * 5 scenarios:
 * - ConnectButton initial render
 * - ConnectButton re-render (state change)
 * - ConnectModal initial render
 * - WalletCard render
 * - ChainSwitcher render with 5 chains
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { html, render } from 'lit';
async function measureRender(template, container) {
    const start = performance.now();
    render(template, container);
    return performance.now() - start;
}
describe('Render Benchmarks', () => {
    let container;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });
    afterEach(() => {
        document.body.removeChild(container);
    });
    it('should render ConnectButton within 5ms', async () => {
        const duration = await measureRender(html `<ocx-connect-button></ocx-connect-button>`, container);
        expect(duration).toBeLessThan(5);
        const btn = container.querySelector('ocx-connect-button');
        expect(btn).toBeTruthy();
    });
    it('should re-render ConnectButton on state change within 3ms', async () => {
        render(html `<ocx-connect-button></ocx-connect-button>`, container);
        const btn = container.querySelector('ocx-connect-button');
        // Trigger a re-render by changing state
        const start = performance.now();
        btn.state = 'connecting';
        await btn.updateComplete;
        const duration = performance.now() - start;
        expect(duration).toBeLessThan(3);
    });
    it('should render ConnectModal with 10 wallets within 10ms', async () => {
        const wallets = Array.from({ length: 10 }, (_, i) => ({
            id: `wallet-${i}`,
            name: `Wallet ${i}`,
            icon: '',
        }));
        const duration = await measureRender(html `<ocx-connect-modal
        .wallets=${wallets}
        is-open
      ></ocx-connect-modal>`, container);
        expect(duration).toBeLessThan(10);
        const modal = container.querySelector('ocx-connect-modal');
        expect(modal).toBeTruthy();
    });
    it('should render WalletCard within 3ms', async () => {
        const wallet = {
            id: 'metamask',
            name: 'MetaMask',
            icon: 'data:image/svg+xml;base64,mock',
            description: 'Browser extension wallet',
        };
        const duration = await measureRender(html `<ocx-wallet-card
        .wallet=${wallet}
        ?recommended=${true}
        ?installed=${false}
      ></ocx-wallet-card>`, container);
        expect(duration).toBeLessThan(3);
    });
    it('should render ChainSwitcher with 5 chains within 5ms', async () => {
        const chains = [
            { id: 1, name: 'Ethereum', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },
            { id: 137, name: 'Polygon', nativeCurrency: { name: 'Polygon', symbol: 'MATIC', decimals: 18 } },
            { id: 42161, name: 'Arbitrum', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },
            { id: 8453, name: 'Base', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },
            { id: 10, name: 'Optimism', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },
        ];
        const duration = await measureRender(html `<ocx-chain-switcher
        .chains=${chains}
        active-chain-id=${1}
      ></ocx-chain-switcher>`, container);
        expect(duration).toBeLessThan(5);
    });
});
//# sourceMappingURL=render.bench.js.map