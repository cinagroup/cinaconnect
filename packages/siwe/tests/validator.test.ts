/**
 * Tests for SIWE message validation per EIP-4361 specification.
 * Covers parameter validation, domain matching, expiration, and full validation pipeline.
 */

import { describe, it, expect } from 'vitest';
import {
  validateSIWEParams,
  validateTemporalConstraints,
  validateDomainMatch,
  fullValidation,
} from '../src/validator.js';
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
    nonce: 'abcdefgh12345678',
    issuedAt: '2025-06-15T12:00:00.000Z',
    ...overrides,
  };
}

function makeParsed(overrides?: Partial<ParsedSIWE>): ParsedSIWE {
  return {
    domain: 'https://example.com',
    address: '0x1234567890abcdef1234567890abcdef12345678',
    uri: 'https://example.com/login',
    version: '1',
    chainId: 1,
    nonce: 'abcdefgh12345678',
    issuedAt: '2025-06-15T12:00:00.000Z',
    resources: [],
    ...overrides,
  };
}

// ============================================================
// validateSIWEParams
// ============================================================

describe('validateSIWEParams', () => {
  it('should return no errors for valid parameters', () => {
    const params = makeParams();
    const errors = validateSIWEParams(params);
    expect(errors).toEqual([]);
  });

  it('should report error for missing domain', () => {
    const params = makeParams();
    delete (params as any).domain;
    const errors = validateSIWEParams(params as SIWEParams);
    expect(errors.some((e) => e.field === 'domain')).toBe(true);
  });

  it('should report error for invalid domain format', () => {
    const params = makeParams({ domain: 'not-a-uri' });
    const errors = validateSIWEParams(params);
    expect(errors.some((e) => e.field === 'domain')).toBe(true);
  });

  it('should report error for missing address', () => {
    const params = makeParams();
    delete (params as any).address;
    const errors = validateSIWEParams(params as SIWEParams);
    expect(errors.some((e) => e.field === 'address')).toBe(true);
  });

  it('should report error for invalid address format', () => {
    const params = makeParams({ address: '0xinvalid' });
    const errors = validateSIWEParams(params);
    expect(errors.some((e) => e.field === 'address')).toBe(true);
  });

  it('should report error for missing URI', () => {
    const params = makeParams();
    delete (params as any).uri;
    const errors = validateSIWEParams(params as SIWEParams);
    expect(errors.some((e) => e.field === 'uri')).toBe(true);
  });

  it('should report error for invalid URI format', () => {
    const params = makeParams({ uri: 'not-valid' });
    const errors = validateSIWEParams(params);
    expect(errors.some((e) => e.field === 'uri')).toBe(true);
  });

  it('should report error for invalid version', () => {
    const params = makeParams({ version: '2' });
    const errors = validateSIWEParams(params);
    expect(errors.some((e) => e.field === 'version')).toBe(true);
  });

  it('should accept version "1"', () => {
    const params = makeParams({ version: '1' });
    const errors = validateSIWEParams(params);
    expect(errors.some((e) => e.field === 'version')).toBe(false);
  });

  it('should report error for missing chainId', () => {
    const params = makeParams();
    delete (params as any).chainId;
    const errors = validateSIWEParams(params as SIWEParams);
    expect(errors.some((e) => e.field === 'chainId')).toBe(true);
  });

  it('should report error for negative chainId', () => {
    const params = makeParams({ chainId: -1 });
    const errors = validateSIWEParams(params);
    expect(errors.some((e) => e.field === 'chainId')).toBe(true);
  });

  it('should accept zero chainId', () => {
    const params = makeParams({ chainId: 0 });
    const errors = validateSIWEParams(params);
    expect(errors.some((e) => e.field === 'chainId')).toBe(false);
  });

  it('should report error for short nonce (< 8 chars)', () => {
    const params = makeParams({ nonce: 'short' });
    const errors = validateSIWEParams(params);
    expect(errors.some((e) => e.field === 'nonce')).toBe(true);
  });

  it('should accept nonce of 8+ characters', () => {
    const params = makeParams({ nonce: 'abcdefgh' });
    const errors = validateSIWEParams(params);
    expect(errors.some((e) => e.field === 'nonce')).toBe(false);
  });

  it('should report error for statement with newlines', () => {
    const params = makeParams({ statement: 'line one\nline two' });
    const errors = validateSIWEParams(params);
    expect(errors.some((e) => e.field === 'statement')).toBe(true);
  });

  it('should report error for invalid issuedAt timestamp', () => {
    const params = makeParams({ issuedAt: 'not-a-date' });
    const errors = validateSIWEParams(params);
    expect(errors.some((e) => e.field === 'issuedAt')).toBe(true);
  });

  it('should report error for invalid expirationTime', () => {
    const params = makeParams({ expirationTime: 'invalid' });
    const errors = validateSIWEParams(params);
    expect(errors.some((e) => e.field === 'expirationTime')).toBe(true);
  });

  it('should report error for invalid notBefore', () => {
    const params = makeParams({ notBefore: 'bad-date' });
    const errors = validateSIWEParams(params);
    expect(errors.some((e) => e.field === 'notBefore')).toBe(true);
  });

  it('should report error for requestId with newlines', () => {
    const params = makeParams({ requestId: 'req\nline' });
    const errors = validateSIWEParams(params);
    expect(errors.some((e) => e.field === 'requestId')).toBe(true);
  });

  it('should report error for invalid resource URIs', () => {
    const params = makeParams({ resources: ['not-a-uri'] });
    const errors = validateSIWEParams(params);
    expect(errors.some((e) => e.field === 'resources[0]')).toBe(true);
  });

  it('should accept valid resources', () => {
    const params = makeParams({ resources: ['https://example.com/terms'] });
    const errors = validateSIWEParams(params);
    expect(errors.some((e) => e.field === 'resources[0]')).toBe(false);
  });
});

// ============================================================
// validateTemporalConstraints
// ============================================================

describe('validateTemporalConstraints', () => {
  it('should pass for message with no temporal constraints', () => {
    const data = makeParsed();
    const errors = validateTemporalConstraints(data);
    expect(errors).toEqual([]);
  });

  it('should pass for message not yet expired', () => {
    const data = makeParsed({
      expirationTime: '2030-01-01T00:00:00.000Z',
    });
    const errors = validateTemporalConstraints(data);
    expect(errors).toEqual([]);
  });

  it('should fail for expired message', () => {
    const data = makeParsed({
      expirationTime: '2020-01-01T00:00:00.000Z',
    });
    const errors = validateTemporalConstraints(data);
    expect(errors.some((e) => e.field === 'expirationTime')).toBe(true);
    expect(errors.some((e) => e.message.includes('expired'))).toBe(true);
  });

  it('should pass for message that has passed notBefore', () => {
    const data = makeParsed({
      notBefore: '2020-01-01T00:00:00.000Z',
    });
    const errors = validateTemporalConstraints(data);
    expect(errors).toEqual([]);
  });

  it('should fail for message before notBefore', () => {
    const data = makeParsed({
      notBefore: '2030-01-01T00:00:00.000Z',
    });
    const errors = validateTemporalConstraints(data);
    expect(errors.some((e) => e.field === 'notBefore')).toBe(true);
    expect(errors.some((e) => e.message.includes('not yet valid'))).toBe(true);
  });

  it('should respect custom reference time', () => {
    const data = makeParsed({
      expirationTime: '2025-01-01T00:00:00.000Z',
    });
    // Use a reference time before expiration
    const errors = validateTemporalConstraints(data, new Date('2024-06-01T00:00:00.000Z'));
    expect(errors).toEqual([]);

    // Use a reference time after expiration
    const errors2 = validateTemporalConstraints(data, new Date('2026-01-01T00:00:00.000Z'));
    expect(errors2.some((e) => e.field === 'expirationTime')).toBe(true);
  });
});

// ============================================================
// validateDomainMatch
// ============================================================

describe('validateDomainMatch', () => {
  it('should return true when domains match exactly', () => {
    expect(validateDomainMatch('https://example.com', 'https://example.com')).toBe(true);
  });

  it('should return true when origins match (same domain different paths)', () => {
    expect(validateDomainMatch('https://example.com/login', 'https://example.com/dashboard')).toBe(true);
  });

  it('should return false for different domains', () => {
    expect(validateDomainMatch('https://example.com', 'https://evil.com')).toBe(false);
  });

  it('should return false for different protocols', () => {
    expect(validateDomainMatch('https://example.com', 'http://example.com')).toBe(false);
  });

  it('should return false for invalid URIs', () => {
    expect(validateDomainMatch('not-a-uri', 'https://example.com')).toBe(false);
  });

  it('should return false when request domain is invalid', () => {
    expect(validateDomainMatch('https://example.com', 'not-a-uri')).toBe(false);
  });
});

// ============================================================
// fullValidation
// ============================================================

describe('fullValidation', () => {
  it('should return no errors for valid data and signature', () => {
    const data = makeParsed({
      expirationTime: '2030-01-01T00:00:00.000Z',
    });
    const errors = fullValidation(data, '0xabcdef1234567890');
    expect(errors).toEqual([]);
  });

  it('should report error for invalid signature format', () => {
    const data = makeParsed();
    const errors = fullValidation(data, 'not-hex');
    expect(errors.some((e) => e.field === 'signature')).toBe(true);
  });

  it('should report error for empty signature', () => {
    const data = makeParsed();
    const errors = fullValidation(data, '');
    expect(errors.some((e) => e.field === 'signature')).toBe(true);
  });

  it('should report error for expired message', () => {
    const data = makeParsed({
      expirationTime: '2020-01-01T00:00:00.000Z',
    });
    const errors = fullValidation(data, '0xabcdef1234567890');
    expect(errors.some((e) => e.message.includes('expired'))).toBe(true);
  });

  it('should report domain mismatch when domains do not match', () => {
    const data = makeParsed({
      domain: 'https://example.com',
    });
    const errors = fullValidation(data, '0xabcdef1234567890', 'https://evil.com');
    expect(errors.some((e) => e.field === 'domain')).toBe(true);
    expect(errors.some((e) => e.message.includes('does not match'))).toBe(true);
  });

  it('should pass domain check when domains match', () => {
    const data = makeParsed({
      domain: 'https://example.com',
    });
    const errors = fullValidation(data, '0xabcdef1234567890', 'https://example.com');
    expect(errors.some((e) => e.field === 'domain')).toBe(false);
  });

  it('should skip domain check when requestDomain is not provided', () => {
    const data = makeParsed();
    const errors = fullValidation(data, '0xabcdef1234567890');
    expect(errors.some((e) => e.field === 'domain')).toBe(false);
  });

  it('should combine multiple errors', () => {
    const data = makeParsed({
      expirationTime: '2020-01-01T00:00:00.000Z',
    });
    const errors = fullValidation(data, '', 'https://evil.com');

    expect(errors.length).toBeGreaterThanOrEqual(2);
    expect(errors.some((e) => e.field === 'signature')).toBe(true);
    expect(errors.some((e) => e.message.includes('expired'))).toBe(true);
    expect(errors.some((e) => e.message.includes('does not match'))).toBe(true);
  });
});
