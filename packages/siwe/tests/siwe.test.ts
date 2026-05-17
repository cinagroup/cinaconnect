/**
 * Tests for SIWE (Sign-In with Ethereum) message generation, parsing, and verification per EIP-4361.
 */

import { describe, it, expect, vi } from 'vitest';
import { generateMessage, parseMessage } from '../src/siwe.js';
import { generateNonce, generateTimestamp, isValidEthereumAddress, isValidUri } from '../src/utils.js';
import type { SIWEParams, ParsedSIWE } from '../src/types.js';

// ============================================================
// Helpers
// ============================================================

function makeParams(overrides?: Partial<SIWEParams>): SIWEParams {
  return {
    domain: 'https://example.com',
    address: '0x1234567890abcdef1234567890abcdef12345678',
    uri: 'https://example.com/login',
    chainId: 1,
    nonce: generateNonce(),
    issuedAt: generateTimestamp(),
    ...overrides,
  };
}

// ============================================================
// generateMessage
// ============================================================

describe('generateMessage', () => {
  it('should generate a valid SIWE message with minimal required fields', () => {
    const params = makeParams();
    const message = generateMessage(params);

    expect(message).toContain('example.com wants you to sign in with your Ethereum account:');
    expect(message).toContain(params.address);
    expect(message).toContain(`URI: ${params.uri}`);
    expect(message).toContain(`Version: 1`);
    expect(message).toContain(`Chain ID: ${params.chainId}`);
    expect(message).toContain(`Nonce: ${params.nonce}`);
    expect(message).toContain(`Issued At: ${params.issuedAt}`);
  });

  it('should include optional statement when provided', () => {
    const params = makeParams({ statement: 'Accept the terms of service' });
    const message = generateMessage(params);

    expect(message).toContain('Accept the terms of service');
  });

  it('should include expiration time when provided', () => {
    const expiresAt = '2025-12-31T23:59:59.000Z';
    const params = makeParams({ expirationTime: expiresAt });
    const message = generateMessage(params);

    expect(message).toContain(`Expiration Time: ${expiresAt}`);
  });

  it('should include notBefore when provided', () => {
    const notBefore = '2025-01-01T00:00:00.000Z';
    const params = makeParams({ notBefore });
    const message = generateMessage(params);

    expect(message).toContain(`Not Before: ${notBefore}`);
  });

  it('should include requestId when provided', () => {
    const params = makeParams({ requestId: 'req-abc-123' });
    const message = generateMessage(params);

    expect(message).toContain(`Request ID: req-abc-123`);
  });

  it('should include resources section when provided', () => {
    const params = makeParams({
      resources: [
        'https://example.com/terms',
        'https://example.com/privacy',
      ],
    });
    const message = generateMessage(params);

    expect(message).toContain('Resources:');
    expect(message).toContain('- https://example.com/terms');
    expect(message).toContain('- https://example.com/privacy');
  });

  it('should use custom version when provided', () => {
    const params = makeParams({ version: '1' });
    const message = generateMessage(params);
    expect(message).toContain('Version: 1');
  });

  it('should generate timestamp when issuedAt is not provided', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));

    const { issuedAt, ...rest } = makeParams();
    const message = generateMessage(rest as SIWEParams);

    expect(message).toContain('Issued At: 2025-06-15T12:00:00.000Z');

    vi.useRealTimers();
  });

  it('should throw when domain is missing', () => {
    const params = makeParams();
    delete (params as any).domain;

    expect(() => generateMessage(params as SIWEParams)).toThrow('Invalid SIWE parameters');
  });

  it('should throw when address is invalid', () => {
    const params = makeParams({ address: '0xinvalid' });

    expect(() => generateMessage(params)).toThrow('Invalid SIWE parameters');
  });

  it('should throw when nonce is too short', () => {
    const params = makeParams({ nonce: 'short' });

    expect(() => generateMessage(params)).toThrow('Invalid SIWE parameters');
  });

  it('should throw when URI is invalid', () => {
    const params = makeParams({ uri: 'not-a-uri' });

    expect(() => generateMessage(params)).toThrow('Invalid SIWE parameters');
  });

  it('should include all optional fields together', () => {
    const params = makeParams({
      statement: 'Sign in to continue',
      expirationTime: '2025-12-31T23:59:59.000Z',
      notBefore: '2025-01-01T00:00:00.000Z',
      requestId: 'auth-001',
      resources: ['https://example.com/resource'],
    });
    const message = generateMessage(params);

    expect(message).toContain('Sign in to continue');
    expect(message).toContain('Expiration Time: 2025-12-31T23:59:59.000Z');
    expect(message).toContain('Not Before: 2025-01-01T00:00:00.000Z');
    expect(message).toContain('Request ID: auth-001');
    expect(message).toContain('Resources:');
    expect(message).toContain('- https://example.com/resource');
  });
});

// ============================================================
// parseMessage
// ============================================================

describe('parseMessage', () => {
  it('should parse a minimal SIWE message', () => {
    const params = makeParams();
    const message = generateMessage(params);
    const parsed = parseMessage(message);

    expect(parsed.domain).toBe('https://example.com');
    expect(parsed.address).toBe(params.address);
    expect(parsed.uri).toBe(params.uri);
    expect(parsed.version).toBe('1');
    expect(parsed.chainId).toBe(1);
    expect(parsed.nonce).toBe(params.nonce);
    expect(parsed.issuedAt).toBe(params.issuedAt);
    expect(parsed.resources).toEqual([]);
  });

  it('should parse statement from a SIWE message', () => {
    const params = makeParams({ statement: 'I accept the terms' });
    const message = generateMessage(params);
    const parsed = parseMessage(message);

    expect(parsed.statement).toBe('I accept the terms');
  });

  it('should parse optional expirationTime', () => {
    const params = makeParams({ expirationTime: '2025-12-31T23:59:59.000Z' });
    const message = generateMessage(params);
    const parsed = parseMessage(message);

    expect(parsed.expirationTime).toBe('2025-12-31T23:59:59.000Z');
  });

  it('should parse optional notBefore', () => {
    const params = makeParams({ notBefore: '2025-06-01T00:00:00.000Z' });
    const message = generateMessage(params);
    const parsed = parseMessage(message);

    expect(parsed.notBefore).toBe('2025-06-01T00:00:00.000Z');
  });

  it('should parse optional requestId', () => {
    const params = makeParams({ requestId: 'req-123' });
    const message = generateMessage(params);
    const parsed = parseMessage(message);

    expect(parsed.requestId).toBe('req-123');
  });

  it('should parse resources list', () => {
    const params = makeParams({
      resources: [
        'https://example.com/terms',
        'https://example.com/privacy',
      ],
    });
    const message = generateMessage(params);
    const parsed = parseMessage(message);

    expect(parsed.resources).toEqual([
      'https://example.com/terms',
      'https://example.com/privacy',
    ]);
  });

  it('should parse custom version', () => {
    const params = makeParams({ version: '1' });
    const message = generateMessage(params);
    const parsed = parseMessage(message);

    expect(parsed.version).toBe('1');
  });

  it('should throw on missing preamble', () => {
    expect(() => parseMessage('This is not a SIWE message')).toThrow(
      'Invalid SIWE message: missing or malformed preamble'
    );
  });

  it('should throw on missing address', () => {
    expect(() => parseMessage('example.com wants you to sign in with your Ethereum account:\nnot-an-address\n\nURI: https://example.com\nVersion: 1\nChain ID: 1\nNonce: abcdefgh\nIssued At: 2025-01-01T00:00:00.000Z')).toThrow(
      'Invalid SIWE message: missing or malformed address'
    );
  });

  it('should throw on missing URI field', () => {
    expect(() => parseMessage('example.com wants you to sign in with your Ethereum account:\n0x1234567890abcdef1234567890abcdef12345678\n')).toThrow(
      'Invalid SIWE message: missing URI field'
    );
  });

  it('should throw on missing required fields (nonce, chainId)', () => {
    const message = [
      'example.com wants you to sign in with your Ethereum account:',
      '0x1234567890abcdef1234567890abcdef12345678',
      '',
      'URI: https://example.com',
      'Version: 1',
      'Issued At: 2025-01-01T00:00:00.000Z',
    ].join('\n');

    expect(() => parseMessage(message)).toThrow(
      'Invalid SIWE message: missing required fields'
    );
  });

  it('should throw on invalid Chain ID (non-numeric)', () => {
    const message = [
      'example.com wants you to sign in with your Ethereum account:',
      '0x1234567890abcdef1234567890abcdef12345678',
      '',
      'URI: https://example.com',
      'Version: 1',
      'Chain ID: not-a-number',
      'Nonce: abcdefgh',
      'Issued At: 2025-01-01T00:00:00.000Z',
    ].join('\n');

    expect(() => parseMessage(message)).toThrow(
      'Invalid SIWE message: Chain ID must be a number'
    );
  });

  it('should round-trip: generate then parse preserves all fields', () => {
    const params = makeParams({
      statement: 'Round trip test',
      expirationTime: '2026-01-01T00:00:00.000Z',
      notBefore: '2025-01-01T00:00:00.000Z',
      requestId: 'rt-001',
      resources: ['https://example.com/doc'],
    });

    const message = generateMessage(params);
    const parsed = parseMessage(message);

    expect(parsed.domain).toBe(params.domain);
    expect(parsed.address).toBe(params.address);
    expect(parsed.statement).toBe(params.statement);
    expect(parsed.uri).toBe(params.uri);
    expect(parsed.chainId).toBe(params.chainId);
    expect(parsed.nonce).toBe(params.nonce);
    expect(parsed.expirationTime).toBe(params.expirationTime);
    expect(parsed.notBefore).toBe(params.notBefore);
    expect(parsed.requestId).toBe(params.requestId);
    expect(parsed.resources).toEqual(params.resources);
  });

  it('should parse message without statement', () => {
    const params = makeParams();
    const message = generateMessage(params);
    const parsed = parseMessage(message);

    expect(parsed.statement).toBeUndefined();
  });
});

// ============================================================
// Utility functions
// ============================================================

describe('generateNonce', () => {
  it('should generate a nonce of default length (16 hex chars = 8 bytes)', () => {
    const nonce = generateNonce();
    expect(nonce.length).toBe(16);
    expect(/^[0-9a-f]+$/.test(nonce)).toBe(true);
  });

  it('should generate different nonces on each call', () => {
    const n1 = generateNonce();
    const n2 = generateNonce();
    expect(n1).not.toBe(n2);
  });

  it('should support custom byte length', () => {
    const nonce = generateNonce(4);
    expect(nonce.length).toBe(8);
  });
});

describe('generateTimestamp', () => {
  it('should generate an ISO 8601 timestamp', () => {
    const ts = generateTimestamp();
    expect(() => new Date(ts)).not.toThrow();
  });

  it('should use provided date', () => {
    const date = new Date('2025-03-15T10:30:00.000Z');
    const ts = generateTimestamp(date);
    expect(ts).toBe('2025-03-15T10:30:00.000Z');
  });
});

describe('isValidEthereumAddress', () => {
  it('should return true for valid addresses', () => {
    expect(isValidEthereumAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
  });

  it('should return false for too-short address', () => {
    expect(isValidEthereumAddress('0x1234')).toBe(false);
  });

  it('should return false for non-hex characters', () => {
    expect(isValidEthereumAddress('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG')).toBe(false);
  });

  it('should return false for missing 0x prefix', () => {
    expect(isValidEthereumAddress('1234567890abcdef1234567890abcdef12345678')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isValidEthereumAddress('')).toBe(false);
  });
});

describe('isValidUri', () => {
  it('should return true for valid HTTPS URIs', () => {
    expect(isValidUri('https://example.com')).toBe(true);
  });

  it('should return true for valid HTTP URIs', () => {
    expect(isValidUri('http://localhost:3000')).toBe(true);
  });

  it('should return false for non-URI strings', () => {
    expect(isValidUri('not a uri')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isValidUri('')).toBe(false);
  });
});
