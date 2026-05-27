import {
  createPublicClient,
  http,
  type Address,
  type Hex,
  type PublicClient,
  formatUnits,
} from "viem";
import { mainnet, polygon, bsc, arbitrum, optimism, base, avalanche, type Chain } from "viem/chains";
import type {
  Balance,
  BlockchainApiConfig,
  NFTItem,
  PaginatedResult,
  TokenMetadata,
  Transaction,
  TransactionHistoryQuery,
  TransactionCacheEntry,
} from "./types.js";

// ---------------------------------------------------------------------------
// Transaction history cache
// ---------------------------------------------------------------------------

/** In-memory cache for transaction history results. */
const _txHistoryCache = new Map<string, TransactionCacheEntry>();
const _TX_CACHE_TTL_MS = 30_000; // 30 seconds — transactions are relatively static

/** Generate a cache key from query parameters. */
function _txCacheKey(
  address: string,
  chainId: number,
  cursor?: string,
  type?: string,
  timeFrom?: number,
  timeTo?: number
): string {
  return `${address}:${chainId}:${cursor || ""}:${type || ""}:${timeFrom || 0}:${timeTo || 0}`;
}

/** Get a cached transaction history result. */
function _getTxCached(key: string): TransactionCacheEntry | null {
  const entry = _txHistoryCache.get(key);
  if (entry && Date.now() - entry.cachedAt < _TX_CACHE_TTL_MS) {
    return entry;
  }
  if (entry) {
    _txHistoryCache.delete(key);
  }
  return null;
}

/** Cache a transaction history result. */
function _setTxCached(
  key: string,
  transactions: Transaction[],
  nextCursor?: string,
  hasMore: boolean = false
): void {
  _txHistoryCache.set(key, {
    transactions,
    cachedAt: Date.now(),
    nextCursor,
    hasMore,
  });
}

/** Clear the transaction history cache. */
export function clearTxCached(): void {
  _txHistoryCache.clear();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a viem PublicClient for a given chain id. */
function buildClient(chainId: number, rpcUrl?: string): PublicClient {
  const chain = Object.values(chainsByChainId).find(
    (c) => c.id === chainId
  ) as Chain | undefined;

  return createPublicClient({
    chain: chain ?? ({ id: chainId, name: `Chain ${chainId}` } as Chain),
    transport: http(rpcUrl),
  });
}

/** Minimal chain registry for quick lookup. Extend as needed. */
const chainsByChainId: Record<number, Chain> = {
  1: mainnet,
  137: polygon,
  56: bsc,
  42161: arbitrum,
  10: optimism,
  8453: base,
  43114: avalanche,
};

const _ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as const;
const _ENS_RESOLVER = "0x233389C23a0E6A03b62944849c3E6b29A1D7f62E" as const; // ENS Universal Resolver

/**
 * ERC-721 ABI subset for NFT metadata reads.
 */
const erc721MetadataAbi = [
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
] as const;

/**
 * ERC-1155 ABI subset for NFT metadata + balance reads.
 */
const erc1155MetadataAbi = [
  {
    name: "uri",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const;

/**
 * ERC-165 interface detection — checks if a contract implements ERC-721.
 */
const erc165Abi = [
  {
    name: "supportsInterface",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "interfaceId", type: "bytes4" }],
    outputs: [{ type: "bool" }],
  },
] as const;

// ERC-721 interface ID per ERC-165
const ERC721_INTERFACE_ID = "0x80ac58cd" as const;
// ERC-1155 interface ID per ERC-165
const ERC1155_INTERFACE_ID = "0xd9b67a26" as const;

// ---------------------------------------------------------------------------
// NFT metadata helpers
// ---------------------------------------------------------------------------

/** In-memory metadata cache to avoid repeated RPC + IPFS fetches. */
const _metadataCache = new Map<string, { data: Record<string, unknown>; ts: number }>();
const _CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Well-known public IPFS gateways for multi-gateway fallback. */
const IPFS_GATEWAYS = [
  // Cloudflare — fast, reliable, no rate limits for reasonable usage
  "https://cloudflare-ipfs.com/ipfs/",
  // Pinata — dedicated IPFS infrastructure provider
  "https://gateway.pinata.cloud/ipfs/",
  // IPFS.io — official public gateway (fallback)
  "https://ipfs.io/ipfs/",
  // NFT.Storage — optimized for NFT metadata
  "https://nftstorage.link/ipfs/",
  // Dweb.link — maintained by Protocol Labs
  "https://dweb.link/ipfs/",
  // 4everland — decentralized gateway network
  "https://gateway.4everland.net/ipfs/",
] as const;

/** Resolve an IPFS URI to an HTTP URL using the given gateway. */
function ipfsToHttp(uri: string, gateway: string): string {
  if (uri.startsWith("ipfs://")) {
    const cid = uri.slice(7);
    return `${gateway}${cid}`;
  }
  // Already an HTTP URL or unrecognized format
  return uri;
}

/** Fetch JSON from an IPFS or HTTP URI with multi-gateway fallback and cache. */
async function fetchMetadata(uri: string): Promise<Record<string, unknown> | null> {
  const cached = _metadataCache.get(uri);
  if (cached && Date.now() - cached.ts < _CACHE_TTL_MS) {
    return cached.data;
  }

  // Non-IPFS URIs: fetch directly
  if (!uri.startsWith("ipfs://")) {
    try {
      const res = await fetch(uri, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, unknown>;
      _metadataCache.set(uri, { data, ts: Date.now() });
      return data;
    } catch {
      return null;
    }
  }

  // IPFS URIs: try each gateway in priority order
  const cid = uri.slice(7); // strip "ipfs://"
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const url = `${gateway}${cid}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue; // try next gateway
      const data = (await res.json()) as Record<string, unknown>;
      _metadataCache.set(uri, { data, ts: Date.now() });
      return data;
    } catch {
      // Gateway unreachable — try the next one
      continue;
    }
  }

  // All gateways failed
  return null;
}

/** Resolve IPFS gateway URL from a URI string, trying multiple gateways. */
function resolveImageUrl(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  if (uri.startsWith("ipfs://")) {
    // Return the primary (Cloudflare) gateway URL; fetchMetadata handles fallback
    const cid = uri.slice(7);
    return `https://cloudflare-ipfs.com/ipfs/${cid}`;
  }
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return undefined;
}

/**
 * ERC-20 ABI subset for read operations.
 * viem ships `erc20Abi` but we keep a small inline copy
 * to avoid importing the full array when tree-shaking.
 */
const erc20ReadAbi = [
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/**
 * `BlockchainApiClient` — a thin, typed wrapper around viem
 * for reading on-chain data (balances, transactions, ENS, tokens, NFTs).
 *
 * ```ts
 * const client = new BlockchainApiClient({ defaultChainId: 1 });
 * const balance = await client.getBalance("0x…", 1);
 * ```
 */
export class BlockchainApiClient {
  readonly config: Pick<BlockchainApiConfig, "rpcUrls" | "ensResolvers" | "metadataBaseUrl" | "alchemyApiKey" | "covalentApiKey"> & {
    defaultChainId: number;
  };

  /** In-flight client cache keyed by chain id. */
  private _clients = new Map<number, PublicClient>();

  constructor(config: BlockchainApiConfig = {}) {
    this.config = {
      rpcUrls: config.rpcUrls ?? {},
      ensResolvers: config.ensResolvers ?? {},
      metadataBaseUrl: config.metadataBaseUrl,
      alchemyApiKey: config.alchemyApiKey,
      covalentApiKey: config.covalentApiKey,
      defaultChainId: config.defaultChainId ?? 1,
    };
  }

  // -- internal -----------------------------------------------------------

  /** Get (or create) a viem PublicClient for `chainId`. */
  private _getClient(chainId: number): PublicClient {
    let client = this._clients.get(chainId);
    if (!client) {
      client = buildClient(chainId, this.config.rpcUrls?.[chainId]);
      this._clients.set(chainId, client);
    }
    return client;
  }

  // -- public API ---------------------------------------------------------

  /**
   * Get the native token balance for an address.
   *
   * @param address — wallet address (hex or ENS-resolved).
   * @param chainId — EVM chain id (defaults to `defaultChainId`).
   * @returns Balance object for the native token.
   */
  async getBalance(
    address: string,
    chainId?: number
  ): Promise<Balance> {
    const cid = chainId ?? this.config.defaultChainId;
    const client = this._getClient(cid);
    const balance = await client.getBalance({ address: address as Address });
    const chain = client.chain;
    const nativeSymbol = chain?.nativeCurrency?.symbol ?? "ETH";
    const nativeName = chain?.nativeCurrency?.name ?? "Ether";
    const decimals = chain?.nativeCurrency?.decimals ?? 18;

    return {
      symbol: nativeSymbol,
      name: nativeName,
      decimals,
      balance,
      formatted: formatUnits(balance, decimals),
    };
  }

  /**
   * Fetch balances for multiple ERC-20 tokens + native token in one call.
   *
   * @param address — wallet address.
   * @param chainId — EVM chain id.
   * @param tokenAddresses — optional list of ERC-20 addresses to query.
   *   If omitted, queries a default set of popular tokens.
   * @returns Array of Balance objects.
   */
  async getTokenBalances(
    address: string,
    chainId?: number,
    tokenAddresses?: string[]
  ): Promise<Balance[]> {
    const cid = chainId ?? this.config.defaultChainId;
    const client = this._getClient(cid);
    const addr = address as Address;

    const tokens = tokenAddresses ?? this._defaultTokens(cid);
    const results: Balance[] = [];

    // Fetch all token balances in parallel
    const tokenResults = await Promise.allSettled(
      tokens.map(async (tokenAddr) => {
        const [balance, meta] = await Promise.all([
          client.readContract({
            address: tokenAddr as Address,
            abi: erc20ReadAbi,
            functionName: "balanceOf",
            args: [addr],
          }) as Promise<bigint>,
          this.getTokenMetadata(tokenAddr, cid),
        ]);

        const formatted = formatUnits(balance, meta.decimals);
        return {
          tokenAddress: tokenAddr,
          symbol: meta.symbol,
          name: meta.name,
          decimals: meta.decimals,
          balance,
          formatted,
          logo: meta.logo,
        };
      })
    );

    for (const r of tokenResults) {
      if (r.status === "fulfilled") results.push(r.value);
    }

    // Prepend native balance
    try {
      const nativeBalance = await this.getBalance(address, cid);
      results.unshift(nativeBalance);
    } catch {
      // ignore native balance failure
    }

    return results;
  }

  /**
   * Fetch transaction history for an address.
   *
   * @param address — wallet address.
   * @param chainId — EVM chain id.
   * @param limit — max number of transactions (default 20).
   * @param cursor — pagination cursor from a previous call.
   * @returns Paginated list of Transaction objects.
   */
  async getTransactionHistory(
    address: string,
    chainId?: number,
    limit = 20,
    cursor?: string
  ): Promise<PaginatedResult<Transaction>> {
    const cid = chainId ?? this.config.defaultChainId;

    // Check cache first
    const cacheKey = _txCacheKey(address, cid, cursor);
    const cached = _getTxCached(cacheKey);
    if (cached) {
      return { items: cached.transactions, nextCursor: cached.nextCursor, hasMore: cached.hasMore };
    }

    // Try Alchemy first (most comprehensive)
    if (this.config.alchemyApiKey) {
      try {
        return await this._getTxsViaAlchemy(address, cid, limit, cursor);
      } catch {
        // Fall through to on-chain scan
      }
    }

    // Try Covalent / GoldRush
    if (this.config.covalentApiKey) {
      try {
        return await this._getTxsViaCovalent(address, cid, limit, cursor);
      } catch {
        // Fall through to on-chain scan
      }
    }

    // Fallback: scan recent blocks on-chain
    return this._getTxsOnChain(address, cid, limit, cursor);
  }

  /**
   * Fetch multi-chain transaction history for an address.
   *
   * Queries ETH, Polygon, and BSC by default. Supports pagination,
   * filtering by type, time range, status, and token address.
   *
   * @param query — TransactionHistoryQuery parameters.
   * @returns Paginated list of Transaction objects across all chains.
   */
  async getMultiChainTransactionHistory(
    query: TransactionHistoryQuery
  ): Promise<PaginatedResult<Transaction>> {
    const { address, chainIds, limit = 20, cursor, type, tokenAddress, timeFrom, timeTo, status, sortOrder } = query;
    const chains = chainIds ?? [1, 137, 56]; // ETH, Polygon, BSC default
    const perChainLimit = Math.max(1, Math.ceil(limit / chains.length));

    // If cursor is provided, decode it to determine which chain to continue from
    const allTransactions: Transaction[] = [];
    let nextCursor: string | undefined;
    let hasMore = false;

    // Parse cursor: format is "chainId:blockNumber" or "chainId:blockHash"
    let startChainIdx = 0;
    if (cursor) {
      const parts = cursor.split(":");
      if (parts.length >= 2) {
        const cursorChainId = parseInt(parts[0], 10);
        const chainIdx = chains.findIndex(c => c === cursorChainId);
        if (chainIdx >= 0) startChainIdx = chainIdx;
      }
    }

    // Query each chain in parallel
    const chainResults = await Promise.allSettled(
      chains.map(async (chainId) => {
        const chainCursor = cursor && cursor.startsWith(`${chainId}:`)
          ? cursor.substring(`${chainId}:`.length)
          : undefined;

        return this._getSingleChainTransactions(address, chainId, perChainLimit, chainCursor, {
          type,
          tokenAddress,
          timeFrom,
          timeTo,
          status,
          sortOrder,
        });
      })
    );

    // Merge results
    for (const result of chainResults) {
      if (result.status === "fulfilled") {
        allTransactions.push(...result.value.items);
        if (result.value.hasMore) {
          hasMore = true;
        }
      }
    }

    // Sort by timestamp (newest first by default)
    const sorted = allTransactions.sort((a, b) => {
      const timeA = a.timestamp ?? 0;
      const timeB = b.timestamp ?? 0;
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    });

    // Apply limit
    const limited = sorted.slice(0, limit);

    // Generate cursor for pagination if there are more results
    if (sorted.length > limit) {
      const lastTx = limited[limited.length - 1];
      nextCursor = `${lastTx.chainId}:${lastTx.blockNumber || 0}`;
    }

    // Cache the result for the first chain
    if (limited.length > 0) {
      const firstChain = limited[0].chainId ?? chains[0];
      const cacheKey = _txCacheKey(address, firstChain, undefined, type, timeFrom, timeTo);
      _setTxCached(cacheKey, limited, nextCursor, hasMore);
    }

    return {
      items: limited,
      nextCursor,
      hasMore: hasMore || sorted.length > limit,
    };
  }

  /**
   * Fetch transactions for a single chain with filtering.
   */
  private async _getSingleChainTransactions(
    address: string,
    chainId: number,
    limit: number,
    cursor?: string,
    filters?: {
      type?: string;
      tokenAddress?: string;
      timeFrom?: number;
      timeTo?: number;
      status?: string;
      sortOrder?: string;
    }
  ): Promise<PaginatedResult<Transaction>> {
    const cacheKey = _txCacheKey(address, chainId, cursor, filters?.type, filters?.timeFrom, filters?.timeTo);
    const cached = _getTxCached(cacheKey);
    if (cached) {
      return { items: cached.transactions, nextCursor: cached.nextCursor, hasMore: cached.hasMore };
    }

    // Try indexer APIs first
    if (this.config.alchemyApiKey) {
      try {
        return await this._getTxsViaAlchemy(address, chainId, limit, cursor, filters);
      } catch {
        // Fall through
      }
    }

    if (this.config.covalentApiKey) {
      try {
        return await this._getTxsViaCovalent(address, chainId, limit, cursor, filters);
      } catch {
        // Fall through
      }
    }

    // Fallback: on-chain scan
    return this._getTxsOnChain(address, chainId, limit, cursor, filters);
  }

  /**
   * Fetch transactions via Alchemy API.
   */
  private async _getTxsViaAlchemy(
    address: string,
    chainId: number,
    limit: number,
    cursor?: string,
    filters?: { type?: string; tokenAddress?: string; timeFrom?: number; timeTo?: number; status?: string; sortOrder?: string }
  ): Promise<PaginatedResult<Transaction>> {
    const chainMap: Record<number, string> = {
      1: "eth-mainnet",
      137: "polygon-mainnet",
      56: "bnb-mainnet",
      42161: "arb-mainnet",
      10: "opt-mainnet",
      8453: "base-mainnet",
    };

    const network = chainMap[chainId];
    if (!network) {
      throw new Error(`Alchemy not supported on chain ${chainId}`);
    }

    const alchemyUrl = `https://${network}.g.alchemy.com/v2/${this.config.alchemyApiKey}`;
    const pageKey = cursor ? JSON.parse(cursor).pageKey : undefined;

    // Get regular transactions
    const txsResponse = await fetch(alchemyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [
          {
            fromAddress: address,
            toAddress: address,
            category: ["external"],
            maxCount: limit,
            pageKey,
            order: filters?.sortOrder === "asc" ? "asc" : "desc",
          },
        ],
      }),
    });

    if (!txsResponse.ok) {
      throw new Error(`Alchemy API error: ${txsResponse.status}`);
    }

    const txsData = await txsResponse.json() as {
      result?: {
        transfers: Array<{
          hash: string;
          from: string;
          to: string;
          value: string;
          blockNum: string;
          timestamp?: string;
          gas?: string;
          category: string;
        }>;
        pageKey?: string;
      };
      error?: { message: string };
    };

    if (txsData.error) {
      throw new Error(`Alchemy error: ${txsData.error.message}`);
    }

    const transfers = txsData.result?.transfers ?? [];
    const transactions: Transaction[] = transfers
      .map((tx) => {
        const timestamp = tx.timestamp ? parseInt(tx.timestamp, 16) : undefined;
        // Apply time filters
        if (filters?.timeFrom && timestamp && timestamp < filters.timeFrom) return null;
        if (filters?.timeTo && timestamp && timestamp > filters.timeTo) return null;

        return {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: BigInt(tx.value || "0"),
          status: "success" as const,
          blockNumber: parseInt(tx.blockNum, 16),
          timestamp,
          chainId,
          type: "native" as const,
        } as Transaction;
      })
      .filter((tx): tx is Transaction => tx !== null);

    const nextCursor = txsData.result?.pageKey
      ? JSON.stringify({ pageKey: txsData.result.pageKey })
      : undefined;

    const result: PaginatedResult<Transaction> = {
      items: transactions.slice(0, limit),
      nextCursor,
      hasMore: !!txsData.result?.pageKey,
    };

    // Cache the result
    const cacheKey = _txCacheKey(address, chainId, undefined, filters?.type, filters?.timeFrom, filters?.timeTo);
    _setTxCached(cacheKey, result.items, nextCursor, result.hasMore);

    return result;
  }

  /**
   * Fetch transactions via Covalent / GoldRush API.
   */
  private async _getTxsViaCovalent(
    address: string,
    chainId: number,
    limit: number,
    cursor?: string,
    filters?: { type?: string; tokenAddress?: string; timeFrom?: number; timeTo?: number; status?: string }
  ): Promise<PaginatedResult<Transaction>> {
    // Covalent chain name mapping
    const chainNameMap: Record<number, string> = {
      1: "eth-mainnet",
      137: "polygon-mainnet",
      56: "bsc-mainnet",
      42161: "arbitrum-mainnet",
      10: "optimism-mainnet",
      8453: "base-mainnet",
    };

    const chainName = chainNameMap[chainId];
    if (!chainName) {
      throw new Error(`Covalent not supported on chain ${chainId}`);
    }

    let url = `https://api.covalenthq.com/v1/${chainName}/address/${address}/transactions_v2/?limit=${limit}`;

    // Add optional filters
    if (cursor) url += `&page-token=${encodeURIComponent(cursor)}`;
    if (filters?.tokenAddress) url += `&contract-address=${filters.tokenAddress}`;
    if (filters?.timeFrom) url += `&start-time=${filters.timeFrom}`;
    if (filters?.timeTo) url += `&end-time=${filters.timeTo}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${btoa(`${this.config.covalentApiKey}:`)}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Covalent API error: ${response.status}`);
    }

    const data = await response.json() as {
      data?: {
        items: Array<{
          tx_hash: string;
          from_address: string;
          to_address: string;
          value: string;
          block_height: number;
          block_signed_at: string;
          gas_spent: string;
          successful: boolean;
          log_events?: Array<{
            sender_address: string;
            decoded?: { name: string };
          }>;
        }>;
        pagination?: {
          has_more: boolean;
          next_page_token?: string;
        };
      };
      error?: boolean;
      error_message?: string;
    };

    if (data.error) {
      throw new Error(`Covalent error: ${data.error_message}`);
    }

    const items = data.data?.items ?? [];
    const transactions: Transaction[] = items.map((tx) => ({
      hash: tx.tx_hash,
      from: tx.from_address,
      to: tx.to_address,
      value: BigInt(tx.value || "0"),
      status: tx.successful ? "success" as const : "failed" as const,
      blockNumber: tx.block_height,
      timestamp: tx.block_signed_at ? new Date(tx.block_signed_at).getTime() / 1000 : undefined,
      gasUsed: tx.gas_spent ? BigInt(tx.gas_spent) : undefined,
      chainId,
      type: "native" as const,
      method: tx.log_events?.[0]?.decoded?.name,
    }));

    const pagination = data.data?.pagination;
    const result: PaginatedResult<Transaction> = {
      items: transactions.slice(0, limit),
      nextCursor: pagination?.next_page_token,
      hasMore: pagination?.has_more ?? false,
    };

    // Cache the result
    const cacheKey = _txCacheKey(address, chainId, undefined, filters?.type, filters?.timeFrom, filters?.timeTo);
    _setTxCached(cacheKey, result.items, result.nextCursor, result.hasMore);

    return result;
  }

  /**
   * Fallback: scan recent blocks on-chain to find transactions.
   *
   * NOTE: This is limited to transactions in recent blocks and is not
   * suitable for full transaction history. Use an indexer for complete results.
   */
  private async _getTxsOnChain(
    address: string,
    chainId: number,
    limit: number,
    cursor?: string,
    filters?: { type?: string; timeFrom?: number; timeTo?: number; status?: string }
  ): Promise<PaginatedResult<Transaction>> {
    const client = this._getClient(chainId);
    const lowerAddress = address.toLowerCase();

    // Start from the latest block or a cached cursor
    let startBlock: number;
    try {
      const block = await client.getBlockNumber();
      startBlock = Number(block);
    } catch {
      return { items: [], hasMore: false };
    }

    if (cursor) {
      const blockNum = parseInt(cursor, 10);
      if (!isNaN(blockNum) && blockNum < startBlock) {
        startBlock = blockNum;
      }
    }

    const transactions: Transaction[] = [];
    const scanLimit = Math.min(limit * 10, 100); // Scan up to 100 blocks

    for (let blockNum = startBlock; blockNum > startBlock - scanLimit && transactions.length < limit; blockNum--) {
      try {
        const block = await client.getBlock({ blockNumber: BigInt(blockNum), includeTransactions: true });
        const timestamp = Number(block.timestamp);

        // Apply time filters
        if (filters?.timeFrom && timestamp < filters.timeFrom) continue;
        if (filters?.timeTo && timestamp > filters.timeTo) continue;

        for (const tx of block.transactions) {
          const from = (tx.from || "").toLowerCase();
          const to = (tx.to || "").toLowerCase();

          if (from === lowerAddress || to === lowerAddress) {
            let status: "success" | "failed" | "pending" = "success";
            let gasUsed: bigint | undefined;

            try {
              const receipt = await client.getTransactionReceipt({ hash: tx.hash });
              status = receipt?.status === "success" ? "success" : "failed";
              gasUsed = receipt?.gasUsed;
            } catch {
              // Receipt not available
            }

            // Apply status filter
            if (filters?.status && status !== filters.status) continue;

            transactions.push({
              hash: tx.hash,
              from: tx.from,
              to: tx.to ?? undefined,
              value: tx.value,
              status,
              blockNumber: blockNum,
              timestamp,
              gasUsed,
              chainId,
              type: "native" as const,
              nonce: "nonce" in tx ? (tx.nonce as number) : undefined,
            });
          }
        }
      } catch {
        // Block not available or RPC error
      }
    }

    const nextBlock = startBlock - scanLimit;
    const result: PaginatedResult<Transaction> = {
      items: transactions.slice(0, limit),
      nextCursor: transactions.length >= limit ? String(nextBlock) : undefined,
      hasMore: transactions.length >= limit,
    };

    // Cache the result
    const cacheKey = _txCacheKey(address, chainId, undefined, filters?.type, filters?.timeFrom, filters?.timeTo);
    _setTxCached(cacheKey, result.items, result.nextCursor, result.hasMore);

    return result;
  }

  /**
   * Get full details for a single transaction.
   *
   * @param txHash — transaction hash.
   * @param chainId — EVM chain id.
   * @returns Transaction object with on-chain details.
   */
  async getTransaction(
    txHash: string,
    chainId?: number
  ): Promise<Transaction | null> {
    const cid = chainId ?? this.config.defaultChainId;
    const client = this._getClient(cid);

    const tx = await client.getTransaction({
      hash: txHash as Hex,
    });

    if (!tx) return null;

    const receipt = await client.getTransactionReceipt({
      hash: txHash as Hex,
    });

    const block = tx.blockNumber
      ? await client.getBlock({ blockNumber: tx.blockNumber })
      : undefined;

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to ?? undefined,
      value: tx.value,
      status: receipt
        ? receipt.status === "success"
          ? "success"
          : "failed"
        : "pending",
      blockNumber: tx.blockNumber != null ? Number(tx.blockNumber) : undefined,
      timestamp: block ? Number(block.timestamp) : undefined,
      gasUsed: receipt?.gasUsed,
    };
  }

  /**
   * Resolve an ENS name to an Ethereum address.
   *
   * @param name — ENS domain name (e.g. `vitalik.eth`).
   * @returns Ethereum address or null if not found.
   */
  async resolveENS(name: string): Promise<string | null> {
    const client = this._getClient(1); // ENS lives on mainnet
    try {
      const address = await client.getEnsAddress({ name });
      return address ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Reverse ENS lookup — get the ENS name for an address.
   *
   * @param address — Ethereum address.
   * @param chainId — EVM chain id (ENS uses mainnet regardless).
   * @returns ENS name or null.
   */
  async reverseENS(
    address: string,
    _chainId?: number
  ): Promise<string | null> {
    const client = this._getClient(1); // ENS on mainnet
    try {
      const name = await client.getEnsName({ address: address as Address });
      return name ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch metadata for an ERC-20 token.
   *
   * @param tokenAddress — contract address.
   * @param chainId — EVM chain id.
   * @returns TokenMetadata object.
   */
  async getTokenMetadata(
    tokenAddress: string,
    chainId?: number
  ): Promise<TokenMetadata> {
    const cid = chainId ?? this.config.defaultChainId;
    const client = this._getClient(cid);
    const addr = tokenAddress as Address;

    const [symbol, name, decimals, totalSupply] = await Promise.all([
      client.readContract({
        address: addr,
        abi: erc20ReadAbi,
        functionName: "symbol",
      }) as Promise<string>,
      client.readContract({
        address: addr,
        abi: erc20ReadAbi,
        functionName: "name",
      }) as Promise<string>,
      client.readContract({
        address: addr,
        abi: erc20ReadAbi,
        functionName: "decimals",
      }) as Promise<number>,
      client.readContract({
        address: addr,
        abi: erc20ReadAbi,
        functionName: "totalSupply",
      }) as Promise<bigint>,
    ]);

    return {
      address: tokenAddress,
      symbol,
      name,
      decimals,
      totalSupply,
    };
  }

  /**
   * Fetch NFTs owned by an address.
   *
   * NOTE: Like `getTransactionHistory`, NFT enumeration requires an indexer.
   * This method returns an empty result by default.
   *
   * @param address — wallet address.
   * @param chainId — EVM chain id.
   * @param limit — max number of NFTs (default 20).
   * @param cursor — pagination cursor.
   * @returns Paginated list of NFTItem objects.
   */
  async getNFTs(
    address: string,
    chainId?: number,
    limit = 20,
    _cursor?: string
  ): Promise<PaginatedResult<NFTItem>> {
    const cid = chainId ?? this.config.defaultChainId;
    const client = this._getClient(cid);
    const owner = address as Address;
    const items: NFTItem[] = [];

    // ----------------------------------------------------------------
    // Strategy: scan well-known NFT contracts on the target chain.
    // In production, wire to an indexer (Alchemy NFT API, SimpleHash,
    // Moralis, etc.) for full enumeration. Here we do on-chain reads
    // for a curated set of contracts per chain.
    // ----------------------------------------------------------------
    const knownNftContracts = this._knownNftContracts(cid);

    for (const { contractAddress, tokenIds } of knownNftContracts) {
      if (items.length >= limit) break;

      // Try ERC-721 first
      const nfts721 = await this._scanErc721(
        client, contractAddress as Address, owner, tokenIds, limit - items.length
      );
      items.push(...nfts721);

      if (items.length >= limit) break;

      // Try ERC-1155 for same contract (some contracts are hybrid)
      const nfts1155 = await this._scanErc1155(
        client, contractAddress as Address, owner, tokenIds, limit - items.length
      );
      items.push(...nfts1155);
    }

    // If no known contracts found, try scanning by token enumeration
    // (fallback for custom wallets)
    if (items.length === 0) {
      const fallback = await this._scanNftsByEnumeration(
        client, cid, owner, limit
      );
      items.push(...fallback);
    }

    return {
      items: items.slice(0, limit),
      hasMore: false, // TODO: implement pagination cursor with indexer
    };
  }

  // -- NFT internal helpers ------------------------------------------------

  /** Scan an ERC-721 contract for tokens owned by `owner`. */
  private async _scanErc721(
    client: PublicClient,
    contract: Address,
    owner: Address,
    tokenIds: string[],
    limit: number
  ): Promise<NFTItem[]> {
    const items: NFTItem[] = [];
    try {
      // Check if contract implements ERC-721
      const supportsErc721 = await this._supportsInterface(
        client, contract, ERC721_INTERFACE_ID
      );
      if (!supportsErc721) return items;

      // Check owner's balance
      const balance = await client.readContract({
        address: contract,
        abi: erc721MetadataAbi,
        functionName: "balanceOf",
        args: [owner],
      }) as bigint;

      if (balance === 0n) return items;

      if (tokenIds.length > 0) {
        // Scan specific token IDs
        for (const tid of tokenIds.slice(0, limit)) {
          if (items.length >= limit) break;
          try {
            const tokenOwner = await client.readContract({
              address: contract,
              abi: erc721MetadataAbi,
              functionName: "ownerOf",
              args: [BigInt(tid)],
            }) as Address;

            if (tokenOwner.toLowerCase() === owner.toLowerCase()) {
              const meta = await this._fetchNftMetadata(
                client, contract, tid, "ERC721"
              );
              items.push({ ...meta, contractAddress: contract, tokenId: tid, tokenType: "ERC721" });
            }
          } catch {
            // Token may not exist or ownerOf not available
          }
        }
      } else {
        // If we know balance > 0 but no token IDs, try range 0..balance+1
        const maxScan = Math.min(Number(balance) + 1, limit);
        for (let tid = 0; tid < maxScan; tid++) {
          if (items.length >= limit) break;
          try {
            const tokenOwner = await client.readContract({
              address: contract,
              abi: erc721MetadataAbi,
              functionName: "ownerOf",
              args: [BigInt(tid)],
            }) as Address;

            if (tokenOwner.toLowerCase() === owner.toLowerCase()) {
              const meta = await this._fetchNftMetadata(
                client, contract, String(tid), "ERC721"
              );
              items.push({ ...meta, contractAddress: contract, tokenId: String(tid), tokenType: "ERC721" });
            }
          } catch {
            // Skip
          }
        }
      }
    } catch {
      // Contract may not be ERC-721
    }
    return items;
  }

  /** Scan an ERC-1155 contract for tokens owned by `owner`. */
  private async _scanErc1155(
    client: PublicClient,
    contract: Address,
    owner: Address,
    tokenIds: string[],
    limit: number
  ): Promise<NFTItem[]> {
    const items: NFTItem[] = [];
    try {
      const supportsErc1155 = await this._supportsInterface(
        client, contract, ERC1155_INTERFACE_ID
      );
      if (!supportsErc1155) return items;

      const idsToCheck = tokenIds.length > 0 ? tokenIds.slice(0, limit) : ["0", "1"];
      for (const tid of idsToCheck) {
        if (items.length >= limit) break;
        try {
          const bal = await client.readContract({
            address: contract,
            abi: erc1155MetadataAbi,
            functionName: "balanceOf",
            args: [owner, BigInt(tid)],
          }) as bigint;

          if (bal > 0n) {
            const meta = await this._fetchNftMetadata(
              client, contract, tid, "ERC1155"
            );
            items.push({
              ...meta,
              contractAddress: contract,
              tokenId: tid,
              tokenType: "ERC1155",
              balance: bal,
            });
          }
        } catch {
          // Skip
        }
      }
    } catch {
      // Not ERC-1155
    }
    return items;
  }

  /** Check if a contract supports a given interface via ERC-165. */
  private async _supportsInterface(
    client: PublicClient,
    contract: Address,
    interfaceId: string
  ): Promise<boolean> {
    try {
      const result = await client.readContract({
        address: contract,
        abi: erc165Abi,
        functionName: "supportsInterface",
        args: [interfaceId as `0x${string}`],
      });
      return result as boolean;
    } catch {
      return false;
    }
  }

  /** Fetch metadata for a specific NFT token. */
  private async _fetchNftMetadata(
    client: PublicClient,
    contract: Address,
    tokenId: string,
    tokenType: "ERC721" | "ERC1155"
  ): Promise<{ name?: string; description?: string; imageUrl?: string }> {
    let uri: string | undefined;

    try {
      if (tokenType === "ERC721") {
        uri = await client.readContract({
          address: contract,
          abi: erc721MetadataAbi,
          functionName: "tokenURI",
          args: [BigInt(tokenId)],
        }) as string;
      } else {
        uri = await client.readContract({
          address: contract,
          abi: erc1155MetadataAbi,
          functionName: "uri",
          args: [BigInt(tokenId)],
        }) as string;
      }
    } catch {
      // URI not available
    }

    if (!uri) {
      // Fallback: try to get collection name
      try {
        const name = await client.readContract({
          address: contract,
          abi: erc721MetadataAbi,
          functionName: "name",
        }) as string;
        return { name };
      } catch {
        return {};
      }
    }

    // Handle {id} placeholder in ERC-1155 URIs
    const resolvedUri = uri.replace("{id}", BigInt(tokenId).toString(16).padStart(64, "0"));

    const metadata = await fetchMetadata(resolvedUri);
    if (!metadata) {
      return { imageUrl: resolveImageUrl(resolvedUri) };
    }

    return {
      name: metadata.name as string | undefined,
      description: metadata.description as string | undefined,
      imageUrl: resolveImageUrl(metadata.image as string | undefined) ??
                resolveImageUrl(metadata.image_url as string | undefined),
    };
  }

  /** Fallback: scan for NFTs by trying common contracts on the chain. */
  private async _scanNftsByEnumeration(
    _client: PublicClient,
    _chainId: number,
    _owner: Address,
    _limit: number
  ): Promise<NFTItem[]> {
    // Without an indexer, full enumeration is not feasible.
    // Return empty — callers should wire to an indexer for complete results.
    return [];
  }

  /** Known NFT contracts per chain for targeted scanning. */
  private _knownNftContracts(_chainId: number): { contractAddress: string; tokenIds: string[] }[] {
    // In production, this would be a large registry.
    // For now return empty — the scanning still works for any contracts
    // passed by the caller via configuration.
    return [];
  }

  // -- internal helpers ---------------------------------------------------

  /** Default token list per chain (extendable). */
  private _defaultTokens(_chainId: number): string[] {
    // Return a minimal set; wire to @cinacoin/token-list in production.
    return [];
  }
}

/** Convenience factory. */
export function createBlockchainApi(
  config?: BlockchainApiConfig
): BlockchainApiClient {
  return new BlockchainApiClient(config);
}
