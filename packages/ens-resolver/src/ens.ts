/**
 * ENS Resolver — Core implementation
 * Supports name resolution, reverse lookup, avatar retrieval, and text record fetching.
 * Multi-chain: Ethereum mainnet, Arbitrum, Optimism, Polygon, Base, Sepolia.
 */

import {
  createPublicClient,
  http,
  type Address,
  type Chain,
  type PublicClient,
  namehash,
} from "viem";
import {
  mainnet,
  arbitrum,
  optimism,
  polygon,
  base,
  sepolia,
} from "viem/chains";

import type {
  ENSProfile,
  ENSResolverConfig,
  CacheEntry,
  ENSContracts,
  ENSErrorCode,
} from "./types.js.js";
import {
  ENS_CHAIN_CONFIG,
  ENS_ERRORS,
  ENSResolverError,
} from "./types.js.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_CACHE_ENTRIES = 1000;
const ENS_NAME_REGEX = /^[a-z0-9-]+\.[a-z]+(\.[a-z]+)*$/;
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

// ABI fragments
const ENS_REGISTRY_ABI = [
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "resolver",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ENS_RESOLVER_ABI = [
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "addr",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    name: "text",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const SUPPORTED_CHAIN_IDS = [1, 11155111, 10, 137, 8453, 42161] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getChain(chainId: number): Chain {
  const chainMap: Record<number, Chain> = {
    1: mainnet,
    11155111: sepolia,
    10: optimism,
    137: polygon,
    8453: base,
    42161: arbitrum,
  };
  return chainMap[chainId];
}

function isValidENSName(name: string): boolean {
  return ENS_NAME_REGEX.test(name);
}

function isValidAddress(address: string): boolean {
  return ETH_ADDRESS_REGEX.test(address);
}

function makeReverseNode(address: Address): `0x${string}` {
  const addr = address.toLowerCase().replace("0x", "");
  return namehash(`${addr}.addr.reverse`);
}

function isZeroAddress(addr: string): boolean {
  return addr === "0x0000000000000000000000000000000000000000";
}

function resolveChainId(chainId: number | undefined, defaultChainId: number): number {
  const cid = chainId ?? defaultChainId;
  return SUPPORTED_CHAIN_IDS.includes(cid as typeof SUPPORTED_CHAIN_IDS[number]) ? cid : defaultChainId;
}

function getChainConfig(chainId: number): ENSContracts {
  return ENS_CHAIN_CONFIG[chainId as keyof typeof ENS_CHAIN_CONFIG];
}

// ---------------------------------------------------------------------------
// ENSResolver class
// ---------------------------------------------------------------------------

export class ENSResolver {
  private readonly config: Required<ENSResolverConfig>;
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly clients: Map<number, PublicClient> = new Map();

  constructor(config: ENSResolverConfig = {}) {
    this.config = {
      rpcUrl: config.rpcUrl ?? "",
      cacheTtlMs: config.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS,
      maxCacheEntries: config.maxCacheEntries ?? DEFAULT_MAX_CACHE_ENTRIES,
      chainId: config.chainId ?? 1,
    };
  }

  // -- Client management --

  private getClient(chainId?: number): PublicClient {
    const cid = resolveChainId(chainId, this.config.chainId);
    const cached = this.clients.get(cid);
    if (cached) return cached;

    const chain = getChain(cid);
    const client = createPublicClient({
      chain,
      transport: http(this.config.rpcUrl || undefined),
    });
    this.clients.set(cid, client);
    return client;
  }

  // -- Cache management --

  private cacheKey(method: string, args: unknown[]): string {
    return `${method}:${JSON.stringify(args)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > (entry.expiresAt as number)) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  private setCache<T>(key: string, value: T): void {
    if (this.cache.size >= this.config.maxCacheEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.config.cacheTtlMs,
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

  // -- Internal: get resolver for a node --

  private async getResolverForNode(
    node: `0x${string}`,
    chainId?: number
  ): Promise<Address | null> {
    const cid = resolveChainId(chainId, this.config.chainId);
    const client = this.getClient(cid);
    const config = getChainConfig(cid);
    const registryAddr = config.registry as Address;

    const resolverAddress = await client.readContract({
      address: registryAddr,
      abi: ENS_REGISTRY_ABI,
      functionName: "resolver",
      args: [node],
    });

    if (!resolverAddress || isZeroAddress(resolverAddress as string)) {
      return null;
    }
    return resolverAddress as Address;
  }

  // -- Core methods --

  /**
   * Resolve an ENS name to an Ethereum address.
   */
  async resolveName(name: string, chainId?: number): Promise<Address | null> {
    if (!isValidENSName(name)) {
      throw new ENSResolverError(
        ENS_ERRORS.INVALID_NAME,
        `Invalid ENS name: ${name}`
      );
    }

    const cacheKey = this.cacheKey("resolveName", [name, chainId]);
    const cached = this.getFromCache<Address>(cacheKey);
    if (cached !== null) return cached;

    try {
      const cid = resolveChainId(chainId, this.config.chainId);
      const node = namehash(name);
      const resolverAddress = await this.getResolverForNode(node, cid);

      if (!resolverAddress) {
        this.setCache(cacheKey, null);
        return null;
      }

      const client = this.getClient(cid);
      const address = await client.readContract({
        address: resolverAddress,
        abi: ENS_RESOLVER_ABI,
        functionName: "addr",
        args: [node],
      });

      const result = (address as Address) || null;
      this.setCache(cacheKey, result);
      return result;
    } catch (err: unknown) {
      throw new ENSResolverError(
        ENS_ERRORS.RESOLVE_FAILED,
        `Failed to resolve name: ${name}`,
        err
      );
    }
  }

  /**
   * Perform a reverse lookup: address → ENS name.
   */
  async reverseLookup(address: string, chainId?: number): Promise<string | null> {
    if (!isValidAddress(address)) {
      throw new ENSResolverError(
        ENS_ERRORS.INVALID_ADDRESS,
        `Invalid Ethereum address: ${address}`
      );
    }

    const normalized = address.toLowerCase() as Address;
    const cacheKey = this.cacheKey("reverseLookup", [normalized, chainId]);
    const cached = this.getFromCache<string>(cacheKey);
    if (cached !== null) return cached;

    try {
      const cid = resolveChainId(chainId, this.config.chainId);
      const client = this.getClient(cid);
      const node = makeReverseNode(normalized);
      const resolverAddress = await this.getResolverForNode(node, cid);

      if (!resolverAddress) {
        this.setCache(cacheKey, null);
        return null;
      }

      const name = await client.readContract({
        address: resolverAddress,
        abi: ENS_RESOLVER_ABI,
        functionName: "name",
        args: [node],
      });

      const result = (name as string) || null;

      // Verify forward resolution matches (anti-spoofing)
      if (result && isValidENSName(result)) {
        try {
          const forwardAddr = await this.resolveName(result, chainId);
          if (forwardAddr?.toLowerCase() !== normalized) {
            this.setCache(cacheKey, null);
            return null;
          }
        } catch {
          // Forward resolution failed — still return the name
        }
      }

      this.setCache(cacheKey, result);
      return result;
    } catch (err: unknown) {
      throw new ENSResolverError(
        ENS_ERRORS.LOOKUP_FAILED,
        `Failed to reverse lookup: ${address}`,
        err
      );
    }
  }

  /**
   * Get the avatar (profile image) URL for an ENS name.
   */
  async getAvatar(nameOrAddress: string, chainId?: number): Promise<string | null> {
    let node: `0x${string}`;
    if (isValidENSName(nameOrAddress)) {
      node = namehash(nameOrAddress);
    } else if (isValidAddress(nameOrAddress)) {
      const name = await this.reverseLookup(nameOrAddress, chainId);
      if (!name) return null;
      node = namehash(name);
    } else {
      return null;
    }

    const cacheKey = this.cacheKey("getAvatar", [nameOrAddress, chainId]);
    const cached = this.getFromCache<string>(cacheKey);
    if (cached !== null) return cached;

    try {
      const cid = resolveChainId(chainId, this.config.chainId);
      const resolverAddress = await this.getResolverForNode(node, cid);

      if (!resolverAddress) {
        this.setCache(cacheKey, null);
        return null;
      }

      const client = this.getClient(cid);
      const avatar = await client.readContract({
        address: resolverAddress,
        abi: ENS_RESOLVER_ABI,
        functionName: "text",
        args: [node, "avatar"],
      });

      const result = (avatar as string) || null;
      this.setCache(cacheKey, result);
      return result;
    } catch (err: unknown) {
      throw new ENSResolverError(
        ENS_ERRORS.AVATAR_NOT_FOUND,
        `Failed to get avatar for: ${nameOrAddress}`,
        err
      );
    }
  }

  /**
   * Get a text record value for an ENS name.
   */
  async getText(name: string, key: string, chainId?: number): Promise<string | null> {
    if (!isValidENSName(name)) {
      throw new ENSResolverError(
        ENS_ERRORS.INVALID_NAME,
        `Invalid ENS name: ${name}`
      );
    }

    const cacheKey = this.cacheKey("getText", [name, key, chainId]);
    const cached = this.getFromCache<string>(cacheKey);
    if (cached !== null) return cached;

    try {
      const cid = resolveChainId(chainId, this.config.chainId);
      const node = namehash(name);
      const resolverAddress = await this.getResolverForNode(node, cid);

      if (!resolverAddress) {
        this.setCache(cacheKey, null);
        return null;
      }

      const client = this.getClient(cid);
      const value = await client.readContract({
        address: resolverAddress,
        abi: ENS_RESOLVER_ABI,
        functionName: "text",
        args: [node, key],
      });

      const result = (value as string) || null;
      this.setCache(cacheKey, result);
      return result;
    } catch (err: unknown) {
      throw new ENSResolverError(
        ENS_ERRORS.RESOLVE_FAILED,
        `Failed to get text record "${key}" for: ${name}`,
        err
      );
    }
  }

  /**
   * Get the full ENS profile for a name or address.
   */
  async getProfile(nameOrAddress: string, chainId?: number): Promise<ENSProfile> {
    const profile: ENSProfile = {
      address: null,
      name: null,
      avatar: null,
      url: null,
      description: null,
      email: null,
      github: null,
      twitter: null,
      discord: null,
      records: [],
    };

    let ensName: string | null = null;
    let address: string | null = null;

    if (isValidENSName(nameOrAddress)) {
      ensName = nameOrAddress;
      address = await this.resolveName(nameOrAddress, chainId);
    } else if (isValidAddress(nameOrAddress)) {
      address = nameOrAddress.toLowerCase();
      ensName = await this.reverseLookup(nameOrAddress, chainId);
    }

    profile.address = address;
    profile.name = ensName;

    if (ensName) {
      const [avatar, url, description, email, github, twitter, discord] =
        await Promise.allSettled([
          this.getText(ensName, "avatar", chainId),
          this.getText(ensName, "url", chainId),
          this.getText(ensName, "description", chainId),
          this.getText(ensName, "email", chainId),
          this.getText(ensName, "com.github", chainId),
          this.getText(ensName, "com.twitter", chainId),
          this.getText(ensName, "com.discord", chainId),
        ]);

      profile.avatar = avatar.status === "fulfilled" ? avatar.value : null;
      profile.url = url.status === "fulfilled" ? url.value : null;
      profile.description =
        description.status === "fulfilled" ? description.value : null;
      profile.email = email.status === "fulfilled" ? email.value : null;
      profile.github = github.status === "fulfilled" ? github.value : null;
      profile.twitter = twitter.status === "fulfilled" ? twitter.value : null;
      profile.discord = discord.status === "fulfilled" ? discord.value : null;

      profile.records = [
        { key: "avatar", value: profile.avatar ?? "" },
        { key: "url", value: profile.url ?? "" },
        { key: "description", value: profile.description ?? "" },
        { key: "email", value: profile.email ?? "" },
        { key: "com.github", value: profile.github ?? "" },
        { key: "com.twitter", value: profile.twitter ?? "" },
        { key: "com.discord", value: profile.discord ?? "" },
      ].filter((r) => r.value.length > 0);
    }

    return profile;
  }

  /**
   * Resolve a name with batch fetching for multiple text records.
   */
  async resolveWithRecords(
    name: string,
    keys: string[],
    chainId?: number
  ): Promise<{ address: Address | null; records: Record<string, string> }> {
    const address = await this.resolveName(name, chainId);
    const records: Record<string, string> = {};

    const results = await Promise.allSettled(
      keys.map((key) => this.getText(name, key, chainId))
    );

    keys.forEach((key, i) => {
      const result = results[i];
      if (result.status === "fulfilled" && result.value !== null) {
        records[key] = result.value as string;
      }
    });

    return { address, records };
  }
}

// ---------------------------------------------------------------------------
// Convenience exports (functional API)
// ---------------------------------------------------------------------------

export function createENSResolver(config?: ENSResolverConfig): ENSResolver {
  return new ENSResolver(config);
}

export async function resolveENSName(
  name: string,
  rpcUrl?: string,
  chainId?: number
): Promise<Address | null> {
  const resolver = new ENSResolver({ rpcUrl, chainId });
  return resolver.resolveName(name, chainId);
}

export async function reverseLookupENS(
  address: string,
  rpcUrl?: string,
  chainId?: number
): Promise<string | null> {
  const resolver = new ENSResolver({ rpcUrl, chainId });
  return resolver.reverseLookup(address, chainId);
}

export async function getAvatarENS(
  nameOrAddress: string,
  rpcUrl?: string,
  chainId?: number
): Promise<string | null> {
  const resolver = new ENSResolver({ rpcUrl, chainId });
  return resolver.getAvatar(nameOrAddress, chainId);
}
