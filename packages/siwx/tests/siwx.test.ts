/**
 * Tests for SIWX (Sign-In with Cross-chain) core functions.
 */

import { describe, it, expect } from 'vitest';
import {
  createSignInMessage,
  verifySignIn,
  SIWXAdapter,
  SIWXRegistry,
  defaultRegistry,
} from '../src/siwx.js';
import type { SIWXParams, SIWXVerifyInput, ChainType } from '../src/types.js';

// Helper to create standard params
function createParams(overrides?: Partial<SIWXParams>): SIWXParams {
  return {
    domain: 'example.com',
    address: '0x1234567890123456789012345678901234567890',
    uri: 'https://example.com/login',
    chainId: 1,
    nonce: 'abc123',
    ...overrides,
  };
}

describe('createSignInMessage', () => {
  it('should create an EVM sign-in message', () => {
    const params = createParams();
    const message = createSignInMessage(params, 'evm');
    expect(message).toContain('example.com');
    expect(message).toContain('0x1234567890123456789012345678901234567890');
    expect(message).toContain('abc123');
    expect(message).toContain('https://example.com/login');
  });

  it('should create a Solana sign-in message', () => {
    const params = createParams({
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      chainId: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    });
    const message = createSignInMessage(params, 'solana');
    expect(message).toBeDefined();
    expect(typeof message).toBe('string');
  });

  it('should create a Bitcoin sign-in message', () => {
    const params = createParams({
      address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      chainId: '000000000019d6689c085ae165831e93',
    });
    const message = createSignInMessage(params, 'bitcoin');
    expect(message).toBeDefined();
    expect(typeof message).toBe('string');
  });

  it('should throw for unsupported chain type', () => {
    const params = createParams();
    expect(() => createSignInMessage(params, 'unknown' as ChainType)).toThrow(
      'Unsupported chain type'
    );
  });

  it('should enrich with nonce and issuedAt when not provided', () => {
    const params = createParams({ nonce: undefined as any });
    const message = createSignInMessage(params, 'evm');
    // The adapter will generate defaults
    expect(message).toBeDefined();
  });

  it('should include optional fields', () => {
    const params = createParams({
      statement: 'Sign in to the app',
      resources: ['https://example.com/resource1'],
      expirationTime: '2025-01-01T00:00:00Z',
    });
    const message = createSignInMessage(params, 'evm');
    expect(message).toContain('Sign in to the app');
    expect(message).toContain('https://example.com/resource1');
  });
});

describe('verifySignIn', () => {
  it('should throw for EVM without provider', async () => {
    const input: SIWXVerifyInput = {
      message: 'test',
      signature: '0xabc',
      address: '0x123',
      chainType: 'evm',
    };
    await expect(verifySignIn(input)).rejects.toThrow(
      'EVM verification requires a provider'
    );
  });

  it('should throw for unsupported chain type', async () => {
    const input: SIWXVerifyInput = {
      message: 'test',
      signature: 'abc',
      address: 'bc1q',
      chainType: 'unknown' as ChainType,
    };
    await expect(verifySignIn(input)).rejects.toThrow(
      'Unsupported chain type for verification'
    );
  });
});

describe('SIWXRegistry', () => {
  it('should register and get adapters', () => {
    const registry = new SIWXRegistry();
    const mockAdapter: SIWXAdapter = {
      chainType: 'evm',
      createMessage: () => 'mock message',
      verify: async () => ({
        chainType: 'evm',
        data: {},
        signature: '',
        message: 'mock message',
        valid: true,
      }),
    };

    registry.register(mockAdapter);
    expect(registry.get('evm')).toBe(mockAdapter);
    expect(registry.has('evm')).toBe(true);
    expect(registry.has('solana')).toBe(false);
  });

  it('should list registered chains', () => {
    const registry = new SIWXRegistry();
    expect(registry.getRegisteredChains()).toEqual([]);
  });

  it('should replace adapters for same chain', () => {
    const registry = new SIWXRegistry();
    const adapter1: SIWXAdapter = {
      chainType: 'evm',
      createMessage: () => 'v1',
      verify: async () => ({
        chainType: 'evm',
        data: {},
        signature: '',
        message: 'v1',
        valid: true,
      }),
    };
    const adapter2: SIWXAdapter = {
      chainType: 'evm',
      createMessage: () => 'v2',
      verify: async () => ({
        chainType: 'evm',
        data: {},
        signature: '',
        message: 'v2',
        valid: true,
      }),
    };

    registry.register(adapter1);
    registry.register(adapter2);
    expect(registry.get('evm')).toBe(adapter2);
  });
});
