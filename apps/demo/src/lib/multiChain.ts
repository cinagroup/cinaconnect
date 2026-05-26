/**
 * multiChain.ts — Multi-chain balance and RPC health service.
 *
 * Fetches native token balances across multiple EVM chains
 * using public RPC endpoints. No API keys required.
 */

/* ─── Chain configuration ────────────────────────────────────────────────────── */

export interface ChainConfig {
  id: string;
  name: string;
  symbol: string;
  chainId: number;
  rpcUrl: string;
  decimals: number;
  explorer: string;
}

export const CHAINS: ChainConfig[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    decimals: 18,
    explorer: 'https://etherscan.io',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'POL',
    chainId: 137,
    rpcUrl: 'https://polygon.llamarpc.com',
    decimals: 18,
    explorer: 'https://polygonscan.com',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum One',
    symbol: 'ETH',
    chainId: 42161,
    rpcUrl: 'https://arbitrum.llamarpc.com',
    decimals: 18,
    explorer: 'https://arbiscan.io',
  },
  {
    id: 'base',
    name: 'Base',
    symbol: 'ETH',
    chainId: 8453,
    rpcUrl: 'https://base.llamarpc.com',
    decimals: 18,
    explorer: 'https://basescan.org',
  },
  {
    id: 'bsc',
    name: 'BNB Chain',
    symbol: 'BNB',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    decimals: 18,
    explorer: 'https://bscscan.com',
  },
  {
    id: 'optimism',
    name: 'Optimism',
    symbol: 'ETH',
    chainId: 10,
    rpcUrl: 'https://optimism.llamarpc.com',
    decimals: 18,
    explorer: 'https://optimistic.etherscan.io',
  },
];

/* ─── Types ──────────────────────────────────────────────────────────────────── */

export interface ChainBalance {
  chain: ChainConfig;
  balance: string;        // Formatted (e.g. "1.2345")
  balanceWei: string;     // Raw hex from RPC
  status: 'loaded' | 'error';
  error?: string;
}

export interface ChainHealthStatus {
  chain: ChainConfig;
  healthy: boolean;
  latencyMs?: number;
  error?: string;
}

/* ─── JSON-RPC helper ────────────────────────────────────────────────────────── */

/**
 * Send a raw JSON-RPC request to a given endpoint.
 */
async function jsonRpc<T>(
  rpcUrl: string,
  method: string,
  params: unknown[],
  timeoutMs = 10_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      jsonrpc: string;
      id: number;
      result?: T;
      error?: { code: number; message: string };
    };

    if (data.error) {
      throw new Error(`RPC error ${data.error.code}: ${data.error.message}`);
    }

    if (data.result === undefined) {
      throw new Error('No result in RPC response');
    }

    return data.result;
  } finally {
    clearTimeout(timer);
  }
}

/* ─── Balance formatting ─────────────────────────────────────────────────────── */

/**
 * Format a raw wei hex string into a human-readable decimal string.
 *
 * @param weiHex - Hex string of wei value (e.g. "0x16345785d8a0000")
 * @param decimals - Token decimals (default 18 for ETH)
 * @returns Formatted string (e.g. "1.2345")
 */
export function formatBalance(weiHex: string, decimals = 18): string {
  try {
    const wei = BigInt(weiHex);
    if (wei === 0n) return '0.0000';

    const divisor = 10n ** BigInt(decimals);
    const integerPart = wei / divisor;
    const fractionalPart = wei % divisor;

    // Get 4 decimal places
    const fractionalDigits = 4;
    const fractionalScale = 10n ** BigInt(fractionalDigits);
    const scaled = (fractionalPart * fractionalScale) / divisor;
    const fractionalStr = scaled.toString().padStart(fractionalDigits, '0');

    // Remove trailing zeros
    const trimmed = fractionalStr.replace(/0+$/, '') || '0';

    return `${integerPart.toString()}.${trimmed}`;
  } catch {
    return '0.0000';
  }
}

/* ─── Fetch balances ─────────────────────────────────────────────────────────── */

/**
 * Fetch the native token balance for an address on a single chain.
 */
async function fetchChainBalance(
  address: string,
  chain: ChainConfig,
): Promise<ChainBalance> {
  try {
    const balanceWei = await jsonRpc<string>(chain.rpcUrl, 'eth_getBalance', [
      address,
      'latest',
    ]);

    return {
      chain,
      balance: formatBalance(balanceWei, chain.decimals),
      balanceWei,
      status: 'loaded',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      chain,
      balance: '0.0000',
      balanceWei: '0x0',
      status: 'error',
      error: message,
    };
  }
}

/**
 * Fetch balances for an address across all configured chains.
 * Runs all RPC calls in parallel.
 */
export async function getMultiChainBalances(
  address: string,
): Promise<ChainBalance[]> {
  const results = await Promise.allSettled(
    CHAINS.map((chain) => fetchChainBalance(address, chain)),
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') {
      return r.value;
    }
    return {
      chain: CHAINS[i],
      balance: '0.0000',
      balanceWei: '0x0',
      status: 'error' as const,
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });
}

/* ─── Chain health checks ────────────────────────────────────────────────────── */

/**
 * Check the health of a single chain RPC by calling eth_chainId.
 * Returns latency and status.
 */
async function checkChainHealth(chain: ChainConfig): Promise<ChainHealthStatus> {
  const start = Date.now();

  try {
    await jsonRpc<string>(chain.rpcUrl, 'eth_chainId', []);
    const latency = Date.now() - start;

    return {
      chain,
      healthy: true,
      latencyMs: latency,
    };
  } catch (err: unknown) {
    const latency = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);

    return {
      chain,
      healthy: false,
      latencyMs: latency,
      error: message,
    };
  }
}

/**
 * Check the health of all configured chain RPCs.
 */
export async function getChainStatus(): Promise<ChainHealthStatus[]> {
  const results = await Promise.allSettled(
    CHAINS.map((chain) => checkChainHealth(chain)),
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') {
      return r.value;
    }
    return {
      chain: CHAINS[i],
      healthy: false,
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });
}
