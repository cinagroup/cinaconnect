import type { TokenInfo, TokenSource } from '../types.js';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export interface CoinGeckoOptions {
  apiKey?: string;
  baseUrl?: string;
}

/**
 * CoinGecko API token source.
 * Fetches token metadata from the CoinGecko API.
 */
export class CoinGeckoSource implements TokenSource {
  readonly name = 'coingecko';
  private apiKey?: string;
  private baseUrl: string;

  constructor(options: CoinGeckoOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || COINGECKO_API;
  }

  async fetch(): Promise<TokenInfo[]> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['x-cg-pro-api-key'] = this.apiKey;
    }

    const url = `${this.baseUrl}/coins/list?include_platform=true`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(
        `CoinGecko API error: ${response.status} ${response.statusText}`,
      );
    }

    const coins: Array<{
      id: string;
      symbol: string;
      name: string;
      platforms: Record<string, string>;
    }> = await response.json();

    return coins
      .filter((coin) => Object.keys(coin.platforms).length > 0)
      .flatMap((coin) =>
        Object.entries(coin.platforms).map(([platform, address]) => ({
          address,
          chainId: this.platformToChainId(platform),
          name: coin.name,
          symbol: coin.symbol.toUpperCase(),
          decimals: 18, // Default; actual decimals require a separate API call
          logoURI: undefined,
          tags: ['coingecko'],
          extensions: {
            coingeckoId: coin.id,
            platform,
          },
        })),
      );
  }

  /**
   * Fetch price data for a specific token.
   */
  async fetchPrice(
    coingeckoId: string,
    vsCurrency = 'usd',
  ): Promise<{ price: number; change24h?: number }> {
    const url = `${this.baseUrl}/simple/price?ids=${coingeckoId}&vs_currencies=${vsCurrency}&include_24hr_change=true`;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['x-cg-pro-api-key'] = this.apiKey;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(
        `CoinGecko price error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const entry = data[coingeckoId];
    return {
      price: entry?.[vsCurrency] ?? 0,
      change24h: entry?.[`${vsCurrency}_24h_change`],
    };
  }

  private platformToChainId(platform: string): number {
    const mapping: Record<string, number> = {
      ethereum: 1,
      binance-smart-chain: 56,
      polygon-pos: 137,
      'avalanche': 43114,
      optimism: 10,
      arbitrum: 42161,
      fantom: 250,
      'base': 8453,
    };
    return mapping[platform] ?? 0;
  }
}
