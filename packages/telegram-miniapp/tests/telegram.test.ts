/**
 * Tests for Telegram Mini App integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TelegramProvider } from '../src/TelegramProvider.js';
import { TelegramModal } from '../src/TelegramModal.js';
import {
  validateInitData,
  parseInitData,
  buildLoginResult,
  telegramIdToAddress,
  generateSignInMessage,
  isInitDataExpired,
} from '../src/TelegramAuth.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockWebApp(overrides: Record<string, unknown> = {}) {
  const mainButtonCallbacks: Array<() => void> = [];
  return {
    initData: 'query_id=test123&user=%7B%22id%22%3A12345%7D&auth_date=1700000000&hash=abc123',
    initDataUnsafe: {
      user: {
        id: 12345,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        is_premium: true,
        language_code: 'en',
      },
      auth_date: 1700000000,
      hash: 'abc123',
    },
    version: '7.0',
    colorScheme: 'dark',
    platform: 'android',
    expand: vi.fn(),
    close: vi.fn(),
    showAlert: vi.fn(),
    showConfirm: vi.fn().mockResolvedValue(true),
    openTelegramLink: vi.fn(),
    openLink: vi.fn(),
    setHeaderColor: vi.fn(),
    setBackgroundColor: vi.fn(),
    MainButton: {
      text: '',
      isVisible: false,
      isActive: true,
      isProgressVisible: false,
      setText: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      showProgress: vi.fn(),
      hideProgress: vi.fn(),
      onClick: vi.fn((cb: () => void) => { mainButtonCallbacks.push(cb); }),
      offClick: vi.fn(),
      onTap: vi.fn(),
      offTap: vi.fn(),
    },
    BackButton: {
      isVisible: false,
      show: vi.fn(),
      hide: vi.fn(),
      onClick: vi.fn(),
      offClick: vi.fn(),
    },
    HapticFeedback: {
      impactOccurred: vi.fn(),
      notificationOccurred: vi.fn(),
      selectionChanged: vi.fn(),
    },
    ...overrides,
  } as any;
}

// ---------------------------------------------------------------------------
// TelegramProvider tests
// ---------------------------------------------------------------------------

describe('TelegramProvider', () => {
  describe('constructor', () => {
    it('should accept custom webApp', () => {
      const mockWebApp = createMockWebApp();
      const provider = new TelegramProvider({ webApp: mockWebApp });
      expect(provider.isAvailable()).toBe(true);
    });

    it('should work without webApp (unavailable)', () => {
      const provider = new TelegramProvider();
      expect(provider.isAvailable()).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      const mockWebApp = createMockWebApp();
      const provider = new TelegramProvider({ webApp: mockWebApp });
      const result = await provider.initialize();
      expect(result).toBe(true);
      expect(provider.isInitialized()).toBe(true);
      expect(mockWebApp.expand).toHaveBeenCalled();
    });

    it('should return false without webApp', async () => {
      const provider = new TelegramProvider();
      const result = await provider.initialize();
      expect(result).toBe(false);
    });

    it('should be idempotent', async () => {
      const mockWebApp = createMockWebApp();
      const provider = new TelegramProvider({ webApp: mockWebApp });
      await provider.initialize();
      const second = await provider.initialize();
      expect(second).toBe(true);
      expect(mockWebApp.expand).toHaveBeenCalledTimes(1);
    });
  });

  describe('connect', () => {
    it('should connect with account', async () => {
      const mockWebApp = createMockWebApp();
      const provider = new TelegramProvider({ webApp: mockWebApp });
      await provider.initialize();
      const state = provider.connect('0x1234567890abcdef1234567890abcdef12345678');
      expect(state.connected).toBe(true);
      expect(state.account).toBe('0x1234567890abcdef1234567890abcdef12345678');
      expect(state.chainId).toBe(1);
    });

    it('should use custom chainId', async () => {
      const mockWebApp = createMockWebApp();
      const provider = new TelegramProvider({ webApp: mockWebApp });
      await provider.initialize();
      const state = provider.connect('0x1234', 137);
      expect(state.chainId).toBe(137);
    });

    it('should include user data after connect', async () => {
      const mockWebApp = createMockWebApp();
      const provider = new TelegramProvider({ webApp: mockWebApp });
      await provider.initialize();
      const state = provider.connect('0x1234');
      expect(state.user?.id).toBe(12345);
    });
  });

  describe('disconnect', () => {
    it('should clear connection state', async () => {
      const mockWebApp = createMockWebApp();
      const provider = new TelegramProvider({ webApp: mockWebApp });
      await provider.initialize();
      provider.connect('0x1234');
      provider.disconnect();
      expect(provider.getState().connected).toBe(false);
      expect(provider.getState().account).toBeUndefined();
    });
  });

  describe('user', () => {
    it('should get user data', async () => {
      const mockWebApp = createMockWebApp();
      const provider = new TelegramProvider({ webApp: mockWebApp });
      const user = provider.getUser();
      expect(user?.id).toBe(12345);
      expect(user?.first_name).toBe('Test');
    });

    it('should get display name', async () => {
      const mockWebApp = createMockWebApp();
      const provider = new TelegramProvider({ webApp: mockWebApp });
      expect(provider.getDisplayName()).toBe('Test User');
    });

    it('should get user ID', async () => {
      const mockWebApp = createMockWebApp();
      const provider = new TelegramProvider({ webApp: mockWebApp });
      expect(provider.getUserId()).toBe(12345);
    });

    it('should detect premium user', async () => {
      const mockWebApp = createMockWebApp();
      const provider = new TelegramProvider({ webApp: mockWebApp });
      expect(provider.isPremiumUser()).toBe(true);
    });

    it('should detect non-premium user', async () => {
      const mockWebApp = createMockWebApp({
        initDataUnsafe: {
          user: { id: 99, first_name: 'Free', is_premium: false },
          auth_date: 1700000000,
          hash: 'abc',
        },
      });
      const provider = new TelegramProvider({ webApp: mockWebApp });
      expect(provider.isPremiumUser()).toBe(false);
    });
  });

  describe('theme & platform', () => {
    it('should get color scheme', () => {
      const mockWebApp = createMockWebApp();
      const provider = new TelegramProvider({ webApp: mockWebApp });
      expect(provider.getColorScheme()).toBe('dark');
    });

    it('should get platform', () => {
      const mockWebApp = createMockWebApp();
      const provider = new TelegramProvider({ webApp: mockWebApp });
      expect(provider.getPlatform()).toBe('android');
    });

    it('should get version', () => {
      const mockWebApp = createMockWebApp();
      const provider = new TelegramProvider({ webApp: mockWebApp });
      expect(provider.getVersion()).toBe('7.0');
    });
  });

  describe('events', () => {
    it('should subscribe and emit events', async () => {
      const mockWebApp = createMockWebApp();
      const provider = new TelegramProvider({ webApp: mockWebApp });
      await provider.initialize();
      let emitted: any = null;
      provider.on('connected', (state: any) => { emitted = state; });
      provider.connect('0x1234');
      expect(emitted?.connected).toBe(true);
    });

    it('should unsubscribe from events', async () => {
      const mockWebApp = createMockWebApp();
      const provider = new TelegramProvider({ webApp: mockWebApp });
      await provider.initialize();
      let count = 0;
      const unsub = provider.on('connected', () => { count++; });
      provider.connect('0x1234');
      expect(count).toBe(1);
      unsub();
      provider.disconnect();
      provider.connect('0x5678');
      expect(count).toBe(1);
    });
  });

  describe('init data', () => {
    it('should return raw init data', () => {
      const mockWebApp = createMockWebApp();
      const provider = new TelegramProvider({ webApp: mockWebApp });
      expect(provider.getInitData()).toContain('query_id=test123');
    });

    it('should return empty string without webApp', () => {
      const provider = new TelegramProvider();
      expect(provider.getInitData()).toBe('');
    });
  });
});

// ---------------------------------------------------------------------------
// TelegramModal tests
// ---------------------------------------------------------------------------

describe('TelegramModal', () => {
  it('should initialize', async () => {
    const mockWebApp = createMockWebApp();
    const modal = new TelegramModal({ webApp: mockWebApp });
    const result = await modal.initialize();
    expect(result).toBe(true);
  });

  it('should return wallet options', () => {
    const mockWebApp = createMockWebApp();
    const modal = new TelegramModal({
      webApp: mockWebApp,
      wallets: [
        { id: 'meta', name: 'MetaMask', icon: '🦊' },
      ],
    });
    expect(modal.getWalletOptions()).toHaveLength(1);
  });

  it('should return null when no wallets available', async () => {
    const mockWebApp = createMockWebApp();
    const modal = new TelegramModal({ webApp: mockWebApp });
    await modal.initialize();
    const result = await modal.show();
    expect(result).toBeNull();
    expect(mockWebApp.showAlert).toHaveBeenCalled();
  });

  it('should confirm connection', async () => {
    const mockWebApp = createMockWebApp();
    const modal = new TelegramModal({ webApp: mockWebApp });
    const result = await modal.confirmConnection('MetaMask');
    expect(result).toBe(true);
  });

  it('should provide access to underlying provider', async () => {
    const mockWebApp = createMockWebApp();
    const modal = new TelegramModal({ webApp: mockWebApp });
    const provider = modal.getProvider();
    expect(provider).toBeInstanceOf(TelegramProvider);
  });
});

// ---------------------------------------------------------------------------
// TelegramAuth tests
// ---------------------------------------------------------------------------

describe('validateInitData', () => {
  it('should return false without hash', () => {
    const result = validateInitData('query_id=test&auth_date=1700000000', 'bot-token');
    expect(result).toBe(false);
  });

  it('should return false for invalid hash', () => {
    const result = validateInitData(
      'query_id=test&auth_date=1700000000&hash=invalid',
      'bot-token',
    );
    expect(result).toBe(false);
  });
});

describe('parseInitData', () => {
  it('should parse init data string', () => {
    const result = parseInitData('query_id=test123&user=data&auth_date=1700000000');
    expect(result['query_id']).toBe('test123');
    expect(result['user']).toBe('data');
    expect(result['auth_date']).toBe('1700000000');
  });

  it('should return empty object for empty string', () => {
    expect(parseInitData('')).toEqual({});
  });
});

describe('buildLoginResult', () => {
  it('should build login result from provider', async () => {
    const mockWebApp = createMockWebApp();
    const provider = new TelegramProvider({ webApp: mockWebApp });
    const result = buildLoginResult(provider);
    expect(result?.telegramId).toBe(12345);
    expect(result?.username).toBe('testuser');
    expect(result?.displayName).toBe('Test User');
    expect(result?.isPremium).toBe(true);
  });

  it('should return null without user data', () => {
    const mockWebApp = createMockWebApp({
      initDataUnsafe: { auth_date: 1700000000, hash: 'abc' },
    });
    const provider = new TelegramProvider({ webApp: mockWebApp });
    expect(buildLoginResult(provider)).toBeNull();
  });
});

describe('telegramIdToAddress', () => {
  it('should generate pseudo-address from ID', () => {
    const addr = telegramIdToAddress(12345);
    expect(addr).toMatch(/^0x[0-9a-f]{40}$/);
  });

  it('should be deterministic', () => {
    const addr1 = telegramIdToAddress(12345);
    const addr2 = telegramIdToAddress(12345);
    expect(addr1).toBe(addr2);
  });
});

describe('generateSignInMessage', () => {
  it('should generate a SIWE-compatible message', () => {
    const user = {
      id: 12345,
      first_name: 'Test',
      is_premium: false,
    };
    const message = generateSignInMessage(user, 'example.com', 'abc-nonce');
    expect(message).toContain('Telegram User ID: 12345');
    expect(message).toContain('Nonce: abc-nonce');
    expect(message).toContain('example.com');
    expect(message).toContain('Display Name: Test');
  });

  it('should include last name in display name', () => {
    const user = {
      id: 1,
      first_name: 'First',
      last_name: 'Last',
      is_premium: true,
    };
    const message = generateSignInMessage(user, 'test.com', 'nonce');
    expect(message).toContain('Display Name: First Last');
  });
});

describe('isInitDataExpired', () => {
  it('should return false for fresh data', () => {
    const freshTimestamp = Math.floor(Date.now() / 1000);
    const data = `auth_date=${freshTimestamp}&hash=abc`;
    expect(isInitDataExpired(data)).toBe(false);
  });

  it('should return true for old data', () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - (25 * 60 * 60); // 25 hours ago
    const data = `auth_date=${oldTimestamp}&hash=abc`;
    expect(isInitDataExpired(data)).toBe(true);
  });

  it('should return true for missing auth_date', () => {
    expect(isInitDataExpired('hash=abc')).toBe(true);
  });

  it('should respect custom maxAge', () => {
    const recentTimestamp = Math.floor(Date.now() / 1000) - 100; // 100 seconds ago
    const data = `auth_date=${recentTimestamp}&hash=abc`;
    expect(isInitDataExpired(data, 60 * 1000)).toBe(true); // 1 minute max
  });
});
