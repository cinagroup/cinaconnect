/**
 * @cinacoin/siwe — Sign-In with Ethereum (EIP-4361)
 *
 * Generate, parse, and verify SIWE messages for Ethereum-based authentication.
 *
 * @packageDocumentation
 */
export { generateMessage, parseMessage, verifyMessage } from './siwe.js';
export type { SIWEParams, ParsedSIWE, SIWEVerificationResult, SIWEValidationError, } from './types.js';
export { generateNonce, generateTimestamp, parseTimestamp, isValidEthereumAddress, isValidUri, normalizeAddress, getOrigin, } from './utils.js';
export { validateSIWEParams, validateTemporalConstraints, validateDomainMatch, fullValidation, } from './validator.js';
//# sourceMappingURL=index.d.ts.map