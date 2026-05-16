/**
 * Tests for ethers v6 adapter.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Ethers6Adapter } from '../../src/adapters/ethers6.js';
import type {
  Ethers6Provider,
  Ethers6Signer,
  Ethers6BigInt,
  Ethers6Network,
} from '../../src/adapters/ethers6.js';

function mockBigInt(value: bigint | number): Ethers6BigInt {
  const v = typeof value === 'number' ? BigInt(value) : value;
  return {
    toString: () => v.toString(),
    toHexString: () => `0x${v.toString(16)}`,
    toNumber: () => Number(v),
  };
}

function createMockProvider(overrides?: {
  accounts?: string[];
  chainId?: bigint;
  signer?: Ethers6Signer;
}): Ethers6Provider {
  const accounts = overrides?.accounts ?? ['0xEthers6Account'];
  const chainId = overrides?.chainId ?? BigInt(1);

  const network: Ethers6Network = { chainId, name: 'homestead' };

  const signer: Ethers6Signer = {
    getAddress: async () => accounts[0],
    getBalance: async () => mockBigInt(1000),
    signMessage: async (msg: string | Uint8Array) =>
      `0xethers6sig_${typeof msg === 'string' ? msg.slice(0, 10) : 'bytes'}`,
    signTransaction: async () => '0xethers6signedTx',
    sendTransaction: async () => ({
      hash: '0xethers6txhash',
      from: accounts[0],
      to: null,
      nonce: 0,
      gasLimit: mockBigInt(21000),
      data: '0x',
      value: mockBigInt(0),
      chainId,
      type: 2,
      wait: async () => ({
        hash: '0xethers6txhash',
        to: null,
        from: accounts[0],
        contractAddress: null,
        blockHash: '0xblock',
        blockNumber: 100,
        gasUsed: mockBigInt(21000),
        cumulativeGasUsed: mockBigInt(21000),
        status: 1,
        logs: [],
      }),
    }),
    provider: undefined,
  };

  return {
    getNetwork: async () => network,
    getBalance: async () => mockBigInt(1000),
    getBlockNumber: async () => 18000000,
    getGasPrice: async () => mockBigInt(20000000000),
    getTransaction: async () => null,
    getTransactionReceipt: async () => null,
    send: async ({ method }: { method: string }) => {
      if (method === 'wallet_switchEthereumChain') return null;
      return null;
    },
    call: async () => '0x',
    listAccounts: async () => accounts,
    getSigner: async () => overrides?.signer ?? signer,
  };
}

describe('Ethers6Adapter', () => {
  let adapter: Ethers6Adapter;

  beforeEach(() => {
    adapter = new Ethers6Adapter();
  });

  it('should have correct id and type', () => {
    expect(adapter.id).toBe('ethers6');
    expect(adapter.name).toBe('ethers v6');
    expect(adapter.type).toBe('injected');
  });

  it('should not be installed without provider', () => {
    expect(adapter.installed).toBe(false);
  });

  it('should be installed with provider', () => {
    const provider = createMockProvider();
    const a = new Ethers6Adapter(provider);
    expect(a.installed).toBe(true);
  });

  it('should throw when no provider set', async () => {
    await expect(adapter.connect()).rejects.toThrow('No ethers v6 provider');
  });

  it('should connect and return ConnectionResult', async () => {
    const provider = createMockProvider();
    adapter = new Ethers6Adapter(provider);
    const result = await adapter.connect();
    expect(result.accounts).toEqual(['0xEthers6Account']);
    expect(result.chainId).toBe(1);
    expect(result.connectorId).toBe('ethers6');
  });

  it('should disconnect', async () => {
    const provider = createMockProvider();
    adapter = new Ethers6Adapter(provider);
    await adapter.connect();
    await expect(adapter.disconnect()).resolves.not.toThrow();
  });

  it('should get accounts', async () => {
    const provider = createMockProvider();
    adapter = new Ethers6Adapter(provider);
    const accounts = await adapter.getAccounts();
    expect(accounts).toEqual(['0xEthers6Account']);
  });

  it('should get chainId', async () => {
    const provider = createMockProvider({ chainId: BigInt(137) });
    adapter = new Ethers6Adapter(provider);
    const chainId = await adapter.getChainId();
    expect(chainId).toBe(137);
  });

  it('should switch chain', async () => {
    const provider = createMockProvider();
    adapter = new Ethers6Adapter(provider);
    await expect(adapter.switchChain(137)).resolves.not.toThrow();
  });

  it('should sign a message', async () => {
    const provider = createMockProvider();
    adapter = new Ethers6Adapter(provider);
    await adapter.connect();
    const sig = await adapter.signMessage('Hello ethers v6');
    expect(sig).toContain('0xethers6sig');
  });

  it('should sign a transaction', async () => {
    const provider = createMockProvider();
    adapter = new Ethers6Adapter(provider);
    await adapter.connect();
    const signed = await adapter.signTransaction({
      from: '0xabc',
      to: '0xdef',
      value: '0x100',
      maxFeePerGas: '0x3b9aca00',
    });
    expect(signed).toBe('0xethers6signedTx');
  });

  it('should get balance', async () => {
    const provider = createMockProvider();
    adapter = new Ethers6Adapter(provider);
    const balance = await adapter.getBalance();
    expect(balance.toNumber()).toBe(1000);
  });

  it('should get gas price', async () => {
    const provider = createMockProvider();
    adapter = new Ethers6Adapter(provider);
    const gp = await adapter.getGasPrice();
    expect(gp.toNumber()).toBe(20000000000);
  });

  it('should get block number', async () => {
    const provider = createMockProvider();
    adapter = new Ethers6Adapter(provider);
    const bn = await adapter.getBlockNumber();
    expect(bn).toBe(18000000);
  });

  it('should send EIP-1559 transaction', async () => {
    const provider = createMockProvider();
    adapter = new Ethers6Adapter(provider);
    await adapter.connect();
    const tx = await adapter.sendTransaction({
      from: '0xabc',
      to: '0xdef',
      value: '0x100',
      maxFeePerGas: '0x3b9aca00',
      maxPriorityFeePerGas: '0x77359400',
    });
    expect(tx.hash).toBe('0xethers6txhash');
    expect(tx.type).toBe(2); // EIP-1559
  });

  it('should estimate gas', async () => {
    const provider = createMockProvider();
    adapter = new Ethers6Adapter(provider);
    const gas = await adapter.estimateGas({
      from: '0xabc',
      to: '0xdef',
    });
    // Mock returns '0xresult' cast as BigInt — just check it's returned
    expect(gas).toBeDefined();
  });

  it('should call a contract method', async () => {
    const provider = createMockProvider();
    adapter = new Ethers6Adapter(provider);
    const result = await adapter.call('0xContract', '0xdata');
    expect(result).toBe('0x');
  });

  it('should register and find chains', () => {
    adapter.registerChains([
      { id: '1', name: 'Ethereum', rpcUrl: 'https://eth.rpc' },
      { id: '10', name: 'Optimism', rpcUrl: 'https://optimism.rpc' },
    ]);
    expect(adapter.findChain(1)?.name).toBe('Ethereum');
    expect(adapter.findChain(10)?.name).toBe('Optimism');
  });

  it('should set provider', () => {
    const provider = createMockProvider();
    adapter.setProvider(provider);
    expect(adapter.getEthersProvider()).toBe(provider);
  });

  it('should throw when signing without connecting', async () => {
    const provider = createMockProvider();
    adapter = new Ethers6Adapter(provider);
    await expect(adapter.signMessage('test')).rejects.toThrow();
  });
});
