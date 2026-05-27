/**
 * Token types for @cinacoin/token-list
 */

export interface TokenInfo {
  address: string;
  chainId: number;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
  extensions?: Record<string, unknown>;
}

export interface PriceData {
  usd: number;
  usd24hChange?: number;
  lastUpdated: number;
}

export interface TokenWithPrice extends TokenInfo {
  price?: PriceData;
}

export interface TokenList {
  name: string;
  version: { major: number; minor: number; patch: number };
  keywords?: string[];
  tags?: Record<string, { name: string; description: string }>;
  logoURI?: string;
  tokens: TokenInfo[];
  timestamp: string;
}

export interface TokenSource {
  name: string;
  fetch(): Promise<TokenInfo[]>;
}

export interface TokenListCache {
  get(key: string): TokenInfo[] | undefined;
  set(key: string, tokens: TokenInfo[]): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  getTimestamp(key: string): number | undefined;
}

export interface FilterOptions {
  chainId?: number;
  symbol?: string;
  address?: string;
  tags?: string[];
  search?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
