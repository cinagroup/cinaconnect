/**
 * swapTokens.ts — EVM token registry with real contract addresses.
 *
 * Covers: Ethereum, Polygon, Arbitrum, Base, BSC, Optimism.
 * Each token includes: address (or "native"), symbol, name, decimals, chainId.
 */

export interface TokenInfo {
  symbol: string;
  name: string;
  /** Contract address. "native" for the chain's native gas token. */
  address: string;
  decimals: number;
  chainId: number;
  icon: string;
}

export const SUPPORTED_CHAINS = [
  { chainId: 1,       name: 'Ethereum',   symbol: 'ETH',  rpc: 'https://eth.llamarpc.com' },
  { chainId: 137,     name: 'Polygon',    symbol: 'POL',  rpc: 'https://polygon.llamarpc.com' },
  { chainId: 42161,   name: 'Arbitrum',   symbol: 'ETH',  rpc: 'https://arb1.arbitrum.io/rpc' },
  { chainId: 8453,    name: 'Base',       symbol: 'ETH',  rpc: 'https://mainnet.base.org' },
  { chainId: 56,      name: 'BNB Chain',  symbol: 'BNB',  rpc: 'https://bsc-dataseed.binance.org' },
  { chainId: 10,      name: 'Optimism',   symbol: 'ETH',  rpc: 'https://mainnet.optimism.io' },
] as const;

/** Map chainId → chain metadata. */
export const CHAIN_BY_ID: Record<number, { name: string; symbol: string; rpc: string }> = Object.fromEntries(
  SUPPORTED_CHAINS.map((c) => [c.chainId, { name: c.name, symbol: c.symbol, rpc: c.rpc }]),
);

// ─── Token Lists per Chain ────────────────────────────────────────────────

const ETHEREUM: TokenInfo[] = [
  { symbol: 'ETH',  name: 'Ethereum',   address: 'native', decimals: 18, chainId: 1, icon: '⟠' },
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, chainId: 1, icon: '⟠' },
  { symbol: 'USDC', name: 'USD Coin',   address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6,  chainId: 1, icon: '◎' },
  { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6,  chainId: 1, icon: '₮' },
  { symbol: 'DAI',  name: 'Dai',        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, chainId: 1, icon: '◈' },
  { symbol: 'WBTC', name: 'Wrapped BTC',address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8,  chainId: 1, icon: '₿' },
];

const POLYGON: TokenInfo[] = [
  { symbol: 'POL',  name: 'Polygon',    address: 'native', decimals: 18, chainId: 137, icon: '⬡' },
  { symbol: 'WMATIC',name: 'Wrapped POL',address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 18, chainId: 137, icon: '⬡' },
  { symbol: 'USDC', name: 'USD Coin',   address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6,  chainId: 137, icon: '◎' },
  { symbol: 'USDT', name: 'Tether USD', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6,  chainId: 137, icon: '₮' },
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, chainId: 137, icon: '⟠' },
];

const ARBITRUM: TokenInfo[] = [
  { symbol: 'ETH',  name: 'Ethereum',   address: 'native', decimals: 18, chainId: 42161, icon: '⟠' },
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, chainId: 42161, icon: '⟠' },
  { symbol: 'USDC', name: 'USD Coin',   address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6,  chainId: 42161, icon: '◎' },
  { symbol: 'USDT', name: 'Tether USD', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6,  chainId: 42161, icon: '₮' },
  { symbol: 'ARB',  name: 'Arbitrum',   address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, chainId: 42161, icon: '🔵' },
];

const BASE: TokenInfo[] = [
  { symbol: 'ETH',  name: 'Ethereum',   address: 'native', decimals: 18, chainId: 8453, icon: '⟠' },
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0x4200000000000000000000000000000000000006', decimals: 18, chainId: 8453, icon: '⟠' },
  { symbol: 'USDC', name: 'USD Coin',   address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6,  chainId: 8453, icon: '◎' },
  { symbol: 'cbETH',name: 'Coinbase Wrapped Staked ETH', address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', decimals: 18, chainId: 8453, icon: '🔷' },
];

const BSC: TokenInfo[] = [
  { symbol: 'BNB',  name: 'BNB',        address: 'native', decimals: 18, chainId: 56, icon: '🔶' },
  { symbol: 'WBNB', name: 'Wrapped BNB',address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', decimals: 18, chainId: 56, icon: '🔶' },
  { symbol: 'BUSD', name: 'BUSD',       address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18, chainId: 56, icon: '💲' },
  { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, chainId: 56, icon: '₮' },
];

const OPTIMISM: TokenInfo[] = [
  { symbol: 'ETH',  name: 'Ethereum',   address: 'native', decimals: 18, chainId: 10, icon: '⟠' },
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0x4200000000000000000000000000000000000006', decimals: 18, chainId: 10, icon: '⟠' },
  { symbol: 'USDC', name: 'USD Coin',   address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6,  chainId: 10, icon: '◎' },
  { symbol: 'USDT', name: 'Tether USD', address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6,  chainId: 10, icon: '₮' },
  { symbol: 'OP',   name: 'Optimism',   address: '0x4200000000000000000000000000000000000042', decimals: 18, chainId: 10, icon: '🔴' },
];

// ─── Aggregated Token Registry ────────────────────────────────────────────

export const TOKEN_REGISTRY: Record<number, TokenInfo[]> = {
  1: ETHEREUM,
  137: POLYGON,
  42161: ARBITRUM,
  8453: BASE,
  56: BSC,
  10: OPTIMISM,
};

/**
 * Get tokens for a specific chain.
 */
export function getTokensForChain(chainId: number): TokenInfo[] {
  return TOKEN_REGISTRY[chainId] ?? [];
}

/**
 * Look up a token by symbol + chainId.
 */
export function getTokenBySymbol(symbol: string, chainId: number): TokenInfo | undefined {
  return getTokensForChain(chainId).find((t) => t.symbol === symbol);
}

/**
 * Look up a token by contract address + chainId.
 */
export function getTokenByAddress(address: string, chainId: number): TokenInfo | undefined {
  const normalized = address.toLowerCase();
  return getTokensForChain(chainId).find((t) => t.address.toLowerCase() === normalized);
}

/**
 * All supported chain IDs.
 */
export const SUPPORTED_CHAIN_IDS = SUPPORTED_CHAINS.map((c) => c.chainId);
