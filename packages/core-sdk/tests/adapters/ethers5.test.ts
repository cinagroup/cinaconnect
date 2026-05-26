/**
 * Tests for ethers v5 adapter.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Ethers5Adapter } from '../../src/adapters/ethers5.js';
import type { Ethers5Provider, Ethers5Signer, Ethers5BigNumber, Ethers5Network } from '../../src/adapters/ethers5.js';

function mockBigNumber(value: number): Ethers5BigNumber {
  return {
    toString: () => value.toString(),
    toHexString: () => `0x${value.toString(16)}`,
    toNumber: () => value,
  };
}

function createMockProvider(overrides?: {
  accounts?: string[];
  chainId?: number;
  signer?: Ethers5Signer;
}): Ethers5Provider {
  const accounts = overrides?.accounts ?? ['0xEthers5Account'];
  const chainId = overrides?.chainId ?? 1;

  const network: Ethers5Network = { chainId, name: 'homestead' };

  const signer: Ethers5Signer = {
    getAddress: async () => accounts[0],
    getBalance: async () => mockBigNumber(1000),
    signMessage: async (msg: string | Uint8Array) =>
      `0xethers5sig_${typeof msg === 'string' ? msg.slice(0, 10) : 'bytes'}`,
    signTransaction: async () => '0xethers5signedTx',
    sendTransaction: async () => ({
      hash: '0xethers5txhash',
      from: accounts[0],
      to: null,
      nonce: 0,
      gasLimit: mockBigNumber(21000),
      data: '0x',
      value: mockBigNumber(0),
      chainId,
      wait: async () => ({
        transactionHash: '0xethers5txhash',
        transactionIndex: 0,
        blockHash: '0xblock',
        blockNumber: 100,
        from: accounts[0],
        to: null,
        gasUsed: mockBigNumber(21000),
        cumulativeGasUsed: mockBigNumber(21000),
        status: 1,
        logs: [],
      }),
    }),
    connect: () => signer,
    provider: undefined,
  };

  return {
    getNetwork: async () => network,
    getBalance: async () => mockBigNumber(1000),
    getCode: async () => '0x',
    getGasPrice: async () => mockBigNumber(20000000000),
    getBlockNumber: async () => 18000000,
    getTransaction: async () => null,
    getTransactionReceipt: async () => null,
    send: async ({ method }: { method: string }) => {
      if (method === 'wallet_switchEthereumChain') return null;
      return null;
    },
    listAccounts: async () => accounts,
    getSigner: () => overrides?.signer ?? signer,
  };
}

describe('Ethers5Adapter', () => {
  let adapter: Ethers5Adapter;

  beforeEach(() => {
    adapter = new Ethers5Adapter();
  });

  it('should have correct id and type', () => {
    expect(adapter.id).toBe('ethers5');
    expect(adapter.name).toBe('ethers v5');
    expect(adapter.type).toBe('injected');
  });

  it('should not be installed without provider', () => {
    // Ethers5Adapter without a provider should report installed=false
    // Note: the constructor sets installed based on provider !== null
    expect(adapter.getEthersProvider()).toBeNull();
  });

  it('should be installed with provider', () => {
    const provider = createMockProvider();
    const a = new Ethers5Adapter(provider);
    expect(a.installed).toBe(true);
  });

  it('should throw when no provider set', async () => {
    await expect(adapter.connect()).rejects.toThrow('No ethers v5 provider');
  });

  it('should connect and return ConnectionResult', async () => {
    const provider = createMockProvider();
    adapter = new Ethers5Adapter(provider);
    const result = await adapter.connect();
    expect(result.accounts).toEqual(['0xEthers5Account']);
    expect(result.chainId).toBe(1);
    expect(result.connectorId).toBe('ethers5');
  });

  it('should disconnect', async () => {
    const provider = createMockProvider();
    adapter = new Ethers5Adapter(provider);
    await adapter.connect();
    await expect(adapter.disconnect()).resolves.not.toThrow();
  });

  it('should get accounts', async () => {
    const provider = createMockProvider();
    adapter = new Ethers5Adapter(provider);
    const accounts = await adapter.getAccounts();
    expect(accounts).toEqual(['0xEthers5Account']);
  });

  it('should get chainId', async () => {
    const provider = createMockProvider({ chainId: 137 });
    adapter = new Ethers5Adapter(provider);
    const chainId = await adapter.getChainId();
    expect(chainId).toBe(137);
  });

  it('should switch chain', async () => {
    const provider = createMockProvider();
    adapter = new Ethers5Adapter(provider);
    await expect(adapter.switchChain(137)).resolves.not.toThrow();
  });

  it('should sign a message', async () => {
    const provider = createMockProvider();
    adapter = new Ethers5Adapter(provider);
    await adapter.connect();
    const sig = await adapter.signMessage('Hello ethers v5');
    expect(sig).toContain('0xethers5sig');
  });

  it('should sign a transaction', async () => {
    const provider = createMockProvider();
    adapter = new Ethers5Adapter(provider);
    await adapter.connect();
    const signed = await adapter.signTransaction({
      from: '0xabc',
      to: '0xdef',
      value: '0x100',
    });
    expect(signed).toBe('0xethers5signedTx');
  });

  it('should get balance', async () => {
    const provider = createMockProvider();
    adapter = new Ethers5Adapter(provider);
    const balance = await adapter.getBalance();
    expect(balance.toNumber()).toBe(1000);
  });

  it('should get gas price', async () => {
    const provider = createMockProvider();
    adapter = new Ethers5Adapter(provider);
    const gp = await adapter.getGasPrice();
    expect(gp.toNumber()).toBe(20000000000);
  });

  it('should get block number', async () => {
    const provider = createMockProvider();
    adapter = new Ethers5Adapter(provider);
    const bn = await adapter.getBlockNumber();
    expect(bn).toBe(18000000);
  });

  it('should send transaction', async () => {
    const provider = createMockProvider();
    adapter = new Ethers5Adapter(provider);
    await adapter.connect();
    const tx = await adapter.sendTransaction({
      from: '0xabc',
      to: '0xdef',
      value: '0x100',
    });
    expect(tx.hash).toBe('0xethers5txhash');
  });

  it('should get transaction', async () => {
    const provider = createMockProvider();
    adapter = new Ethers5Adapter(provider);
    const tx = await adapter.getTransaction('0xhash');
    expect(tx).toBeNull();
  });

  it('should call a contract method', async () => {
    const provider = createMockProvider();
    adapter = new Ethers5Adapter(provider);
    const result = await adapter.call('0xContract', '0xdata');
    expect(result).toBeNull();
  });

  it('should get token balance', async () => {
    const provider = createMockProvider();
    adapter = new Ethers5Adapter(provider);
    const result = await adapter.getTokenBalance('0xToken', '0xUser');
    expect(result).toBeNull();
  });

  it('should register and find chains', () => {
    adapter.registerChains([
      { id: '1', name: 'Ethereum', rpcUrl: 'https://eth.rpc' },
      { id: '89', name: 'Polygon', rpcUrl: 'https://polygon.rpc' },
    ]);
    expect(adapter.findChain(1)?.name).toBe('Ethereum');
    expect(adapter.findChain(137)?.name).toBe('Polygon');
  });

  it('should set provider', () => {
    const provider = createMockProvider();
    adapter.setProvider(provider);
    expect(adapter.getEthersProvider()).toBe(provider);
  });
});
