/**
 * ENS Resolver — Core implementation
 * Supports name resolution, reverse lookup, avatar retrieval, and text record fetching.
 * Multi-chain: Ethereum mainnet, Arbitrum, Optimism, Polygon, Base, Sepolia.
 */
import { type Address } from "viem";
import type { ENSProfile, ENSResolverConfig } from "./types.js";
export declare class ENSResolver {
    private readonly config;
    private readonly cache;
    private readonly clients;
    constructor(config?: ENSResolverConfig);
    private getClient;
    private cacheKey;
    private getFromCache;
    private setCache;
    clearCache(): void;
    private getResolverForNode;
    /**
     * Resolve an ENS name to an Ethereum address.
     */
    resolveName(name: string, chainId?: number): Promise<Address | null>;
    /**
     * Perform a reverse lookup: address → ENS name.
     */
    reverseLookup(address: string, chainId?: number): Promise<string | null>;
    /**
     * Get the avatar (profile image) URL for an ENS name.
     */
    getAvatar(nameOrAddress: string, chainId?: number): Promise<string | null>;
    /**
     * Get a text record value for an ENS name.
     */
    getText(name: string, key: string, chainId?: number): Promise<string | null>;
    /**
     * Get the full ENS profile for a name or address.
     */
    getProfile(nameOrAddress: string, chainId?: number): Promise<ENSProfile>;
    /**
     * Resolve a name with batch fetching for multiple text records.
     */
    resolveWithRecords(name: string, keys: string[], chainId?: number): Promise<{
        address: Address | null;
        records: Record<string, string>;
    }>;
}
export declare function createENSResolver(config?: ENSResolverConfig): ENSResolver;
export declare function resolveENSName(name: string, rpcUrl?: string, chainId?: number): Promise<Address | null>;
export declare function reverseLookupENS(address: string, rpcUrl?: string, chainId?: number): Promise<string | null>;
export declare function getAvatarENS(nameOrAddress: string, rpcUrl?: string, chainId?: number): Promise<string | null>;
//# sourceMappingURL=ens.d.ts.map