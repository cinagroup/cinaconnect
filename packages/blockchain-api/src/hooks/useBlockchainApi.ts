import { useState, useEffect, useCallback, useRef } from "react";
import type { Balance, Transaction, TokenMetadata } from "../types.js";
import { BlockchainApiClient, createBlockchainApi } from "../client.js";

// ---------------------------------------------------------------------------
// Shared client singleton (avoids re-creating on every render)
// ---------------------------------------------------------------------------

let _sharedClient: BlockchainApiClient | null = null;

/**
 * Get or create the shared `BlockchainApiClient`.
 * Override via env var `NEXT_PUBLIC_RPC_URLS` (JSON string).
 */
function getSharedClient(): BlockchainApiClient {
  if (!_sharedClient) {
    _sharedClient = createBlockchainApi({
      rpcUrls:
        typeof process !== "undefined" && process.env?.NEXT_PUBLIC_RPC_URLS
          ? JSON.parse(process.env.NEXT_PUBLIC_RPC_URLS)
          : undefined,
      metadataBaseUrl:
        typeof process !== "undefined"
          ? process.env.NEXT_PUBLIC_METADATA_BASE_URL
          : undefined,
      defaultChainId:
        typeof process !== "undefined" && process.env?.NEXT_PUBLIC_DEFAULT_CHAIN_ID
          ? Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID)
          : undefined,
    });
  }
  return _sharedClient;
}

// ---------------------------------------------------------------------------
// useBalance
// ---------------------------------------------------------------------------

interface UseBalanceResult {
  balance: Balance | null;
  formatted: string;
  symbol: string;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch the native token balance for a given address.
 *
 * @param address - Wallet address (required). Pass `undefined` to skip.
 * @param chainId - EVM chain id (defaults to client default).
 *
 * ```tsx
 * const { balance, formatted, symbol, isLoading } = useBalance(address, 1);
 * ```
 */
export function useBalance(
  address?: string,
  chainId?: number
): UseBalanceResult {
  const client = getSharedClient();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchBalance = useCallback(() => {
    if (!address) {
      setBalance(null);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);

    client
      .getBalance(address, chainId)
      .then((result) => {
        if (!controller.signal.aborted) {
          setBalance(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });
  }, [address, chainId, client]);

  useEffect(() => {
    fetchBalance();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchBalance]);

  return {
    balance,
    formatted: balance?.formatted ?? "0",
    symbol: balance?.symbol ?? "",
    isLoading,
    error,
    refetch: fetchBalance,
  };
}

// ---------------------------------------------------------------------------
// useTransactionHistory
// ---------------------------------------------------------------------------

interface UseTransactionHistoryResult {
  transactions: Transaction[];
  isLoading: boolean;
  error: Error | null;
  cursor: string | undefined;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

/**
 * Fetch transaction history for a given address.
 *
 * @param address - Wallet address (required). Pass `undefined` to skip.
 * @param chainId - EVM chain id.
 * @param limit - Items per page (default 20).
 *
 * ```tsx
 * const { transactions, isLoading, loadMore } = useTransactionHistory(address, 1);
 * ```
 */
export function useTransactionHistory(
  address?: string,
  chainId?: number,
  limit = 20
): UseTransactionHistoryResult {
  const client = getSharedClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchHistory = useCallback(
    (append = false) => {
      if (!address) {
        if (!append) setTransactions([]);
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      setError(null);

      const currentCursor = append ? cursor : undefined;

      client
        .getTransactionHistory(address, chainId, limit, currentCursor)
        .then((result) => {
          if (!controller.signal.aborted) {
            setTransactions(
              append ? [...transactions, ...result.items] : result.items
            );
            setCursor(result.nextCursor);
            setHasMore(result.hasMore);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (!controller.signal.aborted) {
            setError(err instanceof Error ? err : new Error(String(err)));
            setIsLoading(false);
          }
        });
    },
    [address, chainId, limit, cursor, transactions, client]
  );

  useEffect(() => {
    fetchHistory(false);
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, chainId, limit]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) fetchHistory(true);
  }, [hasMore, isLoading, fetchHistory]);

  return {
    transactions,
    isLoading,
    error,
    cursor,
    hasMore,
    loadMore,
    refetch: () => fetchHistory(false),
  };
}

// ---------------------------------------------------------------------------
// useENS
// ---------------------------------------------------------------------------

interface UseENSResult {
  address: string | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Resolve an ENS name to an Ethereum address.
 *
 * @param name - ENS name (e.g. `vitalik.eth`). Pass `undefined` to skip.
 *
 * ```tsx
 * const { address, isLoading } = useENS("vitalik.eth");
 * ```
 */
export function useENS(name?: string): UseENSResult {
  const client = getSharedClient();
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchENS = useCallback(() => {
    if (!name) {
      setAddress(null);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);

    client
      .resolveENS(name)
      .then((result) => {
        if (!controller.signal.aborted) {
          setAddress(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });
  }, [name, client]);

  useEffect(() => {
    fetchENS();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchENS]);

  return { address, isLoading, error, refetch: fetchENS };
}

// ---------------------------------------------------------------------------
// useReverseENS
// ---------------------------------------------------------------------------

interface UseReverseENSResult {
  name: string | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Reverse ENS lookup — get the ENS name for an address.
 *
 * @param address - Ethereum address. Pass `undefined` to skip.
 *
 * ```tsx
 * const { name, isLoading } = useReverseENS("0x…");
 * ```
 */
export function useReverseENS(address?: string): UseReverseENSResult {
  const client = getSharedClient();
  const [name, setName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchReverse = useCallback(() => {
    if (!address) {
      setName(null);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);

    client
      .reverseENS(address)
      .then((result) => {
        if (!controller.signal.aborted) {
          setName(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });
  }, [address, client]);

  useEffect(() => {
    fetchReverse();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchReverse]);

  return { name, isLoading, error, refetch: fetchReverse };
}

// ---------------------------------------------------------------------------
// useTokenMetadata
// ---------------------------------------------------------------------------

interface UseTokenMetadataResult {
  metadata: TokenMetadata | null;
  name: string;
  symbol: string;
  decimals: number;
  logo: string | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch ERC-20 token metadata by contract address.
 *
 * @param tokenAddress - Contract address. Pass `undefined` to skip.
 * @param chainId - EVM chain id.
 *
 * ```tsx
 * const { name, symbol, decimals } = useTokenMetadata("0x…");
 * ```
 */
export function useTokenMetadata(
  tokenAddress?: string,
  chainId?: number
): UseTokenMetadataResult {
  const client = getSharedClient();
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchMetadata = useCallback(() => {
    if (!tokenAddress) {
      setMetadata(null);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);

    client
      .getTokenMetadata(tokenAddress, chainId)
      .then((result) => {
        if (!controller.signal.aborted) {
          setMetadata(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });
  }, [tokenAddress, chainId, client]);

  useEffect(() => {
    fetchMetadata();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchMetadata]);

  return {
    metadata,
    name: metadata?.name ?? "",
    symbol: metadata?.symbol ?? "",
    decimals: metadata?.decimals ?? 18,
    logo: metadata?.logo,
    isLoading,
    error,
    refetch: fetchMetadata,
  };
}
