/**
 * Tests for @cinacoin/cross-chain-sync — identity management, linking proofs, and types.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  generateIdentityHash,
  verifyLinkingProof,
  createLinkingProof,
  CrossChainIdentityManager,
} from "../src/identity.js";
import { InMemoryStorage, LocalStorage } from "../src/storage.js";
import type { ChainAccount, LinkingProof } from "../src/types.js";

// ---------------------------------------------------------------------------
// generateIdentityHash
// ---------------------------------------------------------------------------

describe("generateIdentityHash", () => {
  it("should generate a hash string", () => {
    const accounts: ChainAccount[] = [
      { chain: "evm", address: "0xabc", addedAt: Date.now() },
    ];
    const hash = generateIdentityHash(accounts);
    expect(typeof hash).toBe("string");
    expect(hash).toMatch(/^0x[0-9a-f]{8}$/);
  });

  it("should produce same hash for same accounts regardless of order", () => {
    const a1: ChainAccount[] = [
      { chain: "evm", address: "0xaaa", addedAt: 1 },
      { chain: "solana", address: "SolBBB", addedAt: 2 },
    ];
    const a2: ChainAccount[] = [
      { chain: "solana", address: "SolBBB", addedAt: 2 },
      { chain: "evm", address: "0xaaa", addedAt: 1 },
    ];
    expect(generateIdentityHash(a1)).toBe(generateIdentityHash(a2));
  });

  it("should produce different hashes for different accounts", () => {
    const a1: ChainAccount[] = [
      { chain: "evm", address: "0xaaa", addedAt: 1 },
    ];
    const a2: ChainAccount[] = [
      { chain: "evm", address: "0xbbb", addedAt: 1 },
    ];
    expect(generateIdentityHash(a1)).not.toBe(generateIdentityHash(a2));
  });

  it("should handle empty accounts array", () => {
    const hash = generateIdentityHash([]);
    expect(typeof hash).toBe("string");
    expect(hash).toMatch(/^0x[0-9a-f]{8}$/);
  });

  it("should handle multiple chains", () => {
    const accounts: ChainAccount[] = [
      { chain: "evm", address: "0x111", addedAt: 1 },
      { chain: "solana", address: "Sol222", addedAt: 2 },
      { chain: "bitcoin", address: "bc1q333", addedAt: 3 },
    ];
    const hash = generateIdentityHash(accounts);
    expect(hash).toMatch(/^0x[0-9a-f]{8}$/);
  });
});

// ---------------------------------------------------------------------------
// verifyLinkingProof
// ---------------------------------------------------------------------------

describe("verifyLinkingProof", () => {
  it("should accept a valid proof", () => {
    const proof: LinkingProof = {
      sourceAddress: "0xsource",
      sourceChain: "evm",
      targetAddress: "0xtarget",
      targetChain: "evm",
      signature: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      message: "Link my accounts",
      createdAt: Date.now(),
    };
    expect(verifyLinkingProof(proof)).toBe(true);
  });

  it("should reject proof with missing source address", () => {
    const proof: LinkingProof = {
      sourceAddress: "",
      sourceChain: "evm",
      targetAddress: "0xtarget",
      targetChain: "evm",
      signature: "abcdef1234567890",
      message: "Link my accounts",
      createdAt: Date.now(),
    };
    expect(verifyLinkingProof(proof)).toBe(false);
  });

  it("should reject proof with missing target address", () => {
    const proof: LinkingProof = {
      sourceAddress: "0xsource",
      sourceChain: "evm",
      targetAddress: "",
      targetChain: "evm",
      signature: "abcdef1234567890",
      message: "Link my accounts",
      createdAt: Date.now(),
    };
    expect(verifyLinkingProof(proof)).toBe(false);
  });

  it("should reject proof with missing signature", () => {
    const proof: LinkingProof = {
      sourceAddress: "0xsource",
      sourceChain: "evm",
      targetAddress: "0xtarget",
      targetChain: "evm",
      signature: "",
      message: "Link my accounts",
      createdAt: Date.now(),
    };
    expect(verifyLinkingProof(proof)).toBe(false);
  });

  it("should reject self-linking (same chain and address)", () => {
    const proof: LinkingProof = {
      sourceAddress: "0xsame",
      sourceChain: "evm",
      targetAddress: "0xsame",
      targetChain: "evm",
      signature: "abcdef1234567890",
      message: "Link my accounts",
      createdAt: Date.now(),
    };
    expect(verifyLinkingProof(proof)).toBe(false);
  });

  it("should accept cross-chain linking", () => {
    const proof: LinkingProof = {
      sourceAddress: "0xsource",
      sourceChain: "evm",
      targetAddress: "SolTarget",
      targetChain: "solana",
      signature: "abcdef1234567890abcdef1234567890",
      message: "Cross-chain link",
      createdAt: Date.now(),
    };
    expect(verifyLinkingProof(proof)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createLinkingProof
// ---------------------------------------------------------------------------

describe("createLinkingProof", () => {
  it("should create a proof with all fields populated", () => {
    const source: ChainAccount = { chain: "evm", address: "0xsrc", addedAt: 1 };
    const target: ChainAccount = { chain: "solana", address: "SolTgt", addedAt: 2 };
    const proof = createLinkingProof(source, target, "sig123", "msg456");

    expect(proof.sourceAddress).toBe("0xsrc");
    expect(proof.sourceChain).toBe("evm");
    expect(proof.targetAddress).toBe("SolTgt");
    expect(proof.targetChain).toBe("solana");
    expect(proof.signature).toBe("sig123");
    expect(proof.message).toBe("msg456");
    expect(proof.createdAt).toBeGreaterThan(0);
  });

  it("should set createdAt to current timestamp", () => {
    const before = Date.now();
    const source: ChainAccount = { chain: "evm", address: "0xa", addedAt: 1 };
    const target: ChainAccount = { chain: "evm", address: "0xb", addedAt: 2 };
    const proof = createLinkingProof(source, target, "sig", "msg");
    expect(proof.createdAt).toBeGreaterThanOrEqual(before);
  });
});

// ---------------------------------------------------------------------------
// CrossChainIdentityManager
// ---------------------------------------------------------------------------

describe("CrossChainIdentityManager", () => {
  let manager: CrossChainIdentityManager;

  beforeEach(() => {
    manager = new CrossChainIdentityManager(new InMemoryStorage());
  });

  it("should create an identity", async () => {
    const accounts: ChainAccount[] = [
      { chain: "evm", address: "0xtest", addedAt: Date.now() },
    ];
    const result = await manager.createIdentity(accounts);
    expect(result.identityHash).toMatch(/^0x[0-9a-f]{8}$/);
  });

  it("should store and retrieve the current identity", async () => {
    const accounts: ChainAccount[] = [
      { chain: "evm", address: "0xidentity", addedAt: Date.now() },
    ];
    const { identityHash } = await manager.createIdentity(accounts);
    const current = await manager.getCurrentIdentity();
    expect(current).toBe(identityHash);
  });

  it("should return null for current identity when none exists", async () => {
    const fresh = new CrossChainIdentityManager(new InMemoryStorage());
    const current = await fresh.getCurrentIdentity();
    expect(current).toBeNull();
  });

  it("should link an account with valid proof", async () => {
    const accounts: ChainAccount[] = [
      { chain: "evm", address: "0xmain", addedAt: Date.now() },
    ];
    const { identityHash } = await manager.createIdentity(accounts);

    const newAccount: ChainAccount = {
      chain: "solana",
      address: "SolNew",
      addedAt: Date.now(),
    };
    const proof: LinkingProof = {
      sourceAddress: "0xmain",
      sourceChain: "evm",
      targetAddress: "SolNew",
      targetChain: "solana",
      signature: "abcdef1234567890abcdef1234567890",
      message: "Link",
      createdAt: Date.now(),
    };

    const linked = await manager.linkAccount(identityHash, newAccount, proof);
    expect(linked).toBe(true);
  });

  it("should reject linking with invalid proof", async () => {
    const accounts: ChainAccount[] = [
      { chain: "evm", address: "0xmain", addedAt: Date.now() },
    ];
    const { identityHash } = await manager.createIdentity(accounts);

    const newAccount: ChainAccount = {
      chain: "solana",
      address: "SolBad",
      addedAt: Date.now(),
    };
    const badProof: LinkingProof = {
      sourceAddress: "",
      sourceChain: "evm",
      targetAddress: "SolBad",
      targetChain: "solana",
      signature: "",
      message: "",
      createdAt: Date.now(),
    };

    const linked = await manager.linkAccount(identityHash, newAccount, badProof);
    expect(linked).toBe(false);
  });

  it("should return existing accounts", async () => {
    const accounts: ChainAccount[] = [
      { chain: "evm", address: "0xaccount1", addedAt: Date.now() },
      { chain: "solana", address: "SolAccount2", addedAt: Date.now() },
    ];
    const { identityHash } = await manager.createIdentity(accounts);
    const retrieved = await manager.getAccounts(identityHash);
    expect(retrieved).toHaveLength(2);
  });

  it("should return empty array for unknown identity", async () => {
    const accounts = await manager.getAccounts("0xunknown");
    expect(accounts).toEqual([]);
  });

  it("should return empty proofs for identity", async () => {
    const accounts: ChainAccount[] = [
      { chain: "evm", address: "0xproof", addedAt: Date.now() },
    ];
    const { identityHash } = await manager.createIdentity(accounts);
    const proofs = await manager.getProofs(identityHash);
    expect(Array.isArray(proofs)).toBe(true);
  });

  it("should handle linking a new account successfully", async () => {
    const accounts: ChainAccount[] = [
      { chain: "evm", address: "0xdup", addedAt: Date.now() },
    ];
    const { identityHash } = await manager.createIdentity(accounts);

    // Link a new account
    const newAccount: ChainAccount = {
      chain: "solana",
      address: "SolDup",
      addedAt: Date.now(),
    };
    const proof: LinkingProof = {
      sourceAddress: "0xdup",
      sourceChain: "evm",
      targetAddress: "SolDup",
      targetChain: "solana",
      signature: "abcdef1234567890",
      message: "Link",
      createdAt: Date.now(),
    };
    const linked = await manager.linkAccount(identityHash, newAccount, proof);
    expect(linked).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// InMemoryStorage
// ---------------------------------------------------------------------------

describe("InMemoryStorage", () => {
  it("should get and set values", async () => {
    const storage = new InMemoryStorage();
    await storage.set("key", "value");
    const result = await storage.get<string>("key");
    expect(result).toBe("value");
  });

  it("should return null for missing key", async () => {
    const storage = new InMemoryStorage();
    const result = await storage.get("missing");
    expect(result).toBeNull();
  });

  it("should delete values", async () => {
    const storage = new InMemoryStorage();
    await storage.set("del", "data");
    await storage.delete("del");
    expect(await storage.get("del")).toBeNull();
  });

  it("should clear all values", async () => {
    const storage = new InMemoryStorage();
    await storage.set("a", 1);
    await storage.set("b", 2);
    await storage.clear();
    expect(await storage.get("a")).toBeNull();
    expect(await storage.get("b")).toBeNull();
  });

  it("should store and retrieve objects", async () => {
    const storage = new InMemoryStorage();
    const obj = { name: "test", count: 42 };
    await storage.set("obj", obj);
    const result = await storage.get<typeof obj>("obj");
    expect(result).toEqual(obj);
  });

  it("should handle complex nested objects", async () => {
    const storage = new InMemoryStorage();
    const complex = {
      nested: { a: [1, 2, { b: "deep" }] },
      flag: true,
    };
    await storage.set("complex", complex);
    const result = await storage.get<typeof complex>("complex");
    expect(result).toEqual(complex);
  });
});

// ---------------------------------------------------------------------------
// LocalStorage (existence / interface check)
// ---------------------------------------------------------------------------

describe("LocalStorage", () => {
  it("should have the expected methods", () => {
    // LocalStorage uses window.localStorage, which doesn't exist in Node
    // Just check the class exists and has the right interface
    expect(typeof LocalStorage).toBe("function");
    const proto = LocalStorage.prototype;
    expect(typeof proto.get).toBe("function");
    expect(typeof proto.set).toBe("function");
    expect(typeof proto.delete).toBe("function");
    expect(typeof proto.clear).toBe("function");
  });
});
