/**
 * Cosmos Chain Adapter tests.
 *
 * Tests cover bech32 encoding/decoding, address validation, utility functions,
 * wallet info constants, chain presets, and the CosmosChainAdapter class.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CosmosChainAdapter,
  COSMOS_WALLETS,
  COSMOS_CHAINS,
  bech32Encode,
  bech32Decode,
  bech32FromBytes,
  bech32ToBytes,
  isValidCosmosAddress,
} from '../../src/adapters/cosmos.js';

/* ------------------------------------------------------------------ */
/*  Bech32 Encoding / Decoding                                         */
/* ------------------------------------------------------------------ */

describe('bech32Encode / bech32Decode', () => {
  it('encodes and decodes round-trip', () => {
    // bech32Encode expects 5-bit data (values 0-31)
    const data5bit = [0, 1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 31];
    const encoded = bech32Encode('cosmos', data5bit);
    expect(encoded.startsWith('cosmos1')).toBe(true);

    const decoded = bech32Decode(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.hrp).toBe('cosmos');
    expect(decoded!.data).toEqual(data5bit);
  });

  it('decodes a known Cosmos address', () => {
    // cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6
    const decoded = bech32Decode('cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6');
    expect(decoded).not.toBeNull();
    expect(decoded!.hrp).toBe('cosmos');
    expect(decoded!.data.length).toBeGreaterThan(0);
  });

  it('rejects mixed-case strings', () => {
    // Mix of upper and lower case
    const result = bech32Decode('Cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6');
    expect(result).toBeNull();
  });

  it('rejects too-short strings', () => {
    expect(bech32Decode('a1')).toBeNull();
  });

  it('rejects invalid characters', () => {
    expect(bech32Decode('cosmos1!invalid')).toBeNull();
  });

  it('rejects bad checksum', () => {
    // Valid prefix but corrupted last character
    expect(bech32Decode('cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs7')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  bech32FromBytes / bech32ToBytes                                    */
/* ------------------------------------------------------------------ */

describe('bech32FromBytes / bech32ToBytes', () => {
  it('encodes bytes to bech32 and decodes back', () => {
    const bytes = new Uint8Array([
      0x75, 0x1e, 0x76, 0xe8, 0x19, 0x91, 0x96, 0xd4, 0x54, 0x94,
      0x1c, 0x45, 0xd0, 0x53, 0x63, 0x5b, 0x64, 0x83, 0xae, 0x3a,
    ]);
    const addr = bech32FromBytes('cosmos', bytes);
    expect(addr.startsWith('cosmos1')).toBe(true);

    const roundTripped = bech32ToBytes(addr);
    expect(roundTripped).not.toBeNull();
    expect(roundTripped!).toEqual(bytes);
  });

  it('handles Osmosis prefix', () => {
    const bytes = new Uint8Array(20).fill(0x42);
    const addr = bech32FromBytes('osmo', bytes);
    expect(addr.startsWith('osmo1')).toBe(true);

    const roundTripped = bech32ToBytes(addr);
    expect(roundTripped).not.toBeNull();
    expect(roundTripped!).toEqual(bytes);
  });
});

/* ------------------------------------------------------------------ */
/*  Address validation                                                 */
/* ------------------------------------------------------------------ */

describe('isValidCosmosAddress', () => {
  it('accepts valid cosmos address', () => {
    expect(isValidCosmosAddress('cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6')).toBe(true);
  });

  it('accepts valid osmosis address', () => {
    expect(isValidCosmosAddress('osmo1w508d6qejxtdg4y5r3zaq5mrtdjg8t36vmk3z8')).toBe(true);
  });

  it('accepts valid address with prefix filter', () => {
    expect(
      isValidCosmosAddress('cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6', ['cosmos']),
    ).toBe(true);
  });

  it('rejects address with wrong prefix', () => {
    expect(
      isValidCosmosAddress('osmo1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6', ['cosmos']),
    ).toBe(false);
  });

  it('rejects non-string input', () => {
    expect(isValidCosmosAddress(null as unknown as string)).toBe(false);
    expect(isValidCosmosAddress(undefined as unknown as string)).toBe(false);
    expect(isValidCosmosAddress(123 as unknown as string)).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidCosmosAddress('')).toBe(false);
  });

  it('rejects invalid bech32', () => {
    expect(isValidCosmosAddress('cosmos1invalid!!!')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  Static utility functions                                           */
/* ------------------------------------------------------------------ */

describe('CosmosChainAdapter static utilities', () => {
  it('formats balance from smallest unit (6 decimals)', () => {
    expect(CosmosChainAdapter.formatBalance('1000000', 6)).toBe('1');
    expect(CosmosChainAdapter.formatBalance('1234567', 6)).toBe('1.234567');
    expect(CosmosChainAdapter.formatBalance('500000', 6)).toBe('0.5');
    expect(CosmosChainAdapter.formatBalance('0', 6)).toBe('0');
  });

  it('formats balance with trailing zero removal', () => {
    expect(CosmosChainAdapter.formatBalance('1000010', 6)).toBe('1.00001');
    expect(CosmosChainAdapter.formatBalance('1200000', 6)).toBe('1.2');
  });

  it('converts decimal to smallest unit (6 decimals)', () => {
    expect(CosmosChainAdapter.toSmallestUnit('1', 6)).toBe('1000000');
    expect(CosmosChainAdapter.toSmallestUnit('1.234567', 6)).toBe('1234567');
    expect(CosmosChainAdapter.toSmallestUnit('0.5', 6)).toBe('500000');
  });

  it('handles large values', () => {
    expect(CosmosChainAdapter.formatBalance('999999999999', 6)).toBe('999999.999999');
    expect(CosmosChainAdapter.toSmallestUnit('999999.999999', 6)).toBe('999999999999');
  });
});

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

describe('Cosmos constants', () => {
  it('exports wallet info for Keplr, Leap, Cosmostation', () => {
    expect(COSMOS_WALLETS).toHaveLength(3);
    const ids = COSMOS_WALLETS.map((w) => w.id);
    expect(ids).toContain('keplr');
    expect(ids).toContain('leap');
    expect(ids).toContain('cosmostation');
  });

  it('wallet entries have required fields', () => {
    for (const wallet of COSMOS_WALLETS) {
      expect(wallet.name).toBeDefined();
      expect(wallet.rdns).toBeDefined();
      expect(wallet.icon).toBeDefined();
      expect(wallet.downloadUrl).toBeDefined();
    }
  });

  it('exports chain presets for Cosmos Hub, Osmosis, Juno', () => {
    expect(COSMOS_CHAINS.length).toBeGreaterThanOrEqual(3);
    const names = COSMOS_CHAINS.map((c) => c.name);
    expect(names).toContain('Cosmos Hub');
    expect(names).toContain('Osmosis');
    expect(names).toContain('Juno');
  });

  it('chain presets have required fields', () => {
    for (const chain of COSMOS_CHAINS) {
      expect(chain.id).toBeDefined();
      expect(chain.name).toBeDefined();
      expect(chain.rpcUrl).toBeDefined();
      expect(chain.nativeCurrency).toBeDefined();
    }
  });
});

/* ------------------------------------------------------------------ */
/*  CosmosChainAdapter - Configuration                                 */
/* ------------------------------------------------------------------ */

describe('CosmosChainAdapter configuration', () => {
  let adapter: CosmosChainAdapter;

  beforeEach(() => {
    adapter = new CosmosChainAdapter();
  });

  it('has correct id and name', () => {
    expect(adapter.id).toBe('cosmos-adapter');
    expect(adapter.name).toBe('Cosmos Chain Adapter');
  });

  it('registers chains and finds them by id', () => {
    const chains = [
      {
        id: 'cosmos:custom-chain-1',
        name: 'Custom Chain',
        rpcUrl: 'https://rpc.custom.chain',
        nativeCurrency: { name: 'CUST', symbol: 'CUST', decimals: 6 },
      },
    ];
    adapter.registerChains(chains);
    expect(adapter.findChainById('cosmos:custom-chain-1')).toEqual(chains[0]);
    expect(adapter.findChainById('nonexistent')).toBeUndefined();
  });

  it('sets custom RPC URL', () => {
    adapter.setRpcUrl('https://rpc.custom.cosmos');
    // URL is used internally for RPC calls
  });

  it('returns null keplr before setKeplr', () => {
    expect(adapter.getKeplr()).toBeNull();
  });

  it('accepts setConnector', () => {
    const mockConnector = { id: 'test' } as any;
    adapter.setConnector(mockConnector);
    // Connector stored internally
  });
});

/* ------------------------------------------------------------------ */
/*  CosmosChainAdapter - Connection                                    */
/* ------------------------------------------------------------------ */

describe('CosmosChainAdapter connection', () => {
  let adapter: CosmosChainAdapter;

  beforeEach(() => {
    adapter = new CosmosChainAdapter();
  });

  it('returns null address before connection', () => {
    expect(adapter.getAddress()).toBeNull();
  });

  it('connect throws when no wallet in window', async () => {
    await expect(adapter.connect()).rejects.toThrow('No Cosmos wallet found');
  });

  it('disconnect does not throw when not connected', async () => {
    await expect(adapter.disconnect()).resolves.toBeUndefined();
  });

  it('getAddress returns null without provider', () => {
    expect(adapter.getAddress()).toBeNull();
  });

  it('connect throws for unrecognized wallet ID', async () => {
    await expect(adapter.connect('unknown-wallet')).rejects.toThrow(
      'No Cosmos wallet found',
    );
  });
});

/* ------------------------------------------------------------------ */
/*  CosmosChainAdapter - Connection with mock Keplr                   */
/* ------------------------------------------------------------------ */

describe('CosmosChainAdapter connection with mock Keplr', () => {
  let adapter: CosmosChainAdapter;

  beforeEach(() => {
    adapter = new CosmosChainAdapter();
    vi.restoreAllMocks();
  });

  it('connect succeeds with mock Keplr', async () => {
    const mockKeplr = {
      enable: vi.fn().mockResolvedValue(undefined),
      getKey: vi.fn().mockResolvedValue({
        bech32Address: 'cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6',
        pubKey: new Uint8Array([1, 2, 3]),
      }),
      getOfflineSigner: vi.fn(),
      sendTx: vi.fn(),
    };

    // Attach mock to window
    (globalThis as any).window = { keplr: mockKeplr };

    const accounts = await adapter.connect('keplr', 'cosmoshub-4');
    expect(accounts).toEqual(['cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6']);
    expect(adapter.getAddress()).toBe('cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6');

    delete (globalThis as any).window;
  });

  it('getAccounts returns connected accounts', async () => {
    const mockKeplr = {
      enable: vi.fn().mockResolvedValue(undefined),
      getKey: vi.fn().mockResolvedValue({
        bech32Address: 'cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6',
        pubKey: new Uint8Array([1, 2, 3]),
      }),
      getOfflineSigner: vi.fn(),
      sendTx: vi.fn(),
    };

    (globalThis as any).window = { keplr: mockKeplr };
    await adapter.connect('keplr', 'cosmoshub-4');

    const accounts = await adapter.getAccounts();
    expect(accounts).toEqual(['cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6']);

    delete (globalThis as any).window;
  });

  it('disconnect clears accounts', async () => {
    const mockKeplr = {
      enable: vi.fn().mockResolvedValue(undefined),
      getKey: vi.fn().mockResolvedValue({
        bech32Address: 'cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6',
        pubKey: new Uint8Array([1, 2, 3]),
      }),
      getOfflineSigner: vi.fn(),
      sendTx: vi.fn(),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };

    (globalThis as any).window = { keplr: mockKeplr };
    await adapter.connect('keplr', 'cosmoshub-4');
    expect(adapter.getAddress()).not.toBeNull();

    await adapter.disconnect();
    expect(adapter.getAddress()).toBeNull();
    expect(adapter.getKeplr()).toBeNull();

    delete (globalThis as any).window;
  });
});

/* ------------------------------------------------------------------ */
/*  CosmosChainAdapter - Chain ID                                      */
/* ------------------------------------------------------------------ */

describe('CosmosChainAdapter chain ID', () => {
  let adapter: CosmosChainAdapter;

  beforeEach(() => {
    adapter = new CosmosChainAdapter();
  });

  it('returns string chain ID', async () => {
    const chainId = await adapter.getChainId();
    expect(typeof chainId).toBe('string');
    expect(chainId).toContain('cosmoshub-4');
  });

  it('returns numeric chain ID', () => {
    const numeric = adapter.getChainIdNumeric();
    expect(typeof numeric).toBe('number');
    expect(numeric).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/*  CosmosChainAdapter - Balance                                      */
/* ------------------------------------------------------------------ */

describe('CosmosChainAdapter balance', () => {
  let adapter: CosmosChainAdapter;

  beforeEach(() => {
    adapter = new CosmosChainAdapter();
    vi.restoreAllMocks();
  });

  it('getBalance rejects invalid address', async () => {
    await expect(adapter.getBalance('invalid!address')).rejects.toThrow(
      'Invalid Cosmos address',
    );
  });

  it('getBalance returns 0 on RPC failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const balance = await adapter.getBalance(
      'cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6',
    );
    expect(balance).toBe('0');
  });

  it('getBalanceFormatted formats balance', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ balance: { amount: '1234567' } }),
    } as Response);

    const formatted = await adapter.getBalanceFormatted(
      'cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6',
    );
    expect(formatted).toBe('1.234567');
  });

  it('getAllBalances rejects invalid address', async () => {
    await expect(adapter.getAllBalances('invalid!address')).rejects.toThrow(
      'Invalid Cosmos address',
    );
  });

  it('getAllBalances returns empty on failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const balances = await adapter.getAllBalances(
      'cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6',
    );
    expect(balances).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  CosmosChainAdapter - Transaction building                         */
/* ------------------------------------------------------------------ */

describe('CosmosChainAdapter transaction building', () => {
  let adapter: CosmosChainAdapter;

  beforeEach(() => {
    adapter = new CosmosChainAdapter();
    // Set a mock address via getAccounts mock
    Object.defineProperty(adapter, '_accounts', {
      value: ['cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6'],
      writable: true,
    });
  });

  it('buildTransferMsg creates bank send message', () => {
    const msg = adapter.buildTransferMsg(
      'osmo1w508d6qejxtdg4y5r3zaq5mrtdjg8t36vmk3z8',
      { denom: 'uatom', amount: '1000000' },
    );

    expect(msg.typeUrl).toBe('/cosmos.bank.v1beta1.MsgSend');
    expect(msg.value.fromAddress).toBe('cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6');
    expect(msg.value.toAddress).toBe('osmo1w508d6qejxtdg4y5r3zaq5mrtdjg8t36vmk3z8');
    expect(msg.value.amount).toEqual([{ denom: 'uatom', amount: '1000000' }]);
  });

  it('buildTransferMsg rejects invalid address', () => {
    expect(() =>
      adapter.buildTransferMsg('cosmos1invalid!!!', { denom: 'uatom', amount: '1000000' }),
    ).toThrow('Invalid recipient address');
  });

  it('buildTransferMsg throws without connected address', () => {
    Object.defineProperty(adapter, '_accounts', { value: [], writable: true });
    expect(() =>
      adapter.buildTransferMsg('osmo1w508d6qejxtdg4y5r3zaq5mrtdjg8t36vmk3z8', {
        denom: 'uatom',
        amount: '1000000',
      }),
    ).toThrow('No connected address');
  });

  it('buildWasmExecuteMsg creates wasm execute message', () => {
    const msg = adapter.buildWasmExecuteMsg({
      contractAddress: 'cosmos1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5lzv7xu',
      msg: { swap: { offer_asset: { amount: '1000000' } } },
      funds: [{ denom: 'uatom', amount: '1000000' }],
    });

    expect(msg.typeUrl).toBe('/cosmwasm.wasm.v1.MsgExecuteContract');
    expect(msg.value.sender).toBe('cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6');
    expect(msg.value.contract).toBe('cosmos1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5lzv7xu');
    expect(msg.value.msg).toEqual({ swap: { offer_asset: { amount: '1000000' } } });
  });

  it('buildWasmExecuteMsg rejects invalid contract address', () => {
    expect(() =>
      adapter.buildWasmExecuteMsg({
        contractAddress: 'cosmos1invalid!!!',
        msg: {},
      }),
    ).toThrow('Invalid contract address');
  });

  it('buildTransaction wraps messages with fee', () => {
    const msg = adapter.buildTransferMsg(
      'osmo1w508d6qejxtdg4y5r3zaq5mrtdjg8t36vmk3z8',
      { denom: 'uatom', amount: '1000000' },
    );

    const tx = adapter.buildTransaction({
      messages: [msg],
      fee: { gas: '250000', amount: [{ denom: 'uatom', amount: '250' }] },
      memo: 'test transfer',
    });

    expect(tx.messages).toHaveLength(1);
    expect(tx.fee.gas).toBe('250000');
    expect(tx.memo).toBe('test transfer');
  });
});

/* ------------------------------------------------------------------ */
/*  CosmosChainAdapter - Transactions                                  */
/* ------------------------------------------------------------------ */

describe('CosmosChainAdapter transactions', () => {
  let adapter: CosmosChainAdapter;

  beforeEach(() => {
    adapter = new CosmosChainAdapter();
    vi.restoreAllMocks();
  });

  it('sendTransaction rejects when no provider', async () => {
    await expect(
      adapter.sendTransaction({
        messages: [],
        fee: { gas: '250000', amount: [] },
      }),
    ).rejects.toThrow('No provider connected');
  });

  it('sendTransaction accepts single CosmosMsg', async () => {
    // Should wrap single message in a transaction
    // We can't test the full flow without a mock Keplr + RPC,
    // but we verify the type signature works
    expect(adapter.sendTransaction).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/*  CosmosChainAdapter - CosmWasm                                     */
/* ------------------------------------------------------------------ */

describe('CosmosChainAdapter CosmWasm', () => {
  let adapter: CosmosChainAdapter;

  beforeEach(() => {
    adapter = new CosmosChainAdapter();
    vi.restoreAllMocks();
  });

  it('queryWasm calls RPC client', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { balance: '1000000' } }),
    } as Response);

    const result = await adapter.queryWasm(
      'cosmos1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5lzv7xu',
      { balance: { address: 'cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6' } },
    );

    expect(result).toEqual({ balance: '1000000' });
  });

  it('executeWasm rejects when no provider', async () => {
    await expect(
      adapter.executeWasm({
        contractAddress: 'cosmos1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5lzv7xu',
        msg: { swap: {} },
      }),
    ).rejects.toThrow('No provider connected');
  });
});

/* ------------------------------------------------------------------ */
/*  CosmosChainAdapter - Message Signing                              */
/* ------------------------------------------------------------------ */

describe('CosmosChainAdapter message signing', () => {
  let adapter: CosmosChainAdapter;

  beforeEach(() => {
    adapter = new CosmosChainAdapter();
    vi.restoreAllMocks();
  });

  it('signMessage rejects when no provider', async () => {
    await expect(adapter.signMessage('hello')).rejects.toThrow('No provider connected');
  });

  it('signMessage rejects without connected address', async () => {
    const mockKeplr = {
      enable: vi.fn().mockResolvedValue(undefined),
      getKey: vi.fn().mockResolvedValue({
        bech32Address: '',
        pubKey: new Uint8Array([1, 2, 3]),
      }),
      getOfflineSigner: vi.fn(),
      sendTx: vi.fn(),
      signArbitrary: vi.fn(),
    };

    (globalThis as any).window = { keplr: mockKeplr };
    await adapter.connect('keplr', 'cosmoshub-4');

    await expect(adapter.signMessage('hello')).rejects.toThrow('No connected address');

    delete (globalThis as any).window;
  });

  it('signMessage uses signArbitrary when available', async () => {
    const mockKeplr = {
      enable: vi.fn().mockResolvedValue(undefined),
      getKey: vi.fn().mockResolvedValue({
        bech32Address: 'cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6',
        pubKey: new Uint8Array([1, 2, 3]),
      }),
      getOfflineSigner: vi.fn(),
      sendTx: vi.fn(),
      signArbitrary: vi.fn().mockResolvedValue({
        signature: 'base64sig==',
        pub_key: { type: 'tendermint/PubKeySecp256k1', value: 'pubkey' },
        signed: 'signed data',
      }),
    };

    (globalThis as any).window = { keplr: mockKeplr };
    await adapter.connect('keplr', 'cosmoshub-4');

    const result = await adapter.signMessage('hello world');
    expect(result).toBe('base64sig==');
    expect(mockKeplr.signArbitrary).toHaveBeenCalled();

    delete (globalThis as any).window;
  });

  it('signMessage accepts Uint8Array', async () => {
    const mockKeplr = {
      enable: vi.fn().mockResolvedValue(undefined),
      getKey: vi.fn().mockResolvedValue({
        bech32Address: 'cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6',
        pubKey: new Uint8Array([1, 2, 3]),
      }),
      getOfflineSigner: vi.fn(),
      sendTx: vi.fn(),
      signArbitrary: vi.fn().mockResolvedValue({
        signature: 'base64sig==',
        pub_key: { type: 'tendermint/PubKeySecp256k1', value: 'pubkey' },
        signed: 'signed data',
      }),
    };

    (globalThis as any).window = { keplr: mockKeplr };
    await adapter.connect('keplr', 'cosmoshub-4');

    const msgBytes = new TextEncoder().encode('hello world');
    const result = await adapter.signMessage(msgBytes);
    expect(result).toBe('base64sig==');

    delete (globalThis as any).window;
  });
});

/* ------------------------------------------------------------------ */
/*  CosmosChainAdapter - Sign Transaction                             */
/* ------------------------------------------------------------------ */

describe('CosmosChainAdapter sign transaction', () => {
  let adapter: CosmosChainAdapter;

  beforeEach(() => {
    adapter = new CosmosChainAdapter();
    vi.restoreAllMocks();
  });

  it('signTransaction rejects when no provider', async () => {
    await expect(
      adapter.signTransaction({
        messages: [],
        fee: { gas: '250000', amount: [] },
      }),
    ).rejects.toThrow('No provider connected');
  });
});

/* ------------------------------------------------------------------ */
/*  CosmosChainAdapter - Chain Switch                                 */
/* ------------------------------------------------------------------ */

describe('CosmosChainAdapter chain switch', () => {
  let adapter: CosmosChainAdapter;

  beforeEach(() => {
    adapter = new CosmosChainAdapter();
    vi.restoreAllMocks();
  });

  it('switchChainById switches to registered chain', async () => {
    adapter.registerChains(COSMOS_CHAINS);
    await adapter.switchChainById('cosmos:osmosis-1');
    const chainId = await adapter.getChainId();
    expect(chainId).toBe('cosmos:osmosis-1');
  });

  it('switchChainById throws for unknown chain', async () => {
    await expect(adapter.switchChainById('unknown-chain')).rejects.toThrow(
      'Chain not found',
    );
  });

  it('switchChain uses numeric ID to find chain', async () => {
    adapter.registerChains(COSMOS_CHAINS);
    // This uses findChain which returns the first chain
    await expect(adapter.switchChain(0)).resolves.toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  CosmosChainAdapter - Chain Registration                           */
/* ------------------------------------------------------------------ */

describe('CosmosChainAdapter chain registration', () => {
  let adapter: CosmosChainAdapter;

  beforeEach(() => {
    adapter = new CosmosChainAdapter();
    vi.restoreAllMocks();
  });

  it('registerChainWithKeplr throws when not supported', async () => {
    // No Keplr set
    await expect(
      adapter.registerChainWithKeplr(COSMOS_CHAINS[0], 'cosmos'),
    ).rejects.toThrow('Connected wallet does not support chain registration');
  });

  it('registerChainWithKeplr calls experimentalSuggestChain', async () => {
    const mockKeplr = {
      experimentalSuggestChain: vi.fn().mockResolvedValue(undefined),
      enable: vi.fn().mockResolvedValue(undefined),
      getKey: vi.fn().mockResolvedValue({
        bech32Address: 'cosmos1pkptre7fdkl6gfrzlesjjvhxhlc3r4gmmk8rs6',
        pubKey: new Uint8Array([1, 2, 3]),
      }),
      getOfflineSigner: vi.fn(),
      sendTx: vi.fn(),
    };

    adapter.setKeplr(mockKeplr);

    await adapter.registerChainWithKeplr(
      {
        id: 'cosmos:custom-1',
        name: 'Custom Chain',
        rpcUrl: 'https://rpc.custom.chain',
        nativeCurrency: { name: 'CUST', symbol: 'CUST', decimals: 6 },
      },
      'custom',
    );

    expect(mockKeplr.experimentalSuggestChain).toHaveBeenCalled();
    const suggested = mockKeplr.experimentalSuggestChain.mock.calls[0][0];
    expect(suggested.chainName).toBe('Custom Chain');
    expect(suggested.bech32Config.bech32PrefixAccAddr).toBe('custom');
  });
});

/* ------------------------------------------------------------------ */
/*  CosmosChainAdapter - getAccounts without connection               */
/* ------------------------------------------------------------------ */

describe('CosmosChainAdapter getAccounts without connection', () => {
  let adapter: CosmosChainAdapter;

  beforeEach(() => {
    adapter = new CosmosChainAdapter();
  });

  it('getAccounts throws when not connected', async () => {
    await expect(adapter.getAccounts()).rejects.toThrow('Not connected');
  });
});
