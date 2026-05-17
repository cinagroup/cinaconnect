/**
 * TRON Chain Adapter tests.
 *
 * Tests cover address validation, balance conversion, transaction building,
 * and utility functions without requiring a live wallet or RPC connection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TRONChainAdapter,
  TRON_CHAINS,
  TRON_WALLETS,
  isValidTRONAddress,
  base58ToHex,
  hexToBase58,
} from '../../src/adapters/tron.js';

/* ------------------------------------------------------------------ */
/*  Address Validation                                                 */
/* ------------------------------------------------------------------ */

describe('isValidTRONAddress', () => {
  it('accepts valid TRON addresses', () => {
    expect(isValidTRONAddress('TN2Y7e5RLkKz6kBPZHMoCjLpQJvGvCqTjZ')).toBe(true);
    expect(isValidTRONAddress('T9yD14Nj9j7xAB4dbGeiX9h8zzNUFroF6m')).toBe(true);
    expect(isValidTRONAddress('TKHuVq1oKVruCGLvqVexFs6dawKv6fQgFs')).toBe(true);
  });

  it('rejects addresses not starting with T', () => {
    expect(isValidTRONAddress('AN2Y7e5RLkKz6kBPZHMoCjLpQJvGvCqTjZ')).toBe(false);
  });

  it('rejects wrong-length addresses', () => {
    expect(isValidTRONAddress('TN2Y7e5RLkKz')).toBe(false);
    expect(isValidTRONAddress('TN2Y7e5RLkKz6kBPZHMoCjLpQJvGvCqTjZXX')).toBe(false);
  });

  it('rejects invalid base58 characters', () => {
    // 'O', 'I', 'l' are not in base58
    expect(isValidTRONAddress('TN2Y7e5RLkKz6kBPZHMoCjLpQJvGvCqTjO')).toBe(false);
  });

  it('rejects empty and non-string inputs', () => {
    expect(isValidTRONAddress('')).toBe(false);
    expect(isValidTRONAddress(123 as unknown as string)).toBe(false);
  });
});

describe('base58ToHex / hexToBase58', () => {
  it('round-trips a known TRON address', () => {
    const addr = 'TN2Y7e5RLkKz6kBPZHMoCjLpQJvGvCqTjZ';
    const hex = base58ToHex(addr);
    expect(hexToBase58(hex)).toBe(addr);
  });

  it('throws on invalid base58', () => {
    expect(() => base58ToHex('TN2Y!invalid')).toThrow('Invalid base58 character');
  });
});

/* ------------------------------------------------------------------ */
/*  Chain Presets                                                      */
/* ------------------------------------------------------------------ */

describe('TRON_CHAINS', () => {
  it('includes mainnet and testnets', () => {
    expect(TRON_CHAINS.length).toBe(3);
    expect(TRON_CHAINS[0].name).toContain('Mainnet');
    expect(TRON_CHAINS[1].name).toContain('Shasta');
    expect(TRON_CHAINS[2].name).toContain('Nile');
  });

  it('has correct native currency', () => {
    expect(TRON_CHAINS[0].nativeCurrency?.symbol).toBe('TRX');
    expect(TRON_CHAINS[0].nativeCurrency?.decimals).toBe(6);
  });

  it('has valid RPC and explorer URLs', () => {
    TRON_CHAINS.forEach((chain) => {
      expect(chain.rpcUrl).toMatch(/^https?:\/\//);
      expect(chain.explorerUrl).toMatch(/^https?:\/\//);
    });
  });
});

describe('TRON_WALLETS', () => {
  it('includes major TRON wallets', () => {
    const ids = TRON_WALLETS.map((w) => w.id);
    expect(ids).toContain('tronlink');
    expect(ids).toContain('trustwallet');
  });
});

/* ------------------------------------------------------------------ */
/*  Adapter Instance                                                   */
/* ------------------------------------------------------------------ */

describe('TRONChainAdapter', () => {
  let adapter: TRONChainAdapter;

  beforeEach(() => {
    adapter = new TRONChainAdapter();
  });

  it('has correct identity', () => {
    expect(adapter.id).toBe('tron-adapter');
    expect(adapter.name).toBe('TRON Chain Adapter');
  });

  it('registers chains', () => {
    adapter.registerChains(TRON_CHAINS);
    expect(adapter.findChainById('tron:0x2b6653dc')).toBeDefined();
  });

  it('sets RPC URL', () => {
    adapter.setRpcUrl('https://custom.tron.rpc');
  });

  it('returns empty accounts when not connected', async () => {
    const accounts = await adapter.getAccounts();
    expect(accounts).toEqual([]);
  });

  it('returns null address when not connected', () => {
    expect(adapter.getAddress()).toBeNull();
  });

  it('switches chain', async () => {
    adapter.registerChains(TRON_CHAINS);
    await expect(adapter.switchChain(1)).resolves.not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/*  Unit Conversion                                                    */
/* ------------------------------------------------------------------ */

describe('TRONChainAdapter sunToTRX', () => {
  it('converts whole numbers', () => {
    expect(TRONChainAdapter.sunToTRX('1000000')).toBe('1');
    expect(TRONChainAdapter.sunToTRX('5000000')).toBe('5');
  });

  it('converts fractional numbers', () => {
    expect(TRONChainAdapter.sunToTRX('1234567')).toBe('1.234567');
  });

  it('handles zero', () => {
    expect(TRONChainAdapter.sunToTRX('0')).toBe('0');
  });
});

describe('TRONChainAdapter trxToSun', () => {
  it('converts whole numbers', () => {
    expect(TRONChainAdapter.trxToSun('1')).toBe('1000000');
    expect(TRONChainAdapter.trxToSun('5')).toBe('5000000');
  });

  it('converts fractional numbers', () => {
    expect(TRONChainAdapter.trxToSun('1.234567')).toBe('1234567');
  });

  it('handles zero', () => {
    expect(TRONChainAdapter.trxToSun('0')).toBe('0');
  });
});

/* ------------------------------------------------------------------ */
/*  Transaction Building                                               */
/* ------------------------------------------------------------------ */

describe('TRONChainAdapter buildTransfer', () => {
  let adapter: TRONChainAdapter;
  beforeEach(() => { adapter = new TRONChainAdapter(); });

  it('builds a valid TRX transfer', () => {
    const tx = adapter.buildTransfer(
      'TN2Y7e5RLkKz6kBPZHMoCjLpQJvGvCqTjZ',
      '1000000',
    );
    expect(tx.to).toBe('TN2Y7e5RLkKz6kBPZHMoCjLpQJvGvCqTjZ');
    expect(tx.value).toBe('1000000');
  });

  it('throws on invalid recipient', () => {
    expect(() =>
      adapter.buildTransfer('invalid-address', '1000000'),
    ).toThrow('Invalid recipient address');
  });
});

describe('TRONChainAdapter buildTRC20Transfer', () => {
  let adapter: TRONChainAdapter;
  beforeEach(() => { adapter = new TRONChainAdapter(); });

  it('builds a TRC-20 transfer', () => {
    const tx = adapter.buildTRC20Transfer({
      contractAddress: 'TN2Y7e5RLkKz6kBPZHMoCjLpQJvGvCqTjZ',
      to: 'T9yD14Nj9j7xAB4dbGeiX9h8zzNUFroF6m',
      amount: '1000000',
    });
    expect(tx.to).toBe('TN2Y7e5RLkKz6kBPZHMoCjLpQJvGvCqTjZ');
    expect(tx.value).toBe('0');
    expect(tx.data).toMatch(/^0xa9059cbb/);
  });

  it('throws on invalid contract address', () => {
    expect(() =>
      adapter.buildTRC20Transfer({
        contractAddress: 'invalid',
        to: 'TN2Y7e5RLkKz6kBPZHMoCjLpQJvGvCqTjZ',
        amount: '100',
      }),
    ).toThrow('Invalid contract address');
  });
});

/* ------------------------------------------------------------------ */
/*  Balance Formatting                                                 */
/* ------------------------------------------------------------------ */

describe('TRONChainAdapter getBalanceFormatted', () => {
  let adapter: TRONChainAdapter;
  beforeEach(() => { adapter = new TRONChainAdapter(); });

  it('throws on invalid address', async () => {
    await expect(adapter.getBalanceFormatted('invalid')).rejects.toThrow('Invalid TRON address');
  });
});

/* ------------------------------------------------------------------ */
/*  sendTransaction                                                    */
/* ------------------------------------------------------------------ */

describe('TRONChainAdapter sendTransaction', () => {
  let adapter: TRONChainAdapter;
  beforeEach(() => { adapter = new TRONChainAdapter(); });

  it('throws when no provider', async () => {
    await expect(
      adapter.sendTransaction({ to: 'TN2Y7e5RLkKz6kBPZHMoCjLpQJvGvCqTjZ', value: '1000' }),
    ).rejects.toThrow('No provider connected');
  });
});

/* ------------------------------------------------------------------ */
/*  signMessage                                                        */
/* ------------------------------------------------------------------ */

describe('TRONChainAdapter signMessage', () => {
  let adapter: TRONChainAdapter;
  beforeEach(() => { adapter = new TRONChainAdapter(); });

  it('throws when no provider', async () => {
    await expect(adapter.signMessage('hello')).rejects.toThrow('does not support message signing');
  });
});
