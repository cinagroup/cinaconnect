/**
 * core-sdk/tests/chains.test.ts
 *
 * Tests for chain configuration — EVM chains (ETH, Arbitrum, Base),
 * multi-chain support, and Chain type validation.
 */

import { describe, it, expect } from 'vitest';
import type { Chain, ChainNamespace, ChainReference } from '../src/types.js';

// ---------------------------------------------------------------------------
// Fixtures: common chain definitions
// ---------------------------------------------------------------------------

const ETH_MAINNET: Chain = {
  id: 'eip155:1',
  name: 'Ethereum',
  rpcUrl: 'https://eth.llamarpc.com',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  explorerUrl: 'https://etherscan.io',
};

const ARBITRUM: Chain = {
  id: 'eip155:42161',
  name: 'Arbitrum One',
  rpcUrl: 'https://arb1.arbitrum.io/rpc',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  explorerUrl: 'https://arbiscan.io',
};

const BASE: Chain = {
  id: 'eip155:8453',
  name: 'Base',
  rpcUrl: 'https://mainnet.base.org',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  explorerUrl: 'https://basescan.org',
};

const POLYGON: Chain = {
  id: 'eip155:137',
  name: 'Polygon',
  rpcUrl: 'https://polygon-rpc.com',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  explorerUrl: 'https://polygonscan.com',
};

const OPTIMISM: Chain = {
  id: 'eip155:10',
  name: 'Optimism',
  rpcUrl: 'https://mainnet.optimism.io',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  explorerUrl: 'https://optimistic.etherscan.io',
};

const BSC: Chain = {
  id: 'eip155:56',
  name: 'BNB Smart Chain',
  rpcUrl: 'https://bsc-dataseed.binance.org',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  explorerUrl: 'https://bscscan.com',
};

const AVALANCHE: Chain = {
  id: 'eip155:43114',
  name: 'Avalanche C-Chain',
  rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
  nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
  explorerUrl: 'https://snowtrace.io',
};

// Non-EVM chains
const SOLANA: Chain = {
  id: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  name: 'Solana',
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
};

const BITCOIN: Chain = {
  id: 'bip122:000000000019d6689c085ae165831e93',
  name: 'Bitcoin',
  rpcUrl: '',
  nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 8 },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Chain configurations', () => {
  it('ETH mainnet', () => {
    expect(ETH_MAINNET.name).toBe('Ethereum');
    expect(ETH_MAINNET.rpcUrl.startsWith('https')).toBe(true);
    expect(ETH_MAINNET.nativeCurrency?.symbol).toBe('ETH');
    expect(ETH_MAINNET.nativeCurrency?.decimals).toBe(18);
    expect(ETH_MAINNET.id).toBe('eip155:1');
    expect(ETH_MAINNET.explorerUrl?.includes('etherscan')).toBe(true);
  });

  it('Arbitrum', () => {
    expect(ARBITRUM.id).toBe('eip155:42161');
    expect(ARBITRUM.name).toBe('Arbitrum One');
    expect(ARBITRUM.nativeCurrency?.symbol).toBe('ETH');
  });

  it('Base', () => {
    expect(BASE.id).toBe('eip155:8453');
    expect(BASE.rpcUrl.includes('base.org')).toBe(true);
    expect(BASE.nativeCurrency?.symbol).toBe('ETH');
  });

  it('Polygon', () => {
    expect(POLYGON.id).toBe('eip155:137');
    expect(POLYGON.nativeCurrency?.symbol).toBe('MATIC');
  });

  it('Optimism', () => {
    expect(OPTIMISM.id).toBe('eip155:10');
    expect(OPTIMISM.nativeCurrency?.symbol).toBe('ETH');
  });

  it('BSC', () => {
    expect(BSC.id).toBe('eip155:56');
    expect(BSC.nativeCurrency?.symbol).toBe('BNB');
  });

  it('Avalanche', () => {
    expect(AVALANCHE.id).toBe('eip155:43114');
    expect(AVALANCHE.nativeCurrency?.symbol).toBe('AVAX');
  });

  it('Non-EVM chains', () => {
    expect(SOLANA.id.startsWith('solana:')).toBe(true);
    expect(BITCOIN.id.startsWith('bip122:')).toBe(true);
  });

  it('ChainNamespace types', () => {
    const namespaces: ChainNamespace[] = [
      'eip155', 'solana', 'bip121', 'bip122', 'tron', 'ton', 'polkadot',
    ];
    expect(namespaces.length).toBe(7);
    expect(namespaces.includes('eip155')).toBe(true);
    expect(namespaces.includes('solana')).toBe(true);
    expect(namespaces.includes('ton')).toBe(true);
  });

  it('ChainReference', () => {
    const ref: ChainReference = { namespace: 'eip155', reference: '1' };
    expect(ref.namespace).toBe('eip155');
    expect(ref.reference).toBe('1');
  });

  it('Chain registry lookup', () => {
    const registry: Record<string, Chain> = {
      '1': ETH_MAINNET,
      '42161': ARBITRUM,
      '8453': BASE,
      '137': POLYGON,
      '10': OPTIMISM,
      '56': BSC,
      '43114': AVALANCHE,
    };

    function getChainById(chainId: string): Chain | undefined {
      const num = chainId.split(':').pop();
      return registry[num!];
    }

    expect(getChainById('eip155:1')?.name).toBe('Ethereum');
    expect(getChainById('eip155:42161')?.name).toBe('Arbitrum One');
    expect(getChainById('eip155:8453')?.name).toBe('Base');
    expect(getChainById('eip155:999')).toBeUndefined();
  });

  it('All chains have required fields', () => {
    const chains = [ETH_MAINNET, ARBITRUM, BASE, POLYGON, OPTIMISM, BSC, AVALANCHE, SOLANA, BITCOIN];
    for (const chain of chains) {
      expect(!!chain.id).toBe(true);
      expect(!!chain.name).toBe(true);
      expect(chain.rpcUrl !== undefined).toBe(true);
      expect(!!chain.nativeCurrency).toBe(true);
      expect(typeof chain.nativeCurrency!.decimals).toBe('number');
    }
  });
});
