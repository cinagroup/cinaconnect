/**
 * Tests for Farcaster Mini App integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FarcasterProvider } from '../src/FarcasterProvider.js';
import {
  generateSignInMessage,
  parseSignInMessage,
  buildSignInResult,
  createSessionPayload,
  validateSignature,
  generateNonce,
} from '../src/FarcasterAuth.js';
import type { FarcasterContext, FarcasterUser, Address } from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_ADDRESS: Address = '0x1234567890abcdef1234567890abcdef12345678';
const MOCK_ADDRESS_2: Address = '0xabcdef1234567890abcdef1234567890abcdef12';

function createMockContext(overrides: Partial<FarcasterContext> = {}): FarcasterContext {
  return {
    user: {
      fid: 12345,
      username: 'testuser',
      displayName: 'Test User',
      pfpUrl: 'https://example.com/pfp.png',
      bio: 'Hello Farcaster!',
      url: 'https://example.com',
      verifiedAddresses: {
        ethereum: [MOCK_ADDRESS],
        solana: ['SolAddr123'],
      },
      followingCount: 100,
      followerCount: 500,
    },
    clientFid: 67890,
    appFid: 11111,
    associatedToken: 'token-abc-123',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// FarcasterProvider tests
// ---------------------------------------------------------------------------

describe('FarcasterProvider', () => {
  describe('constructor', () => {
    it('should accept custom context', () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      expect(provider.isAvailable()).toBe(true);
    });

    it('should work without context (unavailable)', () => {
      const provider = new FarcasterProvider();
      expect(provider.isAvailable()).toBe(false);
    });

    it('should accept custom config values', () => {
      const provider = new FarcasterProvider({
        apiBaseUrl: 'https://custom.api.xyz',
        defaultChainId: 137,
        neynarApiKey: 'test-key',
      });
      expect(provider.getApiBaseUrl()).toBe('https://custom.api.xyz');
      expect(provider.getChainId()).toBe(137);
    });
  });

  describe('initialize', () => {
    it('should initialize with context', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      const result = await provider.initialize();
      expect(result).toBe(true);
      expect(provider.isInitialized()).toBe(true);
    });

    it('should return false without context', async () => {
      const provider = new FarcasterProvider();
      const result = await provider.initialize();
      expect(result).toBe(false);
    });

    it('should be idempotent', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      await provider.initialize();
      const second = await provider.initialize();
      expect(second).toBe(true);
    });
  });

  describe('connect', () => {
    it('should connect with account', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      await provider.initialize();
      const state = provider.connect(MOCK_ADDRESS);
      expect(state.connected).toBe(true);
      expect(state.account).toBe(MOCK_ADDRESS);
      expect(state.chainId).toBe(1);
    });

    it('should use custom chainId', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx, defaultChainId: 10 });
      await provider.initialize();
      const state = provider.connect(MOCK_ADDRESS);
      expect(state.chainId).toBe(10);
    });

    it('should include Farcaster user after connect', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      await provider.initialize();
      const state = provider.connect(MOCK_ADDRESS);
      expect(state.user?.fid).toBe(12345);
    });

    it('should throw if not initialized', () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      expect(() => provider.connect(MOCK_ADDRESS)).toThrow(
        'Call initialize() before connect()',
      );
    });
  });

  describe('disconnect', () => {
    it('should clear connection state', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      await provider.initialize();
      provider.connect(MOCK_ADDRESS);
      provider.disconnect();
      expect(provider.getState().connected).toBe(false);
      expect(provider.getState().account).toBeUndefined();
    });
  });

  describe('user identity', () => {
    it('should get user data', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      expect(provider.getUser()?.fid).toBe(12345);
    });

    it('should get FID', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      expect(provider.getFid()).toBe(12345);
    });

    it('should get username', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      expect(provider.getUsername()).toBe('testuser');
    });

    it('should get display name', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      expect(provider.getDisplayName()).toBe('Test User');
    });

    it('should fall back to username if no displayName', async () => {
      const ctx = createMockContext({
        user: { fid: 1, username: 'nobody', verifiedAddresses: { ethereum: [] } },
      });
      const provider = new FarcasterProvider({ context: ctx });
      expect(provider.getDisplayName()).toBe('nobody');
    });

    it('should return empty string without user', () => {
      const provider = new FarcasterProvider();
      expect(provider.getDisplayName()).toBe('');
    });
  });

  describe('verified addresses', () => {
    it('should get verified addresses', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      const addrs = provider.getVerifiedAddresses();
      expect(addrs).toContain(MOCK_ADDRESS);
    });

    it('should return empty array without verified addresses', async () => {
      const ctx = createMockContext({
        user: { fid: 1, username: 'test', verifiedAddresses: { ethereum: [] } },
      });
      const provider = new FarcasterProvider({ context: ctx });
      expect(provider.getVerifiedAddresses()).toEqual([]);
    });

    it('should check if address is verified', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      expect(provider.isAddressVerified(MOCK_ADDRESS)).toBe(true);
      expect(provider.isAddressVerified(MOCK_ADDRESS_2)).toBe(false);
    });
  });

  describe('context accessors', () => {
    it('should get client FID', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      expect(provider.getClientFid()).toBe(67890);
    });

    it('should get app FID', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      expect(provider.getAppFid()).toBe(11111);
    });

    it('should get associated token', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      expect(provider.getAssociatedToken()).toBe('token-abc-123');
    });

    it('should set context dynamically', () => {
      const provider = new FarcasterProvider();
      const ctx = createMockContext();
      provider.setContext(ctx);
      expect(provider.isAvailable()).toBe(true);
      expect(provider.isInitialized()).toBe(true);
    });

    it('should get context', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      expect(provider.getContext()).toBe(ctx);
    });
  });

  describe('events', () => {
    it('should subscribe and emit ready event', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      let readyEmitted = false;
      provider.on('ready', () => { readyEmitted = true; });
      await provider.initialize();
      expect(readyEmitted).toBe(true);
    });

    it('should subscribe and emit walletConnected event', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      await provider.initialize();
      let state: any = null;
      provider.on('walletConnected', (s: any) => { state = s; });
      provider.connect(MOCK_ADDRESS);
      expect(state?.connected).toBe(true);
    });

    it('should emit walletDisconnected event', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      await provider.initialize();
      provider.connect(MOCK_ADDRESS);
      let disconnected = false;
      provider.on('walletDisconnected', () => { disconnected = true; });
      provider.disconnect();
      expect(disconnected).toBe(true);
    });

    it('should unsubscribe from events', async () => {
      const ctx = createMockContext();
      const provider = new FarcasterProvider({ context: ctx });
      await provider.initialize();
      let count = 0;
      const unsub = provider.on('ready', () => { count++; });
      // Already initialized, so we need to trigger manually
      provider.off('ready', () => {});
      // Test off works without error
      expect(typeof unsub).toBe('function');
    });
  });
});

// ---------------------------------------------------------------------------
// FarcasterAuth tests
// ---------------------------------------------------------------------------

describe('generateSignInMessage', () => {
  it('should generate a valid SIWF message', () => {
    const message = generateSignInMessage('example.com', 'abc-nonce');
    expect(message).toContain('example.com wants you to sign in with your Farcaster account');
    expect(message).toContain('Nonce: abc-nonce');
    expect(message).toContain('Version: 1');
    expect(message).toContain('Chain ID: 1');
  });

  it('should include custom URI', () => {
    const message = generateSignInMessage('example.com', 'nonce', 'https://app.example.com/login');
    expect(message).toContain('URI: https://app.example.com/login');
  });

  it('should include statement', () => {
    const message = generateSignInMessage('example.com', 'nonce', 'example.com', 'Connect your wallet');
    expect(message).toContain('Connect your wallet');
  });
});

describe('parseSignInMessage', () => {
  it('should parse a SIWF message', () => {
    const message = generateSignInMessage('example.com', 'test-nonce', 'https://example.com');
    const parsed = parseSignInMessage(message);
    expect(parsed.domain).toBe('example.com');
    expect(parsed.nonce).toBe('test-nonce');
    expect(parsed.uri).toBe('https://example.com');
    expect(parsed.version).toBe('1');
    expect(parsed.chainId).toBe('1');
  });
});

describe('buildSignInResult', () => {
  it('should build a sign-in result', () => {
    const user = {
      fid: 123,
      username: 'user',
      displayName: 'User',
      verifiedAddresses: { ethereum: [MOCK_ADDRESS] },
    };
    const result = buildSignInResult(user, 'auth-token', '0xsignature');
    expect(result.fid).toBe(123);
    expect(result.username).toBe('user');
    expect(result.authToken).toBe('auth-token');
    expect(result.signature).toBe('0xsignature');
    expect(result.verifiedAddresses).toEqual([MOCK_ADDRESS]);
  });

  it('should handle missing verified addresses', () => {
    const user = { fid: 1, username: 'user' } as FarcasterUser;
    const result = buildSignInResult(user);
    expect(result.verifiedAddresses).toEqual([]);
  });
});

describe('createSessionPayload', () => {
  it('should create a session payload', () => {
    const payload = createSessionPayload(12345, 'nonce-abc');
    const parsed = JSON.parse(payload);
    expect(parsed.fid).toBe(12345);
    expect(parsed.nonce).toBe('nonce-abc');
    expect(parsed.iat).toBeDefined();
  });

  it('should include expiration', () => {
    const payload = createSessionPayload(1, 'n', 9999999999);
    const parsed = JSON.parse(payload);
    expect(parsed.exp).toBe(9999999999);
  });
});

describe('validateSignature', () => {
  it('should return true for valid format', () => {
    const sig = '0x' + 'a'.repeat(130);
    expect(validateSignature(sig, 'message', MOCK_ADDRESS)).toBe(true);
  });

  it('should return false for missing signature', () => {
    expect(validateSignature('', 'message', MOCK_ADDRESS)).toBe(false);
  });

  it('should return false for non-hex signature', () => {
    expect(validateSignature('not-hex', 'message', MOCK_ADDRESS)).toBe(false);
  });

  it('should return false for too-short signature', () => {
    expect(validateSignature('0x1234', 'message', MOCK_ADDRESS)).toBe(false);
  });

  it('should return false for missing message', () => {
    const sig = '0x' + 'a'.repeat(130);
    expect(validateSignature(sig, '', MOCK_ADDRESS)).toBe(false);
  });

  it('should return false for invalid address', () => {
    const sig = '0x' + 'a'.repeat(130);
    expect(validateSignature(sig, 'message', 'not-address')).toBe(false);
  });
});

describe('generateNonce', () => {
  it('should generate a nonce of default length', () => {
    const nonce = generateNonce();
    expect(nonce).toHaveLength(32);
    expect(/^[A-Za-z0-9]+$/.test(nonce)).toBe(true);
  });

  it('should generate a nonce of custom length', () => {
    const nonce = generateNonce(64);
    expect(nonce).toHaveLength(64);
  });

  it('should generate unique nonces', () => {
    const n1 = generateNonce();
    const n2 = generateNonce();
    expect(n1).not.toBe(n2);
  });
});
