import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmbeddedWallet } from './EmbeddedWallet';
import { backupWallet, recoverWallet } from './backup';
import { WalletManager } from './WalletManager';
import type {
  AuthMethod,
  EmbeddedWalletConfig,
  LinkedProvider,
  WalletBackup,
  WalletSession,
  UnsignedTransaction,
  SignedTransaction,
} from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────

function makeConfig(overrides?: Partial<EmbeddedWalletConfig>): EmbeddedWalletConfig {
  return {
    id: 'test-wallet-1',
    authMethod: 'email' as AuthMethod,
    identifier: 'test@example.com',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function mockLocalStorage() {
  const store: Record<string, string> = {};
  const ls = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { for (const k in store) delete store[k]; }),
  };
  vi.stubGlobal('localStorage', ls);
  return { store, ls };
}

function mockCrypto() {
  // Mock SubtleCrypto for AES-GCM operations
  const subtle = {
    importKey: vi.fn().mockResolvedValue({} as CryptoKey),
    deriveKey: vi.fn().mockResolvedValue({} as CryptoKey),
    encrypt: vi.fn().mockImplementation(async (_algo: AesGcmParams, _key: CryptoKey, data: BufferSource) => {
      // Return ciphertext + 16-byte auth tag
      const input = new Uint8Array(data as ArrayBuffer);
      const result = new Uint8Array(input.length + 16);
      result.set(input);
      // Fake auth tag
      for (let i = 0; i < 16; i++) result[input.length + i] = i;
      return result;
    }),
    decrypt: vi.fn().mockImplementation(async (_algo: AesGcmParams, _key: CryptoKey, data: BufferSource) => {
      const input = new Uint8Array(data as ArrayBuffer);
      // Strip last 16 bytes (auth tag)
      return input.slice(0, -16);
    }),
  };
  const crypto = { subtle };
  vi.stubGlobal('crypto', crypto);
  return { subtle, crypto };
}

// ─── EmbeddedWallet: Creation ────────────────────────────────────────────

describe('EmbeddedWallet', () => {
  describe('create', () => {
    it('creates a wallet with email auth', () => {
      const wallet = EmbeddedWallet.create('w1', 'email', 'alice@example.com');
      expect(wallet.walletId).toBe('w1');
      expect(wallet.authMethod).toBe('email');
      expect(wallet.identifier).toBe('alice@example.com');
      expect(wallet.salt).toBeInstanceOf(Uint8Array);
      expect(wallet.salt.length).toBe(16);
    });

    it('creates a wallet with social auth', () => {
      const wallet = EmbeddedWallet.create('w2', 'social', 'google_123');
      expect(wallet.authMethod).toBe('social');
    });

    it('creates a wallet with phone auth', () => {
      const wallet = EmbeddedWallet.create('w3', 'phone', '+1234567890');
      expect(wallet.authMethod).toBe('phone');
    });

    it('generates a unique salt each time', () => {
      const w1 = EmbeddedWallet.create('a', 'email', 'x@x.com');
      const w2 = EmbeddedWallet.create('b', 'email', 'x@x.com');
      expect(w1.salt).not.toEqual(w2.salt);
    });
  });

  describe('deriveKeys', () => {
    it('returns deterministic keys for same identifier + salt', () => {
      const d1 = EmbeddedWallet.deriveKeys('email', 'alice@example.com');
      const d2 = EmbeddedWallet.deriveKeys('email', 'alice@example.com', d1.salt);
      expect(d1.privateKey).toEqual(d2.privateKey);
      expect(d1.publicKey).toEqual(d2.publicKey);
      expect(d1.address).toBe(d2.address);
    });

    it('returns different keys for different identifiers', () => {
      const d1 = EmbeddedWallet.deriveKeys('email', 'alice@example.com');
      const d2 = EmbeddedWallet.deriveKeys('email', 'bob@example.com');
      expect(d1.privateKey).not.toEqual(d2.privateKey);
      expect(d1.address).not.toBe(d2.address);
    });
  });

  describe('recover', () => {
    it('recovers a wallet with the same salt', () => {
      const original = EmbeddedWallet.create('w1', 'email', 'alice@example.com');
      const recovered = EmbeddedWallet.recover('w1', 'email', 'alice@example.com', original.salt);
      expect(recovered.exportPrivateKey()).toBe(original.exportPrivateKey());
    });
  });

  describe('getAccount', () => {
    it('returns address and compressed public key', () => {
      const wallet = EmbeddedWallet.create('w1', 'email', 'alice@example.com');
      const account = wallet.getAccount();
      expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(account.publicKey.length).toBe(66); // compressed = 33 bytes = 66 hex
    });

    it('returns the same address across calls', () => {
      const wallet = EmbeddedWallet.create('w1', 'email', 'alice@example.com');
      const a1 = wallet.getAccount();
      const a2 = wallet.getAccount();
      expect(a1.address).toBe(a2.address);
      expect(a1.publicKey).toBe(a2.publicKey);
    });
  });

  describe('signTransaction', () => {
    it('signs hex transaction data', () => {
      const wallet = EmbeddedWallet.create('w1', 'email', 'alice@example.com');
      const tx: UnsignedTransaction = { data: 'deadbeef' };
      const sig: SignedTransaction = wallet.signTransaction(tx);
      expect(sig.data).toBe('deadbeef');
      expect(sig.signature.length).toBe(128); // 64 bytes hex
      expect(sig.publicKey).toBeDefined();
    });

    it('signs Uint8Array transaction data', () => {
      const wallet = EmbeddedWallet.create('w1', 'email', 'alice@example.com');
      const tx: UnsignedTransaction = { data: new Uint8Array([0xde, 0xad]) };
      const sig = wallet.signTransaction(tx);
      expect(sig.signature.length).toBe(128);
    });

    it('produces different signatures for different data', () => {
      const wallet = EmbeddedWallet.create('w1', 'email', 'alice@example.com');
      const s1 = wallet.signTransaction({ data: 'aaaa' });
      const s2 = wallet.signTransaction({ data: 'bbbb' });
      expect(s1.signature).not.toBe(s2.signature);
    });

    it('produces recoverable signatures', () => {
      const wallet = EmbeddedWallet.create('w1', 'email', 'alice@example.com');
      const sig = wallet.signTransaction({ data: 'cafebabe' });
      // recoverable = 65 bytes = 130 hex chars
      expect(sig.signatureRecoverable.length).toBe(130);
    });
  });
});

// ─── WalletManager ───────────────────────────────────────────────────────

describe('WalletManager', () => {
  let lsMock: ReturnType<typeof mockLocalStorage>;

  beforeEach(() => {
    lsMock = mockLocalStorage();
  });

  describe('create', () => {
    it('creates a wallet session', async () => {
      const manager = new WalletManager(makeConfig());
      const session = await manager.create('email', 'alice@example.com', 'Alice');
      expect(session.walletId).toBeDefined();
      expect(session.authMethod).toBe('email');
      expect(session.identifier).toBe('alice@example.com');
    });

    it('creates two wallets for same identifier (random walletId)', async () => {
      const manager = new WalletManager(makeConfig());
      const s1 = await manager.create('email', 'alice@example.com');
      const s2 = await manager.create('email', 'alice@example.com');
      // Each create generates a unique walletId
      expect(s1.walletId).not.toBe(s2.walletId);
    });
  });

  describe('login', () => {
    it('logs in to an existing wallet', async () => {
      const manager = new WalletManager(makeConfig());
      await manager.create('email', 'alice@example.com');
      const session = await manager.login('alice@example.com');
      expect(session.walletId).toBeDefined();
    });

    it('throws if no wallet found', async () => {
      const manager = new WalletManager(makeConfig());
      await expect(manager.login('nobody@example.com')).rejects.toThrow('No wallet found');
    });
  });

  describe('logout', () => {
    it('logs out a specific wallet', async () => {
      const manager = new WalletManager(makeConfig());
      const session = await manager.create('email', 'alice@example.com');
      manager.logout(session.walletId);
      expect(manager.getWallet(session.walletId)).toBeUndefined();
    });

    it('clears all sessions', async () => {
      const manager = new WalletManager(makeConfig());
      await manager.create('email', 'alice@example.com');
      await manager.create('email', 'bob@example.com');
      manager.logout();
      // Both should be gone
    });
  });

  describe('listWallets', () => {
    it('returns all wallets', async () => {
      const manager = new WalletManager(makeConfig());
      await manager.create('email', 'alice@example.com');
      await manager.create('email', 'bob@example.com');
      const list = await manager.listWallets();
      expect(list.length).toBeGreaterThanOrEqual(2);
    });

    it('filters by identifier', async () => {
      const manager = new WalletManager(makeConfig());
      await manager.create('email', 'alice@example.com');
      await manager.create('email', 'bob@example.com');
      const list = await manager.listWallets('alice@example.com');
      expect(list.length).toBe(1);
      expect(list[0].identifier).toBe('alice@example.com');
    });
  });

  describe('linkProvider', () => {
    it('links a new provider', async () => {
      const manager = new WalletManager(makeConfig());
      const session = await manager.create('email', 'alice@example.com');
      const lp = await manager.linkProvider(session.walletId, 'google', 'g_123');
      expect(lp.provider).toBe('google');
      expect(lp.externalId).toBe('g_123');
    });

    it('returns existing link on duplicate', async () => {
      const manager = new WalletManager(makeConfig());
      const session = await manager.create('email', 'alice@example.com');
      const lp1 = await manager.linkProvider(session.walletId, 'google', 'g_123');
      const lp2 = await manager.linkProvider(session.walletId, 'google', 'g_123');
      expect(lp1.providerId).toBe(lp2.providerId);
    });

    it('throws if wallet not found', async () => {
      const manager = new WalletManager(makeConfig());
      await expect(manager.linkProvider('nonexistent', 'google', 'g_123')).rejects.toThrow('Wallet not found');
    });
  });

  describe('unlinkProvider', () => {
    it('removes a linked provider', async () => {
      const manager = new WalletManager(makeConfig());
      const session = await manager.create('email', 'alice@example.com');
      const lp = await manager.linkProvider(session.walletId, 'google', 'g_123');
      await manager.unlinkProvider(session.walletId, lp.providerId);
      // Second unlink should fail
      await expect(manager.unlinkProvider(session.walletId, lp.providerId)).rejects.toThrow('Provider link not found');
    });

    it('throws if wallet not found', async () => {
      const manager = new WalletManager(makeConfig());
      await expect(manager.unlinkProvider('nonexistent', 'lp_foo')).rejects.toThrow('Wallet not found');
    });
  });

  describe('getWallet', () => {
    it('returns undefined for non-existent wallet', () => {
      const manager = new WalletManager(makeConfig());
      expect(manager.getWallet('nope')).toBeUndefined();
    });

    it('returns wallet after login', async () => {
      const manager = new WalletManager(makeConfig());
      const session = await manager.create('email', 'alice@example.com');
      const wallet = manager.getWallet(session.walletId);
      expect(wallet).toBeDefined();
      expect(wallet?.walletId).toBe(session.walletId);
    });
  });
});
