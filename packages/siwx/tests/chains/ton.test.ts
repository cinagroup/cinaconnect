/**
 * TON (SIWT) adapter tests.
 */

import { describe, it, expect } from 'vitest';
import {
  createTonSignInMessage,
  parseTonMessage,
  isValidTonAddress,
} from '../../src/chains/ton.js';
import { createSignInMessage } from '../../src/siwx.js';

describe('TON SIWT Adapter', () => {
  describe('createTonSignInMessage', () => {
    it('creates a valid sign-in message', () => {
      const message = createTonSignInMessage({
        domain: 'example.com',
        address: 'EQCD39VS5jcZHLsTiMIfi1mP3XfNwJ6qH0Rl8BfN9XmZ2aBc',
        uri: 'https://example.com/login',
        chainId: '-2:964733956',
        nonce: 'a1b2c3d4',
      });

      expect(message).toContain('example.com wants you to sign in with your TON account:');
      expect(message).toContain('EQCD39VS5jcZHLsTiMIfi1mP3XfNwJ6qH0Rl8BfN9XmZ2aBc');
      expect(message).toContain('URI: https://example.com/login');
      expect(message).toContain('Nonce: a1b2c3d4');
    });

    it('includes optional fields when provided', () => {
      const message = createTonSignInMessage({
        domain: 'dapp.io',
        address: '0:abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        statement: 'Authenticate with TON',
        uri: 'https://dapp.io',
        chainId: '-2:964733956',
        nonce: 'test123',
        expirationTime: '2026-12-31T23:59:59Z',
        notBefore: '2026-01-01T00:00:00Z',
        requestId: 'req-001',
        resources: ['https://dapp.io/resource1'],
      });

      expect(message).toContain('Authenticate with TON');
      expect(message).toContain('Expiration Time: 2026-12-31T23:59:59Z');
      expect(message).toContain('Not Before: 2026-01-01T00:00:00Z');
      expect(message).toContain('Request ID: req-001');
      expect(message).toContain('Resources:');
      expect(message).toContain('- https://dapp.io/resource1');
    });
  });

  describe('parseTonMessage', () => {
    it('parses a valid TON message', () => {
      const message = createTonSignInMessage({
        domain: 'test.com',
        address: 'EQAbc123',
        statement: 'Sign in',
        uri: 'https://test.com',
        chainId: 'ton-mainnet',
        nonce: 'abc123',
        issuedAt: '2026-01-01T00:00:00Z',
      });

      const parsed = parseTonMessage(message);
      expect(parsed.domain).toBe('test.com');
      expect(parsed.address).toBe('EQAbc123');
      expect(parsed.statement).toBe('Sign in');
      expect(parsed.uri).toBe('https://test.com');
      expect(parsed.nonce).toBe('abc123');
    });

    it('throws on invalid message', () => {
      expect(() => parseTonMessage('not a valid message')).toThrow(
        'Invalid TON sign-in message'
      );
    });
  });

  describe('isValidTonAddress', () => {
    it('accepts valid base64url addresses', () => {
      expect(isValidTonAddress('EQCD39VS5jcZHLsTiMIfi1mP3XfNwJ6qH0Rl8BfN9XmZ2aBc')).toBe(true);
    });

    it('accepts valid full format addresses', () => {
      expect(
        isValidTonAddress('0:abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890')
      ).toBe(true);
    });

    it('rejects invalid addresses', () => {
      expect(isValidTonAddress('')).toBe(false);
      expect(isValidTonAddress('invalid')).toBe(false);
      expect(isValidTonAddress('TQaBc123')).toBe(false);
    });
  });

  describe('createSignInMessage integration', () => {
    it('dispatches to TON adapter via core function', () => {
      const message = createSignInMessage(
        {
          domain: 'dapp.com',
          address: 'EQTestAddress123456789012345678901234567890123456',
          uri: 'https://dapp.com',
          chainId: 'ton-mainnet',
          nonce: 'nonce123',
        },
        'ton'
      );

      expect(message).toContain('wants you to sign in with your TON account:');
    });
  });
});
