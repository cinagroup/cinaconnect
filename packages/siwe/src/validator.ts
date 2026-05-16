/**
 * SIWE message validation per EIP-4361 specification.
 *
 * Validates RFC 4566 URI format, domain matching, expiration checks,
 * and structural integrity of SIWE messages.
 */

import type { SIWEParams, ParsedSIWE, SIWEValidationError } from './types';
import { isValidEthereumAddress, isValidUri, parseTimestamp } from './utils';

/**
 * Validate SIWE parameters before message generation.
 *
 * @param params - SIWE parameters to validate.
 * @returns Array of validation errors. Empty array means valid.
 */
export function validateSIWEParams(params: SIWEParams): SIWEValidationError[] {
  const errors: SIWEValidationError[] = [];

  // Domain: RFC 3986 URI origin or authority
  if (!params.domain) {
    errors.push({ field: 'domain', message: 'Domain is required' });
  } else if (!isValidUri(params.domain)) {
    errors.push({ field: 'domain', message: 'Domain must be a valid RFC 3986 URI' });
  }

  // Address: EIP-55 Ethereum address
  if (!params.address) {
    errors.push({ field: 'address', message: 'Address is required' });
  } else if (!isValidEthereumAddress(params.address)) {
    errors.push({ field: 'address', message: 'Address must be a valid Ethereum address (0x + 40 hex chars)' });
  }

  // URI: RFC 3986 URI
  if (!params.uri) {
    errors.push({ field: 'uri', message: 'URI is required' });
  } else if (!isValidUri(params.uri)) {
    errors.push({ field: 'uri', message: 'URI must be a valid RFC 3986 URI' });
  }

  // Version: must be "1"
  if (params.version !== undefined && params.version !== '1') {
    errors.push({ field: 'version', message: 'Version must be "1"' });
  }

  // Chain ID: must be a positive integer
  if (params.chainId === undefined || params.chainId === null) {
    errors.push({ field: 'chainId', message: 'Chain ID is required' });
  } else if (!Number.isInteger(params.chainId) || params.chainId < 0) {
    errors.push({ field: 'chainId', message: 'Chain ID must be a non-negative integer' });
  }

  // Nonce: required, at least 8 alphanumeric characters
  if (!params.nonce) {
    errors.push({ field: 'nonce', message: 'Nonce is required' });
  } else if (params.nonce.length < 8) {
    errors.push({ field: 'nonce', message: 'Nonce must be at least 8 characters' });
  }

  // Statement: must not contain newlines
  if (params.statement !== undefined && params.statement !== null) {
    if (/[\r\n]/.test(params.statement)) {
      errors.push({ field: 'statement', message: 'Statement must not contain newline characters' });
    }
  }

  // Timestamps: must be valid ISO 8601
  if (params.issuedAt) {
    try {
      parseTimestamp(params.issuedAt);
    } catch {
      errors.push({ field: 'issuedAt', message: 'issuedAt must be a valid ISO 8601 timestamp' });
    }
  }

  if (params.expirationTime) {
    try {
      parseTimestamp(params.expirationTime);
    } catch {
      errors.push({ field: 'expirationTime', message: 'expirationTime must be a valid ISO 8601 timestamp' });
    }
  }

  if (params.notBefore) {
    try {
      parseTimestamp(params.notBefore);
    } catch {
      errors.push({ field: 'notBefore', message: 'notBefore must be a valid ISO 8601 timestamp' });
    }
  }

  // Request ID: must not contain newlines
  if (params.requestId !== undefined && params.requestId !== null) {
    if (/[\r\n]/.test(params.requestId)) {
      errors.push({ field: 'requestId', message: 'requestId must not contain newline characters' });
    }
  }

  // Resources: each must be a valid RFC 3986 URI
  if (params.resources) {
    for (let i = 0; i < params.resources.length; i++) {
      if (!isValidUri(params.resources[i])) {
        errors.push({ field: `resources[${i}]`, message: 'Each resource must be a valid RFC 3986 URI' });
      }
    }
  }

  return errors;
}

/**
 * Validate a parsed SIWE message against temporal constraints.
 *
 * Checks:
 * - Expiration time has not passed
 * - Not-before time has been reached
 *
 * @param data - Parsed SIWE message data.
 * @param now - Optional reference time. Defaults to current time.
 * @returns Array of validation errors. Empty means temporally valid.
 */
export function validateTemporalConstraints(
  data: ParsedSIWE,
  now: Date = new Date()
): SIWEValidationError[] {
  const errors: SIWEValidationError[] = [];

  if (data.expirationTime) {
    const expiration = parseTimestamp(data.expirationTime);
    if (now >= expiration) {
      errors.push({
        field: 'expirationTime',
        message: 'SIWE message has expired',
      });
    }
  }

  if (data.notBefore) {
    const notBefore = parseTimestamp(data.notBefore);
    if (now < notBefore) {
      errors.push({
        field: 'notBefore',
        message: 'SIWE message is not yet valid',
      });
    }
  }

  return errors;
}

/**
 * Validate that the request domain matches the SIWE message domain.
 *
 * @param requestDomain - The domain making the request (e.g., window.location.origin).
 * @param messageDomain - The domain embedded in the SIWE message.
 * @returns True if domains match.
 */
export function validateDomainMatch(requestDomain: string, messageDomain: string): boolean {
  try {
    const requestOrigin = new URL(requestDomain).origin;
    const messageOrigin = new URL(messageDomain).origin;
    return requestOrigin === messageOrigin;
  } catch {
    return false;
  }
}

/**
 * Full validation pipeline for SIWE verification.
 *
 * @param data - Parsed SIWE message data.
 * @param signature - The signature to validate (hex string).
 * @param requestDomain - Optional requesting domain for domain matching.
 * @returns Combined validation errors.
 */
export function fullValidation(
  data: ParsedSIWE,
  signature: string,
  requestDomain?: string
): SIWEValidationError[] {
  const errors: SIWEValidationError[] = [];

  // Check signature format
  if (!signature || !/^0x[0-9a-fA-F]+$/.test(signature)) {
    errors.push({ field: 'signature', message: 'Signature must be a valid hex string prefixed with 0x' });
  }

  // Temporal constraints
  errors.push(...validateTemporalConstraints(data));

  // Domain matching
  if (requestDomain) {
    if (!validateDomainMatch(requestDomain, data.domain)) {
      errors.push({
        field: 'domain',
        message: `Request domain (${requestDomain}) does not match SIWE message domain (${data.domain})`,
      });
    }
  }

  return errors;
}
