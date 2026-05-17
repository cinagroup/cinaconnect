/**
 * Tests for FarcasterAuth.
 */
import { describe, it, expect } from 'vitest';
import { FarcasterAuth, createSiweMessage, verifySignature } from '../src/FarcasterAuth.js';
import type { FarcasterUser, SignInWithFarcasterParams } from '../src/types.js';

const mockUser: FarcasterUser = {
  fid: 42,
  username: 'bob',
  display_name: 'Bob Builder',
  pfp_url: 'https://example.com/bob.png',
  bio: 'Building onchain',
  verified: true,
  verified_addresses: {
    eth_addresses: ['0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'],
  },
};

const mockParams: SignInWithFarcasterParams = {
  domain: 'example.com',
  nonce: 'abc123',
  statement: 'Sign in to Example App',
  uri: 'https://example.com',
  version: '1',
  chainId: 1,
};

describe('createSiweMessage', () => {
  it('should generate a valid SIWE message', () => {
    const msg = createSiweMessage(mockUser, mockParams);
    expect(msg).toContain('example.com wants you to sign in');
    expect(msg).toContain('Farcaster FID: 42');
    expect(msg).toContain('Sign in to Example App');
    expect(msg).toContain('Nonce: abc123');
    expect(msg).toContain('Chain ID: 1');
  });

  it('should use default statement when not provided', () => {
    const params = { domain: 'app.io', nonce: 'x' };
    const msg = createSiweMessage(mockUser, params as SignInWithFarcasterParams);
    expect(msg).toContain('app.io wants you to sign in with your Ethereum account');
  });

  it('should use default values for optional fields', () => {
    const params = { domain: 'test.com', nonce: 'y' } as SignInWithFarcasterParams;
    const msg = createSiweMessage(mockUser, params);
    expect(msg).toContain('Version: 1');
    expect(msg).toContain('Chain ID: 1');
    expect(msg).toContain('URI: test.com');
  });
});

describe('FarcasterAuth.createSignInMessage', () => {
  it('should delegate to createSiweMessage', () => {
    const msg = FarcasterAuth.createSignInMessage(mockUser, mockParams);
    expect(msg).toContain('Farcaster FID: 42');
  });
});

describe('FarcasterAuth.generateNonce', () => {
  it('should generate a 32-character hex nonce', () => {
    const nonce = FarcasterAuth.generateNonce();
    expect(nonce.length).toBe(32);
    expect(nonce).toMatch(/^[0-9a-f]+$/);
  });

  it('should generate unique nonces', () => {
    const a = FarcasterAuth.generateNonce();
    const b = FarcasterAuth.generateNonce();
    expect(a).not.toBe(b);
  });
});

describe('FarcasterAuth.extractFid', () => {
  it('should extract FID from a message', () => {
    const msg = createSiweMessage(mockUser, mockParams);
    expect(FarcasterAuth.extractFid(msg)).toBe(42);
  });

  it('should return null for invalid message', () => {
    expect(FarcasterAuth.extractFid('not a valid message')).toBeNull();
  });
});

describe('FarcasterAuth.buildResult', () => {
  it('should build a sign-in result', () => {
    const result = FarcasterAuth.buildResult(mockUser, mockParams);
    expect(result.user).toEqual(mockUser);
    expect(result.message).toBeDefined();
    expect(result.message).toContain('Farcaster FID: 42');
  });
});

describe('FarcasterAuth.getVerifiedAddress', () => {
  it('should return the first verified ETH address', () => {
    const addr = FarcasterAuth.getVerifiedAddress(mockUser);
    expect(addr).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
  });

  it('should return null when no verified addresses', () => {
    const user = { ...mockUser, verified_addresses: undefined };
    expect(FarcasterAuth.getVerifiedAddress(user)).toBeNull();
  });

  it('should return null when eth_addresses is empty', () => {
    const user = { ...mockUser, verified_addresses: { eth_addresses: [] } };
    expect(FarcasterAuth.getVerifiedAddress(user)).toBeNull();
  });
});

describe('verifySignature', () => {
  it('should throw an error requiring viem', () => {
    expect(() =>
      verifySignature('msg', '0xsignature', '0xaddress'),
    ).toThrow('requires viem');
  });
});
