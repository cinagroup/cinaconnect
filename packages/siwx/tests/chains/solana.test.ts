/**
 * Tests for SIWX Solana chain adapter.
 */

import { describe, it, expect } from 'vitest';
import {
  createSolanaSignInMessage,
  verifySolanaSignature,
  parseSolanaMessage,
} from '../src/chains/solana.js';
import type { SIWXVerifyInput } from '../src/types.js';

describe('createSolanaSignInMessage', () => {
  it('should generate a sign-in message for Solana', () => {
    const message = createSolanaSignInMessage({
      domain: 'solapp.example.com',
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      uri: 'https://solapp.example.com/login',
      chainId: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      nonce: 'solana-nonce-456',
    });

    expect(message).toBeDefined();
    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
  });

  it('should include the Solana address', () => {
    const message = createSolanaSignInMessage({
      domain: 'example.com',
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      uri: 'https://example.com',
      chainId: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      nonce: 'nonce',
    });

    expect(message).toContain('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');
  });

  it('should include optional fields', () => {
    const message = createSolanaSignInMessage({
      domain: 'example.com',
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      uri: 'https://example.com',
      chainId: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      nonce: 'nonce',
      statement: 'Sign in with Solana',
      resources: ['https://example.com/resource'],
    });

    expect(message).toContain('Sign in with Solana');
    expect(message).toContain('https://example.com/resource');
  });
});

describe('parseSolanaMessage', () => {
  it('should parse a Solana sign-in message', () => {
    const message = createSolanaSignInMessage({
      domain: 'example.com',
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      uri: 'https://example.com',
      chainId: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      nonce: 'nonce',
    });

    const parsed = parseSolanaMessage(message);
    expect(parsed).toBeDefined();
  });
});

describe('verifySolanaSignature', () => {
  it('should return a result object', async () => {
    const input: SIWXVerifyInput = {
      message: 'solana test message',
      signature: 'base58signature',
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      chainType: 'solana',
    };

    const result = await verifySolanaSignature(input);
    expect(result.chainType).toBe('solana');
    expect(result.message).toBe('solana test message');
    expect(result.signature).toBe('base58signature');
  });
});
