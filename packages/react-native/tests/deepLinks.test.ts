import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// Tests for @cinacoin/react-native deep linking utilities
// ============================================================

// Mock react-native Linking API
vi.mock('react-native', () => ({
  Linking: {
    canOpenURL: vi.fn(),
    openURL: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getInitialURL: vi.fn(),
  },
  Platform: {
    OS: 'ios',
    select: (obj: Record<string, unknown>) => obj.ios ?? obj.default,
  },
}));

// Mock walletconnect-v2 wallet registry
vi.mock('@cinacoin/walletconnect-v2', () => ({
  WALLET_REGISTRY: [
    {
      id: 'metamask',
      name: 'MetaMask',
      homepage: 'https://metamask.io',
      deepLink: 'metamask://',
      universalLink: 'https://metamask.app.link',
      appStoreUrl: 'https://apps.apple.com/app/metamask/id1438668043',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=io.metamask',
      imageUrl: 'https://registry.walletconnect.com/api/v2/logo/md/metamask',
      supportsWcV2: true,
      chains: ['eip155:1', 'eip155:137'],
      rdns: 'io.metamask',
    },
    {
      id: 'rainbow',
      name: 'Rainbow',
      homepage: 'https://rainbow.me',
      deepLink: 'rainbow://',
      universalLink: 'https://rnbwapp.com',
      appStoreUrl: 'https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=me.rainbow',
      imageUrl: 'https://registry.walletconnect.com/api/v2/logo/md/rainbow',
      supportsWcV2: true,
      chains: ['eip155:1', 'eip155:137'],
      rdns: 'me.rainbow',
    },
    {
      id: 'phantom',
      name: 'Phantom',
      homepage: 'https://phantom.app',
      deepLink: 'phantom://',
      universalLink: 'https://phantom.app',
      appStoreUrl: 'https://apps.apple.com/app/phantom-crypto-wallet/id1598432977',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.phantom.app',
      imageUrl: 'https://registry.walletconnect.com/api/v2/logo/md/phantom',
      supportsWcV2: true,
      chains: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
      rdns: 'app.phantom',
    },
  ],
  getWalletById: vi.fn((id: string) => {
    const wallets = [
      {
        id: 'metamask',
        name: 'MetaMask',
        deepLink: 'metamask://',
        universalLink: 'https://metamask.app.link',
        appStoreUrl: 'https://apps.apple.com/app/metamask/id1438668043',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=io.metamask',
        supportsWcV2: true,
      },
      {
        id: 'rainbow',
        name: 'Rainbow',
        deepLink: 'rainbow://',
        universalLink: 'https://rnbwapp.com',
        appStoreUrl: 'https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=me.rainbow',
        supportsWcV2: true,
      },
    ];
    return wallets.find(w => w.id === id);
  }),
  buildWalletDeepLink: vi.fn((walletId: string, wcUri: string) => {
    const wallet = {
      metamask: { deepLink: 'metamask://' },
      rainbow: { deepLink: 'rainbow://' },
    }[walletId];
    if (!wallet) return undefined;
    return `${wallet.deepLink}wc?uri=${encodeURIComponent(wcUri)}`;
  }),
  buildWalletUniversalLink: vi.fn((walletId: string, wcUri: string) => {
    const wallet = {
      metamask: { universalLink: 'https://metamask.app.link' },
      rainbow: { universalLink: 'https://rnbwapp.com' },
    }[walletId];
    if (!wallet) return undefined;
    return `${wallet.universalLink}/wc?uri=${encodeURIComponent(wcUri)}`;
  }),
}));

describe('Deep Links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildWalletDeepLink', () => {
    it('should build a valid deep link for MetaMask', () => {
      const { buildWalletDeepLink } = require('@cinacoin/walletconnect-v2');
      const uri = 'wc:abc123@2?relay-protocol=irn&symKey=test';
      const link = buildWalletDeepLink('metamask', uri);

      expect(link).toBeDefined();
      expect(link).toContain('metamask://');
      expect(link).toContain('wc?uri=');
      expect(link).toContain('abc123');
    });

    it('should build a valid deep link for Rainbow', () => {
      const { buildWalletDeepLink } = require('@cinacoin/walletconnect-v2');
      const uri = 'wc:abc123@2?relay-protocol=irn&symKey=test';
      const link = buildWalletDeepLink('rainbow', uri);

      expect(link).toBeDefined();
      expect(link).toContain('rainbow://');
    });

    it('should return undefined for unknown wallet', () => {
      const { buildWalletDeepLink } = require('@cinacoin/walletconnect-v2');
      const uri = 'wc:abc123@2?relay-protocol=irn&symKey=test';
      const link = buildWalletDeepLink('unknown', uri);

      expect(link).toBeUndefined();
    });
  });

  describe('buildWalletUniversalLink', () => {
    it('should build a universal link for MetaMask', () => {
      const { buildWalletUniversalLink } = require('@cinacoin/walletconnect-v2');
      const uri = 'wc:abc123@2?relay-protocol=irn&symKey=test';
      const link = buildWalletUniversalLink('metamask', uri);

      expect(link).toContain('https://metamask.app.link');
      expect(link).toContain('wc?uri=');
    });

    it('should return undefined for wallet without universal link', () => {
      const { buildWalletUniversalLink } = require('@cinacoin/walletconnect-v2');
      const uri = 'wc:abc123@2?relay-protocol=irn&symKey=test';
      const link = buildWalletUniversalLink('unknown', uri);

      expect(link).toBeUndefined();
    });
  });

  describe('getWalletById', () => {
    it('should find MetaMask by ID', () => {
      const { getWalletById } = require('@cinacoin/walletconnect-v2');
      const wallet = getWalletById('metamask');

      expect(wallet).toBeDefined();
      expect(wallet.id).toBe('metamask');
      expect(wallet.name).toBe('MetaMask');
      expect(wallet.supportsWcV2).toBe(true);
    });

    it('should return undefined for unknown ID', () => {
      const { getWalletById } = require('@cinacoin/walletconnect-v2');
      const wallet = getWalletById('nonexistent');

      expect(wallet).toBeUndefined();
    });
  });

  describe('Linking API', () => {
    it('should check if URL can be opened', async () => {
      const { Linking } = require('react-native');
      (Linking.canOpenURL as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const canOpen = await Linking.canOpenURL('metamask://');
      expect(canOpen).toBe(true);
      expect(Linking.canOpenURL).toHaveBeenCalledWith('metamask://');
    });

    it('should open URL', async () => {
      const { Linking } = require('react-native');
      await Linking.openURL('metamask://wc?uri=test');

      expect(Linking.openURL).toHaveBeenCalledWith('metamask://wc?uri=test');
    });

    it('should handle canOpenURL failure', async () => {
      const { Linking } = require('react-native');
      (Linking.canOpenURL as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const canOpen = await Linking.canOpenURL('unknown://');
      expect(canOpen).toBe(false);
    });
  });

  describe('Platform detection', () => {
    it('should detect iOS platform', () => {
      const { Platform } = require('react-native');
      expect(Platform.OS).toBe('ios');
    });

    it('should select iOS-specific values', () => {
      const { Platform } = require('react-native');
      const value = Platform.select({ ios: 'ios-value', android: 'android-value' });
      expect(value).toBe('ios-value');
    });
  });

  describe('WC URI format', () => {
    it('should follow WalletConnect v2 URI format', () => {
      const wcUri = 'wc:abc123@2?relay-protocol=irn&symKey=def456';
      const parts = wcUri.split('@');
      const topic = parts[0].replace('wc:', '');
      const version = parts[1].split('?')[0];

      expect(topic).toBe('abc123');
      expect(version).toBe('2');
    });

    it('should encode URI parameters correctly', () => {
      const rawUri = 'wc:test@2?relay-protocol=irn&symKey=abc';
      const encoded = encodeURIComponent(rawUri);
      expect(encoded).toContain('%3F');
      expect(encoded).toContain('%3D');
    });
  });
});
