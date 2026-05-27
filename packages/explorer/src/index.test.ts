import { describe, it, expect, beforeEach } from 'vitest';
import { WalletRegistry, registry } from './registry';
import { fetchWalletLogo, fetchChainLogo, logoCache, preloadLogos } from './logoFetcher';

/* ── WalletRegistry ─────────────────────────────────────────────── */

describe('WalletRegistry', () => {
  it('is a singleton — getInstance always returns the same instance', () => {
    const a = WalletRegistry.getInstance();
    const b = WalletRegistry.getInstance();
    expect(a).toBe(b);
  });

  it('exports a pre-instantiated registry singleton', () => {
    expect(registry).toBeInstanceOf(WalletRegistry);
  });
});

describe('WalletRegistry — wallet operations', () => {
  // Reset the singleton for isolated tests
  beforeEach(() => {
    // Get fresh singleton — it auto-seeds wallets
    WalletRegistry.getInstance();
  });

  it('has popular wallets seeded', () => {
    const metamask = registry.getWallet('metamask');
    expect(metamask).toBeDefined();
    expect(metamask?.name).toBe('MetaMask');
    expect(metamask?.platforms).toContain('browser');
  });

  it('returns undefined for non-existent wallets', () => {
    expect(registry.getWallet('nonexistent-wallet-xyz')).toBeUndefined();
  });

  it('returns all wallets', () => {
    const all = registry.getAllWallets();
    expect(all.length).toBeGreaterThanOrEqual(10);
  });

  it('returns popular wallets only', () => {
    const popular = registry.getPopularWallets();
    expect(popular.every(w => w.popular === true)).toBe(true);
    expect(popular.length).toBeGreaterThan(0);
  });

  it('respects the limit on getPopularWallets', () => {
    const popular = registry.getPopularWallets(3);
    expect(popular.length).toBeLessThanOrEqual(3);
  });
});

describe('WalletRegistry — chain-based filtering', () => {
  it('filters wallets by chain ID (eip155)', () => {
    const wallets = registry.getWalletsForChain('eip155:1');
    expect(wallets.length).toBeGreaterThan(0);
    // All returned wallets should support eip155
    wallets.forEach(w => {
      expect(
        w.supportedChains.includes('eip155') || w.supportedChains.includes('eip155:1')
      ).toBe(true);
    });
  });

  it('filters wallets by solana chain', () => {
    const wallets = registry.getWalletsForChain('solana');
    // Phantom supports solana
    const phantom = wallets.find(w => w.id === 'phantom');
    expect(phantom).toBeDefined();
  });

  it('filters wallets by platform (browser)', () => {
    const browserWallets = registry.getWalletsForPlatform('browser');
    expect(browserWallets.length).toBeGreaterThan(0);
    browserWallets.forEach(w => {
      expect(w.platforms.includes('browser')).toBe(true);
    });
  });

  it('filters wallets by platform (mobile)', () => {
    const mobileWallets = registry.getWalletsForPlatform('mobile');
    expect(mobileWallets.length).toBeGreaterThan(0);
    mobileWallets.forEach(w => {
      expect(w.platforms.includes('mobile')).toBe(true);
    });
  });
});

describe('WalletRegistry — search', () => {
  it('searches wallets by name (case-insensitive)', () => {
    const results = registry.search('meta', 'wallet');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.id === 'metamask')).toBe(true);
  });

  it('searches wallets by ID', () => {
    const results = registry.search('coinbase', 'wallet');
    expect(results.some(r => r.id === 'coinbase')).toBe(true);
  });

  it('returns empty array for no matches', () => {
    const results = registry.search('zzzznonexistent', 'wallet');
    expect(results).toEqual([]);
  });

  it('searches dApps', () => {
    registry.registerDapp({
      id: 'uniswap',
      name: 'Uniswap',
      icon: 'https://example.com/uniswap.png',
      url: 'https://uniswap.org',
      category: 'dex',
      supportedChains: ['eip155:1'],
      description: 'Decentralized exchange',
    });
    const results = registry.search('uniswap', 'dapp');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.id === 'uniswap')).toBe(true);
  });

  it('searches chains', () => {
    registry.registerChain({
      id: 'eip155:1',
      namespace: 'eip155',
      chainId: 1,
      name: 'Ethereum Mainnet',
    });
    const results = registry.search('ethereum', 'chain');
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('WalletRegistry — searchWallets with filters', () => {
  it('filters by chainId', () => {
    const results = registry.searchWallets({ chainId: 'eip155:1' });
    expect(results.length).toBeGreaterThan(0);
  });

  it('filters by platform', () => {
    const results = registry.searchWallets({ platform: 'extension' });
    expect(results.length).toBeGreaterThan(0);
  });

  it('filters by popular flag', () => {
    const results = registry.searchWallets({ popular: true });
    expect(results.every(w => w.popular === true)).toBe(true);
  });

  it('combines query and popular filters', () => {
    const results = registry.searchWallets({ query: 'trust', popular: true });
    expect(results.some(w => w.id === 'trust')).toBe(true);
  });
});

describe('WalletRegistry — chain/dApp registration', () => {
  it('registers and retrieves a chain', () => {
    registry.registerChain({
      id: 'eip155:137',
      caipNetworkId: 'eip155:137',
      namespace: 'eip155',
      chainId: 137,
      name: 'Polygon',
      shortName: 'MATIC',
    });
    const chain = registry.getChain('eip155:137');
    expect(chain).toBeDefined();
    expect(chain?.name).toBe('Polygon');
    expect(chain?.chainId).toBe(137);
  });

  it('returns all registered chains', () => {
    const allChains = registry.getAllChains();
    expect(Array.isArray(allChains)).toBe(true);
  });

  it('registers and retrieves a dApp', () => {
    registry.registerDapp({
      id: 'opensea',
      name: 'OpenSea',
      icon: 'https://example.com/opensea.png',
      url: 'https://opensea.io',
      category: 'marketplace',
      supportedChains: ['eip155:1'],
    });
    // dApps are searched, not directly gettable, but we can search
    const results = registry.search('opensea', 'dapp');
    expect(results.some(r => r.id === 'opensea')).toBe(true);
  });
});

/* ── Logo fetching ──────────────────────────────────────────────── */

describe('fetchWalletLogo', () => {
  it('returns a URL for a wallet logo', () => {
    const url = fetchWalletLogo('metamask');
    expect(url).toBe('https://registry.walletconnect.com/data/v2/logo/metamask/96.png');
  });

  it('respects the size parameter', () => {
    const url = fetchWalletLogo('coinbase', 128);
    expect(url).toBe('https://registry.walletconnect.com/data/v2/logo/coinbase/128.png');
  });

  it('caches results and returns the cached value on second call', () => {
    const key = 'test-wallet';
    const url1 = fetchWalletLogo(key, 64);
    const cacheKey = `${key}:64`;
    logoCache.set(cacheKey, 'cached:' + url1);
    const url2 = fetchWalletLogo(key, 64);
    expect(url2).toBe('cached:' + url1);
  });
});

describe('fetchChainLogo', () => {
  it('returns a chainid.network URL for eip155 chains', () => {
    const url = fetchChainLogo('eip155:1');
    expect(url).toBe('https://chainid.network/icons/1.png');
  });

  it('returns a walletconnect URL for non-eip155 chains', () => {
    const url = fetchChainLogo('solana:mainnet');
    expect(url).toBe('https://registry.walletconnect.com/data/v2/logo/solana:mainnet/96.png');
  });

  it('caches results', () => {
    const url = fetchChainLogo('eip155:137');
    const cacheKey = 'chain:eip155:137';
    logoCache.set(cacheKey, 'cached:' + url);
    const url2 = fetchChainLogo('eip155:137');
    expect(url2).toBe('cached:' + url);
  });
});

describe('preloadLogos', () => {
  it('preloads multiple wallet logos into the cache', () => {
    const wallets = ['metamask', 'coinbase', 'rainbow'];
    preloadLogos(wallets);
    // Each should be in the cache at default size 96
    wallets.forEach(id => {
      expect(logoCache.has(`${id}:96`)).toBe(true);
    });
  });
});
