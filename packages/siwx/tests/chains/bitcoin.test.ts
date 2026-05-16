/**
 * Tests for SIWX Bitcoin chain adapter.
 */

import { describe, it, expect } from 'vitest';
import {
  createBitcoinSignInMessage,
  verifyBitcoinSignature,
  parseBitcoinMessage,
} from '../src/chains/bitcoin.js';
import type { SIWXVerifyInput } from '../src/types.js';

describe('createBitcoinSignInMessage', () => {
  it('should generate a sign-in message for Bitcoin', () => {
    const message = createBitcoinSignInMessage({
      domain: 'btcapp.example.com',
      address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      uri: 'https://btcapp.example.com/login',
      chainId: '000000000019d6689c085ae165831e93',
      nonce: 'bitcoin-nonce-789',
    });

    expect(message).toBeDefined();
    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
  });

  it('should include the Bitcoin address', () => {
    const message = createBitcoinSignInMessage({
      domain: 'example.com',
      address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      uri: 'https://example.com',
      chainId: '000000000019d6689c085ae165831e93',
      nonce: 'nonce',
    });

    expect(message).toContain('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
  });

  it('should include optional statement', () => {
    const message = createBitcoinSignInMessage({
      domain: 'example.com',
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      uri: 'https://example.com',
      chainId: '000000000019d6689c085ae165831e93',
      nonce: 'nonce',
      statement: 'Sign in with Bitcoin',
    });

    expect(message).toContain('Sign in with Bitcoin');
  });
});

describe('parseBitcoinMessage', () => {
  it('should parse a Bitcoin sign-in message', () => {
    const message = createBitcoinSignInMessage({
      domain: 'example.com',
      address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      uri: 'https://example.com',
      chainId: '000000000019d6689c085ae165831e93',
      nonce: 'nonce',
    });

    const parsed = parseBitcoinMessage(message);
    expect(parsed).toBeDefined();
  });
});

describe('verifyBitcoinSignature', () => {
  it('should return a result object', async () => {
    const input: SIWXVerifyInput = {
      message: 'bitcoin test message',
      signature: 'base64signature',
      address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      chainType: 'bitcoin',
    };

    const result = await verifyBitcoinSignature(input);
    expect(result.chainType).toBe('bitcoin');
    expect(result.message).toBe('bitcoin test message');
    expect(result.signature).toBe('base64signature');
  });
});
