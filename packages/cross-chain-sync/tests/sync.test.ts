import { describe, it, expect } from "vitest";
import {
  StateSync,
  InMemoryStorage,
  syncEvmState,
  syncSolanaState,
  syncBitcoinState,
} from "../src/index.js";
import type { ChainAccount } from "../src/index.js";

describe("StateSync", () => {
  it("creates a StateSync instance", () => {
    const sync = new StateSync(new InMemoryStorage());
    expect(sync).toBeDefined();
  });

  it("initializes with an identity", async () => {
    const storage = new InMemoryStorage();
    const sync = new StateSync(storage);
    const identity = {
      identityHash: "0xtest123",
      accounts: [] as ChainAccount[],
      metadata: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await sync.initialize(identity);
    const state = sync.getState();
    expect(state).not.toBeNull();
    expect(state!.identity.identityHash).toBe("0xtest123");
  });

  it("registers and syncs an EVM adapter", async () => {
    const storage = new InMemoryStorage();
    const sync = new StateSync(storage);

    sync.registerAdapter("evm", async () => {
      const account = {
        chain: "evm" as const,
        chainId: 1,
        address: "0x1234000000000000000000000000000000000000",
        addedAt: Date.now(),
      };
      return syncEvmState(account, storage);
    });

    const result = await sync.syncAll();
    expect(result.success).toBe(true);
    expect(result.syncedChains).toContain("evm");
    expect(result.failedChains).toHaveLength(0);
  });

  it("registers and syncs a Solana adapter", async () => {
    const storage = new InMemoryStorage();
    const sync = new StateSync(storage);

    sync.registerAdapter("solana", async () => {
      const account = {
        chain: "solana" as const,
        address: "5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4CmPEwKgVWr8",
        addedAt: Date.now(),
      };
      return syncSolanaState(account, storage);
    });

    const result = await sync.syncAll();
    expect(result.success).toBe(true);
    expect(result.syncedChains).toContain("solana");
  });

  it("registers and syncs a Bitcoin adapter", async () => {
    const storage = new InMemoryStorage();
    const sync = new StateSync(storage);

    sync.registerAdapter("bitcoin", async () => {
      const account = {
        chain: "bitcoin" as const,
        address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
        addressType: "taproot" as const,
        addedAt: Date.now(),
      };
      return syncBitcoinState(account, storage);
    });

    const result = await sync.syncAll();
    expect(result.success).toBe(true);
    expect(result.syncedChains).toContain("bitcoin");
  });

  it("handles adapter failure gracefully", async () => {
    const storage = new InMemoryStorage();
    const sync = new StateSync(storage);

    sync.registerAdapter("evm", async () => {
      throw new Error("Network unreachable");
    });

    const result = await sync.syncAll();
    expect(result.success).toBe(false);
    expect(result.failedChains).toContain("evm");
    expect(result.errors["evm"]).toContain("Network unreachable");
  });

  it("returns false when adapter returns false", async () => {
    const storage = new InMemoryStorage();
    const sync = new StateSync(storage);

    sync.registerAdapter("evm", async () => false);

    const result = await sync.syncAll();
    expect(result.success).toBe(false);
    expect(result.failedChains).toContain("evm");
  });

  it("syncs a single chain", async () => {
    const storage = new InMemoryStorage();
    const sync = new StateSync(storage);

    sync.registerAdapter("evm", async () => true);

    const result = await sync.syncChain("evm");
    expect(result).toBe(true);
  });

  it("throws when syncing unregistered chain", async () => {
    const storage = new InMemoryStorage();
    const sync = new StateSync(storage);

    await expect(sync.syncChain("solana")).rejects.toThrow(
      "No adapter registered"
    );
  });

  it("restores state from storage", async () => {
    const storage = new InMemoryStorage();
    const sync1 = new StateSync(storage);

    const identity = {
      identityHash: "0xrestore",
      accounts: [] as ChainAccount[],
      metadata: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await sync1.initialize(identity);

    const sync2 = new StateSync(storage);
    const restored = await sync2.restore();
    expect(restored).toBe(true);
    expect(sync2.getState()?.identity.identityHash).toBe("0xrestore");
  });
});
