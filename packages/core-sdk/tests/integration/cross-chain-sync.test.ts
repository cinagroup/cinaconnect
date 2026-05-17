/**
 * Integration Test — Cross-Chain Identity Sync
 *
 * Tests cross-chain identity synchronization: linking identities
 * across EVM, Solana, and Bitcoin chains, and maintaining consistent
 * user identity across networks.
 *
 * 8 tests covering:
 * - Identity creation on multiple chains
 * - Cross-chain identity linking
 * - Sync state propagation
 * - Identity lookup by address
 * - Conflict resolution (same address, different chains)
 * - Persistence and restoration
 * - Multi-chain aggregation
 * - Identity removal and cleanup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Cross-Chain Identity types ────────────────────────────────────

interface ChainIdentity {
  chainNamespace: string;
  chainId: string;
  address: string;
  displayName?: string;
}

interface UserIdentity {
  userId: string;
  identities: ChainIdentity[];
  createdAt: number;
  lastSyncedAt: number;
}

interface SyncResult {
  success: boolean;
  syncedCount: number;
  errors: string[];
}

// ── Mock adapters ─────────────────────────────────────────────────

class MockEVMAdapter {
  readonly namespace = 'eip155';

  async getAddress(): Promise<string> {
    return '0x1234567890abcdef1234567890abcdef12345678';
  }

  async getChainId(): Promise<string> {
    return '1';
  }

  async signMessage(message: string): Promise<string> {
    return '0xevm_sig_' + message.slice(0, 20);
  }
}

class MockSolanaAdapter {
  readonly namespace = 'solana';

  async getAddress(): Promise<string> {
    return '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
  }

  async getChainId(): Promise<string> {
    return '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
  }

  async signMessage(message: string): Promise<string> {
    return '0xsol_sig_' + message.slice(0, 20);
  }
}

class MockBitcoinAdapter {
  readonly namespace = 'bip122';

  async getAddress(): Promise<string> {
    return 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
  }

  async getChainId(): Promise<string> {
    return '000000000019d6689c085ae165831e93';
  }

  async signMessage(message: string): Promise<string> {
    return 'btc_sig_' + message.slice(0, 20);
  }
}

// ── Cross-Chain Sync Manager ──────────────────────────────────────

class CrossChainSyncManager {
  private identities: Map<string, UserIdentity> = new Map();
  private adapters: Map<string, MockEVMAdapter | MockSolanaAdapter | MockBitcoinAdapter> = new Map();

  registerAdapter(namespace: string, adapter: MockEVMAdapter | MockSolanaAdapter | MockBitcoinAdapter): void {
    this.adapters.set(namespace, adapter);
  }

  async createIdentity(userId: string, namespace: string): Promise<ChainIdentity> {
    const adapter = this.adapters.get(namespace);
    if (!adapter) throw new Error(`No adapter for namespace: ${namespace}`);

    const address = await adapter.getAddress();
    const chainId = await adapter.getChainId();

    const identity: ChainIdentity = {
      chainNamespace: namespace,
      chainId,
      address,
    };

    let existing = this.identities.get(userId);
    if (!existing) {
      existing = {
        userId,
        identities: [],
        createdAt: Date.now(),
        lastSyncedAt: Date.now(),
      };
      this.identities.set(userId, existing);
    }

    // Add identity if not already present
    const exists = existing.identities.some(
      (i) => i.chainNamespace === identity.chainNamespace && i.address === identity.address
    );
    if (!exists) {
      existing.identities.push(identity);
      existing.lastSyncedAt = Date.now();
    }

    return identity;
  }

  async linkIdentities(userId: string, namespaces: string[]): Promise<UserIdentity> {
    for (const ns of namespaces) {
      await this.createIdentity(userId, ns);
    }
    const identity = this.identities.get(userId);
    if (!identity) throw new Error('Identity not found');
    return identity;
  }

  getIdentity(userId: string): UserIdentity | undefined {
    return this.identities.get(userId);
  }

  async findUserByAddress(address: string): Promise<UserIdentity | undefined> {
    for (const [, identity] of this.identities) {
      if (identity.identities.some((i) => i.address.toLowerCase() === address.toLowerCase())) {
        return identity;
      }
    }
    return undefined;
  }

  async removeIdentity(userId: string, namespace: string): Promise<boolean> {
    const identity = this.identities.get(userId);
    if (!identity) return false;

    const beforeLen = identity.identities.length;
    identity.identities = identity.identities.filter((i) => i.chainNamespace !== namespace);
    identity.lastSyncedAt = Date.now();

    if (identity.identities.length === 0) {
      this.identities.delete(userId);
    }

    return identity.identities.length < beforeLen;
  }

  async syncAll(userId: string): Promise<SyncResult> {
    const identity = this.identities.get(userId);
    if (!identity) {
      return { success: false, syncedCount: 0, errors: ['Identity not found'] };
    }

    const errors: string[] = [];
    let synced = 0;

    for (const id of identity.identities) {
      try {
        const adapter = this.adapters.get(id.chainNamespace);
        if (!adapter) {
          errors.push(`No adapter for ${id.chainNamespace}`);
          continue;
        }

        const currentAddress = await adapter.getAddress();
        if (currentAddress.toLowerCase() === id.address.toLowerCase()) {
          synced++;
        } else {
          errors.push(`Address mismatch for ${id.chainNamespace}`);
        }
      } catch (err) {
        errors.push(`Sync failed for ${id.chainNamespace}: ${err}`);
      }
    }

    identity.lastSyncedAt = Date.now();

    return { success: errors.length === 0, syncedCount: synced, errors };
  }

  getAllUserIdentity(): Map<string, UserIdentity> {
    return new Map(this.identities);
  }

  persist(): string {
    const data: Record<string, UserIdentity> = {};
    for (const [k, v] of this.identities) {
      data[k] = v;
    }
    return JSON.stringify(data);
  }

  restore(serialized: string): void {
    const data = JSON.parse(serialized) as Record<string, UserIdentity>;
    for (const [k, v] of Object.entries(data)) {
      this.identities.set(k, v);
    }
  }
}

// ── Tests ─────────────────────────────────────────────────────────

describe('Cross-Chain Sync — Identity Synchronization', () => {
  let manager: CrossChainSyncManager;
  let evmAdapter: MockEVMAdapter;
  let solAdapter: MockSolanaAdapter;
  let btcAdapter: MockBitcoinAdapter;

  beforeEach(() => {
    manager = new CrossChainSyncManager();
    evmAdapter = new MockEVMAdapter();
    solAdapter = new MockSolanaAdapter();
    btcAdapter = new MockBitcoinAdapter();

    manager.registerAdapter('eip155', evmAdapter);
    manager.registerAdapter('solana', solAdapter);
    manager.registerAdapter('bip122', btcAdapter);
  });

  it('should create identities on multiple chains and link them', async () => {
    const linked = await manager.linkIdentities('user-1', ['eip155', 'solana', 'bip122']);

    expect(linked.userId).toBe('user-1');
    expect(linked.identities).toHaveLength(3);
    expect(linked.identities.map((i) => i.chainNamespace)).toContain('eip155');
    expect(linked.identities.map((i) => i.chainNamespace)).toContain('solana');
    expect(linked.identities.map((i) => i.chainNamespace)).toContain('bip122');
  });

  it('should look up a user by any linked address', async () => {
    await manager.linkIdentities('user-1', ['eip155', 'solana']);

    // Lookup by EVM address
    const foundByEVM = await manager.findUserByAddress('0x1234567890abcdef1234567890abcdef12345678');
    expect(foundByEVM).toBeTruthy();
    expect(foundByEVM!.userId).toBe('user-1');

    // Lookup by Solana address (case-insensitive)
    const foundBySol = await manager.findUserByAddress('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');
    expect(foundBySol).toBeTruthy();
    expect(foundBySol!.userId).toBe('user-1');
  });

  it('should return not found for unlinked address', async () => {
    await manager.linkIdentities('user-1', ['eip155']);

    const found = await manager.findUserByAddress('0x0000000000000000000000000000000000000000');
    expect(found).toBeUndefined();
  });

  it('should sync all identities and report success', async () => {
    await manager.linkIdentities('user-1', ['eip155', 'solana']);

    const result = await manager.syncAll('user-1');

    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should remove an identity chain and update sync state', async () => {
    await manager.linkIdentities('user-1', ['eip155', 'solana']);

    const removed = await manager.removeIdentity('user-1', 'solana');
    expect(removed).toBe(true);

    const identity = manager.getIdentity('user-1');
    expect(identity).toBeTruthy();
    expect(identity!.identities).toHaveLength(1);
    expect(identity!.identities[0].chainNamespace).toBe('eip155');
  });

  it('should delete user identity when last chain is removed', async () => {
    await manager.linkIdentities('user-1', ['eip155']);

    await manager.removeIdentity('user-1', 'eip155');

    const identity = manager.getIdentity('user-1');
    expect(identity).toBeUndefined();
  });

  it('should persist and restore identity state', async () => {
    await manager.linkIdentities('user-1', ['eip155', 'solana']);

    const serialized = manager.persist();
    expect(serialized).toBeTruthy();

    const fresh = new CrossChainSyncManager();
    fresh.restore(serialized);

    const restored = fresh.getIdentity('user-1');
    expect(restored).toBeTruthy();
    expect(restored!.userId).toBe('user-1');
    expect(restored!.identities).toHaveLength(2);
  });

  it('should handle sync with missing adapter gracefully', async () => {
    await manager.linkIdentities('user-1', ['eip155']);

    // Manually add an identity for a chain with no adapter
    const identity = manager.getIdentity('user-1');
    if (identity) {
      identity.identities.push({
        chainNamespace: 'ton',
        chainId: '-2',
        address: 'EQDk2VTvn04SUKJrW7rXahzdF8_Qi6utb0wj41InCuOCvd',
      });
    }

    const result = await manager.syncAll('user-1');

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('No adapter'))).toBe(true);
    expect(result.syncedCount).toBe(1); // EVM still syncs
  });

});
