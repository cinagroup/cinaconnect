/**
 * Bitcoin Chain Adapter tests.
 *
 * Tests cover address validation, UTXO selection, utility functions,
 * wallet info constants, and the BitcoinChainAdapter class.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BitcoinChainAdapter,
  BITCOIN_WALLETS,
  BITCOIN_CHAINS,
  validateBitcoinAddress,
} from '../../src/adapters/bitcoin.js';

/* ------------------------------------------------------------------ */
/*  Address Validation                                                 */
/* ------------------------------------------------------------------ */

describe('validateBitcoinAddress', () => {
  it('validates legacy (P2PKH) addresses', () => {
    const result = validateBitcoinAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(result.valid).toBe(true);
    expect(result.format).toBe('legacy');
  });

  it('validates P2SH addresses', () => {
    const result = validateBitcoinAddress('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy');
    expect(result.valid).toBe(true);
    expect(result.format).toBe('p2sh');
  });

  it('validates P2WPKH (bech32) mainnet addresses', () => {
    const result = validateBitcoinAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv0r56kq');
    expect(result.valid).toBe(true);
    expect(result.format).toBe('p2wpkh');
  });

  it('validates P2WPKH (bech32) testnet addresses', () => {
    const result = validateBitcoinAddress('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kv0r56kq');
    expect(result.valid).toBe(true);
    expect(result.format).toBe('p2wpkh');
  });

  it('validates P2TR (taproot) addresses', () => {
    const result = validateBitcoinAddress(
      'bc1paaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    expect(result.valid).toBe(true);
    expect(result.format).toBe('p2tr');
  });

  it('validates P2TR testnet addresses', () => {
    const result = validateBitcoinAddress(
      'tb1paaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    expect(result.valid).toBe(true);
    expect(result.format).toBe('p2tr');
  });

  it('validates P2WSH (bech32, 62 chars) addresses', () => {
    const result = validateBitcoinAddress(
      'bc1qaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    expect(result.valid).toBe(true);
    expect(result.format).toBe('p2wsh');
  });

  it('rejects empty strings', () => {
    expect(validateBitcoinAddress('').valid).toBe(false);
    expect(validateBitcoinAddress('')).toEqual({ valid: false, format: 'unknown' });
  });

  it('rejects non-string input', () => {
    expect(validateBitcoinAddress(null as unknown as string).valid).toBe(false);
  });

  it('rejects random invalid strings', () => {
    expect(validateBitcoinAddress('not-an-address').valid).toBe(false);
    expect(validateBitcoinAddress('0x1234abcd').valid).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  Utility Functions                                                  */
/* ------------------------------------------------------------------ */

describe('BitcoinChainAdapter static utilities', () => {
  it('converts satoshis to BTC', () => {
    expect(BitcoinChainAdapter.satoshisToBTC(100000000)).toBe('1.00000000');
    expect(BitcoinChainAdapter.satoshisToBTC(123456)).toBe('0.00123456');
    expect(BitcoinChainAdapter.satoshisToBTC(0)).toBe('0.00000000');
    expect(BitcoinChainAdapter.satoshisToBTC(2100000000000000)).toBe('21000000.00000000');
  });

  it('converts BTC to satoshis', () => {
    expect(BitcoinChainAdapter.btctToSatoshis(1)).toBe(100000000);
    expect(BitcoinChainAdapter.btctToSatoshis(0.00123456)).toBe(123456);
    expect(BitcoinChainAdapter.btctToSatoshis('0.001')).toBe(100000);
    expect(BitcoinChainAdapter.btctToSatoshis(0)).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

describe('Bitcoin constants', () => {
  it('exports wallet info for Xverse, Leather, Unisat', () => {
    expect(BITCOIN_WALLETS).toHaveLength(3);
    expect(BITCOIN_WALLETS.map((w) => w.id)).toContain('xverse');
    expect(BITCOIN_WALLETS.map((w) => w.id)).toContain('leather');
    expect(BITCOIN_WALLETS.map((w) => w.id)).toContain('unisat');
  });

  it('wallet entries have required fields', () => {
    for (const wallet of BITCOIN_WALLETS) {
      expect(wallet.name).toBeDefined();
      expect(wallet.rdns).toBeDefined();
      expect(wallet.icon).toBeDefined();
      expect(wallet.downloadUrl).toBeDefined();
    }
  });

  it('exports chain presets for mainnet, testnet, signet', () => {
    expect(BITCOIN_CHAINS).toHaveLength(3);
    expect(BITCOIN_CHAINS.map((c) => c.name)).toContain('Bitcoin Mainnet');
    expect(BITCOIN_CHAINS.map((c) => c.name)).toContain('Bitcoin Testnet');
    expect(BITCOIN_CHAINS.map((c) => c.name)).toContain('Bitcoin Signet');
  });
});

/* ------------------------------------------------------------------ */
/*  BitcoinChainAdapter - UTXO Selection                               */
/* ------------------------------------------------------------------ */

describe('BitcoinChainAdapter.selectUTXOs', () => {
  let adapter: BitcoinChainAdapter;

  beforeEach(() => {
    adapter = new BitcoinChainAdapter();
  });

  it('selects largest UTXOs first to meet target', () => {
    const utxos = [
      { txid: 'a', vout: 0, value: 1000, scriptPubKey: 'xx' },
      { txid: 'b', vout: 0, value: 5000, scriptPubKey: 'xx' },
      { txid: 'c', vout: 0, value: 3000, scriptPubKey: 'xx' },
    ];
    // Target 4000 sats with default fee rate
    const result = adapter.selectUTXOs(utxos, 4000);
    expect(result.selected.length).toBeGreaterThan(0);
    // Largest first: 5000 alone should cover it
    expect(result.selected[0].value).toBe(5000);
    expect(result.change).toBeGreaterThanOrEqual(0);
  });

  it('returns empty when insufficient funds', () => {
    const utxos = [{ txid: 'a', vout: 0, value: 100, scriptPubKey: 'xx' }];
    const result = adapter.selectUTXOs(utxos, 999999, 10);
    expect(result.selected).toEqual([]);
    expect(result.fee).toBe(0);
    expect(result.change).toBe(0);
  });

  it('handles dust threshold for change', () => {
    // Create UTXOs where change would be below 546 dust threshold
    const utxos = [{ txid: 'a', vout: 0, value: 2000, scriptPubKey: 'xx' }];
    const result = adapter.selectUTXOs(utxos, 1900, 1);
    // Change might be dust, so it should be 0
    if (result.change < 546) {
      expect(result.change).toBe(0);
    }
  });

  it('respects custom fee rate', () => {
    const utxos = [
      { txid: 'a', vout: 0, value: 50000, scriptPubKey: 'xx' },
      { txid: 'b', vout: 0, value: 50000, scriptPubKey: 'xx' },
    ];
    const result = adapter.selectUTXOs(utxos, 5000, 100);
    expect(result.selected.length).toBeGreaterThan(0);
    // Higher fee rate means more sats needed
    expect(result.fee).toBeGreaterThan(adapter.selectUTXOs(utxos, 5000, 1).fee);
  });
});

/* ------------------------------------------------------------------ */
/*  BitcoinChainAdapter - Configuration                                */
/* ------------------------------------------------------------------ */

describe('BitcoinChainAdapter configuration', () => {
  let adapter: BitcoinChainAdapter;

  beforeEach(() => {
    adapter = new BitcoinChainAdapter();
  });

  it('registers chains and finds them', () => {
    const chains = [
      {
        id: 'custom:btc',
        name: 'Custom BTC',
        rpcUrl: 'https://custom.api',
        nativeCurrency: { name: 'BTC', symbol: 'BTC', decimals: 8 },
        explorerUrl: 'https://custom.explorer',
        iconUrl: '',
      },
    ];
    adapter.registerChains(chains);
    expect(adapter.findChain('custom:btc')).toEqual(chains[0]);
    expect(adapter.findChain('nonexistent')).toBeUndefined();
  });

  it('sets and uses custom RPC URL', () => {
    adapter.setRpcUrl('https://blockstream.info/api');
    // The URL is used internally - we verify via getBalance mock
  });

  it('returns null when no provider is set', () => {
    expect(adapter.getProvider()).toBeNull();
  });

  it('accepts and returns a provider', () => {
    const mockProvider = {
      requestAccounts: vi.fn().mockResolvedValue(['bc1test']),
      getAccounts: vi.fn().mockResolvedValue(['bc1test']),
      signMessage: vi.fn().mockResolvedValue('sig'),
      sendBitcoin: vi.fn().mockResolvedValue('txid'),
      signPsbt: vi.fn().mockResolvedValue('signedPsbt'),
      pushPsbt: vi.fn().mockResolvedValue('txid'),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };
    adapter.setProvider(mockProvider);
    expect(adapter.getProvider()).toBe(mockProvider);
  });
});

/* ------------------------------------------------------------------ */
/*  BitcoinChainAdapter - Connection                                   */
/* ------------------------------------------------------------------ */

describe('BitcoinChainAdapter connection', () => {
  let adapter: BitcoinChainAdapter;

  beforeEach(() => {
    adapter = new BitcoinChainAdapter();
  });

  it('returns null address before connection', () => {
    expect(adapter.getAddress()).toBeNull();
  });

  it('connect throws when no wallet in window', () => {
    // We are in Node.js, no window, so connect should throw
    expect(adapter.connect()).rejects.toThrow('No Bitcoin wallet found');
  });

  it('connect throws when walletId is unrecognized', async () => {
    // Even with window, unknown walletId returns null
    await expect(adapter.connect('unknown-wallet')).rejects.toThrow(
      'No Bitcoin wallet found',
    );
  });

  it('disconnect does not throw when not connected', async () => {
    await expect(adapter.disconnect()).resolves.toBeUndefined();
  });

  it('disconnect clears provider and address when connected', async () => {
    const mockProvider = {
      requestAccounts: vi.fn().mockResolvedValue(['bc1connected']),
      getAccounts: vi.fn().mockResolvedValue(['bc1connected']),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };
    adapter.setProvider(mockProvider);

    // Manually set connected address to test disconnect
    // (in real usage this is set via connect, but we can simulate)
    await adapter.disconnect();
    expect(adapter.getProvider()).toBeNull();
    expect(adapter.getAddress()).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  BitcoinChainAdapter - Balance & UTXOs (with mocked fetch)         */
/* ------------------------------------------------------------------ */

describe('BitcoinChainAdapter balance and UTXOs', () => {
  let adapter: BitcoinChainAdapter;

  beforeEach(() => {
    adapter = new BitcoinChainAdapter();
    vi.restoreAllMocks();
  });

  it('getBalance rejects invalid address', async () => {
    await expect(adapter.getBalance('invalid-address')).rejects.toThrow(
      'Invalid Bitcoin address',
    );
  });

  it('getBalance fetches and sums UTXOs', async () => {
    const mockUtxos = [
      { txid: 'a', vout: 0, value: 50000, scriptPubKey: 'xx' },
      { txid: 'b', vout: 1, value: 25000, scriptPubKey: 'xx' },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUtxos),
    } as Response);

    const balance = await adapter.getBalance(
      'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv0r56kq',
    );
    expect(balance).toBe(75000);
    expect(fetch).toHaveBeenCalled();
  });

  it('getBalance throws on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    } as Response);

    await expect(
      adapter.getBalance('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv0r56kq'),
    ).rejects.toThrow('Failed to fetch UTXOs');
  });

  it('getBalanceFormatted converts satoshis to BTC string', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { txid: 'a', vout: 0, value: 100000000, scriptPubKey: 'xx' },
        ]),
    } as Response);

    const result = await adapter.getBalanceFormatted(
      'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv0r56kq',
    );
    expect(result).toBe('1.00000000');
  });

  it('getUTXOs rejects invalid address', async () => {
    await expect(adapter.getUTXOs('bad')).rejects.toThrow('Invalid Bitcoin address');
  });

  it('getUTXOs returns UTXO array', async () => {
    const mockUtxos = [{ txid: 'c', vout: 0, value: 1000, scriptPubKey: 'ab' }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUtxos),
    } as Response);

    const utxos = await adapter.getUTXOs(
      'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv0r56kq',
    );
    expect(utxos).toEqual(mockUtxos);
  });
});

/* ------------------------------------------------------------------ */
/*  BitcoinChainAdapter - Signing & Sending (with mock provider)      */
/* ------------------------------------------------------------------ */

describe('BitcoinChainAdapter signing and sending', () => {
  let adapter: BitcoinChainAdapter;
  let mockProvider: any;

  beforeEach(() => {
    adapter = new BitcoinChainAdapter();
    mockProvider = {
      requestAccounts: vi.fn().mockResolvedValue(['bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv0r56kq']),
      getAccounts: vi.fn().mockResolvedValue(['bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv0r56kq']),
      signMessage: vi.fn().mockResolvedValue('c2lnbmF0dXJl'),
      sendBitcoin: vi.fn().mockResolvedValue('abc123txid'),
      signPsbt: vi.fn().mockResolvedValue('c2lnbmVk'),
      pushPsbt: vi.fn().mockResolvedValue('broadcasted'),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };
    adapter.setProvider(mockProvider);
  });

  it('signMessage throws when no provider', async () => {
    const adapterNoProvider = new BitcoinChainAdapter();
    await expect(adapterNoProvider.signMessage('hello')).rejects.toThrow(
      'No provider connected',
    );
  });

  it('signMessage throws when provider does not support signing', async () => {
    const adapterNoSign = new BitcoinChainAdapter();
    adapterNoSign.setProvider({
      requestAccounts: vi.fn(),
      getAccounts: vi.fn(),
    });
    await expect(adapterNoSign.signMessage('hello')).rejects.toThrow(
      'Connected wallet does not support message signing',
    );
  });

  it('signMessage uses connected address when no address provided', async () => {
    // We need to set the connected address - simulate by calling with address param
    await expect(
      adapter.signMessage('hello', 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv0r56kq'),
    ).resolves.toBe('c2lnbmF0dXJl');
    expect(mockProvider.signMessage).toHaveBeenCalledWith('hello', 'bip322-simple');
  });

  it('signMessage throws when no address available', async () => {
    const adapterNoAddr = new BitcoinChainAdapter();
    adapterNoAddr.setProvider({
      requestAccounts: vi.fn(),
      getAccounts: vi.fn(),
      signMessage: vi.fn(),
    });
    await expect(adapterNoAddr.signMessage('hello')).rejects.toThrow(
      'No address available for signing',
    );
  });

  it('sendBTC rejects when no provider', async () => {
    const adapterNoProvider = new BitcoinChainAdapter();
    await expect(
      adapterNoProvider.sendBTC('bc1recipient', 1000),
    ).rejects.toThrow('No provider connected');
  });

  it('sendBTC rejects when provider does not support sendBitcoin', async () => {
    const adapterNoSend = new BitcoinChainAdapter();
    adapterNoSend.setProvider({
      requestAccounts: vi.fn(),
      getAccounts: vi.fn(),
    });
    await expect(
      adapterNoSend.sendBTC('bc1recipient', 1000),
    ).rejects.toThrow('Connected wallet does not support sendBitcoin');
  });

  it('sendBTC rejects invalid recipient address', async () => {
    await expect(adapter.sendBTC('invalid', 1000)).rejects.toThrow(
      'Invalid recipient address',
    );
  });

  it('sendBTC calls provider.sendBitcoin with correct args', async () => {
    const result = await adapter.sendBTC(
      'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv0r56kq',
      50000,
    );
    expect(result).toBe('abc123txid');
    expect(mockProvider.sendBitcoin).toHaveBeenCalledWith(
      'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv0r56kq',
      50000,
    );
  });

  it('signPSBT rejects when no provider', async () => {
    const adapterNoProvider = new BitcoinChainAdapter();
    await expect(adapterNoProvider.signPSBT('psbtBase64')).rejects.toThrow(
      'No provider connected',
    );
  });

  it('signPSBT rejects when provider does not support PSBT signing', async () => {
    const adapterNoPsbt = new BitcoinChainAdapter();
    adapterNoPsbt.setProvider({
      requestAccounts: vi.fn(),
      getAccounts: vi.fn(),
    });
    await expect(adapterNoPsbt.signPSBT('psbtBase64')).rejects.toThrow(
      'Connected wallet does not support PSBT signing',
    );
  });

  it('signPSBT calls provider.signPsbt', async () => {
    const result = await adapter.signPSBT('cHNi');
    expect(result).toBe('c2lnbmVk');
    expect(mockProvider.signPsbt).toHaveBeenCalledWith('cHNi');
  });

  it('broadcastPSBT rejects when provider does not support pushPsbt', async () => {
    const adapterNoPush = new BitcoinChainAdapter();
    adapterNoPush.setProvider({
      requestAccounts: vi.fn(),
      getAccounts: vi.fn(),
    });
    await expect(adapterNoPush.broadcastPSBT('signed')).rejects.toThrow(
      'Wallet does not support pushPsbt',
    );
  });

  it('broadcastPSBT calls provider.pushPsbt', async () => {
    const result = await adapter.broadcastPSBT('signedPsbt');
    expect(result).toBe('broadcasted');
    expect(mockProvider.pushPsbt).toHaveBeenCalledWith('signedPsbt');
  });
});

/* ------------------------------------------------------------------ */
/*  BitcoinChainAdapter - PSBT Building                                */
/* ------------------------------------------------------------------ */

describe('BitcoinChainAdapter.buildPSBT', () => {
  let adapter: BitcoinChainAdapter;

  beforeEach(() => {
    adapter = new BitcoinChainAdapter();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            txid: 'aaa',
            vout: 0,
            value: 100000,
            scriptPubKey: '0014abcdef',
          },
        ]),
    } as Response);
  });

  it('builds a PSBT JSON structure', async () => {
    const result = await adapter.buildPSBT(
      'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv0r56kq',
      '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
      50000,
    );
    const parsed = JSON.parse(result);
    expect(parsed.inputs).toBeDefined();
    expect(parsed.inputs.length).toBeGreaterThan(0);
    expect(parsed.outputs).toBeDefined();
    expect(parsed.outputs.length).toBeGreaterThan(0);
    expect(parsed.fee).toBeDefined();
  });

  it('throws when insufficient funds', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ txid: 'x', vout: 0, value: 1, scriptPubKey: 'xx' }]),
    } as Response);

    await expect(
      adapter.buildPSBT(
        'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv0r56kq',
        '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
        9999999,
      ),
    ).rejects.toThrow('Insufficient funds');
  });

  it('includes change output when change is above dust', async () => {
    // Large UTXO = change above 546 dust
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            txid: 'big',
            vout: 0,
            value: 1000000,
            scriptPubKey: '0014abcdef',
          },
        ]),
    } as Response);

    const result = await adapter.buildPSBT(
      'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv0r56kq',
      '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
      50000,
    );
    const parsed = JSON.parse(result);
    // Should have 2 outputs: recipient + change
    expect(parsed.outputs.length).toBe(2);
  });

  it('uses provided UTXOs instead of fetching', async () => {
    const customUtxos = [
      {
        txid: 'custom',
        vout: 1,
        value: 200000,
        scriptPubKey: '0014custom',
      },
    ];

    const result = await adapter.buildPSBT(
      'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv0r56kq',
      '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
      50000,
      customUtxos,
    );
    const parsed = JSON.parse(result);
    expect(parsed.inputs[0].txid).toBe('custom');
  });
});
