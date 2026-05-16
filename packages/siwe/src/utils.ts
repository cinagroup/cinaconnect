/**
 * Utility functions for SIWE message generation and parsing.
 */

import { randomBytes } from 'crypto';

/**
 * Generate a cryptographically secure random nonce.
 * Default length is 8 bytes (16 hex characters).
 *
 * @param byteLength - Number of random bytes (default: 8).
 * @returns Hex-encoded nonce string.
 */
export function generateNonce(byteLength: number = 8): string {
  const bytes = randomBytes(byteLength);
  return bytes.toString('hex');
}

/**
 * Generate a SIWE-compatible timestamp in ISO 8601 format.
 * Uses the current time by default.
 *
 * @param date - Optional Date object. Defaults to now.
 * @returns ISO 8601 timestamp string (e.g., "2024-01-15T10:30:00.000Z").
 */
export function generateTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Parse an ISO 8601 timestamp string into a Date object.
 *
 * @param timestamp - ISO 8601 timestamp string.
 * @returns Parsed Date object.
 * @throws Error if the timestamp is invalid.
 */
export function parseTimestamp(timestamp: string): Date {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ISO 8601 timestamp: ${timestamp}`);
  }
  return date;
}

/**
 * Validate an Ethereum address format (EIP-55 checksum-aware).
 *
 * @param address - Ethereum address string.
 * @returns True if the address format is valid.
 */
export function isValidEthereumAddress(address: string): boolean {
  if (!address) return false;
  // Must be 0x + 40 hex characters
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return false;
  return true;
}

/**
 * Validate an RFC 3986 URI format.
 *
 * @param uri - URI string to validate.
 * @returns True if the URI format appears valid.
 */
export function isValidUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    // Must have a protocol and hostname
    return !!parsed.protocol && !!parsed.hostname;
  } catch {
    return false;
  }
}

/**
 * Normalize an Ethereum address to lowercase checksummed form.
 *
 * @param address - Ethereum address string.
 * @returns Normalized address.
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

/**
 * Extract the origin from a URI string.
 *
 * @param uri - Full URI string.
 * @returns Origin string (e.g., "https://example.com").
 */
export function getOrigin(uri: string): string {
  const parsed = new URL(uri);
  return parsed.origin;
}
