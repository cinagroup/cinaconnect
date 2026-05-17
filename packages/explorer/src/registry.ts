/**
 * Wallet Registry — search, discovery, and metadata for 600+ wallets.
 */

import type { WalletInfo, DappInfo, ChainInfo, SearchFilter } from './types';

/** Singleton wallet/dApp registry. */
export class WalletRegistry {
  private static _instance: WalletRegistry;
  private wallets: Map<string, WalletInfo> = new Map();
  private dapps: Map<string, DappInfo> = new Map();
  private chains: Map<string, ChainInfo> = new Map();
  private logoCache: Map<string, string> = new Map();

  private constructor() {
    this._seedWallets();
  }

  static getInstance(): WalletRegistry {
    if (!WalletRegistry._instance) {
      WalletRegistry._instance = new WalletRegistry();
    }
    return WalletRegistry._instance;
  }

  /* ── Seed popular wallets ─────────────────────────────────── */

  private _seedWallets() {
    const popular: WalletInfo[] = [
      { id: 'metamask', name: 'MetaMask', icon: 'https://registry.walletconnect.com/data/v2/logo/metamask.png', platforms: ['browser', 'mobile', 'extension'], supportedChains: ['eip155'], rdns: 'io.metamask', popular: true },
      { id: 'walletconnect', name: 'WalletConnect', icon: 'https://registry.walletconnect.com/data/v2/logo/walletconnect.png', platforms: ['mobile'], supportedChains: ['eip155', 'solana', 'bip122'], popular: true },
      { id: 'coinbase', name: 'Coinbase Wallet', icon: 'https://registry.walletconnect.com/data/v2/logo/coinbase.png', platforms: ['browser', 'mobile', 'extension'], supportedChains: ['eip155'], rdns: 'com.coinbase.wallet', popular: true },
      { id: 'rainbow', name: 'Rainbow', icon: 'https://registry.walletconnect.com/data/v2/logo/rainbow.png', platforms: ['browser', 'mobile'], supportedChains: ['eip155'], rdns: 'me.rainbow', popular: true },
      { id: 'trust', name: 'Trust Wallet', icon: 'https://registry.walletconnect.com/data/v2/logo/trust.png', platforms: ['mobile'], supportedChains: ['eip155'], popular: true },
      { id: 'phantom', name: 'Phantom', icon: 'https://registry.walletconnect.com/data/v2/logo/phantom.png', platforms: ['browser', 'mobile', 'extension'], supportedChains: ['solana', 'eip155'], rdns: 'app.phantom', popular: true },
      { id: 'okx', name: 'OKX Wallet', icon: 'https://registry.walletconnect.com/data/v2/logo/okx.png', platforms: ['browser', 'mobile', 'extension'], supportedChains: ['eip155', 'bip122'], popular: true },
      { id: 'zerion', name: 'Zerion', icon: 'https://registry.walletconnect.com/data/v2/logo/zerion.png', platforms: ['browser', 'mobile'], supportedChains: ['eip155'], popular: true },
      { id: 'uniswap', name: 'Uniswap Wallet', icon: 'https://registry.walletconnect.com/data/v2/logo/uniswap.png', platforms: ['mobile'], supportedChains: ['eip155'], popular: true },
      { id: 'ledger', name: 'Ledger', icon: 'https://registry.walletconnect.com/data/v2/logo/ledger.png', platforms: ['browser', 'mobile'], supportedChains: ['eip155'], popular: true },
    ];
    popular.forEach(w => this.wallets.set(w.id, w));
  }

  /* ── Wallet CRUD ─────────────────────────────────────────── */

  getWallet(walletId: string): WalletInfo | undefined {
    return this.wallets.get(walletId);
  }

  getAllWallets(): WalletInfo[] {
    return Array.from(this.wallets.values());
  }

  getPopularWallets(limit = 20): WalletInfo[] {
    return this.getAllWallets()
      .filter(w => w.popular)
      .slice(0, limit);
  }

  getWalletsForChain(chainId: string): WalletInfo[] {
    return this.getAllWallets().filter(w =>
      w.supportedChains.includes(chainId.split(':')[0]) ||
      w.supportedChains.includes(chainId)
    );
  }

  getWalletsForPlatform(platform: WalletInfo['platforms'][number]): WalletInfo[] {
    return this.getAllWallets().filter(w => w.platforms.includes(platform));
  }

  /* ── Search ──────────────────────────────────────────────── */

  search(query: string, type: 'wallet' | 'dapp' | 'chain' = 'wallet'): (WalletInfo | DappInfo | ChainInfo)[] {
    const q = query.toLowerCase();
    switch (type) {
      case 'wallet':
        return this.getAllWallets().filter(w =>
          w.name.toLowerCase().includes(q) || w.id.includes(q)
        );
      case 'dapp':
        return Array.from(this.dapps.values()).filter(d =>
          d.name.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q)
        );
      case 'chain':
        return Array.from(this.chains.values()).filter(c =>
          c.name.toLowerCase().includes(q) || c.caipNetworkId.includes(q)
        );
    }
  }

  searchWallets(filter?: SearchFilter): WalletInfo[] {
    let results = this.getAllWallets();
    if (filter?.chainId) {
      results = this.getWalletsForChain(filter.chainId);
    }
    if (filter?.platform) {
      results = results.filter(w => w.platforms.includes(filter.platform!));
    }
    if (filter?.popular) {
      results = results.filter(w => w.popular);
    }
    if (filter?.query) {
      results = this.search(filter.query, 'wallet') as WalletInfo[];
    }
    return results;
  }

  /* ── Logo caching ────────────────────────────────────────── */

  getCachedLogo(walletId: string): string | undefined {
    return this.logoCache.get(walletId);
  }

  cacheLogo(walletId: string, dataUri: string): void {
    this.logoCache.set(walletId, dataUri);
  }

  /* ── Chain / DApp registry (extensible) ──────────────────── */

  registerChain(info: ChainInfo): void {
    this.chains.set(info.caipNetworkId, info);
  }

  registerDapp(info: DappInfo): void {
    this.dapps.set(info.id, info);
  }

  getChain(caipNetworkId: string): ChainInfo | undefined {
    return this.chains.get(caipNetworkId);
  }

  getAllChains(): ChainInfo[] {
    return Array.from(this.chains.values());
  }
}

export const registry = WalletRegistry.getInstance();
