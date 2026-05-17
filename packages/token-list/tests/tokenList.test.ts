import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenList, LRUTokenCache, LocalSource } from '../src/index.js';
import type { TokenInfo, TokenSource, PriceData } from '../src/types.js';

const mockTokens: TokenInfo[] = [
  {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    chainId: 1,
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    tags: ['erc20'],
  },
  {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    chainId: 1,
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    tags: ['erc20', 'stablecoin'],
  },
  {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    chainId: 1,
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    decimals: 18,
    tags: ['erc20', 'stablecoin'],
  },
  {
    address: '0x0000000000000000000000000000000000000000',
    chainId: 56,
    name: 'Binance Coin',
    symbol: 'BNB',
    decimals: 18,
    tags: ['native'],
  },
];

describe('TokenList', () => {
  describe('search', () => {
    it('should return empty when no tokens are loaded', () => {
      const list = new TokenList();
      expect(list.search('WETH')).toEqual([]);
    });

    it('should search tokens by symbol after fetchAll', async () => {
      const source: TokenSource = {
        name: 'mock',
        fetch: vi.fn().mockResolvedValue(mockTokens),
      };
      const list = new TokenList({ sources: [source] });
      await list.fetchAll();
      const results = list.search('WETH');
      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('WETH');
    });

    it('should search tokens by name', async () => {
      const source: TokenSource = {
        name: 'mock',
        fetch: vi.fn().mockResolvedValue(mockTokens),
      };
      const list = new TokenList({ sources: [source] });
      await list.fetchAll();
      const results = list.search('ether');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('filter', () => {
    it('should filter tokens by chainId', async () => {
      const source: TokenSource = {
        name: 'mock',
        fetch: vi.fn().mockResolvedValue(mockTokens),
      };
      const list = new TokenList({ sources: [source] });
      await list.fetchAll();
      const results = list.filter({ chainId: 56 });
      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('BNB');
    });

    it('should filter tokens by tags', async () => {
      const source: TokenSource = {
        name: 'mock',
        fetch: vi.fn().mockResolvedValue(mockTokens),
      };
      const list = new TokenList({ sources: [source] });
      await list.fetchAll();
      const results = list.filter({ tags: ['stablecoin'] });
      expect(results).toHaveLength(2);
    });

    it('should filter by address', async () => {
      const source: TokenSource = {
        name: 'mock',
        fetch: vi.fn().mockResolvedValue(mockTokens),
      };
      const list = new TokenList({ sources: [source] });
      await list.fetchAll();
      const results = list.filter({
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      });
      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('USDT');
    });
  });

  describe('validateToken', () => {
    it('should validate a correct token', () => {
      const list = new TokenList();
      const result = list.validateToken(mockTokens[0]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject token with empty address', () => {
      const list = new TokenList();
      const result = list.validateToken({
        address: '',
        chainId: 1,
        name: 'Test',
        symbol: 'TST',
        decimals: 18,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Address is required');
    });

    it('should reject token with invalid decimals', () => {
      const list = new TokenList();
      const result = list.validateToken({
        address: '0x123',
        chainId: 1,
        name: 'Test',
        symbol: 'TST',
        decimals: 300,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Decimals must be between 0 and 255',
      );
    });
  });

  describe('getToken', () => {
    it('should retrieve a token by address and chainId after fetch', async () => {
      const source: TokenSource = {
        name: 'mock',
        fetch: vi.fn().mockResolvedValue(mockTokens),
      };
      const list = new TokenList({ sources: [source] });
      await list.fetchAll();
      const token = list.getToken(
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        1,
      );
      expect(token).toBeDefined();
      expect(token?.symbol).toBe('WETH');
    });
  });
});

describe('LRUTokenCache', () => {
  it('should store and retrieve tokens', () => {
    const cache = new LRUTokenCache();
    cache.set('test', mockTokens);
    expect(cache.get('test')).toEqual(mockTokens);
  });

  it('should evict oldest entries when max size is reached', () => {
    const cache = new LRUTokenCache(2);
    cache.set('a', mockTokens.slice(0, 1));
    cache.set('b', mockTokens.slice(1, 2));
    cache.set('c', mockTokens.slice(2, 3));
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeDefined();
    expect(cache.get('c')).toBeDefined();
  });
});
