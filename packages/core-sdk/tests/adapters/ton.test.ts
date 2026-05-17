/**
 * TON Chain Adapter tests.
 *
 * Tests cover address validation, balance formatting, transaction building,
 * and utility functions without requiring a live wallet or RPC connection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TONChainAdapter,
  TON_CHAINS,
  TON_WALLETS,
  isValidTONAddress,
  parseTONAddress,
  hexToBase64url,
  base64urlToHex,
} from '../../src/adapters/ton.js';

/* ------------------------------------------------------------------ */
/*  Address Validation                                                 */
/* ------------------------------------------------------------------ */

describe('isValidTONAddress', () => {
  it('accepts valid friendly-format addresses', () => {
    // 48-character base64url address
    expect(isValidTONAddress('EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N')).toBe(true);
    expect(isValidTONAddress('UQAa0T-RY2o3uA1234567890ABCDEFGHIJKLMNOPQRSTUVWX')).toBe(true);
  });

  it('accepts valid raw-format addresses', () => {
    expect(isValidTONAddress('0:a4db283296e466b94542c933e2e17d68b2c79e90d4c7d4b4e2d4c4e8c4c4c4c4')).toBe(true);
    expect(isValidTONAddress('-1:0000000000000000000000000000000000000000000000000000000000000000')).toBe(true);
  });

  it('rejects invalid addresses', () => {
    expect(isValidTONAddress('')).toBe(false);
    expect(isValidTONAddress('EQshort')).toBe(false);
    expect(isValidTONAddress('not-a-ton-address')).toBe(false);
    expect(isValidTONAddress('0x1234567890abcdef')).toBe(false);
    expect(isValidTONAddress(123 as unknown as string)).toBe(false);
  });

  it('rejects addresses with invalid base64url characters', () => {
    expect(isValidTONAddress('EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2!')).toBe(false);
  });
});

describe('parseTONAddress', () => {
  it('parses raw format addresses', () => {
    const result = parseTONAddress('0:a4db283296e466b94542c933e2e17d68b2c79e90d4c7d4b4e2d4c4e8c4c4c4c4');
    expect(result).not.toBeNull();
    expect(result!.workchain).toBe(0);
    expect(result!.hashHex).toBe('a4db283296e466b94542c933e2e17d68b2c79e90d4c7d4b4e2d4c4e8c4c4c4c4');
  });

  it('returns null for invalid addresses', () => {
    expect(parseTONAddress('')).toBeNull();
    expect(parseTONAddress('invalid')).toBeNull();
  });
});

describe('hexToBase64url / base64urlToHex', () => {
  it('round-trips hex values', () => {
    const hex = 'a4db283296e466b9';
    const b64 = hexToBase64url(hex);
    expect(base64urlToHex(b64)).toBe(hex);
  });

  it('produces base64url-safe output', () => {
    const hex = 'ffffff0000';
    const b64 = hexToBase64url(hex);
    // Should not contain + or / or =
    expect(b64).not.toContain('+');
    expect(b64).not.toContain('/');
    expect(b64).not.toContain('=');
  });
});

/* ------------------------------------------------------------------ */
/*  Chain Presets                                                      */
/* ------------------------------------------------------------------ */

describe('TON_CHAINS', () => {
  it('includes mainnet and testnet', () => {
    expect(TON_CHAINS.length).toBe(2);
    expect(TON_CHAINS[0].name).toContain('Mainnet');
    expect(TON_CHAINS[1].name).toContain('Testnet');
  });

  it('has correct native currency', () => {
    expect(TON_CHAINS[0].nativeCurrency?.symbol).toBe('TON');
    expect(TON_CHAINS[0].nativeCurrency?.decimals).toBe(9);
  });

  it('has valid RPC and explorer URLs', () => {
    TON_CHAINS.forEach((chain) => {
      expect(chain.rpcUrl).toMatch(/^https?:\/\//);
      expect(chain.explorerUrl).toMatch(/^https?:\/\//);
    });
  });
});

describe('TON_WALLETS', () => {
  it('includes major TON wallets', () => {
    const ids = TON_WALLETS.map((w) => w.id);
    expect(ids).toContain('tonkeeper');
    expect(ids).toContain('openmask');
  });
});

/* ------------------------------------------------------------------ */
/*  Adapter Instance                                                   */
/* ------------------------------------------------------------------ */

describe('TONChainAdapter', () => {
  let adapter: TONChainAdapter;

  beforeEach(() => {
    adapter = new TONChainAdapter();
  });

  it('has correct identity', () => {
    expect(adapter.id).toBe('ton-adapter');
    expect(adapter.name).toBe('TON Chain Adapter');
  });

  it('registers chains', () => {
    adapter.registerChains(TON_CHAINS);
    expect(adapter.findChainById('ton:-239c12f4f657778e')).toBeDefined();
  });

  it('sets RPC URL', () => {
    adapter.setRpcUrl('https://custom.ton.rpc');
    // Can't directly test private field, but no error means success
  });

  it('returns empty accounts when not connected', async () => {
    const accounts = await adapter.getAccounts();
    expect(accounts).toEqual([]);
  });

  it('returns null address when not connected', () => {
    expect(adapter.getAddress()).toBeNull();
  });

  it('switches chain', async () => {
    adapter.registerChains(TON_CHAINS);
    await expect(adapter.switchChain(1)).resolves.not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/*  Unit Conversion                                                    */
/* ------------------------------------------------------------------ */

describe('TONChainAdapter nanotonsToTON', () => {
  it('converts whole numbers', () => {
    expect(TONChainAdapter.nanotonsToTON('1000000000')).toBe('1');
    expect(TONChainAdapter.nanotonsToTON('5000000000')).toBe('5');
  });

  it('converts fractional numbers', () => {
    expect(TONChainAdapter.nanotonsToTON('1234567890')).toBe('1.23456789');
    expect(TONChainAdapter.nanotonsToTON('1000000001')).toBe('1.000000001');
  });

  it('handles zero', () => {
    expect(TONChainAdapter.nanotonsToTON('0')).toBe('0');
  });
});

describe('TONChainAdapter tonToNanotons', () => {
  it('converts whole numbers', () => {
    expect(TONChainAdapter.tonToNanotons('1')).toBe('1000000000');
    expect(TONChainAdapter.tonToNanotons('5')).toBe('5000000000');
  });

  it('converts fractional numbers', () => {
    expect(TONChainAdapter.tonToNanotons('1.23456789')).toBe('1234567890');
  });

  it('handles zero', () => {
    expect(TONChainAdapter.tonToNanotons('0')).toBe('0');
  });
});

/* ------------------------------------------------------------------ */
/*  Transaction Building                                               */
/* ------------------------------------------------------------------ */

describe('TONChainAdapter buildTransfer', () => {
  let adapter: TONChainAdapter;
  beforeEach(() => { adapter = new TONChainAdapter(); });

  it('builds a valid transfer', () => {
    const tx = adapter.buildTransfer(
      'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N',
      '1000000000',
    );
    expect(tx.to).toBe('EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N');
    expect(tx.value).toBe('1000000000');
  });

  it('throws on invalid recipient', () => {
    expect(() =>
      adapter.buildTransfer('invalid-address', '1000000000'),
    ).toThrow('Invalid recipient address');
  });
});

describe('TONChainAdapter buildJettonTransfer', () => {
  let adapter: TONChainAdapter;
  beforeEach(() => { adapter = new TONChainAdapter(); });

  it('builds a jetton transfer', () => {
    const tx = adapter.buildJettonTransfer({
      jettonMaster: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N',
      to: 'UQAa0T-RY2o3uA1234567890ABCDEFGHIJKLMNOPQRSTUVWX',
      amount: '1000000',
    });
    expect(tx.to).toBe('EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N');
    expect(tx.value).toBe('50000000'); // gas
    expect(tx.body).toBeDefined();
  });

  it('throws on invalid jetton master', () => {
    expect(() =>
      adapter.buildJettonTransfer({
        jettonMaster: 'invalid',
        to: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N',
        amount: '100',
      }),
    ).toThrow('Invalid jetton master address');
  });
});

/* ------------------------------------------------------------------ */
/*  Balance Formatting                                                 */
/* ------------------------------------------------------------------ */

describe('TONChainAdapter getBalanceFormatted', () => {
  let adapter: TONChainAdapter;
  beforeEach(() => { adapter = new TONChainAdapter(); });

  it('throws on invalid address', async () => {
    await expect(adapter.getBalanceFormatted('invalid')).rejects.toThrow('Invalid TON address');
  });
});

/* ------------------------------------------------------------------ */
/*  sendTransaction                                                    */
/* ------------------------------------------------------------------ */

describe('TONChainAdapter sendTransaction', () => {
  let adapter: TONChainAdapter;
  beforeEach(() => { adapter = new TONChainAdapter(); });

  it('throws when no provider', async () => {
    await expect(
      adapter.sendTransaction({ to: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N', value: '1000' }),
    ).rejects.toThrow('No provider connected');
  });
});

/* ------------------------------------------------------------------ */
/*  signMessage                                                        */
/* ------------------------------------------------------------------ */

describe('TONChainAdapter signMessage', () => {
  let adapter: TONChainAdapter;
  beforeEach(() => { adapter = new TONChainAdapter(); });

  it('throws when no provider', async () => {
    await expect(adapter.signMessage('hello')).rejects.toThrow('No provider connected');
  });
});
