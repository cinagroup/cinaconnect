/**
 * Security unit tests for SIWE verification in @cinacoin/siwe.
 */

import { describe, it, expect } from 'vitest';
import { generateMessage, parseMessage, generateNonce, generateTimestamp } from '@cinacoin/siwe';

describe('SIWE Security', () => {
  it('generates cryptographically random nonces', () => {
    const n1 = generateNonce(16);
    const n2 = generateNonce(16);
    expect(n1).not.toBe(n2);
    expect(n1.length).toBeGreaterThan(0);
  });

  it('generates properly formatted SIWE messages', () => {
    const message = generateMessage({
      domain: 'example.com',
      address: '0xAbC123',
      uri: 'https://example.com',
      version: '1',
      chainId: 1,
      nonce: 'test-nonce',
      issuedAt: generateTimestamp(),
    });

    expect(message).toContain('example.com wants you to sign in');
    expect(message).toContain('0xAbC123');
    expect(message).toContain('Nonce: test-nonce');
    expect(message).toContain('Chain ID: 1');
  });

  it('includes expiration in SIWE messages', () => {
    const expirationTime = new Date(Date.now() + 3600000).toISOString();

    const message = generateMessage({
      domain: 'example.com',
      address: '0xAbC123',
      uri: 'https://example.com',
      version: '1',
      chainId: 1,
      nonce: 'test-nonce',
      issuedAt: generateTimestamp(),
      expirationTime,
    });

    expect(message).toContain('Expiration Time:');
  });

  it('parses SIWE messages back to structured data', () => {
    const nonce = generateNonce(16);
    const issuedAt = generateTimestamp();
    const expirationTime = new Date(Date.now() + 3600000).toISOString();

    const message = generateMessage({
      domain: 'app.cinacoin.io',
      address: '0x1234567890abcdef1234567890abcdef12345678',
      statement: 'Sign in to Cinacoin',
      uri: 'https://app.cinacoin.io',
      version: '1',
      chainId: 1,
      nonce,
      issuedAt,
      expirationTime,
      resources: ['https://app.cinacoin.io/terms'],
    });

    const parsed = parseMessage(message);

    expect(parsed.domain).toBe('app.cinacoin.io');
    expect(parsed.address).toBe('0x1234567890abcdef1234567890abcdef12345678');
    expect(parsed.statement).toBe('Sign in to Cinacoin');
    expect(parsed.nonce).toBe(nonce);
    expect(parsed.chainId).toBe(1);
    expect(parsed.expirationTime).toBe(expirationTime);
    expect(parsed.resources).toContain('https://app.cinacoin.io/terms');
  });

  it('rejects malformed SIWE messages', () => {
    expect(() => parseMessage('This is not a SIWE message')).toThrow();
    expect(() => parseMessage('')).toThrow();
  });

  it('generates nonces of specified length', () => {
    const n8 = generateNonce(8);
    const n16 = generateNonce(16);
    const n32 = generateNonce(32);

    expect(n8.length).toBeGreaterThan(0);
    expect(n16.length).toBeGreaterThan(n8.length);
    expect(n32.length).toBeGreaterThan(n16.length);
  });
});
