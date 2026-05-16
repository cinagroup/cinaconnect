/**
 * @onchainux/siwe — Sign-In with Ethereum (EIP-4361)
 *
 * Generate, parse, and verify SIWE messages for Ethereum-based authentication.
 *
 * @packageDocumentation
 */

// Core SIWE functions
export { generateMessage, parseMessage, verifyMessage } from './siwe';

// Types
export type {
  SIWEParams,
  ParsedSIWE,
  SIWEVerificationResult,
  SIWEValidationError,
} from './types';

// Utilities
export {
  generateNonce,
  generateTimestamp,
  parseTimestamp,
  isValidEthereumAddress,
  isValidUri,
  normalizeAddress,
  getOrigin,
} from './utils';

// Validation
export {
  validateSIWEParams,
  validateTemporalConstraints,
  validateDomainMatch,
  fullValidation,
} from './validator';
