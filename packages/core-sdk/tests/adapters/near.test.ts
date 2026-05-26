/**
 * NEAR Chain Adapter tests.
 *
 * Tests cover Borsh encoding/decoding, base58, account validation,
 * balance formatting, wallet constants, chain presets, NearChainAdapter
 * configuration, connection, balance queries, transaction building,
 * NEP-141 FT operations, NEP-171 NFT operations, message signing,
 * chain switching, and EIP-1193 request method.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NearChainAdapter,
  NEAR_WALLETS,
  NEAR_CHAINS,
  isValidNearAccount,
  normalizeNearAccount,
  isSubAccount,
  getParentAccount,
  formatNearBalance,
  parseNearAmount,
  BorshWriter,
  BorshReader,
  base58Encode,
  base58Decode,
  AccessKeyPermission,
  KeyKind,
  ActionKind,
  createTransferAction,
  createFunctionCallAction,
  createAccountAction,
  buildNearFunctionCall,
  buildNearTransfer,
  buildFtTransferCall,
  buildFtTransferCallWithCallback,
  buildNftTransferCall,
  buildNftMintCall,
  DEFAULT_NEAR_GAS,
  DEFAULT_FT_GAS,
  DEFAULT_NFT_GAS,
  MIN_TRANSFER_DEPOSIT,
} from '../../src/adapters/near.js';

/* ------------------------------------------------------------------ */
/*  Borsh Encoding / Decoding                                          */
/* ------------------------------------------------------------------ */

describe('BorshWriter / BorshReader', () => {
  it('writes and reads u8 round-trip', () => {
    const w = new BorshWriter();
    w.writeU8(42);
    const r = new BorshReader(w.toBytes());
    expect(r.readU8()).toBe(42);
  });

  it('writes and reads u16 round-trip', () => {
    const w = new BorshWriter();
    w.writeU16(65535);
    const r = new BorshReader(w.toBytes());
    expect(r.readU16()).toBe(65535);
  });

  it('writes and reads u32 round-trip', () => {
    const w = new BorshWriter();
    w.writeU32(4294967295);
    const r = new BorshReader(w.toBytes());
    expect(r.readU32()).toBe(4294967295);
  });

  it('writes and reads u64 round-trip', () => {
    const w = new BorshWriter();
    w.writeU64(BigInt('18446744073709551615'));
    const r = new BorshReader(w.toBytes());
    expect(r.readU64()).toBe(BigInt('18446744073709551615'));
  });

  it('writes and reads u128 round-trip', () => {
    const w = new BorshWriter();
    w.writeU128(BigInt('340282366920938463463374607431768211455'));
    const r = new BorshReader(w.toBytes());
    expect(r.readU128()).toBe(BigInt('340282366920938463463374607431768211455'));
  });

  it('writes and reads bool round-trip', () => {
    const w = new BorshWriter();
    w.writeBool(true);
    w.writeBool(false);
    const r = new BorshReader(w.toBytes());
    expect(r.readBool()).toBe(true);
    expect(r.readBool()).toBe(false);
  });

  it('writes and reads bytes round-trip', () => {
    const data = new Uint8Array([0x01, 0x02, 0x03, 0xff]);
    const w = new BorshWriter();
    w.writeBytes(data);
    const r = new BorshReader(w.toBytes());
    expect(r.readBytes()).toEqual(data);
  });

  it('writes and reads string round-trip', () => {
    const w = new BorshWriter();
    w.writeString('hello near');
    const r = new BorshReader(w.toBytes());
    expect(r.readString()).toBe('hello near');
  });

  it('writes and reads UTF-8 strings', () => {
    const w = new BorshWriter();
    w.writeString('🔢 NEAR 你好');
    const r = new BorshReader(w.toBytes());
    expect(r.readString()).toBe('🔢 NEAR 你好');
  });

  it('writes and reads fixed 32-byte hex', () => {
    const w = new BorshWriter();
    w.writeFixed32('a'.repeat(64));
    const r = new BorshReader(w.toBytes());
    expect(r.readFixed32()).toBe('0x' + 'a'.repeat(64));
  });

  it('writes and reads option', () => {
    const w = new BorshWriter();
    w.writeOption(42, (writer, v) => writer.writeU8(v));
    w.writeOption(null as number | null, (writer, v) => writer.writeU8(v));
    const r = new BorshReader(w.toBytes());
    expect(r.readOption((reader) => reader.readU8())).toBe(42);
    expect(r.readOption((reader) => reader.readU8())).toBeNull();
  });

  it('writes and reads array', () => {
    const w = new BorshWriter();
    w.writeArray([1, 2, 3], (writer, v) => writer.writeU8(v));
    const r = new BorshReader(w.toBytes());
    expect(r.readArray((reader) => reader.readU8())).toEqual([1, 2, 3]);
  });

  it('toBytesHex returns correct hex', () => {
    const w = new BorshWriter();
    w.writeU8(0xab);
    w.writeU8(0xcd);
    expect(w.toHex()).toBe('0xabcd');
  });

  it('toBase64 returns correct base64', () => {
    const w = new BorshWriter();
    w.writeU8(0x00);
    w.writeU8(0x01);
    w.writeU8(0x02);
    expect(w.toBase64()).toBe(btoa('\x00\x01\x02'));
  });

  it('remaining returns correct count', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const r = new BorshReader(data);
    expect(r.remaining()).toBe(5);
    r.readU8();
    expect(r.remaining()).toBe(4);
  });
});

/* ------------------------------------------------------------------ */
/*  Base58 Encoding / Decoding                                         */
/* ------------------------------------------------------------------ */

describe('base58Encode / base58Decode', () => {
  it('encodes and decodes round-trip', () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0xff]);
    const encoded = base58Encode(bytes);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = base58Decode(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!).toEqual(bytes);
  });

  it('handles all-zero bytes (leading 1s)', () => {
    const bytes = new Uint8Array([0, 0, 0, 1]);
    const encoded = base58Encode(bytes);
    expect(encoded.startsWith('111')).toBe(true);

    const decoded = base58Decode(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!).toEqual(bytes);
  });

  it('handles empty bytes', () => {
    const encoded = base58Encode(new Uint8Array([]));
    expect(encoded).toBe('1');
  });

  it('rejects invalid base58 characters', () => {
    expect(base58Decode('0Invalid!')).toBeNull();
  });

  it('handles large payloads', () => {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) bytes[i] = i;
    const encoded = base58Encode(bytes);
    const decoded = base58Decode(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!).toEqual(bytes);
  });
});

/* ------------------------------------------------------------------ */
/*  Account validation                                                 */
/* ------------------------------------------------------------------ */

describe('isValidNearAccount', () => {
  it('accepts valid top-level account', () => {
    expect(isValidNearAccount('alice.near')).toBe(true);
  });

  it('accepts valid subaccount', () => {
    expect(isValidNearAccount('bob.alice.near')).toBe(true);
  });

  it('accepts accounts with hyphens', () => {
    expect(isValidNearAccount('my-account.near')).toBe(true);
  });

  it('accepts accounts with underscores', () => {
    expect(isValidNearAccount('my_account.near')).toBe(true);
  });

  it('accepts accounts with dots', () => {
    expect(isValidNearAccount('a.b.c.near')).toBe(true);
  });

  it('accepts long accounts', () => {
    const longName = 'a'.repeat(60) + '.near';
    expect(isValidNearAccount(longName)).toBe(true);
  });

  it('rejects too-short account', () => {
    expect(isValidNearAccount('a')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidNearAccount('')).toBe(false);
  });

  it('rejects accounts with uppercase', () => {
    expect(isValidNearAccount('Alice.near')).toBe(false);
  });

  it('rejects accounts starting with hyphen', () => {
    expect(isValidNearAccount('-alice.near')).toBe(false);
  });

  it('rejects accounts ending with hyphen', () => {
    expect(isValidNearAccount('alice-.near')).toBe(false);
  });

  it('rejects accounts with consecutive hyphens', () => {
    expect(isValidNearAccount('a--b.near')).toBe(false);
  });

  it('rejects non-string input', () => {
    expect(isValidNearAccount(null as unknown as string)).toBe(false);
    expect(isValidNearAccount(undefined as unknown as string)).toBe(false);
  });

  it('rejects accounts with spaces', () => {
    expect(isValidNearAccount('alice near')).toBe(false);
  });

  it('rejects accounts with special chars', () => {
    expect(isValidNearAccount('alice!@#.near')).toBe(false);
  });
});

describe('normalizeNearAccount', () => {
  it('lowercases account ID', () => {
    expect(normalizeNearAccount('Alice.NEAR')).toBe('alice.near');
  });

  it('trims whitespace', () => {
    expect(normalizeNearAccount('  alice.near  ')).toBe('alice.near');
  });

  it('handles already normalized', () => {
    expect(normalizeNearAccount('alice.near')).toBe('alice.near');
  });
});

describe('isSubAccount', () => {
  it('returns true for subaccount', () => {
    expect(isSubAccount('bob.alice.near')).toBe(true);
  });

  it('returns false for top-level account', () => {
    expect(isSubAccount('alice.near')).toBe(false);
  });

  it('returns false for account without dots', () => {
    expect(isSubAccount('alice')).toBe(false);
  });
});

describe('getParentAccount', () => {
  it('returns parent of subaccount', () => {
    expect(getParentAccount('bob.alice.near')).toBe('alice.near');
  });

  it('returns null for top-level account', () => {
    expect(getParentAccount('alice.near')).toBeNull();
  });

  it('returns parent of deep subaccount', () => {
    expect(getParentAccount('x.y.z.near')).toBe('y.z.near');
  });
});

/* ------------------------------------------------------------------ */
/*  Balance formatting                                                 */
/* ------------------------------------------------------------------ */

describe('formatNearBalance', () => {
  it('formats whole NEAR', () => {
    // 1 NEAR = 10^24 yoctoNEAR
    expect(formatNearBalance('1000000000000000000000000')).toBe('1');
  });

  it('formats fractional NEAR', () => {
    expect(formatNearBalance('12345678901234567890123456')).toBe('12.345678901234567890123456');
  });

  it('formats small amounts', () => {
    expect(formatNearBalance('500000000000000000000000')).toBe('0.5');
  });

  it('formats zero', () => {
    expect(formatNearBalance('0')).toBe('0');
  });

  it('handles bigint input', () => {
    expect(formatNearBalance(BigInt('1000000000000000000000000'))).toBe('1');
  });

  it('handles number input', () => {
    expect(formatNearBalance(1000000000000000000000000)).toBe('1');
  });

  it('removes trailing zeros', () => {
    expect(formatNearBalance('1000000000000000000000000')).toBe('1');
    expect(formatNearBalance('1500000000000000000000000')).toBe('1.5');
  });
});

describe('parseNearAmount', () => {
  it('parses whole NEAR', () => {
    expect(parseNearAmount('1')).toBe(BigInt('1000000000000000000000000'));
  });

  it('parses fractional NEAR', () => {
    expect(parseNearAmount('1.5')).toBe(BigInt('1500000000000000000000000'));
  });

  it('parses zero', () => {
    expect(parseNearAmount('0')).toBe(0n);
  });

  it('handles many decimal places', () => {
    const result = parseNearAmount('0.000000000000000000000001');
    expect(result).toBe(1n);
  });

  it('round-trips with formatNearBalance', () => {
    const original = '12.345678901234567890123456';
    const parsed = parseNearAmount(original);
    const formatted = formatNearBalance(parsed);
    expect(formatted).toBe(original);
  });
});

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

describe('NEAR_WALLETS', () => {
  it('exports wallet info for MyNearWallet, Meteor, Here, Sender', () => {
    expect(NEAR_WALLETS.length).toBeGreaterThanOrEqual(4);
    const ids = NEAR_WALLETS.map((w) => w.id);
    expect(ids).toContain('mynearwallet');
    expect(ids).toContain('meteor');
    expect(ids).toContain('here-wallet');
    expect(ids).toContain('sender');
  });

  it('wallet entries have required fields', () => {
    for (const wallet of NEAR_WALLETS) {
      expect(wallet.name).toBeDefined();
      expect(wallet.rdns).toBeDefined();
      expect(wallet.icon).toBeDefined();
      expect(wallet.downloadUrl).toBeDefined();
      expect(wallet.type).toBeDefined();
    }
  });

  it('wallet types are valid', () => {
    const validTypes = ['browser-extension', 'web-wallet', 'mobile', 'hardware'];
    for (const wallet of NEAR_WALLETS) {
      expect(validTypes).toContain(wallet.type);
    }
  });
});

describe('NEAR_CHAINS', () => {
  it('exports chain presets for mainnet and testnet', () => {
    expect(NEAR_CHAINS.length).toBeGreaterThanOrEqual(2);
    const ids = NEAR_CHAINS.map((c) => c.id);
    expect(ids).toContain('near:mainnet');
    expect(ids).toContain('near:testnet');
  });

  it('chain presets have required fields', () => {
    for (const chain of NEAR_CHAINS) {
      expect(chain.id).toBeDefined();
      expect(chain.name).toBeDefined();
      expect(chain.rpcUrl).toBeDefined();
      expect(chain.nativeCurrency).toBeDefined();
    }
  });

  it('NEAR has 24 decimals', () => {
    for (const chain of NEAR_CHAINS) {
      expect(chain.nativeCurrency?.decimals).toBe(24);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Enums and action builders                                          */
/* ------------------------------------------------------------------ */

describe('ActionKind enum', () => {
  it('has all expected action types', () => {
    expect(ActionKind.CreateAccount).toBe(0);
    expect(ActionKind.DeployContract).toBe(1);
    expect(ActionKind.FunctionCall).toBe(2);
    expect(ActionKind.Transfer).toBe(3);
    expect(ActionKind.Stake).toBe(4);
    expect(ActionKind.AddKey).toBe(5);
    expect(ActionKind.DeleteKey).toBe(6);
    expect(ActionKind.DeleteAccount).toBe(7);
  });
});

describe('AccessKeyPermission enum', () => {
  it('has FullAccess and FunctionCall', () => {
    expect(AccessKeyPermission.FullAccess).toBe(0);
    expect(AccessKeyPermission.FunctionCall).toBe(1);
  });
});

describe('KeyKind enum', () => {
  it('has ED25519 and SECP256K1', () => {
    expect(KeyKind.ED25519).toBe(0);
    expect(KeyKind.SECP256K1).toBe(1);
  });
});

describe('Action builders', () => {
  it('createTransferAction creates transfer action', () => {
    const action = createTransferAction('1000000000000000000000000');
    expect(action.kind).toBe(ActionKind.Transfer);
    expect(action.params.deposit).toBe('1000000000000000000000000');
  });

  it('createTransferAction handles bigint', () => {
    const action = createTransferAction(BigInt('500000'));
    expect(action.kind).toBe(ActionKind.Transfer);
    expect(action.params.deposit).toBe('500000');
  });

  it('createFunctionCallAction creates function call action', () => {
    const action = createFunctionCallAction(
      'transfer',
      { receiver_id: 'bob.near', amount: '100' },
      '30000000000000',
      '1',
    );
    expect(action.kind).toBe(ActionKind.FunctionCall);
    expect(action.params.methodName).toBe('transfer');
    expect(action.params.gas).toBe('30000000000000');
    expect(action.params.deposit).toBe('1');
  });

  it('createFunctionCallAction defaults deposit to 0', () => {
    const action = createFunctionCallAction(
      'get_balance',
      { account_id: 'alice.near' },
      '30000000000000',
    );
    expect(action.params.deposit).toBe('0');
  });

  it('createAccountAction creates account action', () => {
    const action = createAccountAction();
    expect(action.kind).toBe(ActionKind.CreateAccount);
    expect(action.params).toEqual({});
  });

  it('buildNearFunctionCall creates wallet-style action', () => {
    const call = buildNearFunctionCall(
      'token.near',
      'ft_transfer',
      { receiver_id: 'bob.near', amount: '100' },
      '100000000000000',
      '1',
    );
    expect(call.type).toBe('FunctionCall');
    expect(call.params.methodName).toBe('ft_transfer');
  });

  it('buildNearTransfer creates wallet-style transfer', () => {
    const transfer = buildNearTransfer('500000000000000000000000');
    expect(transfer.type).toBe('Transfer');
    expect(transfer.params.deposit).toBe('500000000000000000000000');
  });
});

/* ------------------------------------------------------------------ */
/*  NEP-141 FT helpers                                                 */
/* ------------------------------------------------------------------ */

describe('NEP-141 FT helpers', () => {
  it('buildFtTransferCall creates correct action', () => {
    const action = buildFtTransferCall({
      contractId: 'token.near',
      receiverId: 'bob.near',
      amount: '1000000',
      memo: 'payment',
    });
    expect(action.kind).toBe(ActionKind.FunctionCall);
    expect(action.params.methodName).toBe('ft_transfer');
    const args = JSON.parse(action.params.args as string);
    expect(args.receiver_id).toBe('bob.near');
    expect(args.amount).toBe('1000000');
    expect(args.memo).toBe('payment');
  });

  it('buildFtTransferCall defaults deposit to 1 yoctoNEAR', () => {
    const action = buildFtTransferCall({
      contractId: 'token.near',
      receiverId: 'bob.near',
      amount: '1000000',
    });
    expect(action.params.deposit).toBe(MIN_TRANSFER_DEPOSIT);
  });

  it('buildFtTransferCallWithCallback includes msg field', () => {
    const action = buildFtTransferCallWithCallback({
      contractId: 'token.near',
      receiverId: 'bob.near',
      amount: '1000000',
      callbackContract: 'receiver.near',
    });
    const args = JSON.parse(action.params.args as string);
    expect(args.msg).toBeDefined();
    const msg = JSON.parse(args.msg);
    expect(msg.callback).toBe(true);
    expect(msg.contract).toBe('receiver.near');
  });

  it('buildFtTransferCallWithCallback omits msg without callbackContract', () => {
    const action = buildFtTransferCallWithCallback({
      contractId: 'token.near',
      receiverId: 'bob.near',
      amount: '1000000',
    });
    const args = JSON.parse(action.params.args as string);
    expect(args.msg).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  NEP-171 NFT helpers                                                */
/* ------------------------------------------------------------------ */

describe('NEP-171 NFT helpers', () => {
  it('buildNftTransferCall creates correct action', () => {
    const action = buildNftTransferCall({
      contractId: 'nft.near',
      receiverId: 'bob.near',
      tokenId: 'token_001',
      memo: 'gift',
    });
    expect(action.kind).toBe(ActionKind.FunctionCall);
    expect(action.params.methodName).toBe('nft_transfer');
    const args = JSON.parse(action.params.args as string);
    expect(args.receiver_id).toBe('bob.near');
    expect(args.token_id).toBe('token_001');
    expect(args.memo).toBe('gift');
  });

  it('buildNftTransferCall defaults deposit', () => {
    const action = buildNftTransferCall({
      contractId: 'nft.near',
      receiverId: 'bob.near',
      tokenId: 'token_001',
    });
    expect(action.params.deposit).toBe(MIN_TRANSFER_DEPOSIT);
  });

  it('buildNftMintCall creates correct action', () => {
    const action = buildNftMintCall({
      contractId: 'nft.near',
      tokenId: 'token_002',
      metadata: { title: 'My NFT', description: 'A test NFT' },
      deposit: '5000000000000000000000000',
      receiverId: 'alice.near',
    });
    expect(action.kind).toBe(ActionKind.FunctionCall);
    expect(action.params.methodName).toBe('nft_mint');
    const args = JSON.parse(action.params.args as string);
    expect(args.token_id).toBe('token_002');
    expect(args.receiver_id).toBe('alice.near');
    expect(args.metadata.title).toBe('My NFT');
  });

  it('buildNftMintCall omits receiver_id if not provided', () => {
    const action = buildNftMintCall({
      contractId: 'nft.near',
      tokenId: 'token_003',
      metadata: { title: 'Self-mint' },
      deposit: '5000000000000000000000000',
    });
    const args = JSON.parse(action.params.args as string);
    expect(args.receiver_id).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  Default constants                                                  */
/* ------------------------------------------------------------------ */

describe('Default constants', () => {
  it('DEFAULT_NEAR_GAS is 30 Tgas', () => {
    expect(DEFAULT_NEAR_GAS).toBe('30000000000000');
  });

  it('DEFAULT_FT_GAS is 100 Tgas', () => {
    expect(DEFAULT_FT_GAS).toBe('100000000000000');
  });

  it('DEFAULT_NFT_GAS is 100 Tgas', () => {
    expect(DEFAULT_NFT_GAS).toBe('100000000000000');
  });

  it('MIN_TRANSFER_DEPOSIT is 1 yoctoNEAR', () => {
    expect(MIN_TRANSFER_DEPOSIT).toBe('1');
  });
});

/* ------------------------------------------------------------------ */
/*  NearChainAdapter - Configuration                                   */
/* ------------------------------------------------------------------ */

describe('NearChainAdapter configuration', () => {
  let adapter: NearChainAdapter;

  beforeEach(() => {
    adapter = new NearChainAdapter();
  });

  it('has correct id and name', () => {
    expect(adapter.id).toBe('near-adapter');
    expect(adapter.name).toBe('NEAR Chain Adapter');
  });

  it('registers chains and finds them by id', () => {
    const chains = [
      {
        id: 'near:custom-1',
        name: 'Custom NEAR',
        rpcUrl: 'https://rpc.custom.near.org',
        nativeCurrency: { name: 'NEAR', symbol: 'NEAR', decimals: 24 },
      },
    ];
    adapter.registerChains(chains);
    expect(adapter.findChainById('near:custom-1')).toEqual(chains[0]);
    expect(adapter.findChainById('nonexistent')).toBeUndefined();
  });

  it('sets custom RPC URL', () => {
    adapter.setRpcUrl('https://rpc.custom.near.org');
    expect(adapter.getRpcUrl()).toBe('https://rpc.custom.near.org');
  });

  it('returns null provider before setProvider', () => {
    expect(adapter.getProvider()).toBeNull();
  });

  it('accepts setConnector', () => {
    const mockConnector = { id: 'test' } as any;
    adapter.setConnector(mockConnector);
    // Connector stored internally
  });

  it('findChain returns first registered chain', () => {
    const chain = adapter.findChain(0);
    expect(chain).toBeDefined();
    expect(chain?.id).toContain('near');
  });
});

/* ------------------------------------------------------------------ */
/*  NearChainAdapter - Connection                                      */
/* ------------------------------------------------------------------ */

describe('NearChainAdapter connection', () => {
  let adapter: NearChainAdapter;

  beforeEach(() => {
    adapter = new NearChainAdapter();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('returns null address before connection', () => {
    expect(adapter.getAddress()).toBeNull();
  });

  it('connect throws when no wallet in window', async () => {
    await expect(adapter.connect()).rejects.toThrow('No NEAR wallet found');
  });

  it('disconnect does not throw when not connected', async () => {
    await expect(adapter.disconnect()).resolves.toBeUndefined();
  });

  it('connect throws for unrecognized wallet ID', async () => {
    await expect(adapter.connect('unknown-wallet')).rejects.toThrow(
      'No NEAR wallet found',
    );
  });

  it('isSignedIn returns false without provider', async () => {
    const result = await adapter.isSignedIn();
    expect(result).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  NearChainAdapter - Connection with mock provider                   */
/* ------------------------------------------------------------------ */

describe('NearChainAdapter connection with mock provider', () => {
  let adapter: NearChainAdapter;

  beforeEach(() => {
    adapter = new NearChainAdapter();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('connect succeeds with mock provider', async () => {
    const mockProvider = {
      signIn: vi.fn().mockResolvedValue([{ accountId: 'alice.near' }]),
      signOut: vi.fn().mockResolvedValue(undefined),
      getAccounts: vi.fn().mockResolvedValue([{ accountId: 'alice.near' }]),
      isSignedIn: vi.fn().mockReturnValue(true),
      signAndSendTransaction: vi.fn(),
    };

    (globalThis as any).window = { nearWallet: mockProvider };

    const accounts = await adapter.connect('mynearwallet');
    expect(accounts).toEqual(['alice.near']);
    expect(adapter.getAddress()).toBe('alice.near');

    delete (globalThis as any).window;
  });

  it('getAccounts returns connected accounts', async () => {
    const mockProvider = {
      signIn: vi.fn().mockResolvedValue([{ accountId: 'alice.near' }]),
      signOut: vi.fn().mockResolvedValue(undefined),
      getAccounts: vi.fn().mockResolvedValue([{ accountId: 'alice.near' }]),
      isSignedIn: vi.fn().mockReturnValue(true),
      signAndSendTransaction: vi.fn(),
    };

    (globalThis as any).window = { nearWallet: mockProvider };
    await adapter.connect('mynearwallet');

    const accounts = await adapter.getAccounts();
    expect(accounts).toEqual(['alice.near']);
  });

  it('disconnect clears accounts', async () => {
    const mockProvider = {
      signIn: vi.fn().mockResolvedValue([{ accountId: 'alice.near' }]),
      signOut: vi.fn().mockResolvedValue(undefined),
      getAccounts: vi.fn().mockResolvedValue([{ accountId: 'alice.near' }]),
      isSignedIn: vi.fn().mockReturnValue(true),
      signAndSendTransaction: vi.fn(),
    };

    (globalThis as any).window = { nearWallet: mockProvider };
    await adapter.connect('mynearwallet');
    expect(adapter.getAddress()).not.toBeNull();

    await adapter.disconnect();
    expect(adapter.getAddress()).toBeNull();
    expect(adapter.getProvider()).toBeNull();
  });

  it('normalizes account ID on connect', async () => {
    const mockProvider = {
      signIn: vi.fn().mockResolvedValue([{ accountId: 'Alice.NEAR' }]),
      signOut: vi.fn().mockResolvedValue(undefined),
      getAccounts: vi.fn().mockResolvedValue([{ accountId: 'alice.near' }]),
      isSignedIn: vi.fn().mockReturnValue(true),
      signAndSendTransaction: vi.fn(),
    };

    (globalThis as any).window = { nearWallet: mockProvider };
    await adapter.connect('mynearwallet');
    expect(adapter.getAddress()).toBe('alice.near');
  });
});

/* ------------------------------------------------------------------ */
/*  NearChainAdapter - Chain ID                                        */
/* ------------------------------------------------------------------ */

describe('NearChainAdapter chain ID', () => {
  let adapter: NearChainAdapter;

  beforeEach(() => {
    adapter = new NearChainAdapter();
  });

  it('returns string chain ID', async () => {
    const chainId = await adapter.getChainId();
    expect(typeof chainId).toBe('string');
    expect(chainId).toContain('near');
  });

  it('returns numeric chain ID', () => {
    const numeric = adapter.getChainIdNumeric();
    expect(typeof numeric).toBe('number');
    expect(numeric).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/*  NearChainAdapter - Balance                                         */
/* ------------------------------------------------------------------ */

describe('NearChainAdapter balance', () => {
  let adapter: NearChainAdapter;

  beforeEach(() => {
    adapter = new NearChainAdapter();
    vi.restoreAllMocks();
  });

  it('getBalance rejects invalid account', async () => {
    await expect(adapter.getBalance('a')).rejects.toThrow('Invalid NEAR account');
  });

  it('getBalance returns 0 on RPC failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const balance = await adapter.getBalance('alice.near');
    expect(balance).toBe('0');
  });

  it('getBalanceFormatted formats balance', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: { amount: '1000000000000000000000000' },
      }),
    } as Response);

    const formatted = await adapter.getBalanceFormatted('alice.near');
    expect(formatted).toBe('1');
  });

  it('getAccountInfo rejects invalid account', async () => {
    await expect(adapter.getAccountInfo('!!!')).rejects.toThrow('Invalid NEAR account');
  });

  it('getAccountInfo returns null on RPC failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const info = await adapter.getAccountInfo('alice.near');
    expect(info).toBeNull();
  });

  it('getAccessKeys returns empty on failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const keys = await adapter.getAccessKeys('alice.near');
    expect(keys).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  NearChainAdapter - Transaction sending                             */
/* ------------------------------------------------------------------ */

describe('NearChainAdapter transaction sending', () => {
  let adapter: NearChainAdapter;

  beforeEach(() => {
    adapter = new NearChainAdapter();
    vi.restoreAllMocks();

    // Set cached accounts directly
    Object.defineProperty(adapter, '_accounts', {
      value: ['alice.near'],
      writable: true,
    });
    Object.defineProperty(adapter, 'provider', {
      value: {
        signIn: vi.fn(),
        signOut: vi.fn(),
        getAccounts: vi.fn(),
        isSignedIn: vi.fn(),
        signAndSendTransaction: vi.fn().mockResolvedValue({
          transactionHash: 'abc123def456',
          transaction: { hash: 'abc123def456' },
        }),
      },
      writable: true,
    });
  });

  it('transferNear sends to valid recipient', async () => {
    const hash = await adapter.transferNear('bob.near', '500000000000000000000000');
    expect(hash).toBe('abc123def456');
  });

  it('transferNear rejects invalid recipient', async () => {
    await expect(adapter.transferNear('invalid!', '1000')).rejects.toThrow(
      'Invalid recipient account',
    );
  });

  it('sendTransaction requires receiverId and actions', async () => {
    await expect(
      adapter.sendTransaction({ receiverId: '' as any, actions: [] as any }),
    ).rejects.toThrow('Invalid transaction');
  });

  it('sendTransaction normalizes receiverId', async () => {
    const hash = await adapter.sendTransaction({
      receiverId: 'BOB.NEAR',
      actions: [createTransferAction('100')],
    });
    expect(hash).toBe('abc123def456');
  });
});

/* ------------------------------------------------------------------ */
/*  NearChainAdapter - Contract calls                                  */
/* ------------------------------------------------------------------ */

describe('NearChainAdapter contract calls', () => {
  let adapter: NearChainAdapter;

  beforeEach(() => {
    adapter = new NearChainAdapter();
    vi.restoreAllMocks();

    Object.defineProperty(adapter, '_accounts', {
      value: ['alice.near'],
      writable: true,
    });
    Object.defineProperty(adapter, 'provider', {
      value: {
        signIn: vi.fn(),
        signOut: vi.fn(),
        getAccounts: vi.fn(),
        isSignedIn: vi.fn(),
        signAndSendTransaction: vi.fn().mockResolvedValue({
          transactionHash: 'txhash123',
          transaction: { hash: 'txhash123' },
        }),
      },
      writable: true,
    });
  });

  it('callContract sends function call', async () => {
    const hash = await adapter.callContract({
      contractId: 'token.near',
      methodName: 'ft_transfer',
      args: { receiver_id: 'bob.near', amount: '1000' },
    });
    expect(hash).toBe('txhash123');
  });

  it('callContract rejects invalid contract', async () => {
    await expect(
      adapter.callContract({
        contractId: 'invalid!',
        methodName: 'foo',
      }),
    ).rejects.toThrow('Invalid contract account');
  });

  it('viewContract rejects invalid contract', async () => {
    await expect(adapter.viewContract('!!!', 'bar')).rejects.toThrow(
      'Invalid contract account',
    );
  });

  it('viewContract returns decoded result', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: { result: btoa(JSON.stringify({ balance: '1000' })) },
      }),
    } as Response);

    const result = await adapter.viewContract('token.near', 'ft_balance_of', {
      account_id: 'alice.near',
    });
    expect((result as any).balance).toBe('1000');
  });

  it('viewContract returns null on parse failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: { result: btoa('not-json') },
      }),
    } as Response);

    const result = await adapter.viewContract('token.near', 'get_value');
    expect(result).toBe('not-json');
  });
});

/* ------------------------------------------------------------------ */
/*  NearChainAdapter - NEP-141 FT operations                           */
/* ------------------------------------------------------------------ */

describe('NearChainAdapter NEP-141 FT operations', () => {
  let adapter: NearChainAdapter;

  beforeEach(() => {
    adapter = new NearChainAdapter();
    vi.restoreAllMocks();

    Object.defineProperty(adapter, '_accounts', {
      value: ['alice.near'],
      writable: true,
    });
    Object.defineProperty(adapter, 'provider', {
      value: {
        signIn: vi.fn(),
        signOut: vi.fn(),
        getAccounts: vi.fn(),
        isSignedIn: vi.fn(),
        signAndSendTransaction: vi.fn().mockResolvedValue({
          transactionHash: 'fthash',
          transaction: { hash: 'fthash' },
        }),
      },
      writable: true,
    });
  });

  it('ftTransfer sends FT transfer', async () => {
    const hash = await adapter.ftTransfer({
      contractId: 'token.near',
      receiverId: 'bob.near',
      amount: '1000000',
    });
    expect(hash).toBe('fthash');
  });

  it('ftTransfer rejects invalid contract', async () => {
    await expect(
      adapter.ftTransfer({
        contractId: '!!!',
        receiverId: 'bob.near',
        amount: '100',
      }),
    ).rejects.toThrow('Invalid FT contract');
  });

  it('ftTransfer rejects invalid recipient', async () => {
    await expect(
      adapter.ftTransfer({
        contractId: 'token.near',
        receiverId: '!!!',
        amount: '100',
      }),
    ).rejects.toThrow('Invalid recipient');
  });

  it('ftBalanceOf queries balance', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: { result: btoa('"5000000"') },
      }),
    } as Response);

    const balance = await adapter.ftBalanceOf('token.near', 'alice.near');
    expect(balance).toBe('5000000');
  });

  it('ftBalanceOf returns 0 on failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('RPC error'));

    const balance = await adapter.ftBalanceOf('token.near', 'alice.near');
    expect(balance).toBe('0');
  });

  it('ftMetadata queries metadata', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          result: btoa(JSON.stringify({
            name: 'Test Token',
            symbol: 'TEST',
            decimals: 6,
          })),
        },
      }),
    } as Response);

    const metadata = await adapter.ftMetadata('token.near');
    expect(metadata.name).toBe('Test Token');
    expect(metadata.symbol).toBe('TEST');
    expect(metadata.decimals).toBe(6);
  });

  it('ftTotalSupply queries supply', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: { result: btoa('"1000000000000"') },
      }),
    } as Response);

    const supply = await adapter.ftTotalSupply('token.near');
    expect(supply).toBe('1000000000000');
  });

  it('formatFtBalance formats token balance', () => {
    expect(adapter.formatFtBalance('1000000', 6)).toBe('1');
    expect(adapter.formatFtBalance('1234567', 6)).toBe('1.234567');
    expect(adapter.formatFtBalance('500', 6)).toBe('0.0005');
  });
});

/* ------------------------------------------------------------------ */
/*  NearChainAdapter - NEP-171 NFT operations                          */
/* ------------------------------------------------------------------ */

describe('NearChainAdapter NEP-171 NFT operations', () => {
  let adapter: NearChainAdapter;

  beforeEach(() => {
    adapter = new NearChainAdapter();
    vi.restoreAllMocks();

    Object.defineProperty(adapter, '_accounts', {
      value: ['alice.near'],
      writable: true,
    });
    Object.defineProperty(adapter, 'provider', {
      value: {
        signIn: vi.fn(),
        signOut: vi.fn(),
        getAccounts: vi.fn(),
        isSignedIn: vi.fn(),
        signAndSendTransaction: vi.fn().mockResolvedValue({
          transactionHash: 'nfthash',
          transaction: { hash: 'nfthash' },
        }),
      },
      writable: true,
    });
  });

  it('nftTransfer sends NFT transfer', async () => {
    const hash = await adapter.nftTransfer({
      contractId: 'nft.near',
      receiverId: 'bob.near',
      tokenId: 'token_001',
    });
    expect(hash).toBe('nfthash');
  });

  it('nftTransfer rejects invalid contract', async () => {
    await expect(
      adapter.nftTransfer({
        contractId: '!!!',
        receiverId: 'bob.near',
        tokenId: 'token_001',
      }),
    ).rejects.toThrow('Invalid NFT contract');
  });

  it('nftTransfer rejects invalid recipient', async () => {
    await expect(
      adapter.nftTransfer({
        contractId: 'nft.near',
        receiverId: '!!!',
        tokenId: 'token_001',
      }),
    ).rejects.toThrow('Invalid recipient');
  });

  it('nftMint sends NFT mint', async () => {
    const hash = await adapter.nftMint({
      contractId: 'nft.near',
      tokenId: 'new_token',
      metadata: { title: 'New NFT' },
      deposit: '5000000000000000000000000',
    });
    expect(hash).toBe('nfthash');
  });

  it('nftMint rejects invalid contract', async () => {
    await expect(
      adapter.nftMint({
        contractId: '!!!',
        tokenId: 'new_token',
        metadata: {},
        deposit: '100',
      }),
    ).rejects.toThrow('Invalid NFT contract');
  });

  it('nftToken queries token info', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          result: btoa(JSON.stringify({
            token_id: 'token_001',
            owner_id: 'alice.near',
          })),
        },
      }),
    } as Response);

    const token = await adapter.nftToken('nft.near', 'token_001');
    expect(token.token_id).toBe('token_001');
    expect(token.owner_id).toBe('alice.near');
  });

  it('nftMetadata queries contract metadata', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          result: btoa(JSON.stringify({
            name: 'My NFT Collection',
            symbol: 'MYNFT',
          })),
        },
      }),
    } as Response);

    const metadata = await adapter.nftMetadata('nft.near');
    expect(metadata.name).toBe('My NFT Collection');
  });

  it('nftTokensForOwner queries owned tokens', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: {
            result: btoa(JSON.stringify(['token_001', 'token_002', 'token_003'])),
          },
        }),
      } as Response);

    const tokens = await adapter.nftTokensForOwner('nft.near', 'alice.near');
    expect(tokens).toEqual(['token_001', 'token_002', 'token_003']);
  });

  it('nftTokensForOwner handles object array', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          result: btoa(JSON.stringify([
            { token_id: 't1' },
            { token_id: 't2' },
          ])),
        },
      }),
    } as Response);

    const tokens = await adapter.nftTokensForOwner('nft.near', 'alice.near');
    expect(tokens).toEqual(['t1', 't2']);
  });

  it('nftTokensForOwner limits results', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          result: btoa(JSON.stringify(['t1', 't2', 't3', 't4', 't5'])),
        },
      }),
    } as Response);

    const tokens = await adapter.nftTokensForOwner('nft.near', 'alice.near', 3);
    expect(tokens).toEqual(['t1', 't2', 't3']);
  });

  it('nftBalance queries NFT count', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: { result: btoa('"3"') },
      }),
    } as Response);

    const balance = await adapter.nftBalance('nft.near', 'alice.near');
    expect(balance).toBe(3);
  });

  it('nftBalance returns 0 on failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('RPC error'));

    const balance = await adapter.nftBalance('nft.near', 'alice.near');
    expect(balance).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  NearChainAdapter - Message Signing                                 */
/* ------------------------------------------------------------------ */

describe('NearChainAdapter message signing', () => {
  let adapter: NearChainAdapter;

  beforeEach(() => {
    adapter = new NearChainAdapter();
    vi.restoreAllMocks();

    Object.defineProperty(adapter, '_accounts', {
      value: ['alice.near'],
      writable: true,
    });
  });

  it('signMessage rejects when no provider', async () => {
    await expect(adapter.signMessage('hello')).rejects.toThrow('No provider connected');
  });

  it('signMessage rejects without connected account', async () => {
    Object.defineProperty(adapter, '_accounts', { value: [], writable: true });
    Object.defineProperty(adapter, 'provider', {
      value: {
        signMessage: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        getAccounts: vi.fn(),
        isSignedIn: vi.fn(),
        signAndSendTransaction: vi.fn(),
      },
      writable: true,
    });

    await expect(adapter.signMessage('hello')).rejects.toThrow('No connected account');
  });

  it('signMessage rejects when wallet does not support signing', async () => {
    Object.defineProperty(adapter, 'provider', {
      value: {
        // No signMessage method
        signIn: vi.fn(),
        signOut: vi.fn(),
        getAccounts: vi.fn(),
        isSignedIn: vi.fn(),
        signAndSendTransaction: vi.fn(),
      },
      writable: true,
    });

    await expect(adapter.signMessage('hello')).rejects.toThrow(
      'Connected wallet does not support message signing',
    );
  });

  it('signMessage succeeds with NEP-413 support', async () => {
    Object.defineProperty(adapter, 'provider', {
      value: {
        signMessage: vi.fn().mockResolvedValue({
          accountId: 'alice.near',
          publicKey: 'ed25519:abc123',
          signature: 'sig456',
          message: 'hello',
        }),
        signIn: vi.fn(),
        signOut: vi.fn(),
        getAccounts: vi.fn(),
        isSignedIn: vi.fn(),
        signAndSendTransaction: vi.fn(),
      },
      writable: true,
    });

    const result = await adapter.signMessage('hello world');
    expect(result.signature).toBe('sig456');
    expect(result.publicKey).toBe('ed25519:abc123');
    expect(result.accountId).toBe('alice.near');
  });
});

/* ------------------------------------------------------------------ */
/*  NearChainAdapter - Sign Transaction                                */
/* ------------------------------------------------------------------ */

describe('NearChainAdapter sign transaction', () => {
  let adapter: NearChainAdapter;

  beforeEach(() => {
    adapter = new NearChainAdapter();
    vi.restoreAllMocks();

    Object.defineProperty(adapter, '_accounts', {
      value: ['alice.near'],
      writable: true,
    });
  });

  it('signTransaction rejects when no provider', async () => {
    await expect(
      adapter.signTransaction({
        receiverId: 'bob.near',
        actions: [createTransferAction('100')],
      }),
    ).rejects.toThrow('No provider connected');
  });

  it('signTransaction rejects when wallet does not support it', async () => {
    Object.defineProperty(adapter, 'provider', {
      value: {
        signIn: vi.fn(),
        signOut: vi.fn(),
        getAccounts: vi.fn(),
        isSignedIn: vi.fn(),
        signAndSendTransaction: vi.fn(),
        // No signTransaction method
      },
      writable: true,
    });

    await expect(
      adapter.signTransaction({
        receiverId: 'bob.near',
        actions: [createTransferAction('100')],
      }),
    ).rejects.toThrow('Connected wallet does not support raw transaction signing');
  });

  it('signTransaction returns signed data', async () => {
    Object.defineProperty(adapter, 'provider', {
      value: {
        signIn: vi.fn(),
        signOut: vi.fn(),
        getAccounts: vi.fn(),
        isSignedIn: vi.fn(),
        signAndSendTransaction: vi.fn(),
        signTransaction: vi.fn().mockResolvedValue({
          transaction: {},
          signature: 'ed25519:sig123',
          publicKey: 'ed25519:pub456',
        }),
      },
      writable: true,
    });

    const result = await adapter.signTransaction({
      receiverId: 'bob.near',
      actions: [createTransferAction('100')],
    });

    expect(result.transactionHash).toBeDefined();
    expect(result.encoded).toBeDefined();
    expect(result.rawBytes).toBeInstanceOf(Uint8Array);
  });
});

/* ------------------------------------------------------------------ */
/*  NearChainAdapter - Network info                                    */
/* ------------------------------------------------------------------ */

describe('NearChainAdapter network info', () => {
  let adapter: NearChainAdapter;

  beforeEach(() => {
    adapter = new NearChainAdapter();
    vi.restoreAllMocks();
  });

  it('getLatestBlock fetches block info', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          header: {
            height: 12345,
            hash: 'abc123',
            prev_hash: 'def456',
            timestamp: 1000000000,
            epoch_id: 'epoch1',
          },
        },
      }),
    } as Response);

    const block = await adapter.getLatestBlock();
    expect(block.height).toBe(12345);
    expect(block.hash).toBe('abc123');
  });

  it('getGasPrice fetches gas price', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: { gas_price: '100000000' },
      }),
    } as Response);

    const price = await adapter.getGasPrice();
    expect(price).toBe('100000000');
  });

  it('getNetworkStatus returns chain info', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          chain_id: 'mainnet',
          latest_block_hash: 'abc123',
          latest_block_height: 99999,
        },
      }),
    } as Response);

    const status = await adapter.getNetworkStatus();
    expect(status.chainId).toBe('mainnet');
    expect(status.latestBlockHash).toBe('abc123');
    expect(status.latestBlockHeight).toBe(99999);
  });

  it('getOnChainChainId queries chain ID from RPC', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          chain_id: 'mainnet',
          latest_block_hash: 'abc',
          latest_block_height: 1000,
        },
      }),
    } as Response);

    const chainId = await adapter.getOnChainChainId();
    expect(chainId).toBe('mainnet');
  });
});

/* ------------------------------------------------------------------ */
/*  NearChainAdapter - Transaction status                              */
/* ------------------------------------------------------------------ */

describe('NearChainAdapter transaction status', () => {
  let adapter: NearChainAdapter;

  beforeEach(() => {
    adapter = new NearChainAdapter();
    vi.restoreAllMocks();
  });

  it('getTransactionStatus returns null on failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('RPC error'));

    const status = await adapter.getTransactionStatus('abc123', 'alice.near');
    expect(status).toBeNull();
  });

  it('getTransactionStatus parses success status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          transaction: {
            hash: 'abc123',
            signer_id: 'alice.near',
            public_key: 'ed25519:pubkey',
            nonce: 1,
            receiver_id: 'bob.near',
            actions: [],
            signature: 'sig',
          },
          status: { SuccessValue: '' },
          receipts: [],
          receipts_outcome: [],
        },
      }),
    } as Response);

    const status = await adapter.getTransactionStatus('abc123', 'alice.near');
    expect(status).not.toBeNull();
    expect(status!.status).toBe('SuccessValue');
  });

  it('getTransactionStatus parses failure status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          transaction: {
            hash: 'abc123',
            signer_id: 'alice.near',
            public_key: 'ed25519:pubkey',
            nonce: 1,
            receiver_id: 'bob.near',
            actions: [],
            signature: 'sig',
          },
          status: { Failure: 'Error' },
          receipts: [],
          receipts_outcome: [],
        },
      }),
    } as Response);

    const status = await adapter.getTransactionStatus('abc123', 'alice.near');
    expect(status!.status).toBe('Failure');
  });
});

/* ------------------------------------------------------------------ */
/*  NearChainAdapter - Chain Switch                                    */
/* ------------------------------------------------------------------ */

describe('NearChainAdapter chain switch', () => {
  let adapter: NearChainAdapter;

  beforeEach(() => {
    adapter = new NearChainAdapter();
    vi.restoreAllMocks();
  });

  it('switchChainById switches to registered chain', async () => {
    adapter.registerChains(NEAR_CHAINS);
    await adapter.switchChainById('near:testnet');
    const chainId = await adapter.getChainId();
    expect(chainId).toBe('near:testnet');
  });

  it('switchChainById throws for unknown chain', async () => {
    await expect(adapter.switchChainById('unknown-chain')).rejects.toThrow(
      'Chain not found',
    );
  });

  it('switchChain uses numeric ID to find chain', async () => {
    adapter.registerChains(NEAR_CHAINS);
    await expect(adapter.switchChain(0)).resolves.toBeUndefined();
  });

  it('switchChainById resets RPC client', async () => {
    adapter.registerChains(NEAR_CHAINS);
    await adapter.switchChainById('near:testnet');
    expect(adapter.getRpcUrl()).toBe('https://rpc.testnet.near.org');
  });
});

/* ------------------------------------------------------------------ */
/*  NearChainAdapter - EIP-1193 Request                                */
/* ------------------------------------------------------------------ */

describe('NearChainAdapter request (EIP-1193)', () => {
  let adapter: NearChainAdapter;

  beforeEach(() => {
    adapter = new NearChainAdapter();
    vi.restoreAllMocks();
  });

  it('near_getBalance returns balance', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await adapter.request({
      method: 'near_getBalance',
      params: ['alice.near'],
    });
    expect(result).toBe('0');
  });

  it('near_getChainId returns chain ID', async () => {
    const result = await adapter.request({
      method: 'near_getChainId',
    });
    expect(result).toContain('near');
  });

  it('near_ft_metadata queries metadata', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          result: btoa(JSON.stringify({
            name: 'Token',
            symbol: 'TKN',
            decimals: 8,
          })),
        },
      }),
    } as Response);

    const result = await adapter.request({
      method: 'near_ft_metadata',
      params: ['token.near'],
    });
    expect((result as any).name).toBe('Token');
  });

  it('near_getBlock returns block info', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          header: { height: 42, hash: 'h42', prev_hash: 'ph', timestamp: 0, epoch_id: 'e' },
        },
      }),
    } as Response);

    const result = await adapter.request({
      method: 'near_getBlock',
    });
    expect((result as any).height).toBe(42);
  });

  it('near_getGasPrice returns gas price', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: { gas_price: '100' },
      }),
    } as Response);

    const result = await adapter.request({
      method: 'near_getGasPrice',
    });
    expect(result).toBe('100');
  });

  it('near_call queries contract view method', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: { result: btoa('"42"') },
      }),
    } as Response);

    const result = await adapter.request({
      method: 'near_call',
      params: ['token.near', 'ft_total_supply', {}],
    });
    expect(result).toBe('42');
  });

  it('throws for unsupported method', async () => {
    await expect(
      adapter.request({ method: 'near_unsupported' }),
    ).rejects.toThrow('Unsupported NEAR method');
  });

  it('near_nft_token queries NFT token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          result: btoa(JSON.stringify({ token_id: 't1', owner_id: 'alice.near' })),
        },
      }),
    } as Response);

    const result = await adapter.request({
      method: 'near_nft_token',
      params: ['nft.near', 't1'],
    });
    expect((result as any).token_id).toBe('t1');
  });
});

/* ------------------------------------------------------------------ */
/*  NearChainAdapter - getAccounts without connection                  */
/* ------------------------------------------------------------------ */

describe('NearChainAdapter getAccounts without connection', () => {
  let adapter: NearChainAdapter;

  beforeEach(() => {
    adapter = new NearChainAdapter();
  });

  it('getAccounts throws when not connected', async () => {
    await expect(adapter.getAccounts()).rejects.toThrow('Not connected');
  });
});

/* ------------------------------------------------------------------ */
/*  NearChainAdapter - sendTransaction with pre-encoded tx             */
/* ------------------------------------------------------------------ */

describe('NearChainAdapter sendTransaction with pre-encoded data', () => {
  let adapter: NearChainAdapter;

  beforeEach(() => {
    adapter = new NearChainAdapter();
    vi.restoreAllMocks();

    Object.defineProperty(adapter, '_accounts', {
      value: ['alice.near'],
      writable: true,
    });
    Object.defineProperty(adapter, 'provider', {
      value: {
        signIn: vi.fn(),
        signOut: vi.fn(),
        getAccounts: vi.fn(),
        isSignedIn: vi.fn(),
        signAndSendTransaction: vi.fn().mockResolvedValue({
          transactionHash: 'tx123',
          transaction: { hash: 'tx123' },
        }),
      },
      writable: true,
    });
  });

  it('sendTransaction accepts Uint8Array', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          transaction: { hash: 'tx123' },
          status: { SuccessValue: '' },
          receipts: [],
          receipts_outcome: [],
        },
      }),
    } as Response);

    const txBytes = new Uint8Array([0x00, 0x01, 0x02]);
    const hash = await adapter.sendTransaction(txBytes);
    expect(hash).toBe('tx123');
  });
});
