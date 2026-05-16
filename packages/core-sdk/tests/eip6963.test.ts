/**
 * Tests for EIP-6963 wallet discovery event handling.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { discoverWallets, watchWallets, findWalletByRdns } from '../../src/eip6963';

describe('discoverWallets', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Clean up event listeners
    window.removeEventListener('eip6963:announceProvider', (() => {}) as EventListener);
  });

  it('should dispatch eip6963:requestProvider event', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const promise = discoverWallets();
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'eip6963:requestProvider' }));
    await vi.advanceTimersByTimeAsync(300);
    await promise;
    dispatchSpy.mockRestore();
  });

  it('should collect announced wallets', async () => {
    const promise = discoverWallets();

    // Simulate wallet announcements
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: {
          info: { rdns: 'com.metamask', name: 'MetaMask', icon: 'icon-m', uuid: 'uuid-m' },
          provider: { request: () => Promise.resolve(null), on: () => {}, removeListener: () => {} },
        },
      })
    );

    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: {
          info: { rdns: 'io.rabby', name: 'Rabby', icon: 'icon-r', uuid: 'uuid-r' },
          provider: { request: () => Promise.resolve(null), on: () => {}, removeListener: () => {} },
        },
      })
    );

    await vi.advanceTimersByTimeAsync(300);
    const wallets = await promise;

    expect(wallets).toHaveLength(2);
    expect(wallets[0].info.rdns).toBe('com.metamask');
    expect(wallets[1].info.rdns).toBe('io.rabby');
  });

  it('should deduplicate wallets by rdns', async () => {
    const promise = discoverWallets();

    // Same wallet announced twice
    const detail = {
      info: { rdns: 'com.metamask', name: 'MetaMask', icon: 'icon', uuid: 'uuid' },
      provider: { request: () => Promise.resolve(null), on: () => {}, removeListener: () => {} },
    };
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail }));
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail }));

    await vi.advanceTimersByTimeAsync(300);
    const wallets = await promise;
    expect(wallets).toHaveLength(1);
  });

  it('should return empty array when no wallets announce', async () => {
    const promise = discoverWallets();
    await vi.advanceTimersByTimeAsync(300);
    const wallets = await promise;
    expect(wallets).toEqual([]);
  });

  it('should remove event listeners after discovery window', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const promise = discoverWallets();
    await vi.advanceTimersByTimeAsync(300);
    await promise;

    expect(removeSpy).toHaveBeenCalledWith('eip6963:announceProvider', expect.any(Function));
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

describe('watchWallets', () => {
  it('should call callback for each announced wallet', async () => {
    const callback = vi.fn();
    const unsubscribe = watchWallets(callback);

    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: {
          info: { rdns: 'com.coinbase', name: 'Coinbase Wallet', icon: '', uuid: '' },
          provider: { request: () => Promise.resolve(null), on: () => {}, removeListener: () => {} },
        },
      })
    );

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0].info.rdns).toBe('com.coinbase');

    unsubscribe();
  });

  it('should stop receiving events after unsubscribe', async () => {
    const callback = vi.fn();
    const unsubscribe = watchWallets(callback);
    unsubscribe();

    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: {
          info: { rdns: 'com.test', name: 'Test', icon: '', uuid: '' },
          provider: { request: () => Promise.resolve(null), on: () => {}, removeListener: () => {} },
        },
      })
    );

    expect(callback).not.toHaveBeenCalled();
  });

  it('should dispatch requestProvider event when starting watch', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const callback = vi.fn();
    watchWallets(callback);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'eip6963:requestProvider' }));
    dispatchSpy.mockRestore();
  });
});

describe('findWalletByRdns', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should find a wallet by its RDNS', async () => {
    vi.useFakeTimers();
    const promise = findWalletByRdns('com.metamask');

    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: {
          info: { rdns: 'com.metamask', name: 'MetaMask', icon: '', uuid: '' },
          provider: { request: () => Promise.resolve(null), on: () => {}, removeListener: () => {} },
        },
      })
    );

    await vi.advanceTimersByTimeAsync(300);
    const wallet = await promise;
    expect(wallet).toBeDefined();
    expect(wallet!.info.name).toBe('MetaMask');
  });

  it('should return undefined for unknown RDNS', async () => {
    vi.useFakeTimers();
    const promise = findWalletByRdns('com.unknown');

    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: {
          info: { rdns: 'com.metamask', name: 'MetaMask', icon: '', uuid: '' },
          provider: { request: () => Promise.resolve(null), on: () => {}, removeListener: () => {} },
        },
      })
    );

    await vi.advanceTimersByTimeAsync(300);
    const wallet = await promise;
    expect(wallet).toBeUndefined();
  });
});
