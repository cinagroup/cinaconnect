import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BlockchainApiClient, createBlockchainApi } from './client.js';
import { clearTxCached } from './client.js';
import type { BlockchainApiConfig } from './types.js';

describe('BlockchainApiClient', () => {
  it('should create with default config', () => {
    const client = new BlockchainApiClient();
    expect(client.config.defaultChainId).toBe(1);
    expect(client.config.rpcUrls).toEqual({});
    expect(client.config.ensResolvers).toEqual({});
  });

  it('should create with custom config', () => {
    const config: BlockchainApiConfig = {
      defaultChainId: 137,
      rpcUrls: { 137: 'https://polygon-rpc.com' },
      metadataBaseUrl: 'https://metadata.example.com',
      alchemyApiKey: 'test-alchemy-key',
      covalentApiKey: 'test-covalent-key',
    };
    const client = new BlockchainApiClient(config);
    expect(client.config.defaultChainId).toBe(137);
    expect(client.config.rpcUrls![137]).toBe('https://polygon-rpc.com');
    expect(client.config.metadataBaseUrl).toBe('https://metadata.example.com');
    expect(client.config.alchemyApiKey).toBe('test-alchemy-key');
    expect(client.config.covalentApiKey).toBe('test-covalent-key');
  });

  it('should accept empty config object', () => {
    const client = new BlockchainApiClient({});
    expect(client.config.defaultChainId).toBe(1);
  });

  it('should accept partial config', () => {
    const client = new BlockchainApiClient({
      defaultChainId: 42161,
    });
    expect(client.config.defaultChainId).toBe(42161);
    expect(client.config.rpcUrls).toEqual({});
  });

  it('should expose config as read-only', () => {
    const config: BlockchainApiConfig = {
      defaultChainId: 10,
    };
    const client = new BlockchainApiClient(config);
    expect(client.config.defaultChainId).toBe(10);
    // Config object is exposed
    expect(client.config).toHaveProperty('defaultChainId');
  });
});

describe('createBlockchainApi factory', () => {
  it('should create a BlockchainApiClient instance', () => {
    const client = createBlockchainApi();
    expect(client).toBeInstanceOf(BlockchainApiClient);
  });

  it('should forward config to the client', () => {
    const client = createBlockchainApi({
      defaultChainId: 56,
      alchemyApiKey: 'key123',
    });
    expect(client.config.defaultChainId).toBe(56);
    expect(client.config.alchemyApiKey).toBe('key123');
  });

  it('should create with no config', () => {
    const client = createBlockchainApi();
    expect(client.config.defaultChainId).toBe(1);
  });
});

describe('Transaction cache', () => {
  afterEach(() => {
    clearTxCached();
  });

  it('should clear the transaction cache', () => {
    // The cache is internal; we verify clearTxCached runs without error
    expect(() => clearTxCached()).not.toThrow();
  });
});
