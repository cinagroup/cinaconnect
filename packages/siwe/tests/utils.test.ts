/**
 * Tests for SIWE utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  generateNonce,
  generateTimestamp,
  parseTimestamp,
  isValidEthereumAddress,
  isValidUri,
  normalizeAddress,
  getOrigin,
} from '../src/utils.js';

describe('SIWE Utils', () => {
  describe('generateNonce', () => {
    it('should generate a hex string of default length (8 bytes = 16 hex chars)', () => {
      const nonce = generateNonce();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBe(16);
      expect(nonce).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate a hex string of custom length', () => {
      const nonce = generateNonce(4);
      expect(nonce.length).toBe(8);
    });

    it('should generate different nonces each time', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });

    it('should generate a 32-byte nonce (64 hex chars)', () => {
      const nonce = generateNonce(32);
      expect(nonce.length).toBe(64);
    });

    it('should only contain valid hex characters', () => {
      for (let i = 0; i < 20; i++) {
        const nonce = generateNonce();
        expect(nonce).toMatch(/^[0-9a-f]+$/);
      }
    });
  });

  describe('generateTimestamp', () => {
    it('should return a valid ISO 8601 string', () => {
      const timestamp = generateTimestamp();
      expect(typeof timestamp).toBe('string');
      expect(timestamp.endsWith('Z')).toBe(true);
    });

    it('should match the current time within 1 second', () => {
      const before = Date.now();
      const timestamp = generateTimestamp();
      const after = Date.now();
      const parsed = new Date(timestamp).getTime();
      expect(parsed).toBeGreaterThanOrEqual(before - 1000);
      expect(parsed).toBeLessThanOrEqual(after + 1000);
    });

    it('should use the provided date', () => {
      const specificDate = new Date('2024-06-15T12:00:00.000Z');
      const timestamp = generateTimestamp(specificDate);
      expect(timestamp).toBe('2024-06-15T12:00:00.000Z');
    });
  });

  describe('parseTimestamp', () => {
    it('should parse a valid ISO 8601 timestamp', () => {
      const date = parseTimestamp('2024-06-15T12:00:00.000Z');
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe('2024-06-15T12:00:00.000Z');
    });

    it('should parse a timestamp without milliseconds', () => {
      const date = parseTimestamp('2024-06-15T12:00:00Z');
      expect(date).toBeInstanceOf(Date);
      expect(date.getUTCFullYear()).toBe(2024);
    });

    it('should throw on invalid timestamp', () => {
      expect(() => parseTimestamp('not-a-date')).toThrow('Invalid ISO 8601 timestamp');
    });

    it('should throw on empty string', () => {
      expect(() => parseTimestamp('')).toThrow('Invalid ISO 8601 timestamp');
    });

    it('should parse a timestamp with timezone offset', () => {
      const date = parseTimestamp('2024-06-15T12:00:00+08:00');
      expect(date).toBeInstanceOf(Date);
    });
  });

  describe('isValidEthereumAddress', () => {
    it('should return true for valid lowercase address', () => {
      expect(isValidEthereumAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
    });

    it('should return true for valid uppercase address', () => {
      expect(isValidEthereumAddress('0x1234567890ABCDEF1234567890ABCDEF12345678')).toBe(true);
    });

    it('should return true for valid mixed-case address', () => {
      expect(isValidEthereumAddress('0x1234567890AbCdEf1234567890AbCdEf12345678')).toBe(true);
    });

    it('should return false for address without 0x prefix', () => {
      expect(isValidEthereumAddress('1234567890abcdef1234567890abcdef12345678')).toBe(false);
    });

    it('should return false for address that is too short', () => {
      expect(isValidEthereumAddress('0x1234')).toBe(false);
    });

    it('should return false for address that is too long', () => {
      expect(isValidEthereumAddress('0x1234567890abcdef1234567890abcdef1234567890')).toBe(false);
    });

    it('should return false for address with invalid characters', () => {
      expect(isValidEthereumAddress('0x1234567890abcdef1234567890abcdef1234567g')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidEthereumAddress('')).toBe(false);
    });

    it('should return false for null-ish string', () => {
      expect(isValidEthereumAddress('' as string)).toBe(false);
    });

    it('should return false for address with spaces', () => {
      expect(isValidEthereumAddress('0x 1234567890abcdef1234567890abcdef12345678')).toBe(false);
    });
  });

  describe('isValidUri', () => {
    it('should return true for valid HTTP URI', () => {
      expect(isValidUri('https://example.com')).toBe(true);
    });

    it('should return true for valid HTTPS URI with path', () => {
      expect(isValidUri('https://example.com/path/to/resource')).toBe(true);
    });

    it('should return true for valid URI with port', () => {
      expect(isValidUri('https://localhost:3000')).toBe(true);
    });

    it('should return true for http protocol', () => {
      expect(isValidUri('http://example.com')).toBe(true);
    });

    it('should return false for URI without protocol', () => {
      expect(isValidUri('example.com')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidUri('')).toBe(false);
    });

    it('should return false for invalid URI', () => {
      expect(isValidUri('not a uri at all')).toBe(false);
    });
  });

  describe('normalizeAddress', () => {
    it('should convert address to lowercase', () => {
      const result = normalizeAddress('0x1234567890ABCDEF1234567890ABCDEF12345678');
      expect(result).toBe('0x1234567890abcdef1234567890abcdef12345678');
    });

    it('should not change already-lowercase address', () => {
      const input = '0x1234567890abcdef1234567890abcdef12345678';
      expect(normalizeAddress(input)).toBe(input);
    });

    it('should return empty string for empty input', () => {
      expect(normalizeAddress('')).toBe('');
    });
  });

  describe('getOrigin', () => {
    it('should extract origin from HTTPS URL', () => {
      expect(getOrigin('https://example.com/path/to/page')).toBe('https://example.com');
    });

    it('should extract origin from HTTP URL with port', () => {
      expect(getOrigin('http://localhost:3000/api')).toBe('http://localhost:3000');
    });

    it('should strip query parameters', () => {
      expect(getOrigin('https://example.com/page?query=value')).toBe('https://example.com');
    });

    it('should strip hash', () => {
      expect(getOrigin('https://example.com/page#section')).toBe('https://example.com');
    });

    it('should throw on invalid URL', () => {
      expect(() => getOrigin('not-a-url')).toThrow();
    });
  });
});
