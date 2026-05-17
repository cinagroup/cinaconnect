import { describe, it, expect } from "vitest";
import {
  generateIdentityHash,
  verifyLinkingProof,
  createLinkingProof,
  CrossChainIdentityManager,
  InMemoryStorage,
} from "../src/index.js.js";
import type { ChainAccount, LinkingProof } from "../src/index.js.js";

describe("Cross-Chain Identity", () => {
  it("generates a deterministic identity hash", () => {
    const accounts: ChainAccount[] = [
      {
        chain: "evm",
        chainId: 1,
        address: "0xAAA",
        addedAt: Date.now(),
      },
      {
        chain: "solana",
        address: "SolBBB",
        addedAt: Date.now(),
      },
    ];
    const hash1 = generateIdentityHash(accounts);
    const hash2 = generateIdentityHash([...accounts].reverse());
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^0x[0-9a-f]{8}$/);
  });

  it("generates different hashes for different accounts", () => {
    const a1: ChainAccount[] = [
      { chain: "evm", chainId: 1, address: "0xAAA", addedAt: Date.now() },
    ];
    const a2: ChainAccount[] = [
      { chain: "evm", chainId: 1, address: "0xBBB", addedAt: Date.now() },
    ];
    expect(generateIdentityHash(a1)).not.toBe(generateIdentityHash(a2));
  });

  it("validates a correct linking proof", () => {
    const proof: LinkingProof = {
      sourceAddress: "0xAAA",
      sourceChain: "evm",
      targetAddress: "SolBBB",
      targetChain: "solana",
      signature: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      message: "Link my accounts",
      createdAt: Date.now(),
    };
    expect(verifyLinkingProof(proof)).toBe(true);
  });

  it("rejects self-linking proof", () => {
    const proof: LinkingProof = {
      sourceAddress: "0xAAA",
      sourceChain: "evm",
      targetAddress: "0xAAA",
      targetChain: "evm",
      signature: "abcdef1234567890",
      message: "Link my accounts",
      createdAt: Date.now(),
    };
    expect(verifyLinkingProof(proof)).toBe(false);
  });

  it("rejects proof with empty signature", () => {
    const proof: LinkingProof = {
      sourceAddress: "0xAAA",
      sourceChain: "evm",
      targetAddress: "SolBBB",
      targetChain: "solana",
      signature: "",
      message: "Link my accounts",
      createdAt: Date.now(),
    };
    expect(verifyLinkingProof(proof)).toBe(false);
  });

  it("creates a linking proof from accounts", () => {
    const source: ChainAccount = {
      chain: "evm",
      chainId: 1,
      address: "0xAAA",
      addedAt: Date.now(),
    };
    const target: ChainAccount = {
      chain: "solana",
      address: "SolBBB",
      addedAt: Date.now(),
    };
    const proof = createLinkingProof(source, target, "sig123", "msg456");
    expect(proof.sourceAddress).toBe("0xAAA");
    expect(proof.targetAddress).toBe("SolBBB");
    expect(proof.signature).toBe("sig123");
    expect(proof.message).toBe("msg456");
  });

  it("creates identity and retrieves it", async () => {
    const manager = new CrossChainIdentityManager(new InMemoryStorage());
    const accounts: ChainAccount[] = [
      { chain: "evm", chainId: 1, address: "0xAAA", addedAt: Date.now() },
    ];
    const { identityHash } = await manager.createIdentity(accounts, { name: "test" });
    expect(identityHash).toBeDefined();

    const current = await manager.getCurrentIdentity();
    expect(current).toBe(identityHash);
  });

  it("links an account with valid proof", async () => {
    const manager = new CrossChainIdentityManager(new InMemoryStorage());
    const accounts: ChainAccount[] = [
      { chain: "evm", chainId: 1, address: "0xAAA", addedAt: Date.now() },
    ];
    const { identityHash } = await manager.createIdentity(accounts);

    const newAccount: ChainAccount = {
      chain: "solana",
      address: "SolBBB",
      addedAt: Date.now(),
    };
    const proof: LinkingProof = {
      sourceAddress: "0xAAA",
      sourceChain: "evm",
      targetAddress: "SolBBB",
      targetChain: "solana",
      signature: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      message: "Link my accounts",
      createdAt: Date.now(),
    };

    const result = await manager.linkAccount(identityHash, newAccount, proof);
    expect(result).toBe(true);
  });

  it("rejects linking with invalid proof", async () => {
    const manager = new CrossChainIdentityManager(new InMemoryStorage());
    const accounts: ChainAccount[] = [
      { chain: "evm", chainId: 1, address: "0xAAA", addedAt: Date.now() },
    ];
    const { identityHash } = await manager.createIdentity(accounts);

    const newAccount: ChainAccount = {
      chain: "solana",
      address: "SolBBB",
      addedAt: Date.now(),
    };
    const invalidProof: LinkingProof = {
      sourceAddress: "0xAAA",
      sourceChain: "evm",
      targetAddress: "SolBBB",
      targetChain: "solana",
      signature: "",
      message: "",
      createdAt: Date.now(),
    };

    const result = await manager.linkAccount(identityHash, newAccount, invalidProof);
    expect(result).toBe(false);
  });

  it("retrieves accounts for an identity", async () => {
    const manager = new CrossChainIdentityManager(new InMemoryStorage());
    const accounts: ChainAccount[] = [
      { chain: "evm", chainId: 1, address: "0xAAA", addedAt: Date.now() },
      { chain: "solana", address: "SolBBB", addedAt: Date.now() },
    ];
    const { identityHash } = await manager.createIdentity(accounts);

    const retrieved = await manager.getAccounts(identityHash);
    expect(retrieved).toHaveLength(2);
  });
});
