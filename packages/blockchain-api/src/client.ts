import {
  createPublicClient,
  http,
  type Address,
  type Hex,
  type PublicClient,
  formatUnits,
} from "viem";
import { mainnet, type Chain } from "viem/chains";
import type {
  Balance,
  BlockchainApiConfig,
  NFTItem,
  PaginatedResult,
  TokenMetadata,
  Transaction,
} from "./types.js";

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
  // Add more as the monopoly's core-sdk exposes them.
};

const _ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as const;
const _ENS_RESOLVER = "0x233389C23a0E6A03b62944849c3E6b29A1D7f62E" as const; // ENS Universal Resolver

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
  readonly config: Required<Omit<BlockchainApiConfig, "metadataBaseUrl">> &
    Pick<BlockchainApiConfig, "metadataBaseUrl">;

  /** In-flight client cache keyed by chain id. */
  private _clients = new Map<number, PublicClient>();

  constructor(config: BlockchainApiConfig = {}) {
    this.config = {
      rpcUrls: config.rpcUrls ?? {},
      ensResolvers: config.ensResolvers ?? {},
      metadataBaseUrl: config.metadataBaseUrl,
      defaultChainId: config.defaultChainId ?? 1,
    };
  }

  // -- internal -----------------------------------------------------------

  /** Get (or create) a viem PublicClient for `chainId`. */
  private _getClient(chainId: number): PublicClient {
    let client = this._clients.get(chainId);
    if (!client) {
      client = buildClient(chainId, this.config.rpcUrls[chainId]);
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
   * NOTE: Raw transaction enumeration from a public RPC is not natively
   * supported by viem / standard JSON-RPC. This method returns an empty
   * result by default; wire it to an indexer (Alchemy, Covalent, TheGraph)
   * in production.
   *
   * @param address — wallet address.
   * @param chainId — EVM chain id.
   * @param limit — max number of transactions (default 20).
   * @param cursor — pagination cursor from a previous call.
   * @returns Paginated list of Transaction objects.
   */
  async getTransactionHistory(
    _address: string,
    _chainId?: number,
    limit = 20,
    _cursor?: string
  ): Promise<PaginatedResult<Transaction>> {
    // TODO: Connect to an indexer API (Alchemy / Covalent / TheGraph)
    // Example: const res = await fetch(`${this.config.metadataBaseUrl}/txs?…`)
    return {
      items: [],
      hasMore: false,
    };
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
      blockNumber: tx.blockNumber ?? undefined,
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
    _address: string,
    _chainId?: number,
    _limit = 20,
    _cursor?: string
  ): Promise<PaginatedResult<NFTItem>> {
    // TODO: Connect to an NFT indexer (Alchemy, SimpleHash, etc.)
    return {
      items: [],
      hasMore: false,
    };
  }

  // -- internal helpers ---------------------------------------------------

  /** Default token list per chain (extendable). */
  private _defaultTokens(_chainId: number): string[] {
    // Return a minimal set; wire to @cinaconnect/token-list in production.
    return [];
  }
}

/** Convenience factory. */
export function createBlockchainApi(
  config?: BlockchainApiConfig
): BlockchainApiClient {
  return new BlockchainApiClient(config);
}
