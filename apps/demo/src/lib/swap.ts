/**
 * swap.ts — Real DEX aggregator swap service using 1inch API v6.
 *
 * Endpoints:
 *   GET  /quote    — get best swap quote (no tx)
 *   GET  /swap     — get quote + calldata for on-chain execution
 *   GET  /approve/tx — approval transaction for ERC20 tokens
 *
 * Docs: https://docs.1inch.io/docs/swap-protocol/introduction
 */

import { getTokenBySymbol, TOKEN_REGISTRY, CHAIN_BY_ID } from './swapTokens';

// ─── Config ───────────────────────────────────────────────────────────────

const API_KEY = typeof process !== 'undefined'
  ? (process.env.NEXT_PUBLIC_1INCH_API_KEY ?? '')
  : '';

const BASE_URL = 'https://api.1inch.dev/swap/v6.0';

const HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
};
if (API_KEY) {
  HEADERS['Authorization'] = `Bearer ${API_KEY}`;
}

// ─── Types ────────────────────────────────────────────────────────────────

export interface SwapQuoteParams {
  /** Source token contract address, or "native" for the chain's native token. */
  fromTokenAddress: string;
  /** Destination token contract address. */
  toTokenAddress: string;
  /** Amount of fromToken in atomic units (wei / smallest unit). */
  amount: string;
  /** EVM chain ID. */
  chainId: number;
  /** Max slippage percentage. */
  slippage?: number;
  /** Optional: receiver address (defaults to fromAddress). */
  receiver?: string;
}

export interface PriceQuote {
  /** Amount of toToken in atomic units. */
  toTokenAmount: string;
  /** Human-readable toToken amount (with decimals applied). */
  toTokenAmountFormatted: string;
  /** Human-readable fromToken amount. */
  fromTokenAmountFormatted: string;
  /** Estimated price impact in percent (string, e.g. "0.15"). */
  priceImpact: string;
  /** Number of protocols in the route. */
  protocolsCount: number;
  /** Human-readable exchange rate: "1 FROM = X TO". */
  rate: string;
  /** Estimated gas cost in native token (string). */
  estimatedGas: string;
}

export interface SwapTransaction {
  /** Calldata for the swap transaction. */
  tx: {
    from: string;
    to: string;
    data: string;
    value: string;
    gasPrice: string;
    gas: number;
  };
  /** The quote data. */
  quote: PriceQuote;
}

export interface SwapError {
  error: string;
  description?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Resolve a token address.
 * Pass "native" to keep it, or look up a symbol.
 */
function resolveAddress(token: string, chainId: number): string | null {
  if (token.toLowerCase() === 'native') return 'native';
  // Already a 0x address
  if (token.startsWith('0x')) return token;
  // Look up by symbol
  const found = getTokenBySymbol(token, chainId);
  return found?.address ?? null;
}

/**
 * Format an atomic amount to human-readable.
 */
function formatAmount(amount: string, decimals: number): string {
  try {
    const big = BigInt(amount);
    const divisor = BigInt(10) ** BigInt(decimals);
    const integer = big / divisor;
    const fractional = big % divisor;
    const fracStr = fractional.toString().padStart(decimals, '0').replace(/0+$/, '');
    return fracStr ? `${integer}.${fracStr}` : integer.toString();
  } catch {
    return amount;
  }
}

/**
 * Get decimals for a token (by address or symbol) on a chain.
 */
function getTokenDecimals(token: string, chainId: number): number {
  const chainTokens = TOKEN_REGISTRY[chainId];
  if (!chainTokens) return 18;
  const normalized = token.toLowerCase();
  const found = chainTokens.find(
    (t) => t.address.toLowerCase() === normalized || t.symbol.toLowerCase() === token.toLowerCase(),
  );
  return found?.decimals ?? 18;
}

/**
 * Get chain name for display.
 */
function chainName(chainId: number): string {
  return CHAIN_BY_ID[chainId]?.name ?? `Chain ${chainId}`;
}

// ─── 1inch API Calls ──────────────────────────────────────────────────────

/**
 * Fetch a price quote from 1inch (no transaction data).
 *
 * Free tier: 100 req/day without API key, higher with key.
 */
export async function getSwapQuote(
  fromToken: string,
  toToken: string,
  amount: string,
  chainId: number,
  slippage = 0.5,
): Promise<PriceQuote | SwapError> {
  const fromAddress = resolveAddress(fromToken, chainId);
  const toAddress = resolveAddress(toToken, chainId);

  if (!fromAddress || !toAddress) {
    return {
      error: 'token_not_found',
      description: `Could not resolve token: ${fromToken} / ${toToken} on ${chainName(chainId)}`,
    };
  }

  const chain = CHAIN_BY_ID[chainId];
  if (!chain) {
    return {
      error: 'unsupported_chain',
      description: `Chain ${chainId} is not supported.`,
    };
  }

  const params = new URLSearchParams({
    src: fromAddress,
    dst: toAddress,
    amount,
    slippage: slippage.toString(),
  });

  const url = `${BASE_URL}/${chainId}/quote?${params}`;

  try {
    const res = await fetch(url, { headers: HEADERS });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return {
        error: `api_error_${res.status}`,
        description: body?.description ?? body?.message ?? res.statusText,
      };
    }

    const data = await res.json();

    const fromDecimals = getTokenDecimals(fromToken, chainId);
    const toDecimals = getTokenDecimals(toToken, chainId);

    const fromFormatted = formatAmount(amount, fromDecimals);
    const toFormatted = formatAmount(data.dstAmount, toDecimals);

    // Calculate rate
    const fromNum = parseFloat(fromFormatted) || 1;
    const toNum = parseFloat(toFormatted) || 0;
    const rate = toNum / fromNum;

    return {
      toTokenAmount: data.dstAmount,
      toTokenAmountFormatted: toFormatted,
      fromTokenAmountFormatted: fromFormatted,
      priceImpact: (parseFloat(data.estimatedPriceImpact ?? '0')).toFixed(2),
      protocolsCount: data?.protocols?.length ?? 0,
      rate: `1 ${fromToken} = ${rate.toFixed(6)} ${toToken}`,
      estimatedGas: data.gas ?? '0',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      error: 'network_error',
      description: `Failed to fetch quote from 1inch: ${message}`,
    };
  }
}

/**
 * Get swap transaction data from 1inch (quote + calldata for execution).
 *
 * Requires a wallet address (sender).
 */
export async function getSwapTransaction(
  fromToken: string,
  toToken: string,
  amount: string,
  chainId: number,
  fromAddress: string,
  slippage = 0.5,
): Promise<SwapTransaction | SwapError> {
  const tokenAddress = resolveAddress(fromToken, chainId);
  const toAddress = resolveAddress(toToken, chainId);

  if (!tokenAddress || !toAddress) {
    return {
      error: 'token_not_found',
      description: `Could not resolve token: ${fromToken} / ${toToken} on ${chainName(chainId)}`,
    };
  }

  const chain = CHAIN_BY_ID[chainId];
  if (!chain) {
    return {
      error: 'unsupported_chain',
      description: `Chain ${chainId} is not supported.`,
    };
  }

  const params = new URLSearchParams({
    src: tokenAddress,
    dst: toAddress,
    amount,
    from: fromAddress,
    slippage: slippage.toString(),
  });

  const url = `${BASE_URL}/${chainId}/swap?${params}`;

  try {
    const res = await fetch(url, { headers: HEADERS });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return {
        error: `api_error_${res.status}`,
        description: body?.description ?? body?.message ?? res.statusText,
      };
    }

    const data = await res.json();

    const fromDecimals = getTokenDecimals(fromToken, chainId);
    const toDecimals = getTokenDecimals(toToken, chainId);

    const fromFormatted = formatAmount(amount, fromDecimals);
    const toFormatted = formatAmount(data.dstAmount, toDecimals);

    const fromNum = parseFloat(fromFormatted) || 1;
    const toNum = parseFloat(toFormatted) || 0;
    const rate = toNum / fromNum;

    return {
      tx: {
        from: fromAddress,
        to: data.tx.to,
        data: data.tx.data,
        value: data.tx.value,
        gasPrice: data.tx.gasPrice,
        gas: parseInt(data.tx.gas, 10),
      },
      quote: {
        toTokenAmount: data.dstAmount,
        toTokenAmountFormatted: toFormatted,
        fromTokenAmountFormatted: fromFormatted,
        priceImpact: (parseFloat(data.estimatedPriceImpact ?? '0')).toFixed(2),
        protocolsCount: data?.protocols?.length ?? 0,
        rate: `1 ${fromToken} = ${rate.toFixed(6)} ${toToken}`,
        estimatedGas: data.tx.gas,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      error: 'network_error',
      description: `Failed to get swap tx from 1inch: ${message}`,
    };
  }
}

/**
 * Get the approval transaction for an ERC20 token spend.
 * Returns null for native token swaps (no approval needed).
 */
export async function getApprovalTransaction(
  tokenAddress: string,
  chainId: number,
): Promise<{ to: string; data: string; value: string } | null> {
  if (tokenAddress.toLowerCase() === 'native') return null;

  const chain = CHAIN_BY_ID[chainId];
  if (!chain) return null;

  const url = `${BASE_URL}/${chainId}/approve/transaction?tokenAddress=${tokenAddress}`;

  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      to: data.to,
      data: data.data,
      value: data.value,
    };
  } catch {
    return null;
  }
}

/**
 * Execute a swap by sending the transaction via the connected wallet.
 */
export async function executeSwap(
  swapTx: SwapTransaction['tx'],
): Promise<string> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No Ethereum provider found');
  }

  const provider = window.ethereum as {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  };

  const txHash = (await provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: swapTx.from,
        to: swapTx.to,
        data: swapTx.data,
        value: swapTx.value,
        gas: BigInt(swapTx.gas).toString(16),
        gasPrice: swapTx.gasPrice,
      },
    ],
  })) as string;

  return txHash;
}

// ─── Swap History (localStorage) ──────────────────────────────────────────

export interface SwapHistoryEntry {
  id: string;
  from: string;
  to: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  route: string;
  chainId: number;
  txHash?: string;
}

const STORAGE_KEY = 'cinacoin_swap_history';

export function getSwapHistory(): SwapHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSwapHistory(entry: SwapHistoryEntry): void {
  if (typeof window === 'undefined') return;
  const history = getSwapHistory();
  history.unshift(entry);
  // Keep last 50 entries
  if (history.length > 50) history.length = 50;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function updateSwapStatus(txHash: string, status: 'completed' | 'failed'): void {
  if (typeof window === 'undefined') return;
  const history = getSwapHistory();
  const entry = history.find((h) => h.txHash === txHash);
  if (entry) {
    entry.status = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }
}

// ─── Fallback: Simulated Quote (when API is unavailable) ──────────────────

/**
 * Generate a simulated quote using approximate market prices.
 * Used when the 1inch API is unavailable (no key, network error, etc.).
 */
const MOCK_PRICES: Record<string, number> = {
  ETH: 3245.67,
  WETH: 3245.67,
  USDC: 1.0,
  USDT: 1.0,
  DAI: 1.0,
  WBTC: 67234.12,
  POL: 0.58,
  WMATIC: 0.58,
  ARB: 0.85,
  BNB: 610.0,
  WBNB: 610.0,
  BUSD: 1.0,
  OP: 1.65,
  cbETH: 3400.0,
};

export function getMockQuote(
  fromToken: string,
  toToken: string,
  amount: string,
): PriceQuote {
  const fromPrice = MOCK_PRICES[fromToken] ?? 1;
  const toPrice = MOCK_PRICES[toToken] ?? 1;
  const amountNum = parseFloat(amount) || 0;
  const usdValue = amountNum * fromPrice;
  const toAmount = usdValue / toPrice;
  const rate = fromPrice / toPrice;

  return {
    toTokenAmount: Math.floor(toAmount * 1e6).toString(),
    toTokenAmountFormatted: toAmount.toLocaleString(undefined, { maximumFractionDigits: 6 }),
    fromTokenAmountFormatted: amount,
    priceImpact: (Math.min(usdValue / 500000, 2.5)).toFixed(2),
    protocolsCount: 2,
    rate: `1 ${fromToken} = ${rate.toFixed(6)} ${toToken}`,
    estimatedGas: '210000',
  };
}

// Global type augmentation for window.ethereum
// (Note: useWallet.ts provides the full Window.ethereum augmentation; we just reference it)
export {}
