/**
 * TRON (SIWTR) adapter tests.
 */

import { describe, it, expect } from 'vitest';
import {
  createTronSignInMessage,
  parseTronMessage,
  isValidTronAddress,
} from '../../src/chains/tron.js';
import { createSignInMessage } from '../../src/siwx.js';

describe('TRON SIWTR Adapter', () => {
  describe('createTronSignInMessage', () => {
    it('creates a valid sign-in message', () => {
      const message = createTronSignInMessage({
        domain: 'example.com',
        address: 'TJCnKsPa7FkGfN8B5XoMqZqVhQrYwP2aDx',
        uri: 'https://example.com/login',
        chainId: '0x2b6653dc',
        nonce: 'a1b2c3d4',
      });

      expect(message).toContain('example.com wants you to sign in with your TRON account:');
      expect(message).toContain('TJCnKsPa7FkGfN8B5XoMqZqVhQrYwP2aDx');
      expect(message).toContain('URI: https://example.com/login');
      expect(message).toContain('Nonce: a1b2c3d4');
    });

    it('includes optional fields when provided', () => {
      const message = createTronSignInMessage({
        domain: 'trondapp.io',
        address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        statement: 'Authenticate with TRON',
        uri: 'https://trondapp.io',
        chainId: '0x2b6653dc',
        nonce: 'test123',
        expirationTime: '2026-12-31T23:59:59Z',
        requestId: 'tron-req-001',
        resources: ['https://trondapp.io/docs'],
      });

      expect(message).toContain('Authenticate with TRON');
      expect(message).toContain('Expiration Time: 2026-12-31T23:59:59Z');
      expect(message).toContain('Request ID: tron-req-001');
      expect(message).toContain('Resources:');
      expect(message).toContain('- https://trondapp.io/docs');
    });
  });

  describe('parseTronMessage', () => {
    it('parses a valid TRON message', () => {
      const message = createTronSignInMessage({
        domain: 'tron.app',
        address: 'TTestAddress12345678901234567890',
        statement: 'Sign in to TRON dApp',
        uri: 'https://tron.app',
        chainId: '0x2b6653dc',
        nonce: 'tron123',
        issuedAt: '2026-01-01T00:00:00Z',
      });

      const parsed = parseTronMessage(message);
      expect(parsed.domain).toBe('tron.app');
      expect(parsed.address).toBe('TTestAddress12345678901234567890');
      expect(parsed.statement).toBe('Sign in to TRON dApp');
      expect(parsed.uri).toBe('https://tron.app');
      expect(parsed.nonce).toBe('tron123');
    });

    it('throws on invalid message', () => {
      expect(() => parseTronMessage('not a valid message')).toThrow(
        'Invalid TRON sign-in message'
      );
    });
  });

  describe('isValidTronAddress', () => {
    it('accepts valid base58check addresses', () => {
      expect(isValidTronAddress('TJCnKsPa7FkGfN8B5XoMqZqVhQrYwP2aDx')).toBe(true);
    });

    it('accepts valid hex addresses', () => {
      expect(isValidTronAddress('41a614f803b6fd780986a42c78ec9c7f77e6ded13c')).toBe(true);
    });

    it('accepts hex addresses with 0x prefix', () => {
      expect(isValidTronAddress('0x41a614f803b6fd780986a42c78ec9c7f77e6ded13c')).toBe(true);
    });

    it('rejects invalid addresses', () => {
      expect(isValidTronAddress('')).toBe(false);
      expect(isValidTronAddress('invalid')).toBe(false);
      expect(isValidTronAddress('EQAbc123')).toBe(false);
    });
  });

  describe('createSignInMessage integration', () => {
    it('dispatches to TRON adapter via core function', () => {
      const message = createSignInMessage(
        {
          domain: 'dapp.com',
          address: 'TTestTronAddress123456789012345678901234',
          uri: 'https://dapp.com',
          chainId: '0x2b6653dc',
          nonce: 'nonce123',
        },
        'tron'
      );

      expect(message).toContain('wants you to sign in with your TRON account:');
    });
  });
});
