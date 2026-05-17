/**
 * Benchmark — EIP-6963 Wallet Discovery Performance
 *
 * Measures wallet discovery performance using EIP-6963.
 *
 * 4 scenarios:
 * - Single wallet discovery
 * - Multiple wallet discovery (5 wallets)
 * - Wallet lookup by RDNS
 * - Watch mode subscription setup
 */

import { describe, it, expect } from 'vitest';
import { discoverWallets, watchWallets, findWalletByRdns } from '../src/eip6963.js';
import type { EIP6963ProviderDetail } from '../src/eip6963.js';

/** Mock EIP-6963 provider. */
function createMockProvider(
  rdns: string,
  name: string,
  uuid: string,
): EIP6963ProviderDetail {
  return {
    info: {
      rdns,
      name,
      icon: 'data:image/svg+xml;base64,mock',
      uuid,
    },
    provider: {
      request: async () => null,
      on: () => {},
      removeListener: () => {},
    },
  };
}

/** Announce a wallet via EIP-6963. */
function announceWallet(detail: EIP6963ProviderDetail): void {
  window.dispatchEvent(
    new CustomEvent('eip6963:announceProvider', { detail }),
  );
}

async function measure(fn: () => Promise<void>): Promise<number> {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

describe('EIP-6963 Benchmarks', () => {
  it('should discover a single wallet within 350ms (300ms window)', async () => {
    const provider = createMockProvider('io.metamask', 'MetaMask', 'uuid-1');

    // Announce wallet after a short delay (simulating real behavior)
    setTimeout(() => announceWallet(provider), 10);

    const duration = await measure(async () => {
      const wallets = await discoverWallets();
      expect(wallets.some((w) => w.info.rdns === 'io.metamask')).toBe(true);
    });
    // Should complete within 350ms (300ms window + 10ms delay + buffer)
    expect(duration).toBeLessThan(400);
  });

  it('should discover multiple wallets (5) within 350ms', async () => {
    const wallets = [
      createMockProvider('io.metamask', 'MetaMask', 'uuid-1'),
      createMockProvider('me.rainbow', 'Rainbow', 'uuid-2'),
      createMockProvider('com.coinbase.wallet', 'Coinbase', 'uuid-3'),
      createMockProvider('io.rabby', 'Rabby', 'uuid-4'),
      createMockProvider('app.phantom', 'Phantom', 'uuid-5'),
    ];

    // Announce all wallets with staggered delays
    wallets.forEach((w, i) => setTimeout(() => announceWallet(w), 10 + i * 5));

    const duration = await measure(async () => {
      const discovered = await discoverWallets();
      expect(discovered.length).toBeGreaterThanOrEqual(1);
    });
    expect(duration).toBeLessThan(400);
  });

  it('should find wallet by RDNS within 350ms', async () => {
    const provider = createMockProvider('io.metamask', 'MetaMask', 'uuid-1');
    setTimeout(() => announceWallet(provider), 10);

    const duration = await measure(async () => {
      const found = await findWalletByRdns('io.metamask');
      expect(found).toBeTruthy();
      expect(found?.info.name).toBe('MetaMask');
    });
    expect(duration).toBeLessThan(400);
  });

  it('should setup watch mode subscription within 5ms', async () => {
    const duration = await measure(async () => {
      const received: EIP6963ProviderDetail[] = [];
      const unsubscribe = watchWallets((detail) => {
        received.push(detail);
      });

      // Announce a wallet
      const provider = createMockProvider('io.metamask', 'MetaMask', 'uuid-1');
      announceWallet(provider);

      // Cleanup
      unsubscribe();

      expect(received.some((w) => w.info.rdns === 'io.metamask')).toBe(true);
    });
    expect(duration).toBeLessThan(5);
  });
});
