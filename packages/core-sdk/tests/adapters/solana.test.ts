/**
 * Solana Chain Adapter tests.
 *
 * Tests cover address validation, base58 encoding/decoding, utility functions,
 * wallet info constants, and the SolanaChainAdapter class.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SolanaChainAdapter,
  SOLANA_WALLETS,
  SOLANA_CHAINS,
  isValidSolanaAddress,
  base58Decode,
} from '../../src/adapters/solana.js';

/* ------------------------------------------------------------------ */
/*  Address Validation                                                 */
/* ------------------------------------------------------------------ */

describe('isValidSolanaAddress', () => {
  it('accepts valid Solana addresses', () => {
    // Common Solana address format (base58, 32-44 chars)
    expect(
      isValidSolanaAddress('11111111111111111111111111111111'),
    ).toBe(true);
    expect(
      isValidSolanaAddress('So11111111111111111111111111111111111111112'),
    ).toBe(true);
    expect(
      isValidSolanaAddress('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'),
    ).toBe(true);
  });

  it('rejects addresses that are too short', () => {
    expect(isValidSolanaAddress('1234567890123456789012345678901')).toBe(false); // 31 chars
  });

  it('rejects addresses that are too long', () => {
    expect(
      isValidSolanaAddress('123456789012345678901234567890123456789012345'),
    ).toBe(false); // 45 chars
  });

  it('rejects addresses with invalid characters', () => {
    expect(isValidSolanaAddress('1234567890123456789012345678901i')).toBe(false); // 'i' not in base58
    expect(isValidSolanaAddress('1234567890123456789012345678901O')).toBe(false); // 'O' not in base58
    expect(isValidSolanaAddress('1234567890123456789012345678901l')).toBe(false); // 'l' not in base58
    expect(isValidSolanaAddress('012345678901234567890123456789012')).toBe(false); // '0' not in base58
  });

  it('rejects non-string input', () => {
    expect(isValidSolanaAddress(null as unknown as string)).toBe(false);
    expect(isValidSolanaAddress(undefined as unknown as string)).toBe(false);
    expect(isValidSolanaAddress(123 as unknown as string)).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidSolanaAddress('')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  Base58 Decoding                                                    */
/* ------------------------------------------------------------------ */

describe('base58Decode', () => {
  it('decodes valid base58 strings', () => {
    const result = base58Decode('1111');
    expect(result).toBeInstanceOf(Uint8Array);
    // '1111' decodes to [0, 0, 0, 0] (four leading '1's = four zero bytes)
    expect(result).toEqual(new Uint8Array([0, 0, 0, 0]));
  });

  it('decodes non-trivial base58', () => {
    // '2g' in base58: '2' is index 1, 'g' is index 39
    // num = 1 * 58 + 39 = 97 = 0x61 = 'a'
    const result = base58Decode('2g');
    expect(result.length).toBe(1);
    expect(result[0]).toBe(97);
  });

  it('throws on invalid characters', () => {
    expect(() => base58Decode('invalid0')).toThrow('Invalid base58 character');
    expect(() => base58Decode('bad!chars')).toThrow('Invalid base58 character');
  });
});

/* ------------------------------------------------------------------ */
/*  Utility Functions                                                  */
/* ------------------------------------------------------------------ */

describe('SolanaChainAdapter static utilities', () => {
  it('converts SOL to lamports', () => {
    expect(SolanaChainAdapter.solToLamports(1)).toBe(1000000000);
    expect(SolanaChainAdapter.solToLamports(0.001)).toBe(1000000);
    expect(SolanaChainAdapter.solToLamports(0)).toBe(0);
    expect(SolanaChainAdapter.solToLamports('0.5')).toBe(500000000);
  });

  it('converts lamports to SOL', () => {
    expect(SolanaChainAdapter.lamportsToSol(1000000000)).toBe('1');
    expect(SolanaChainAdapter.lamportsToSol(500000000)).toBe('0.5');
    expect(SolanaChainAdapter.lamportsToSol(0)).toBe('0');
  });
});

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

describe('Solana constants', () => {
  it('exports wallet info for Phantom, Solflare, Backpack', () => {
    expect(SOLANA_WALLETS).toHaveLength(3);
    const ids = SOLANA_WALLETS.map((w) => w.id);
    expect(ids).toContain('phantom');
    expect(ids).toContain('solflare');
    expect(ids).toContain('backpack');
  });

  it('wallet entries have required fields', () => {
    for (const wallet of SOLANA_WALLETS) {
      expect(wallet.name).toBeDefined();
      expect(wallet.rdns).toBeDefined();
      expect(wallet.icon).toBeDefined();
      expect(wallet.downloadUrl).toBeDefined();
    }
  });

  it('exports chain presets for mainnet, devnet, testnet', () => {
    expect(SOLANA_CHAINS).toHaveLength(3);
    const names = SOLANA_CHAINS.map((c) => c.name);
    expect(names).toContain('Solana Mainnet');
    expect(names).toContain('Solana Devnet');
    expect(names).toContain('Solana Testnet');
  });
});

/* ------------------------------------------------------------------ */
/*  SolanaChainAdapter - Configuration                                 */
/* ------------------------------------------------------------------ */

describe('SolanaChainAdapter configuration', () => {
  let adapter: SolanaChainAdapter;

  beforeEach(() => {
    adapter = new SolanaChainAdapter();
  });

  it('registers chains and finds them', () => {
    const chains = [
      {
        id: 'custom:sol',
        name: 'Custom SOL',
        rpcUrl: 'https://custom.solana',
        nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
        explorerUrl: 'https://custom.explorer',
        iconUrl: '',
      },
    ];
    adapter.registerChains(chains);
    expect(adapter.findChain('custom:sol')).toEqual(chains[0]);
    expect(adapter.findChain('nonexistent')).toBeUndefined();
  });

  it('sets custom RPC URL', () => {
    adapter.setRpcUrl('https://api.mainnet-beta.solana.com');
    // URL is used internally for RPC calls
  });

  it('returns null provider before setProvider', () => {
    expect(adapter.getProvider()).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  SolanaChainAdapter - Connection                                    */
/* ------------------------------------------------------------------ */

describe('SolanaChainAdapter connection', () => {
  let adapter: SolanaChainAdapter;

  beforeEach(() => {
    adapter = new SolanaChainAdapter();
  });

  it('returns null address before connection', () => {
    expect(adapter.getAddress()).toBeNull();
  });

  it('connect throws when no wallet in window', async () => {
    await expect(adapter.connect()).rejects.toThrow('No Solana wallet found');
  });

  it('connect throws for unrecognized wallet ID', async () => {
    await expect(adapter.connect('unknown-wallet')).rejects.toThrow(
      'No Solana wallet found',
    );
  });

  it('disconnect does not throw when not connected', async () => {
    await expect(adapter.disconnect()).resolves.toBeUndefined();
  });

  it('getAddress returns null without provider', () => {
    expect(adapter.getAddress()).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  SolanaChainAdapter - Balance (with mocked fetch)                  */
/* ------------------------------------------------------------------ */

describe('SolanaChainAdapter balance', () => {
  let adapter: SolanaChainAdapter;

  beforeEach(() => {
    adapter = new SolanaChainAdapter();
    vi.restoreAllMocks();
  });

  it('getBalance rejects invalid address', async () => {
    await expect(adapter.getBalance('invalid!address')).rejects.toThrow(
      'Invalid Solana address',
    );
  });

  it('getBalance uses RPC fallback', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          jsonrpc: '2.0',
          result: { value: 2000000000 },
        }),
    } as Response);

    const balance = await adapter.getBalance(
      'So11111111111111111111111111111111111111112',
    );
    expect(balance).toBe('2');
    expect(fetch).toHaveBeenCalled();
  });

  it('getBalance throws on RPC error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          jsonrpc: '2.0',
          error: { message: 'Method not found' },
        }),
    } as Response);

    await expect(
      adapter.getBalance('So11111111111111111111111111111111111111112'),
    ).rejects.toThrow('Method not found');
  });
});

/* ------------------------------------------------------------------ */
/*  SolanaChainAdapter - Transactions                                  */
/* ------------------------------------------------------------------ */

describe('SolanaChainAdapter transactions', () => {
  let adapter: SolanaChainAdapter;

  beforeEach(() => {
    adapter = new SolanaChainAdapter();
    vi.restoreAllMocks();
  });

  it('sendTransaction rejects when no provider', async () => {
    await expect(adapter.sendTransaction(new Uint8Array())).rejects.toThrow(
      'No provider connected',
    );
  });

  it('buildTransferInstruction validates addresses', () => {
    expect(() =>
      adapter.buildTransferInstruction('invalid!', 'So11111111111111111111111111111111111111112', 1000),
    ).toThrow('Invalid from address');

    expect(() =>
      adapter.buildTransferInstruction('So11111111111111111111111111111111111111112', 'invalid!', 1000),
    ).toThrow('Invalid to address');
  });

  it('buildTransferInstruction returns instruction object', () => {
    const from = '11111111111111111111111111111111';
    const to = '22222222222222222222222222222222';
    const instruction = adapter.buildTransferInstruction(from, to, 1000);

    expect(instruction).toHaveProperty('fromPubkey');
    expect(instruction).toHaveProperty('toPubkey');
    expect(instruction).toHaveProperty('lamports', 1000);
  });
});

/* ------------------------------------------------------------------ */
/*  SolanaChainAdapter - Message Signing                               */
/* ------------------------------------------------------------------ */

describe('SolanaChainAdapter message signing', () => {
  let adapter: SolanaChainAdapter;

  beforeEach(() => {
    adapter = new SolanaChainAdapter();
    vi.restoreAllMocks();
  });

  it('signMessage rejects when no provider', async () => {
    await expect(adapter.signMessage('hello')).rejects.toThrow(
      'No provider connected',
    );
  });

  it('signMessage rejects when provider does not support signing', async () => {
    const mockProvider = {
      publicKey: null,
      isConnected: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signTransaction: vi.fn(),
      signAllTransactions: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };
    adapter.setProvider(mockProvider as any);
    await expect(adapter.signMessage('hello')).rejects.toThrow(
      'Connected wallet does not support message signing',
    );
  });

  it('signMessage converts string to bytes and calls provider', async () => {
    const mockSignature = new Uint8Array([1, 2, 3, 4, 5]);
    const mockProvider = {
      publicKey: null,
      isConnected: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signTransaction: vi.fn(),
      signAllTransactions: vi.fn(),
      signMessage: vi.fn().mockResolvedValue({ signature: mockSignature }),
      on: vi.fn(),
      off: vi.fn(),
    };
    adapter.setProvider(mockProvider as any);

    const result = await adapter.signMessage('hello');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(mockProvider.signMessage).toHaveBeenCalled();
  });

  it('signMessage accepts Uint8Array directly', async () => {
    const mockSignature = new Uint8Array([10, 20, 30]);
    const mockProvider = {
      publicKey: null,
      isConnected: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signTransaction: vi.fn(),
      signAllTransactions: vi.fn(),
      signMessage: vi.fn().mockResolvedValue({ signature: mockSignature }),
      on: vi.fn(),
      off: vi.fn(),
    };
    adapter.setProvider(mockProvider as any);

    const msgBytes = new TextEncoder().encode('test');
    const result = await adapter.signMessage(msgBytes);
    expect(result).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/*  SolanaChainAdapter - SPL Token                                     */
/* ------------------------------------------------------------------ */

describe('SolanaChainAdapter SPL tokens', () => {
  let adapter: SolanaChainAdapter;

  beforeEach(() => {
    adapter = new SolanaChainAdapter();
  });

  it('buildSPLTransferInstruction returns instruction object', () => {
    const instruction = adapter.buildSPLTransferInstruction(
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      'source1111111111111111111111111111111111',
      'dest11111111111111111111111111111111111',
      'owner1111111111111111111111111111111111',
      1000000,
    );

    expect(instruction).toHaveProperty('mint');
    expect(instruction).toHaveProperty('source');
    expect(instruction).toHaveProperty('destination');
    expect(instruction).toHaveProperty('owner');
    expect(instruction).toHaveProperty('amount', 1000000);
  });

  it('buildSPLTransferInstruction handles bigint amount', () => {
    const instruction = adapter.buildSPLTransferInstruction(
      'mint11111111111111111111111111111111111',
      'src11111111111111111111111111111111111',
      'dst11111111111111111111111111111111111',
      'own11111111111111111111111111111111111',
      BigInt(999999),
    );

    expect(instruction).toHaveProperty('amount', 999999);
  });
});

/* ------------------------------------------------------------------ */
/*  SolanaChainAdapter - EIP-1193 Request                              */
/* ------------------------------------------------------------------ */

describe('SolanaChainAdapter request (EIP-1193)', () => {
  let adapter: SolanaChainAdapter;

  beforeEach(() => {
    adapter = new SolanaChainAdapter();
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jsonrpc: '2.0', result: { value: 0 } }),
    } as Response);
  });

  it('routes solana_getBalance correctly', async () => {
    const result = await adapter.request({
      method: 'solana_getBalance',
      params: ['So11111111111111111111111111111111111111112'],
    });
    expect(result).toBeDefined();
  });

  it('throws for unsupported methods', async () => {
    await expect(
      adapter.request({ method: 'solana_unknownMethod' }),
    ).rejects.toThrow('Unsupported Solana method');
  });
});

/* ------------------------------------------------------------------ */
/*  SolanaChainAdapter - bytesToBase58                                 */
/* ------------------------------------------------------------------ */

describe('SolanaChainAdapter internal base58 encoding', () => {
  let adapter: SolanaChainAdapter;

  beforeEach(() => {
    adapter = new SolanaChainAdapter();
    vi.restoreAllMocks();
  });

  it('encodes zero bytes as "1"', async () => {
    const mockSignature = new Uint8Array([0]);
    const mockProvider = {
      publicKey: null,
      isConnected: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signTransaction: vi.fn(),
      signAllTransactions: vi.fn(),
      signMessage: vi.fn().mockResolvedValue({ signature: mockSignature }),
      on: vi.fn(),
      off: vi.fn(),
    };
    adapter.setProvider(mockProvider as any);

    const result = await adapter.signMessage('test');
    expect(result).toBe('1');
  });
});
