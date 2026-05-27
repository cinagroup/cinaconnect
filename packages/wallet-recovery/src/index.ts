/**
 * @cinacoin/wallet-recovery — Shamir's Secret Sharing Wallet Recovery
 *
 * Threshold-based wallet recovery across multiple providers
 * (email, phone, social OAuth) with password-based fallback.
 *
 * @packageDocumentation
 */

// Core recovery manager
export {
  WalletRecovery,
  hexToBytes,
  bytesToHex,
  gfMul,
  gfInv,
  gfDiv,
  evalPolynomial,
  lagrangeInterpolate,
  splitSecret,
  combineShares,
  encryptShare,
  decryptShare,
  deriveKeyFromPassword,
} from './WalletRecovery.js';

// React hook
export { useWalletRecovery } from './useWalletRecovery.js';

// Types
export type {
  RecoveryProviderType,
  RecoveryShare,
  RecoverySetupConfig,
  RecoverySetupResult,
  AddRecoveryProviderParams,
  RecoverWithProvidersParams,
  RecoveryResult,
  RecoverWithPasswordParams,
  WalletRecoveryConfig,
  PasswordStrength,
  PasswordStrengthResult,
  SetPasswordParams,
  ChangePasswordParams,
  EncryptedShareBundle,
} from './types.js';
