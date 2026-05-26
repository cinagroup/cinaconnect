/**
 * Wallet Recovery type definitions.
 *
 * Types for Shamir's Secret Sharing, recovery providers, and wallet recovery flows.
 */

/**
 * Supported recovery provider types.
 * Each provider can hold a share of the wallet recovery secret.
 */
export type RecoveryProviderType =
  | 'email'
  | 'phone'
  | 'google'
  | 'apple'
  | 'x'
  | 'github'
  | 'discord'
  | 'facebook'
  | 'passkey'
  | 'password';

/**
 * A single recovery share created via Shamir's Secret Sharing.
 */
export interface RecoveryShare {
  /** Unique share identifier (index in the SSS scheme). */
  shareIndex: number;

  /** The hex-encoded share data. */
  shareData: string;

  /** The provider type this share is assigned to. */
  providerType: RecoveryProviderType;

  /** Provider-specific identifier (email address, phone number, OAuth sub, etc.). */
  providerId: string;

  /** Timestamp when this share was created (Unix seconds). */
  createdAt: number;

  /** Optional label for user-facing display. */
  label?: string;
}

/**
 * Configuration for creating a recovery setup.
 */
export interface RecoverySetupConfig {
  /** Total number of shares to create. */
  totalShares: number;

  /** Minimum number of shares required to recover (threshold). */
  threshold: number;

  /** The wallet's seed or private key to be split (hex-encoded). */
  walletSecret: string;
}

/**
 * Result of creating recovery shares for a wallet.
 */
export interface RecoverySetupResult {
  /** The wallet ID these shares belong to. */
  walletId: string;

  /** All generated recovery shares. */
  shares: RecoveryShare[];

  /** The threshold required for recovery. */
  threshold: number;

  /** The total number of shares. */
  totalShares: number;
}

/**
 * Parameters for adding a recovery provider to a wallet.
 */
export interface AddRecoveryProviderParams {
  /** The wallet ID to add the provider to. */
  walletId: string;

  /** The provider type. */
  providerType: RecoveryProviderType;

  /** Provider-specific identifier. */
  providerId: string;

  /** Optional display label. */
  label?: string;
}

/**
 * Parameters for recovering a wallet using provider shares.
 */
export interface RecoverWithProvidersParams {
  /** Collected recovery shares. */
  shares: RecoveryShare[];
}

/**
 * Result of a wallet recovery operation.
 */
export interface RecoveryResult {
  /** Whether the recovery was successful. */
  success: boolean;

  /** The recovered wallet secret (hex-encoded seed/private key). */
  walletSecret?: string;

  /** The recovered wallet address (if derivable). */
  walletAddress?: string;

  /** Error message if recovery failed. */
  error?: string;
}

/**
 * Parameters for password-based wallet recovery.
 */
export interface RecoverWithPasswordParams {
  /** The wallet ID to recover. */
  walletId: string;

  /** The user's password. */
  password: string;
}

/**
 * Stored recovery configuration for a wallet.
 */
export interface WalletRecoveryConfig {
  /** The wallet ID. */
  walletId: string;

  /** All registered recovery providers. */
  providers: RecoveryShare[];

  /** The encrypted wallet secret. */
  encryptedSecret: string;

  /** The encryption salt (for password-based encryption). */
  encryptionSalt: string;

  /** The SSS threshold. */
  threshold: number;

  /** Total number of shares. */
  totalShares: number;

  /** Timestamp when recovery was configured. */
  createdAt: number;

  /** Last time recovery config was updated. */
  updatedAt: number;
}

/**
 * Password strength levels.
 */
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';

/**
 * Password strength analysis result.
 */
export interface PasswordStrengthResult {
  /** The strength rating. */
  strength: PasswordStrength;

  /** Score from 0-100. */
  score: number;

  /** List of issues found with the password. */
  issues: string[];

  /** List of suggestions to improve the password. */
  suggestions: string[];
}

/**
 * Parameters for setting a password on a wallet.
 */
export interface SetPasswordParams {
  /** The wallet ID. */
  walletId: string;

  /** The password to set. */
  password: string;
}

/**
 * Parameters for changing a wallet password.
 */
export interface ChangePasswordParams {
  /** The wallet ID. */
  walletId: string;

  /** The current password. */
  oldPassword: string;

  /** The new password. */
  newPassword: string;
}

/**
 * Encrypted share bundle with nonce for transport.
 */
export interface EncryptedShareBundle {
  /** The encrypted share data (ciphertext + 16-byte tag, hex-encoded). */
  encryptedData: string;

  /** The 24-byte nonce used for encryption (hex-encoded). */
  nonce: string;

  /** The share index. */
  shareIndex: number;
}
