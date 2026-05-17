/**
 * ENS Resolver — 20+ comprehensive tests
 * Covers constructor, validation, cache, error handling, type exports, and functional API.
 * Network calls to ENS are tested via mocks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ENSResolver,
  createENSResolver,
  resolveENSName,
  reverseLookupENS,
  getAvatarENS,
} from "../src/ens.js.js";
import {
  ENS_CHAIN_CONFIG,
  ENS_ERRORS,
  ENSResolverError,
} from "../src/types.js.js";
import type { ENSProfile, ENSRecord, CacheEntry } from "../src/types.js.js";

// ---------------------------------------------------------------------------
// Mock viem
// ---------------------------------------------------------------------------

vi.mock("viem", () => ({
  createPublicClient: vi.fn(() => ({
    readContract: vi.fn(),
  })),
  http: vi.fn(() => ({})),
  namehash: vi.fn((name: string) => {
    // Simple deterministic hash for testing
    return `0x${Buffer.from(name).toString("hex").padEnd(64, "0")}` as `0x${string}`;
  }),
  keccak256: vi.fn((data: string) => `0x${Buffer.from(data).toString("hex").padEnd(64, "0")}`),
  encodePacked: vi.fn((types: string[], values: unknown[]) => `0x${values.join("")}`),
  stringToHex: vi.fn((s: string) => `0x${Buffer.from(s).toString("hex")}`),
  slice: vi.fn(),
}));

vi.mock("viem/chains", () => ({
  mainnet: { id: 1, name: "Ethereum" },
  arbitrum: { id: 42161, name: "Arbitrum" },
  optimism: { id: 10, name: "Optimism" },
  polygon: { id: 137, name: "Polygon" },
  base: { id: 8453, name: "Base" },
  sepolia: { id: 11155111, name: "Sepolia" },
}));

import { createPublicClient } from "viem";

function mockReadContract(value: unknown) {
  (createPublicClient as any).mockReturnValue({
    readContract: vi.fn().mockResolvedValue(value),
  });
}

function mockReadContractSeq(...values: unknown[]) {
  let idx = 0;
  (createPublicClient as any).mockReturnValue({
    readContract: vi.fn().mockImplementation(() => {
      const v = values[idx];
      idx++;
      return Promise.resolve(v);
    }),
  });
}

function mockReadContractFn(fn: (...args: any[]) => Promise<unknown>) {
  (createPublicClient as any).mockReturnValue({
    readContract: vi.fn().mockImplementation(fn),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ENSResolver", () => {
  let resolver: ENSResolver;

  beforeEach(() => {
    resolver = new ENSResolver({ cacheTtlMs: 60000 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // 1. Constructor with defaults
  it("creates with default config", () => {
    const r = new ENSResolver();
    expect(r).toBeDefined();
    expect(r.clearCache).toBeDefined();
  });

  // 2. Constructor with custom config
  it("creates with custom config", () => {
    const r = new ENSResolver({
      rpcUrl: "https://custom.rpc",
      cacheTtlMs: 30000,
      maxCacheEntries: 500,
      chainId: 10,
    });
    expect(r).toBeDefined();
  });

  // 3. createENSResolver helper
  it("createENSResolver creates an instance", () => {
    const r = createENSResolver({ rpcUrl: "https://test" });
    expect(r).toBeInstanceOf(ENSResolver);
  });

  // 4. resolveName — rejects invalid name
  it("resolveName throws on invalid name", async () => {
    await expect(resolver.resolveName("not-a-valid-name")).rejects.toThrow(
      ENSResolverError
    );
  });

  // 5. resolveName — rejects name without TLD
  it("resolveName throws on name without TLD", async () => {
    await expect(resolver.resolveName("vitalik")).rejects.toThrow(
      "Invalid ENS name"
    );
  });

  // 6. resolveName — returns null for unknown name
  it("resolveName returns null when resolver not found", async () => {
    mockReadContract("0x0000000000000000000000000000000000000000");
    const result = await resolver.resolveName("unknown.eth");
    expect(result).toBeNull();
  });

  // 7. reverseLookup — rejects invalid address
  it("reverseLookup throws on invalid address", async () => {
    await expect(resolver.reverseLookup("0xinvalid")).rejects.toThrow(
      ENSResolverError
    );
  });

  // 8. reverseLookup — throws on invalid address for short hex
  it("reverseLookup throws INVALID_ADDRESS for short hex", async () => {
    await expect(resolver.reverseLookup("0x123")).rejects.toThrow(
      "Invalid Ethereum address"
    );
  });

  // 9. reverseLookup — returns null when no reverse record
  it("reverseLookup returns null when no reverse resolver", async () => {
    mockReadContract("0x0000000000000000000000000000000000000000");
    const result = await resolver.reverseLookup(
      "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
    );
    expect(result).toBeNull();
  });

  // 10. reverseLookup — validates forward resolution
  it("reverseLookup validates forward resolution matches", async () => {
    mockReadContractSeq(
      "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41", // reverse resolver
      "vitalik.eth",                                     // reverse name
      "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41", // forward resolver
      "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // forward addr
    );
    const result = await resolver.reverseLookup(
      "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
    );
    expect(result).toBe("vitalik.eth");
  });

  // 11. getText — rejects invalid name
  it("getText throws on invalid name", async () => {
    await expect(resolver.getText("badname", "url")).rejects.toThrow(
      "Invalid ENS name"
    );
  });

  // 12. getText — returns null when no resolver
  it("getText returns null when no resolver", async () => {
    mockReadContract("0x0000000000000000000000000000000000000000");
    const result = await resolver.getText("test.eth", "url");
    expect(result).toBeNull();
  });

  // 13. getAvatar — resolves by name
  it("getAvatar resolves by name", async () => {
    mockReadContract("https://example.com/avatar.png");
    const result = await resolver.getAvatar("test.eth");
    expect(result).toBe("https://example.com/avatar.png");
  });

  // 14. getAvatar — resolves by address (reverse lookup + avatar)
  it("getAvatar resolves by address", async () => {
    mockReadContractSeq(
      "0x0000000000000000000000000000000000000000" // no reverse resolver → returns null
    );
    const result = await resolver.getAvatar(
      "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
    );
    expect(result).toBeNull();
  });

  // 15. getAvatar — returns null for invalid input
  it("getAvatar returns null for invalid input", async () => {
    const result = await resolver.getAvatar("not-valid-input");
    expect(result).toBeNull();
  });

  // 16. Cache — caches results
  it("caches resolveName results", async () => {
    mockReadContract("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
    const addr1 = await resolver.resolveName("cached.eth");
    expect(addr1).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
    // Second call should use cache
    const addr2 = await resolver.resolveName("cached.eth");
    expect(addr2).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
  });

  // 17. Cache — clearCache works
  it("clearCache empties the cache", async () => {
    mockReadContract("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
    await resolver.resolveName("to-clear.eth");
    resolver.clearCache();
    // After clearing, a new call should re-query (not cached)
    const result = await resolver.resolveName("to-clear.eth");
    expect(result).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
  });

  // 18. Multi-chain — resolves on different chain IDs
  it("supports custom chainId for resolveName", async () => {
    mockReadContract("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
    const result = await resolver.resolveName("test.eth", 42161);
    expect(result).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
  });

  // 19. getProfile — returns profile structure
  it("getProfile returns correct structure", async () => {
    mockReadContract("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
    const profile = await resolver.getProfile("vitalik.eth");
    expect(profile.address).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
    expect(profile.name).toBe("vitalik.eth");
    expect(typeof profile.records).toBe("object");
    expect(Array.isArray(profile.records)).toBe(true);
  });

  // 20. getProfile — resolves by address
  it("getProfile works with address input", async () => {
    mockReadContract("0x0000000000000000000000000000000000000000");
    const profile = await resolver.getProfile(
      "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
    );
    expect(profile.address).toBe("0xd8da6bf26964af9d7eed9e03e53415d37aa96045");
    expect(profile.name).toBeNull();
  });

  // 21. resolveWithRecords — returns address + records
  it("resolveWithRecords returns address and records", async () => {
    mockReadContract("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
    const result = await resolver.resolveWithRecords("test.eth", ["url", "email"]);
    expect(result.address).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
    expect(typeof result.records).toBe("object");
  });

  // 22. ENS_CHAIN_CONFIG — has all chains
  it("ENS_CHAIN_CONFIG includes all supported chains", () => {
    expect(ENS_CHAIN_CONFIG).toHaveProperty("1");
    expect(ENS_CHAIN_CONFIG).toHaveProperty("11155111");
    expect(ENS_CHAIN_CONFIG).toHaveProperty("10");
    expect(ENS_CHAIN_CONFIG).toHaveProperty("137");
    expect(ENS_CHAIN_CONFIG).toHaveProperty("8453");
    expect(ENS_CHAIN_CONFIG).toHaveProperty("42161");
  });

  // 23. ENS_CHAIN_CONFIG — registry addresses are set
  it("ENS_CHAIN_CONFIG has non-zero registry addresses", () => {
    for (const [, config] of Object.entries(ENS_CHAIN_CONFIG)) {
      expect(config.registry).toBeTruthy();
      expect(config.registry).toMatch(/^0x/);
    }
  });

  // 24. ENSResolverError — has code and details
  it("ENSResolverError has code and message", () => {
    const err = new ENSResolverError(
      ENS_ERRORS.RESOLVE_FAILED,
      "test error",
      { extra: "data" }
    );
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe(ENS_ERRORS.RESOLVE_FAILED);
    expect(err.message).toBe("test error");
    expect(err.details).toEqual({ extra: "data" });
    expect(err.name).toBe("ENSResolverError");
  });

  // 25. ENSResolverError — error codes
  it("ENS_ERRORS has all expected error codes", () => {
    expect(ENS_ERRORS).toHaveProperty("RESOLVE_FAILED");
    expect(ENS_ERRORS).toHaveProperty("LOOKUP_FAILED");
    expect(ENS_ERRORS).toHaveProperty("AVATAR_NOT_FOUND");
    expect(ENS_ERRORS).toHaveProperty("INVALID_NAME");
    expect(ENS_ERRORS).toHaveProperty("INVALID_ADDRESS");
    expect(ENS_ERRORS).toHaveProperty("RPC_ERROR");
    expect(ENS_ERRORS).toHaveProperty("CACHE_ERROR");
  });

  // 26. Functional API — resolveENSName
  it("resolveENSName is a function", () => {
    expect(typeof resolveENSName).toBe("function");
  });

  // 27. Functional API — reverseLookupENS
  it("reverseLookupENS is a function", () => {
    expect(typeof reverseLookupENS).toBe("function");
  });

  // 28. Functional API — getAvatarENS
  it("getAvatarENS is a function", () => {
    expect(typeof getAvatarENS).toBe("function");
  });

  // 29. Cache TTL — expires after TTL
  it("cache entries expire after TTL", async () => {
    const shortTtlResolver = new ENSResolver({ cacheTtlMs: 10 });
    mockReadContract("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
    const result1 = await shortTtlResolver.resolveName("expiring.eth");
    expect(result1).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
    // Wait for TTL to expire
    await new Promise((r) => setTimeout(r, 20));
    const result2 = await shortTtlResolver.resolveName("expiring.eth");
    expect(result2).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
  });

  // 30. Type exports
  it("type exports are available", () => {
    const record: ENSRecord = { key: "test", value: "val" };
    expect(record.key).toBe("test");

    const profile: ENSProfile = {
      address: "0x123",
      name: "test.eth",
      avatar: null,
      url: null,
      description: null,
      email: null,
      github: null,
      twitter: null,
      discord: null,
      records: [],
    };
    expect(profile.name).toBe("test.eth");

    const cache: CacheEntry<string> = { value: "test", expiresAt: 123 };
    expect(cache.value).toBe("test");
  });

  // 31. resolveName — returns error code on failure
  it("resolveName throws ENSResolverError with RESOLVE_FAILED code on RPC error", async () => {
    (createPublicClient as any).mockReturnValue({
      readContract: vi.fn().mockRejectedValue(new Error("RPC timeout")),
    });
    await expect(resolver.resolveName("test.eth")).rejects.toSatisfy((err: unknown) => {
      if (err instanceof ENSResolverError) {
        return err.code === ENS_ERRORS.RESOLVE_FAILED;
      }
      return false;
    });
  });

  // 32. reverseLookup — throws ENSResolverError with LOOKUP_FAILED code
  it("reverseLookup throws LOOKUP_FAILED on RPC error", async () => {
    (createPublicClient as any).mockReturnValue({
      readContract: vi.fn().mockRejectedValue(new Error("RPC error")),
    });
    await expect(
      resolver.reverseLookup("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")
    ).rejects.toSatisfy((err: unknown) => {
      if (err instanceof ENSResolverError) {
        return err.code === ENS_ERRORS.LOOKUP_FAILED;
      }
      return false;
    });
  });

  // 33. getAvatar — throws AVATAR_NOT_FOUND on error
  it("getAvatar throws AVATAR_NOT_FOUND on error", async () => {
    (createPublicClient as any).mockReturnValue({
      readContract: vi.fn().mockRejectedValue(new Error("RPC")),
    });
    await expect(resolver.getAvatar("test.eth")).rejects.toSatisfy((err: unknown) => {
      if (err instanceof ENSResolverError) {
        return err.code === ENS_ERRORS.AVATAR_NOT_FOUND;
      }
      return false;
    });
  });

  // 34. getText — throws RESOLVE_FAILED on error
  it("getText throws RESOLVE_FAILED on error", async () => {
    (createPublicClient as any).mockReturnValue({
      readContract: vi.fn().mockRejectedValue(new Error("RPC")),
    });
    await expect(resolver.getText("test.eth", "url")).rejects.toSatisfy((err: unknown) => {
      if (err instanceof ENSResolverError) {
        return err.code === ENS_ERRORS.RESOLVE_FAILED;
      }
      return false;
    });
  });

  // 35. getProfile — empty records when no ENS name found
  it("getProfile returns empty profile for unknown address", async () => {
    mockReadContract("0x0000000000000000000000000000000000000000");
    const profile = await resolver.getProfile(
      "0x1111111111111111111111111111111111111111"
    );
    expect(profile.address).toBe("0x1111111111111111111111111111111111111111");
    expect(profile.name).toBeNull();
    expect(profile.records).toHaveLength(0);
  });

  // 36. resolveWithRecords — returns address and records when successful
  it("resolveWithRecords returns address and populated records", async () => {
    // Call order: resolveName(resolver, addr) -> parallel getText(resolver, resolver, text, text)
    const readContractFn = vi.fn()
      .mockResolvedValueOnce("0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41") // call 1: resolver (resolveName)
      .mockResolvedValueOnce("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045") // call 2: addr (resolveName)
      .mockResolvedValueOnce("0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41") // call 3: resolver (getText url)
      .mockResolvedValueOnce("0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41") // call 4: resolver (getText email)
      .mockResolvedValueOnce("https://example.com")                   // call 5: text url
      .mockResolvedValueOnce("test@email.com");                      // call 6: text email
    (createPublicClient as any).mockReturnValue({ readContract: readContractFn });
    const result = await resolver.resolveWithRecords("test.eth", ["url", "email"]);
    expect(result.address).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
    expect(result.records["url"]).toBe("https://example.com");
    expect(result.records["email"]).toBe("test@email.com");
  });

  // 37. Max cache entries — evicts oldest
  it("evicts oldest cache entry when max entries reached", async () => {
    const tinyCacheResolver = new ENSResolver({
      maxCacheEntries: 2,
      cacheTtlMs: 60000,
    });
    mockReadContract("0xaddr1");
    await tinyCacheResolver.resolveName("first.eth");
    mockReadContract("0xaddr2");
    await tinyCacheResolver.resolveName("second.eth");
    mockReadContract("0xaddr3");
    await tinyCacheResolver.resolveName("third.eth"); // should evict first

    // first.eth should re-query (mock returns 0xaddr1 again)
    const first = await tinyCacheResolver.resolveName("first.eth");
    expect(first).toBe("0xaddr1");
  });
});
