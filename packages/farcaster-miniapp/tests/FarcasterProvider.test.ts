/**
 * Tests for FarcasterProvider.
 */
import { describe, it, expect, vi } from 'vitest';
import { FarcasterProvider } from '../src/FarcasterProvider.js';
import type { FarcasterContext, FarcasterUser } from '../src/types.js';

const mockUser: FarcasterUser = {
  fid: 12345,
  username: 'alice',
  display_name: 'Alice',
  pfp_url: 'https://example.com/pfp.png',
  bio: 'Hello Farcaster',
  url: 'https://alice.example.com',
  verified: true,
  custody_address: '0x1111111111111111111111111111111111111111',
  verified_addresses: {
    eth_addresses: ['0x1234567890abcdef1234567890abcdef12345678'],
    sol_addresses: ['sol123'],
  },
};

const mockContext: FarcasterContext = {
  user: mockUser,
  clientFid: 999,
  isInFarcaster: true,
  version: '1.0',
};

describe('FarcasterProvider', () => {
  it('should detect Farcaster context when provided', () => {
    const provider = new FarcasterProvider({ contextOverride: mockContext });
    expect(provider.isInFarcaster).toBe(true);
  });

  it('should return null context when not in Farcaster', () => {
    const provider = new FarcasterProvider();
    expect(provider.isInFarcaster).toBe(false);
    expect(provider.context).toBeNull();
  });

  it('should initialize successfully', async () => {
    const provider = new FarcasterProvider({ contextOverride: mockContext });
    const result = await provider.init();
    expect(result).not.toBeNull();
    expect(provider.isReady).toBe(true);
  });

  it('should return null when init fails', async () => {
    const provider = new FarcasterProvider();
    const result = await provider.init();
    expect(result).toBeNull();
    expect(provider.isReady).toBe(false);
  });

  it('should get user data', async () => {
    const provider = new FarcasterProvider({ contextOverride: mockContext });
    await provider.init();
    expect(provider.user).not.toBeNull();
    expect(provider.user!.fid).toBe(12345);
    expect(provider.user!.username).toBe('alice');
  });

  it('should set account address', async () => {
    const provider = new FarcasterProvider({ contextOverride: mockContext });
    provider.setAccount('0x1234567890abcdef1234567890abcdef12345678');
    expect(provider.account).toBe('0x1234567890abcdef1234567890abcdef12345678');
  });

  it('should emit accountsChanged event on setAccount', async () => {
    const provider = new FarcasterProvider({ contextOverride: mockContext });
    const callback = vi.fn();
    provider.on('accountsChanged', callback);
    provider.setAccount('0x1234567890abcdef1234567890abcdef12345678');
    expect(callback).toHaveBeenCalledWith(['0x1234567890abcdef1234567890abcdef12345678']);
  });

  it('should handle eth_accounts request', async () => {
    const provider = new FarcasterProvider({ contextOverride: mockContext });
    await provider.init();
    provider.setAccount('0x1234567890abcdef1234567890abcdef12345678');
    const result = await provider.request({ method: 'eth_accounts' });
    expect(result).toEqual(['0x1234567890abcdef1234567890abcdef12345678']);
  });

  it('should handle eth_chainId request', async () => {
    const provider = new FarcasterProvider({ contextOverride: mockContext });
    await provider.init();
    const result = await provider.request({ method: 'eth_chainId' });
    expect(result).toBe('0x1');
  });

  it('should handle wallet_switchEthereumChain request', async () => {
    const provider = new FarcasterProvider({ contextOverride: mockContext, chains: [1, 10, 8453] });
    await provider.init();
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xa' }] });
    expect(provider.chainId).toBe(10);
  });

  it('should throw on unsupported chain switch', async () => {
    const provider = new FarcasterProvider({ contextOverride: mockContext, chains: [1] });
    await provider.init();
    await expect(
      provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x89' }] }),
    ).rejects.toThrow();
  });

  it('should throw on unsupported methods', async () => {
    const provider = new FarcasterProvider({ contextOverride: mockContext });
    await expect(
      provider.request({ method: 'eth_sign' }),
    ).rejects.toThrow('not supported');
  });

  it('should throw when no account for eth_requestAccounts', async () => {
    const provider = new FarcasterProvider({ contextOverride: mockContext });
    await provider.init();
    await expect(
      provider.request({ method: 'eth_requestAccounts' }),
    ).rejects.toThrow('No wallet connected');
  });

  it('should handle event listeners', () => {
    const provider = new FarcasterProvider({ contextOverride: mockContext });
    const callback = vi.fn();
    const unsubscribe = provider.on('custom', callback);
    unsubscribe();
  });

  it('should get supported chains', () => {
    const provider = new FarcasterProvider({ contextOverride: mockContext, chains: [1, 10, 8453] });
    expect(provider.getSupportedChains()).toEqual([1, 10, 8453]);
  });

  it('should set app name', () => {
    const provider = new FarcasterProvider({ contextOverride: mockContext, appName: 'My Farcaster App' });
    expect(provider.appName).toBe('My Farcaster App');
  });
});
