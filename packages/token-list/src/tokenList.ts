import type {
  TokenInfo,
  TokenSource,
  TokenWithPrice,
  FilterOptions,
  ValidationResult,
  PriceData,
  TokenListCache,
} from './types.js';
import { LRUTokenCache } from './cache.js';

/**
 * TokenList — Unified token management with multi-source fetching,
 * searching, filtering, caching, and validation.
 */
export class TokenList {
  private sources: TokenSource[] = [];
  private cache: TokenListCache;
  private tokenMap = new Map<string, TokenInfo>();

  constructor(options: { cache?: TokenListCache; sources?: TokenSource[] } = {}) {
    this.cache = options.cache ?? new LRUTokenCache();
    if (options.sources) {
      this.sources = options.sources;
    }
  }

  /**
   * Register a token source.
   */
  addSource(source: TokenSource): void {
    this.sources.push(source);
  }

  /**
   * Fetch tokens from all registered sources, merging results.
   */
  async fetchAll(): Promise<TokenInfo[]> {
    const results = await Promise.allSettled(
      this.sources.map(async (source) => {
        const cacheKey = `source:${source.name}`;
        if (this.cache.has(cacheKey)) {
          return this.cache.get(cacheKey)!;
        }
        const tokens = await source.fetch();
        this.cache.set(cacheKey, tokens);
        return tokens;
      }),
    );

    const allTokens: TokenInfo[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allTokens.push(...result.value);
      }
    }

    // Deduplicate by chainId:address
    const seen = new Set<string>();
    for (const token of allTokens) {
      const key = `${token.chainId}:${token.address.toLowerCase()}`;
      if (!seen.has(key)) {
        this.tokenMap.set(key, token);
        seen.add(key);
      }
    }

    return [...this.tokenMap.values()];
  }

  /**
   * Search tokens by symbol, name, or address.
   */
  search(query: string, options: FilterOptions = {}): TokenInfo[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.filter(options);

    return this.tokenMap.values().filter((token) => {
      const matchesSearch =
        token.symbol.toLowerCase().includes(q) ||
        token.name.toLowerCase().includes(q) ||
        token.address.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      return this.matchesFilter(token, options);
    });
  }

  /**
   * Filter tokens by chain, tags, address, symbol.
   */
  filter(options: FilterOptions): TokenInfo[] {
    return [...this.tokenMap.values()].filter((token) =>
      this.matchesFilter(token, options),
    );
  }

  /**
   * Validate a single token against basic schema rules.
   */
  validateToken(token: TokenInfo): ValidationResult {
    const errors: string[] = [];

    if (!token.address || token.address.trim() === '') {
      errors.push('Address is required');
    }
    if (!token.symbol || token.symbol.trim() === '') {
      errors.push('Symbol is required');
    }
    if (!token.name || token.name.trim() === '') {
      errors.push('Name is required');
    }
    if (token.decimals < 0 || token.decimals > 255) {
      errors.push('Decimals must be between 0 and 255');
    }
    if (token.chainId < 0) {
      errors.push('ChainId must be non-negative');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get price data for a token (if available in the enriched map).
   */
  getPrice(token: TokenWithPrice): PriceData | undefined {
    return token.price;
  }

  /**
   * Enrich tokens with price data from a source.
   */
  async enrichWithPrices(
    tokens: TokenInfo[],
    priceMap: Map<string, PriceData>,
  ): Promise<TokenWithPrice[]> {
    return tokens.map((token) => {
      const key = `${token.chainId}:${token.address.toLowerCase()}`;
      const price = priceMap.get(key);
      return price ? { ...token, price } : token;
    });
  }

  /**
   * Get a token by address and chainId.
   */
  getToken(address: string, chainId: number): TokenInfo | undefined {
    const key = `${chainId}:${address.toLowerCase()}`;
    return this.tokenMap.get(key);
  }

  /**
   * Clear the internal cache and token map.
   */
  clear(): void {
    this.cache.clear();
    this.tokenMap.clear();
  }

  private matchesFilter(token: TokenInfo, options: FilterOptions): boolean {
    if (options.chainId !== undefined && token.chainId !== options.chainId) {
      return false;
    }
    if (
      options.symbol &&
      token.symbol.toLowerCase() !== options.symbol.toLowerCase()
    ) {
      return false;
    }
    if (
      options.address &&
      token.address.toLowerCase() !== options.address.toLowerCase()
    ) {
      return false;
    }
    if (options.tags && options.tags.length > 0) {
      const tokenTags = token.tags || [];
      if (!options.tags.some((t) => tokenTags.includes(t))) {
        return false;
      }
    }
    return true;
  }
}
