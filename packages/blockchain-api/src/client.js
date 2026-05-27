import { createPublicClient, http, formatUnits, } from "viem";
import { mainnet } from "viem/chains";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Build a viem PublicClient for a given chain id. */
function buildClient(chainId, rpcUrl) {
    const chain = Object.values(chainsByChainId).find((c) => c.id === chainId);
    return createPublicClient({
        chain: chain ?? { id: chainId, name: `Chain ${chainId}` },
        transport: http(rpcUrl),
    });
}
/** Minimal chain registry for quick lookup. Extend as needed. */
const chainsByChainId = {
    1: mainnet,
    // Add more as the monopoly's core-sdk exposes them.
};
const _ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const _ENS_RESOLVER = "0x233389C23a0E6A03b62944849c3E6b29A1D7f62E"; // ENS Universal Resolver
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
];
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
    constructor(config = {}) {
        /** In-flight client cache keyed by chain id. */
        this._clients = new Map();
        this.config = {
            rpcUrls: config.rpcUrls ?? {},
            ensResolvers: config.ensResolvers ?? {},
            metadataBaseUrl: config.metadataBaseUrl,
            defaultChainId: config.defaultChainId ?? 1,
        };
    }
    // -- internal -----------------------------------------------------------
    /** Get (or create) a viem PublicClient for `chainId`. */
    _getClient(chainId) {
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
    async getBalance(address, chainId) {
        const cid = chainId ?? this.config.defaultChainId;
        const client = this._getClient(cid);
        const balance = await client.getBalance({ address: address });
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
    async getTokenBalances(address, chainId, tokenAddresses) {
        const cid = chainId ?? this.config.defaultChainId;
        const client = this._getClient(cid);
        const addr = address;
        const tokens = tokenAddresses ?? this._defaultTokens(cid);
        const results = [];
        // Fetch all token balances in parallel
        const tokenResults = await Promise.allSettled(tokens.map(async (tokenAddr) => {
            const [balance, meta] = await Promise.all([
                client.readContract({
                    address: tokenAddr,
                    abi: erc20ReadAbi,
                    functionName: "balanceOf",
                    args: [addr],
                }),
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
        }));
        for (const r of tokenResults) {
            if (r.status === "fulfilled")
                results.push(r.value);
        }
        // Prepend native balance
        try {
            const nativeBalance = await this.getBalance(address, cid);
            results.unshift(nativeBalance);
        }
        catch {
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
    async getTransactionHistory(_address, _chainId, limit = 20, _cursor) {
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
    async getTransaction(txHash, chainId) {
        const cid = chainId ?? this.config.defaultChainId;
        const client = this._getClient(cid);
        const tx = await client.getTransaction({
            hash: txHash,
        });
        if (!tx)
            return null;
        const receipt = await client.getTransactionReceipt({
            hash: txHash,
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
    async resolveENS(name) {
        const client = this._getClient(1); // ENS lives on mainnet
        try {
            const address = await client.getEnsAddress({ name });
            return address ?? null;
        }
        catch {
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
    async reverseENS(address, _chainId) {
        const client = this._getClient(1); // ENS on mainnet
        try {
            const name = await client.getEnsName({ address: address });
            return name ?? null;
        }
        catch {
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
    async getTokenMetadata(tokenAddress, chainId) {
        const cid = chainId ?? this.config.defaultChainId;
        const client = this._getClient(cid);
        const addr = tokenAddress;
        const [symbol, name, decimals, totalSupply] = await Promise.all([
            client.readContract({
                address: addr,
                abi: erc20ReadAbi,
                functionName: "symbol",
            }),
            client.readContract({
                address: addr,
                abi: erc20ReadAbi,
                functionName: "name",
            }),
            client.readContract({
                address: addr,
                abi: erc20ReadAbi,
                functionName: "decimals",
            }),
            client.readContract({
                address: addr,
                abi: erc20ReadAbi,
                functionName: "totalSupply",
            }),
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
    async getNFTs(_address, _chainId, _limit = 20, _cursor) {
        // TODO: Connect to an NFT indexer (Alchemy, SimpleHash, etc.)
        return {
            items: [],
            hasMore: false,
        };
    }
    // -- internal helpers ---------------------------------------------------
    /** Default token list per chain (extendable). */
    _defaultTokens(_chainId) {
        // Return a minimal set; wire to @cinacoin/token-list in production.
        return [];
    }
}
/** Convenience factory. */
export function createBlockchainApi(config) {
    return new BlockchainApiClient(config);
}
//# sourceMappingURL=client.js.map