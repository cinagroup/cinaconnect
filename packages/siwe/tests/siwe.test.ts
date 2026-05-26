/**
 * siwe/tests/siwe.test.ts
 *
 * Tests for SIWE (Sign-In with Ethereum) message generation, parsing, and validation.
 */

import { describe, it, expect } from 'vitest';
import { generateMessage, parseMessage } from '../src/siwe.js';
import { generateNonce, isValidEthereumAddress, isValidUri, normalizeAddress, getOrigin } from '../src/utils.js';
import { validateSIWEParams, validateDomainMatch } from '../src/validator.js';
import type { SIWEParams } from '../src/types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validParams: SIWEParams = {
  domain: 'https://example.com',
  address: '0xabcDEF0123456789abcdef0123456789ABCDEF01',
  statement: 'Sign in to continue.',
  uri: 'https://example.com/login',
  version: '1',
  chainId: 1,
  nonce: 'abc123def456',
  issuedAt: '2024-01-15T12:00:00.000Z',
  expirationTime: '2024-01-15T13:00:00.000Z',
  notBefore: '2024-01-15T11:00:00.000Z',
  requestId: 'req-001',
  resources: ['https://example.com/resource1', 'https://example.com/resource2'],
};

// ---------------------------------------------------------------------------
// generateMessage
// ---------------------------------------------------------------------------

describe('generateMessage', () => {
  it('generates a message with full params', () => {
    const msg = generateMessage(validParams);
    expect(msg.startsWith('https://example.com wants you to sign in with your Ethereum account:')).toBe(true);
    expect(msg.includes('0xabcDEF0123456789abcdef0123456789ABCDEF01')).toBe(true);
    expect(msg.includes('Sign in to continue.')).toBe(true);
    expect(msg.includes('URI: https://example.com/login')).toBe(true);
    expect(msg.includes('Version: 1')).toBe(true);
    expect(msg.includes('Chain ID: 1')).toBe(true);
    expect(msg.includes('Nonce: abc123def456')).toBe(true);
    expect(msg.includes('Issued At: 2024-01-15T12:00:00.000Z')).toBe(true);
    expect(msg.includes('Expiration Time: 2024-01-15T13:00:00.000Z')).toBe(true);
    expect(msg.includes('Not Before: 2024-01-15T11:00:00.000Z')).toBe(true);
    expect(msg.includes('Request ID: req-001')).toBe(true);
  });

  it('generates a minimal message', () => {
    const minimal: SIWEParams = {
      domain: 'https://app.io',
      address: '0x1234567890abcdef1234567890abcdef12345678',
      uri: 'https://app.io',
      version: '1',
      chainId: 1,
      nonce: 'abcdefgh',
    };
    const msg = generateMessage(minimal);
    expect(msg.startsWith('https://app.io wants you to sign in with your Ethereum account:')).toBe(true);
    expect(msg.includes('URI: https://app.io')).toBe(true);
    expect(msg.includes('Version: 1')).toBe(true);
    expect(msg.includes('Chain ID: 1')).toBe(true);
    expect(msg.includes('Nonce: abcdefgh')).toBe(true);
    expect(msg.includes('Expiration Time')).toBe(false);
    expect(msg.includes('Resources:')).toBe(false);
  });

  it('auto-generates issuedAt', () => {
    const params: SIWEParams = {
      domain: 'https://test.com',
      address: '0x1111111111111111111111111111111111111111',
      uri: 'https://test.com',
      version: '1',
      chainId: 1,
      nonce: 'nonce1234567',
    };
    const msg = generateMessage(params);
    expect(msg.includes('Issued At:')).toBe(true);
  });

  it('handles no statement', () => {
    const params: SIWEParams = {
      domain: 'https://nos.com',
      address: '0x2222222222222222222222222222222222222222',
      uri: 'https://nos.com',
      version: '1',
      chainId: 1,
      nonce: 'nonce1234567',
    };
    const msg = generateMessage(params);
    expect(msg.includes('Sign in')).toBe(false);
  });

  it('includes resources', () => {
    const params: SIWEParams = {
      domain: 'https://res.com',
      address: '0x3333333333333333333333333333333333333333',
      uri: 'https://res.com',
      version: '1',
      chainId: 1,
      nonce: 'nonce1234567',
      resources: ['ipfs://bafy123', 'https://res.com/doc'],
    };
    const msg = generateMessage(params);
    expect(msg.includes('Resources:')).toBe(true);
    expect(msg.includes('- ipfs://bafy123')).toBe(true);
    expect(msg.includes('- https://res.com/doc')).toBe(true);
  });

  it('rejects invalid params (empty domain)', () => {
    const bad: SIWEParams = {
      domain: '',
      address: '0x1111111111111111111111111111111111111111',
      uri: 'https://x.com',
      version: '1',
      chainId: 1,
      nonce: 'n',
    };
    expect(() => generateMessage(bad)).toThrow('Invalid SIWE parameters');
  });
});

// ---------------------------------------------------------------------------
// parseMessage
// ---------------------------------------------------------------------------

describe('parseMessage', () => {
  it('parses a full message', () => {
    const msg = generateMessage(validParams);
    const parsed = parseMessage(msg);

    expect(parsed.domain).toBe('https://example.com');
    expect(parsed.address).toBe('0xabcDEF0123456789abcdef0123456789ABCDEF01');
    expect(parsed.statement).toBe('Sign in to continue.');
    expect(parsed.uri).toBe('https://example.com/login');
    expect(parsed.version).toBe('1');
    expect(parsed.chainId).toBe(1);
    expect(parsed.nonce).toBe('abc123def456');
    expect(parsed.issuedAt).toBe('2024-01-15T12:00:00.000Z');
    expect(parsed.expirationTime).toBe('2024-01-15T13:00:00.000Z');
    expect(parsed.notBefore).toBe('2024-01-15T11:00:00.000Z');
    expect(parsed.requestId).toBe('req-001');
    expect(parsed.resources?.length).toBe(2);
    expect(parsed.resources?.[0]).toBe('https://example.com/resource1');
    expect(parsed.resources?.[1]).toBe('https://example.com/resource2');
  });

  it('parses a minimal message', () => {
    const params: SIWEParams = {
      domain: 'https://min.io',
      address: '0x4444444444444444444444444444444444444444',
      uri: 'https://min.io',
      version: '1',
      chainId: 5,
      nonce: 'abcdefgh',
    };
    const msg = generateMessage(params);
    const parsed = parseMessage(msg);

    expect(parsed.domain).toBe('https://min.io');
    expect(parsed.chainId).toBe(5);
    expect(parsed.statement).toBeUndefined();
    expect(parsed.expirationTime).toBeUndefined();
    expect(parsed.resources?.length).toBe(0);
  });

  it('rejects invalid message', () => {
    expect(() => parseMessage('This is not a SIWE message')).toThrow('Invalid SIWE message');
  });

  it('rejects message with missing address', () => {
    expect(() => parseMessage('example.com wants you to sign in with your Ethereum account:\nnoaddress\n\nURI: https://x\nVersion: 1\nChain ID: 1\nNonce: n\nIssued At: 2024-01-01T00:00:00.000Z')).toThrow('Invalid SIWE message');
  });
});

// ---------------------------------------------------------------------------
// Round-trip: generate → parse → compare
// ---------------------------------------------------------------------------

describe('round-trip', () => {
  it('generate → parse preserves all fields', () => {
    const params: SIWEParams = {
      domain: 'https://roundtrip.app',
      address: '0x5555555555555555555555555555555555555555',
      statement: 'Round trip test',
      uri: 'https://roundtrip.app',
      version: '1',
      chainId: 137,
      nonce: 'rt-' + Date.now().toString(36) + Date.now().toString(36),
      issuedAt: '2024-06-01T00:00:00.000Z',
      expirationTime: '2024-06-02T00:00:00.000Z',
      resources: ['https://roundtrip.app/res'],
    };

    const msg = generateMessage(params);
    const parsed = parseMessage(msg);

    expect(parsed.domain).toBe(params.domain);
    expect(parsed.address).toBe(params.address);
    expect(parsed.statement).toBe(params.statement);
    expect(parsed.uri).toBe(params.uri);
    expect(parsed.chainId).toBe(params.chainId);
    expect(parsed.nonce).toBe(params.nonce);
    expect(parsed.resources?.[0]).toBe(params.resources?.[0]);
  });
});

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

describe('utils', () => {
  it('generateNonce generates unique non-empty hex strings', () => {
    const n1 = generateNonce();
    const n2 = generateNonce();
    expect(n1.length).toBeGreaterThan(0);
    expect(n1).not.toBe(n2);
  });

  it('isValidEthereumAddress validates correctly', () => {
    expect(isValidEthereumAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
    expect(isValidEthereumAddress('0x1234')).toBe(false);
    expect(isValidEthereumAddress('nope')).toBe(false);
    expect(isValidEthereumAddress('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG')).toBe(false);
  });

  it('isValidUri validates correctly', () => {
    expect(isValidUri('https://example.com')).toBe(true);
    expect(isValidUri('http://localhost:3000')).toBe(true);
    expect(isValidUri('not-a-uri')).toBe(false);
  });

  it('normalizeAddress lowercases', () => {
    const addr = '0xABCDEF0123456789abcdef0123456789ABCDEF01';
    expect(normalizeAddress(addr)).toBe(addr.toLowerCase());
    expect(normalizeAddress('0x0000')).toBe('0x0000');
  });

  it('getOrigin extracts origin', () => {
    expect(getOrigin('https://example.com/path?query=1')).toBe('https://example.com');
    expect(getOrigin('http://localhost:3000/app')).toBe('http://localhost:3000');
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('validation', () => {
  it('validateSIWEParams accepts valid params', () => {
    const errors = validateSIWEParams(validParams);
    expect(errors).toEqual([]);
  });

  it('validateSIWEParams rejects invalid params', () => {
    const badParams: SIWEParams = {
      domain: '',
      address: '0xshort',
      uri: 'nope',
      version: '1',
      chainId: 1,
      nonce: '',
    };
    const badErrors = validateSIWEParams(badParams);
    expect(badErrors.length).toBeGreaterThan(0);
  });

  it('validateDomainMatch matches and mismatches', () => {
    expect(validateDomainMatch('https://example.com', 'https://example.com/login')).toBe(true);
    expect(validateDomainMatch('example.com', 'https://other.com/login')).toBe(false);
  });
});
