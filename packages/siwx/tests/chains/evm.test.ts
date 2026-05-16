/**
 * Tests for SIWX EVM chain adapter.
 */

import { describe, it, expect } from 'vitest';
import { createEvmSignInMessage, verifyEvmSignature, parseEvmMessage } from '../src/chains/evm.js';
import type { SIWXVerifyInput } from '../src/types.js';

describe('createEvmSignInMessage', () => {
  it('should generate a valid EIP-4361 formatted message', () => {
    const message = createEvmSignInMessage({
      domain: 'app.example.com',
      address: '0x1234567890123456789012345678901234567890',
      uri: 'https://app.example.com/login',
      chainId: 1,
      nonce: 'test-nonce-123',
    });

    expect(message).toContain('app.example.com');
    expect(message).toContain('0x1234567890123456789012345678901234567890');
    expect(message).toContain('test-nonce-123');
    expect(message).toContain('https://app.example.com/login');
    expect(message).toContain('Chain ID: 1');
  });

  it('should include optional statement', () => {
    const message = createEvmSignInMessage({
      domain: 'example.com',
      address: '0xabc',
      uri: 'https://example.com',
      chainId: 1,
      nonce: 'nonce',
      statement: 'Sign in with Ethereum',
    });
    expect(message).toContain('Sign in with Ethereum');
  });

  it('should include expiration time', () => {
    const message = createEvmSignInMessage({
      domain: 'example.com',
      address: '0xabc',
      uri: 'https://example.com',
      chainId: 1,
      nonce: 'nonce',
      expirationTime: '2025-12-31T23:59:59Z',
    });
    expect(message).toContain('Expiration Time: 2025-12-31T23:59:59Z');
  });

  it('should include resources', () => {
    const message = createEvmSignInMessage({
      domain: 'example.com',
      address: '0xabc',
      uri: 'https://example.com',
      chainId: 1,
      nonce: 'nonce',
      resources: ['https://example.com/resource1', 'https://example.com/resource2'],
    });
    expect(message).toContain('https://example.com/resource1');
    expect(message).toContain('https://example.com/resource2');
  });

  it('should handle string chainId', () => {
    const message = createEvmSignInMessage({
      domain: 'example.com',
      address: '0xabc',
      uri: 'https://example.com',
      chainId: '42',
      nonce: 'nonce',
    });
    expect(message).toContain('Chain ID: 42');
  });
});

describe('parseEvmMessage', () => {
  it('should parse a valid SIWE message', () => {
    const message = `app.example.com wants you to sign in with your Ethereum account:
0x1234567890123456789012345678901234567890

Sign in to the app

URI: https://app.example.com/login
Version: 1
Chain ID: 1
Nonce: test-nonce
Issued At: 2025-01-01T00:00:00Z`;

    const parsed = parseEvmMessage(message);
    expect(parsed).toBeDefined();
    expect(parsed.domain).toBe('app.example.com');
  });
});

describe('verifyEvmSignature', () => {
  it('should return valid result with mock provider', async () => {
    const input: SIWXVerifyInput = {
      message: 'test message',
      signature: '0xsignature',
      address: '0x123',
      chainType: 'evm',
    };

    const mockProvider = {
      request: async () => true,
    };

    const result = await verifyEvmSignature(input, mockProvider);
    expect(result.chainType).toBe('evm');
    expect(result.message).toBe('test message');
    expect(result.signature).toBe('0xsignature');
  });
});
