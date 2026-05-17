/**
 * Polkadot Chain Adapter tests.
 *
 * Tests cover SS58 address validation, balance conversion, transaction building,
 * and utility functions without requiring a live wallet or RPC connection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PolkadotChainAdapter,
  POLKADOT_CHAINS,
  POLKADOT_WALLETS,
  decodeSS58,
  isValidSS58Address,
} from '../../src/adapters/polkadot.js';

/* ------------------------------------------------------------------ */
/*  SS58 Address Validation                                            */
/* ------------------------------------------------------------------ */

describe('isValidSS58Address', () => {
  it('accepts valid SS58 addresses', () => {
    // Polkadot (prefix 0)
    expect(isValidSS58Address('13KjEoTnVdVrZJzKjLzN1KjEoTnVdVrZJzKjLzN1KjEoTnVd')).toBe(true);
    // Kusama (prefix 2)
    expect(isValidSS58Address('HNZata7iMYWmk5RvZRTiAsSDhV8366zq2YGb3tLH5Upf74F')).toBe(true);
    // Generic (prefix 42)
    expect(isValidSS58Address('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')).toBe(true);
  });

  it('rejects empty and too-short addresses', () => {
    expect(isValidSS58Address('')).toBe(false);
    expect(isValidSS58Address('short')).toBe(false);
    expect(isValidSS58Address('1234567890123456789012345678901234567890123456')).toBe(false);
  });

  it('rejects addresses with invalid base58 characters', () => {
    expect(isValidSS58Address('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQ!')).toBe(false);
  });

  it('rejects non-string inputs', () => {
    expect(isValidSS58Address(123 as unknown as string)).toBe(false);
  });
});

describe('decodeSS58', () => {
  it('decodes valid SS58 addresses', () => {
    // Generic address with prefix 42 (0x2a)
    const addr = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const result = decodeSS58(addr);
    expect(result).not.toBeNull();
    expect(result!.publicKey.length).toBe(64); // 32 bytes as hex
  });

  it('returns null for invalid addresses', () => {
    expect(decodeSS58('')).toBeNull();
    expect(decodeSS58('short')).toBeNull();
    expect(decodeSS58('invalidSS58address!!')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  Chain Presets                                                      */
/* ------------------------------------------------------------------ */

describe('POLKADOT_CHAINS', () => {
  it('includes mainnet and testnets', () => {
    expect(POLKADOT_CHAINS.length).toBe(3);
    expect(POLKADOT_CHAINS[0].name).toBe('Polkadot');
    expect(POLKADOT_CHAINS[1].name).toBe('Kusama');
    expect(POLKADOT_CHAINS[2].name).toContain('Westend');
  });

  it('has correct native currencies', () => {
    expect(POLKADOT_CHAINS[0].nativeCurrency?.symbol).toBe('DOT');
    expect(POLKADOT_CHAINS[0].nativeCurrency?.decimals).toBe(10);
    expect(POLKADOT_CHAINS[1].nativeCurrency?.symbol).toBe('KSM');
    expect(POLKADOT_CHAINS[1].nativeCurrency?.decimals).toBe(12);
  });

  it('has valid RPC and explorer URLs', () => {
    POLKADOT_CHAINS.forEach((chain) => {
      expect(chain.rpcUrl).toMatch(/^wss?:\/\//);
      expect(chain.explorerUrl).toMatch(/^https?:\/\//);
    });
  });
});

describe('POLKADOT_WALLETS', () => {
  it('includes major Polkadot wallets', () => {
    const ids = POLKADOT_WALLETS.map((w) => w.id);
    expect(ids).toContain('polkadotjs');
    expect(ids).toContain('talisman');
    expect(ids).toContain('subwallet');
  });
});

/* ------------------------------------------------------------------ */
/*  Adapter Instance                                                   */
/* ------------------------------------------------------------------ */

describe('PolkadotChainAdapter', () => {
  let adapter: PolkadotChainAdapter;

  beforeEach(() => {
    adapter = new PolkadotChainAdapter();
  });

  it('has correct identity', () => {
    expect(adapter.id).toBe('polkadot-adapter');
    expect(adapter.name).toBe('Polkadot Chain Adapter');
  });

  it('registers chains', () => {
    adapter.registerChains(POLKADOT_CHAINS);
    expect(adapter.findChainById('polkadot:91b171bb158e2d3848fa23a9f1c25182')).toBeDefined();
  });

  it('sets RPC URL', () => {
    adapter.setRpcUrl('wss://custom.polkadot.rpc');
  });

  it('returns empty accounts when not connected', async () => {
    const accounts = await adapter.getAccounts();
    expect(accounts).toEqual([]);
  });

  it('returns null address when not connected', () => {
    expect(adapter.getAddress()).toBeNull();
  });

  it('switches chain', async () => {
    adapter.registerChains(POLKADOT_CHAINS);
    await expect(adapter.switchChain(1)).resolves.not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/*  Unit Conversion                                                    */
/* ------------------------------------------------------------------ */

describe('PolkadotChainAdapter plancksToDOT', () => {
  it('converts whole numbers', () => {
    expect(PolkadotChainAdapter.plancksToDOT('10000000000')).toBe('1');
    expect(PolkadotChainAdapter.plancksToDOT('50000000000')).toBe('5');
  });

  it('converts fractional numbers', () => {
    expect(PolkadotChainAdapter.plancksToDOT('12345678901')).toBe('1.2345678901');
    expect(PolkadotChainAdapter.plancksToDOT('10000000001')).toBe('1.0000000001');
  });

  it('handles zero', () => {
    expect(PolkadotChainAdapter.plancksToDOT('0')).toBe('0');
  });
});

describe('PolkadotChainAdapter dotToPlancks', () => {
  it('converts whole numbers', () => {
    expect(PolkadotChainAdapter.dotToPlancks('1')).toBe('10000000000');
    expect(PolkadotChainAdapter.dotToPlancks('5')).toBe('50000000000');
  });

  it('converts fractional numbers', () => {
    expect(PolkadotChainAdapter.dotToPlancks('1.2345678901')).toBe('12345678901');
  });

  it('handles zero', () => {
    expect(PolkadotChainAdapter.dotToPlancks('0')).toBe('0');
  });
});

/* ------------------------------------------------------------------ */
/*  Transaction Building                                               */
/* ------------------------------------------------------------------ */

describe('PolkadotChainAdapter buildTransfer', () => {
  let adapter: PolkadotChainAdapter;
  beforeEach(() => { adapter = new PolkadotChainAdapter(); });

  it('builds a valid DOT transfer', () => {
    const tx = adapter.buildTransfer(
      '13KjEoTnVdVrZJzKjLzN1KjEoTnVdVrZJzKjLzN1KjEoTnVd',
      '10000000000',
    );
    expect(tx.to).toBe('13KjEoTnVdVrZJzKjLzN1KjEoTnVdVrZJzKjLzN1KjEoTnVd');
    expect(tx.value).toBe('10000000000');
  });

  it('throws on invalid recipient', () => {
    expect(() =>
      adapter.buildTransfer('invalid-address', '10000000000'),
    ).toThrow('Invalid recipient address');
  });
});

describe('PolkadotChainAdapter buildAssetTransfer', () => {
  let adapter: PolkadotChainAdapter;
  beforeEach(() => { adapter = new PolkadotChainAdapter(); });

  it('builds an asset transfer', () => {
    const tx = adapter.buildAssetTransfer({
      assetId: '1984',
      to: '13KjEoTnVdVrZJzKjLzN1KjEoTnVdVrZJzKjLzN1KjEoTnVd',
      amount: '1000000',
    });
    expect(tx.to).toBe('13KjEoTnVdVrZJzKjLzN1KjEoTnVdVrZJzKjLzN1KjEoTnVd');
    expect(tx.value).toBe('1000000');
    expect(tx.memo).toBe('asset:1984');
  });

  it('throws on invalid recipient', () => {
    expect(() =>
      adapter.buildAssetTransfer({
        assetId: '1984',
        to: 'invalid',
        amount: '100',
      }),
    ).toThrow('Invalid recipient address');
  });
});

/* ------------------------------------------------------------------ */
/*  Balance Formatting                                                 */
/* ------------------------------------------------------------------ */

describe('PolkadotChainAdapter getBalanceFormatted', () => {
  let adapter: PolkadotChainAdapter;
  beforeEach(() => { adapter = new PolkadotChainAdapter(); });

  it('throws on invalid address', async () => {
    await expect(adapter.getBalanceFormatted('invalid')).rejects.toThrow('Invalid Polkadot address');
  });
});

/* ------------------------------------------------------------------ */
/*  getAssetBalance                                                    */
/* ------------------------------------------------------------------ */

describe('PolkadotChainAdapter getAssetBalance', () => {
  let adapter: PolkadotChainAdapter;
  beforeEach(() => { adapter = new PolkadotChainAdapter(); });

  it('throws on invalid address', async () => {
    await expect(adapter.getAssetBalance('1984', 'invalid')).rejects.toThrow('Invalid Polkadot address');
  });
});

/* ------------------------------------------------------------------ */
/*  sendTransaction                                                    */
/* ------------------------------------------------------------------ */

describe('PolkadotChainAdapter sendTransaction', () => {
  let adapter: PolkadotChainAdapter;
  beforeEach(() => { adapter = new PolkadotChainAdapter(); });

  it('throws when no provider', async () => {
    await expect(
      adapter.sendTransaction({ to: '13KjEoTnVdVrZJzKjLzN1KjEoTnVdVrZJzKjLzN1KjEoTnVd', value: '1000' }),
    ).rejects.toThrow('No provider connected');
  });
});

/* ------------------------------------------------------------------ */
/*  signMessage                                                        */
/* ------------------------------------------------------------------ */

describe('PolkadotChainAdapter signMessage', () => {
  let adapter: PolkadotChainAdapter;
  beforeEach(() => { adapter = new PolkadotChainAdapter(); });

  it('throws when no provider', async () => {
    await expect(adapter.signMessage('hello')).rejects.toThrow('does not support message signing');
  });
});
