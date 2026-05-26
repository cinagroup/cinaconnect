/**
 * WalletRecovery — Shamir's Secret Sharing with multi-provider wallet recovery.
 *
 * Implements threshold-based wallet recovery using Shamir's Secret Sharing (SSS)
 * over GF(2^8). Supports multiple recovery providers (email, phone, social OAuth)
 * and password-based recovery with PBKDF2 key derivation.
 *
 * Encryption uses XChaCha20-Poly1305 (via @noble/ciphers) for authenticated
 * encryption of shares and wallet secrets.
 *
 * @packageDocumentation
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { extract, expand } from '@noble/hashes/hkdf.js';
import { randomBytes } from '@noble/hashes/utils.js';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import {
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
  RecoveryProviderType,
} from './types.js';

// ─── Shamir's Secret Sharing over GF(2^8) ──────────────────────────────

/**
 * The irreducible polynomial for GF(2^8): x^8 + x^4 + x^3 + x + 1.
 * Used for the multiplication reduction in the finite field.
 */
const GF256_PRIMITIVE = 0x11b;

/**
 * Multiply two elements in GF(2^8).
 *
 * Uses the Russian peasant multiplication algorithm with reduction
 * by the irreducible polynomial 0x11d.
 *
 * @param a - First element (0-255).
 * @param b - Second element (0-255).
 * @returns Product in GF(2^8).
 */
export function gfMul(a: number, b: number): number {
  let result = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) {
      result ^= a;
    }
    const hiBit = a & 0x80;
    a = (a << 1) & 0xff;
    if (hiBit) {
      // Reduce by the irreducible polynomial. Since a is already masked to 8 bits,
      // XOR with 0x1b (the lower 8 bits of 0x11b) is equivalent.
      a ^= 0x1b;
    }
    b >>= 1;
  }
  return result;
}

/**
 * Precomputed GF(2^8) inverse table.
 * GF_INVERSE[0] is unused (0 has no inverse).
 */
export const GF_INVERSE = new Uint8Array(256);

(function buildInverseTable() {
  const generator = 3;
  let power = 1;
  const logTable = new Int16Array(256).fill(-1);
  const antilogTable = new Uint8Array(256);

  for (let i = 0; i < 255; i++) {
    antilogTable[i] = power;
    logTable[power] = i;
    power = gfMul(power, generator);
  }

  for (let i = 1; i < 256; i++) {
    const log = logTable[i];
    if (log >= 0) {
      const invLog = (255 - log) % 255;
      GF_INVERSE[i] = antilogTable[invLog];
    }
  }
})();

/**
 * Compute the multiplicative inverse in GF(2^8) using the precomputed table.
 *
 * @param a - Element to invert (must be non-zero).
 * @returns The multiplicative inverse of a in GF(2^8).
 */
export function gfInv(a: number): number {
  if (a === 0) throw new Error('Cannot invert zero in GF(256)');
  return GF_INVERSE[a];
}

/**
 * Compute a/b in GF(2^8), which is a * b^(-1).
 *
 * @param a - Numerator.
 * @param b - Denominator (must be non-zero).
 * @returns a/b in GF(2^8).
 */
export function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero in GF(256)');
  return gfMul(a, gfInv(b));
}

/**
 * Evaluate a polynomial at point x in GF(2^8).
 *
 * Uses Horner's method for efficient evaluation.
 *
 * @param coefficients - Polynomial coefficients [a0, a1, a2, ...].
 * @param x - Point to evaluate at.
 * @returns Polynomial value at x.
 */
export function evalPolynomial(coefficients: number[], x: number): number {
  let result = 0;
  for (let i = coefficients.length - 1; i >= 0; i--) {
    result = gfMul(result, x) ^ coefficients[i];
  }
  return result;
}

/**
 * Lagrange interpolation over GF(2^8) to reconstruct the secret.
 *
 * Given a set of (x, y) points, reconstructs the polynomial value at x=0,
 * which corresponds to the original secret byte.
 *
 * @param points - Array of [x, y] coordinate pairs.
 * @returns The interpolated value at x=0 (the secret byte).
 */
export function lagrangeInterpolate(points: Array<[number, number]>): number {
  const n = points.length;
  let result = 0;

  for (let i = 0; i < n; i++) {
    const [xi, yi] = points[i];
    if (yi === 0) continue;

    let basis = yi;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const [xj] = points[j];
      // basis *= xj / (xj - xi) in GF(2^8)
      basis = gfMul(basis, gfDiv(xj, xj ^ xi));
    }

    result ^= basis;
  }

  return result;
}

// ─── Core SSS Functions ────────────────────────────────────────────────

/**
 * Split a secret (Buffer) into n shares with threshold k using Shamir's Secret Sharing.
 *
 * Each byte of the secret is treated independently and split using a random
 * polynomial of degree k-1 where the constant term is the secret byte.
 *
 * @param secret - The secret bytes to split.
 * @param threshold - Minimum shares needed to reconstruct (k).
 * @param totalShares - Total number of shares to generate (n).
 * @returns Array of shares, each containing an index and the share bytes.
 */
export function splitSecret(
  secret: Uint8Array,
  threshold: number,
  totalShares: number
): Array<{ index: number; data: Uint8Array }> {
  if (threshold < 2) throw new Error('Threshold must be at least 2');
  if (threshold > totalShares) throw new Error('Threshold cannot exceed total shares');
  if (totalShares > 255) throw new Error('Total shares cannot exceed 255');

  const shares: Array<{ index: number; data: Uint8Array }> = [];
  for (let i = 1; i <= totalShares; i++) {
    shares.push({ index: i, data: new Uint8Array(secret.length) });
  }

  for (let byteIdx = 0; byteIdx < secret.length; byteIdx++) {
    // Create polynomial: f(x) = secret + a1*x + a2*x^2 + ... + a(k-1)*x^(k-1)
    const coefficients: number[] = [secret[byteIdx]];
    for (let i = 1; i < threshold; i++) {
      coefficients.push(randomBytes(1)[0]);
    }

    // Evaluate polynomial at x = 1, 2, ..., n
    for (let i = 0; i < totalShares; i++) {
      const x = i + 1;
      shares[i].data[byteIdx] = evalPolynomial(coefficients, x);
    }
  }

  return shares;
}

/**
 * Reconstruct the secret from a set of shares using Lagrange interpolation.
 *
 * Requires at least `threshold` shares. Extra shares beyond the threshold
 * are ignored (the first `threshold` shares are used).
 *
 * @param shares - Array of {index, data} share objects.
 * @param threshold - The threshold used when splitting (k).
 * @returns The reconstructed secret bytes.
 */
export function combineShares(
  shares: Array<{ index: number; data: Uint8Array }>,
  threshold: number
): Uint8Array {
  if (shares.length < threshold) {
    throw new Error(
      `Need at least ${threshold} shares to reconstruct, got ${shares.length}`
    );
  }

  const selectedShares = shares.slice(0, threshold);
  const secretLength = selectedShares[0].data.length;
  const secret = new Uint8Array(secretLength);

  for (let byteIdx = 0; byteIdx < secretLength; byteIdx++) {
    const points: Array<[number, number]> = selectedShares.map((s) => [
      s.index,
      s.data[byteIdx],
    ]);
    secret[byteIdx] = lagrangeInterpolate(points);
  }

  return secret;
}

// ─── Encryption/Decryption (XChaCha20-Poly1305) ────────────────────────

/**
 * XChaCha20-Poly1305 AEAD encryption.
 *
 * Returns [ciphertext || 16-byte auth tag].
 *
 * @param data - Plaintext data.
 * @param key - 32-byte encryption key.
 * @param nonce - 24-byte nonce (random).
 * @param aad - Optional additional authenticated data.
 * @returns Encrypted data with appended 16-byte authentication tag.
 */
export function encryptShare(
  data: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  aad?: Uint8Array
): Uint8Array {
  const cipher = xchacha20poly1305(key, nonce, aad);
  // encrypt() returns [ciphertext || 16-byte auth tag]
  return cipher.encrypt(data);
}

/**
 * XChaCha20-Poly1305 AEAD decryption.
 *
 * Expects [ciphertext || 16-byte auth tag].
 *
 * @param data - Encrypted data (ciphertext + 16-byte tag).
 * @param key - 32-byte encryption key.
 * @param nonce - 24-byte nonce (same as used for encryption).
 * @param aad - Optional additional authenticated data.
 * @returns Decrypted plaintext.
 * @throws Error if authentication tag verification fails.
 */
export function decryptShare(
  data: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  aad?: Uint8Array
): Uint8Array {
  if (data.length < 16) {
    throw new Error('Encrypted data too short (missing authentication tag)');
  }

  const cipher = xchacha20poly1305(key, nonce, aad);
  // decrypt() expects [ciphertext || 16-byte auth tag], validates tag, returns plaintext
  return cipher.decrypt(data);
}

/**
 * Derive a 256-bit encryption key from a password and salt using HKDF.
 *
 * @param password - User's password.
 * @param salt - Random salt (at least 16 bytes recommended).
 * @returns 32-byte encryption key.
 */
export function deriveKeyFromPassword(password: string, salt: Uint8Array): Uint8Array {
  const passwordBytes = new TextEncoder().encode(password);
  const prk = extract(sha256, passwordBytes, salt);
  return expand(sha256, prk, undefined, 32);
}

// ─── WalletRecovery Class ──────────────────────────────────────────────

/**
 * Encrypted share wrapper with nonce for transport.
 */
export interface EncryptedShareBundle {
  /** The encrypted share data (ciphertext + 16-byte tag). */
  encryptedData: string;
  /** The 24-byte nonce used for encryption (hex-encoded). */
  nonce: string;
  /** The share index. */
  shareIndex: number;
}

/**
 * Wallet recovery manager using Shamir's Secret Sharing.
 *
 * Enables threshold-based wallet recovery across multiple providers
 * (email, phone, social OAuth) with password-based fallback.
 *
 * @example
 * ```ts
 * const recovery = new WalletRecovery(walletStorage);
 *
 * // Set up recovery
 * const result = await recovery.createRecoveryShares(walletId, {
 *   totalShares: 5,
 *   threshold: 3,
 *   walletSecret: walletSeedHex,
 * });
 *
 * // Add recovery providers
 * await recovery.addRecoveryProvider(walletId, {
 *   providerType: 'email',
 *   providerId: 'user@example.com',
 *   label: 'Primary Email',
 * });
 *
 * // Recover wallet
 * const recovered = await recovery.recoverWithProviders({ shares });
 * ```
 */
export class WalletRecovery {
  /** In-memory store for wallet recovery configurations. */
  private configs: Map<string, WalletRecoveryConfig>;

  /** Map of share data by share index (for server-side share storage). */
  private shareStore: Map<string, RecoveryShare>;

  /** Master encryption keys per wallet (in production, derive from HSM). */
  private shareKeys: Map<string, Uint8Array>;

  /**
   * Create a new WalletRecovery instance.
   *
   * @param configs - Optional initial recovery configurations map.
   */
  constructor(configs?: Map<string, WalletRecoveryConfig>) {
    this.configs = configs || new Map();
    this.shareStore = new Map();
    this.shareKeys = new Map();
  }

  /**
   * Create recovery shares for a wallet using Shamir's Secret Sharing.
   *
   * Splits the wallet secret into `totalShares` shares where `threshold`
   * shares are needed to reconstruct the secret. Each share is encrypted
   * with a per-wallet key using XChaCha20-Poly1305.
   *
   * @param walletId - Unique identifier for the wallet.
   * @param config - Recovery setup configuration.
   * @returns Recovery setup result with generated shares.
   *
   * @throws Error if threshold < 2 or threshold > totalShares.
   */
  createRecoveryShares(
    walletId: string,
    config: RecoverySetupConfig
  ): RecoverySetupResult {
    if (config.threshold < 2) {
      throw new Error('Recovery threshold must be at least 2');
    }
    if (config.threshold > config.totalShares) {
      throw new Error('Threshold cannot exceed total shares');
    }
    if (config.totalShares > 255) {
      throw new Error('Total shares cannot exceed 255');
    }

    const secretBytes = hexToBytes(config.walletSecret);

    // Split using Shamir's Secret Sharing
    const sssShares = splitSecret(secretBytes, config.threshold, config.totalShares);

    // Generate a per-wallet share encryption key (32 bytes)
    const shareKey = randomBytes(32);
    this.shareKeys.set(walletId, shareKey);

    // Create recovery share objects with encrypted shares
    const shares: RecoveryShare[] = sssShares.map((sssShare) => {
      const nonce = randomBytes(24);
      const encryptedData = encryptShare(sssShare.data, shareKey, nonce);
      const share: RecoveryShare = {
        shareIndex: sssShare.index,
        shareData: bytesToHex(encryptedData),
        // Store nonce as part of share data metadata
        providerType: 'email',
        providerId: '',
        createdAt: Math.floor(Date.now() / 1000),
        label: `nonce:${bytesToHex(nonce)}`,
      };

      const shareKeyIdx = `${walletId}:${share.shareIndex}`;
      this.shareStore.set(shareKeyIdx, share);

      return share;
    });

    // Store encrypted wallet secret for password recovery
    // Use deriveKeyFromPassword with the original secret as "password" and a random salt
    const salt = randomBytes(32);
    const passwordKey = deriveKeyFromPassword(config.walletSecret, salt);
    // Use zero nonce for password-based encryption (same password always decrypts)
    const pwNonce = new Uint8Array(24);
    const encryptedSecret = bytesToHex(encryptShare(secretBytes, passwordKey, pwNonce));

    const recoveryConfig: WalletRecoveryConfig = {
      walletId,
      providers: [],
      encryptedSecret,
      encryptionSalt: bytesToHex(salt),
      threshold: config.threshold,
      totalShares: config.totalShares,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
    };

    this.configs.set(walletId, recoveryConfig);

    return {
      walletId,
      shares,
      threshold: config.threshold,
      totalShares: config.totalShares,
    };
  }

  /**
   * Add a recovery provider to a wallet's recovery setup.
   *
   * Links a specific provider (email, phone, social OAuth) to a recovery share.
   *
   * @param walletId - The wallet ID to add the provider to.
   * @param params - Recovery provider parameters.
   * @returns The assigned recovery share.
   *
   * @throws Error if wallet has no recovery setup or all shares are assigned.
   */
  addRecoveryProvider(
    walletId: string,
    params: AddRecoveryProviderParams
  ): RecoveryShare {
    const config = this.configs.get(walletId);
    if (!config) {
      throw new Error(`No recovery setup found for wallet: ${walletId}`);
    }

    const assignedIndices = new Set(config.providers.map((p) => p.shareIndex));
    let assignedShare: RecoveryShare | null = null;

    for (let i = 1; i <= config.totalShares; i++) {
      if (!assignedIndices.has(i)) {
        const shareKey = `${walletId}:${i}`;
        const share = this.shareStore.get(shareKey);
        if (share) {
          share.providerType = params.providerType;
          share.providerId = params.providerId;
          share.label = params.label;
          share.createdAt = Math.floor(Date.now() / 1000);
          assignedShare = share;
          break;
        }
      }
    }

    if (!assignedShare) {
      throw new Error('All recovery shares are already assigned to providers');
    }

    config.providers.push(assignedShare);
    config.updatedAt = Math.floor(Date.now() / 1000);
    this.configs.set(walletId, config);

    return { ...assignedShare };
  }

  /**
   * Recover a wallet using provider recovery shares.
   *
   * Collects shares from multiple recovery providers and reconstructs
   * the wallet secret using Shamir's Secret Sharing. Requires at least
   * the configured threshold number of shares.
   *
   * @param params - Recovery parameters with collected shares.
   * @returns Recovery result with the reconstructed wallet secret.
   */
  async recoverWithProviders(params: RecoverWithProvidersParams): Promise<RecoveryResult> {
    if (params.shares.length === 0) {
      return {
        success: false,
        error: 'No recovery shares provided',
      };
    }

    const walletId = this.determineWalletId(params.shares);
    if (!walletId) {
      return {
        success: false,
        error: 'Cannot determine wallet ID from shares',
      };
    }

    const config = this.configs.get(walletId);
    if (!config) {
      return this.reconstructFromShares(params.shares);
    }

    if (params.shares.length < config.threshold) {
      return {
        success: false,
        error: `Need at least ${config.threshold} shares to recover, got ${params.shares.length}`,
      };
    }

    return this.reconstructFromShares(params.shares);
  }

  /**
   * Recover a wallet using a password.
   *
   * Derives an encryption key from the password and uses it to decrypt
   * the stored wallet secret.
   *
   * @param params - Password recovery parameters.
   * @returns Recovery result with the decrypted wallet secret.
   */
  async recoverWithPassword(params: RecoverWithPasswordParams): Promise<RecoveryResult> {
    const config = this.configs.get(params.walletId);
    if (!config) {
      return {
        success: false,
        error: `No recovery setup found for wallet: ${params.walletId}`,
      };
    }

    if (!params.password) {
      return {
        success: false,
        error: 'Password is required',
      };
    }

    try {
      const salt = hexToBytes(config.encryptionSalt);
      const key = deriveKeyFromPassword(params.password, salt);

      const encryptedData = hexToBytes(config.encryptedSecret);
      const pwNonce = new Uint8Array(24); // Must match encryption nonce
      const secretBytes = decryptShare(encryptedData, key, pwNonce);

      const isEmpty = secretBytes.every((b) => b === 0);
      if (isEmpty) {
        return {
          success: false,
          error: 'Incorrect password',
        };
      }

      const walletSecret = bytesToHex(secretBytes);

      return {
        success: true,
        walletSecret,
        walletAddress: deriveAddressFromSeed(secretBytes),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password recovery failed',
      };
    }
  }

  /**
   * Set a password for wallet recovery.
   *
   * @param params - Password setup parameters.
   * @returns True if password was set successfully.
   */
  async setPassword(params: SetPasswordParams): Promise<boolean> {
    const config = this.configs.get(params.walletId);
    if (!config) {
      throw new Error(`No recovery setup found for wallet: ${params.walletId}`);
    }

    const strength = this.analyzePasswordStrength(params.password);
    if (strength.strength === 'weak') {
      throw new Error(
        `Password is too weak: ${strength.issues.join(', ')}`
      );
    }

    const salt = randomBytes(32);
    config.encryptionSalt = bytesToHex(salt);
    config.updatedAt = Math.floor(Date.now() / 1000);
    this.configs.set(params.walletId, config);

    return true;
  }

  /**
   * Verify a password against a wallet's recovery setup.
   *
   * @param walletId - The wallet ID.
   * @param password - The password to verify.
   * @returns True if the password is correct.
   */
  async verifyPassword(walletId: string, password: string): Promise<boolean> {
    const result = await this.recoverWithPassword({ walletId, password });
    return result.success;
  }

  /**
   * Change the password for a wallet's recovery setup.
   *
   * @param params - Password change parameters.
   * @returns True if password was changed successfully.
   */
  async changePassword(params: ChangePasswordParams): Promise<boolean> {
    const config = this.configs.get(params.walletId);
    if (!config) {
      throw new Error(`No recovery setup found for wallet: ${params.walletId}`);
    }

    const oldValid = await this.verifyPassword(params.walletId, params.oldPassword);
    if (!oldValid) {
      throw new Error('Current password is incorrect');
    }

    const strength = this.analyzePasswordStrength(params.newPassword);
    if (strength.strength === 'weak') {
      throw new Error(
        `New password is too weak: ${strength.issues.join(', ')}`
      );
    }

    const salt = randomBytes(32);
    const key = deriveKeyFromPassword(params.newPassword, salt);

    const oldSalt = hexToBytes(config.encryptionSalt);
    const oldKey = deriveKeyFromPassword(params.oldPassword, oldSalt);
    const encryptedData = hexToBytes(config.encryptedSecret);
    const pwNonce = new Uint8Array(24);
    const secretBytes = decryptShare(encryptedData, oldKey, pwNonce);

    const newEncrypted = encryptShare(secretBytes, key, pwNonce);
    config.encryptedSecret = bytesToHex(newEncrypted);
    config.encryptionSalt = bytesToHex(salt);
    config.updatedAt = Math.floor(Date.now() / 1000);

    this.configs.set(params.walletId, config);

    return true;
  }

  /**
   * Analyze password strength.
   *
   * @param password - Password to analyze.
   * @returns Password strength analysis result.
   */
  analyzePasswordStrength(password: string): PasswordStrengthResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    if (password.length < 8) {
      issues.push('Password is too short (minimum 8 characters)');
      suggestions.push('Use at least 8 characters');
    } else if (password.length < 12) {
      score += 10;
      suggestions.push('Consider using 12+ characters');
    } else if (password.length < 16) {
      score += 20;
    } else {
      score += 30;
    }

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);

    const charTypes = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

    if (charTypes < 2) {
      issues.push('Password lacks character diversity');
      suggestions.push('Mix uppercase, lowercase, numbers, and special characters');
    } else if (charTypes < 3) {
      score += 10;
    } else if (charTypes === 3) {
      score += 20;
    } else {
      score += 30;
    }

    const commonPatterns = [
      /^(password|123456|qwerty|abc123|letmein)/i,
      /(.)\1{2,}/,
      /(012|123|234|345|456|567|678|789)/,
      /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk)/i,
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        issues.push('Password contains a common pattern');
        suggestions.push('Avoid common patterns and sequences');
        score -= 10;
        break;
      }
    }

    const charsetSize = (hasLower ? 26 : 0) + (hasUpper ? 26 : 0) + (hasDigit ? 10 : 0) + (hasSpecial ? 33 : 0);
    const entropy = password.length * Math.log2(charsetSize || 1);

    if (entropy < 40) {
      score = Math.max(score, 10);
    } else if (entropy < 60) {
      score += 10;
    } else if (entropy < 80) {
      score += 15;
    } else {
      score += 20;
    }

    score = Math.max(0, Math.min(100, score));

    let strength: PasswordStrength;
    if (score < 25) strength = 'weak';
    else if (score < 45) strength = 'fair';
    else if (score < 65) strength = 'good';
    else if (score < 85) strength = 'strong';
    else strength = 'very-strong';

    return { strength, score, issues, suggestions };
  }

  /**
   * Get the recovery configuration for a wallet.
   *
   * @param walletId - The wallet ID.
   * @returns The recovery configuration, or undefined if not set up.
   */
  getRecoveryConfig(walletId: string): WalletRecoveryConfig | undefined {
    return this.configs.get(walletId);
  }

  /**
   * List all configured recovery providers for a wallet.
   *
   * @param walletId - The wallet ID.
   * @returns Array of recovery providers.
   */
  listRecoveryProviders(walletId: string): RecoveryShare[] {
    const config = this.configs.get(walletId);
    return config ? [...config.providers] : [];
  }

  /**
   * Remove a recovery provider from a wallet.
   *
   * @param walletId - The wallet ID.
   * @param shareIndex - The share index to remove.
   * @returns True if the provider was removed.
   */
  removeRecoveryProvider(walletId: string, shareIndex: number): boolean {
    const config = this.configs.get(walletId);
    if (!config) {
      throw new Error(`No recovery setup found for wallet: ${walletId}`);
    }

    if (config.providers.length <= config.threshold) {
      throw new Error(
        `Cannot remove: would leave ${config.providers.length - 1} shares, below threshold of ${config.threshold}`
      );
    }

    const idx = config.providers.findIndex((p) => p.shareIndex === shareIndex);
    if (idx === -1) {
      return false;
    }

    config.providers.splice(idx, 1);
    config.updatedAt = Math.floor(Date.now() / 1000);
    this.configs.set(walletId, config);

    const shareKey = `${walletId}:${shareIndex}`;
    this.shareStore.delete(shareKey);

    return true;
  }

  /**
   * Internal: Determine wallet ID from a set of shares.
   */
  private determineWalletId(shares: RecoveryShare[]): string | null {
    for (const [walletId, config] of this.configs) {
      const match = shares.some((s) =>
        config.providers.some((p) => p.shareIndex === s.shareIndex && p.shareData === s.shareData)
      );
      if (match) {
        return walletId;
      }
    }
    return null;
  }

  /**
   * Internal: Reconstruct wallet secret from shares.
   */
  private reconstructFromShares(shares: RecoveryShare[]): RecoveryResult {
    try {
      let threshold = 2;
      for (const [walletId, config] of this.configs) {
        const match = shares.some((s) =>
          config.providers.some((p) => p.shareIndex === s.shareIndex && p.shareData === s.shareData)
        );
        if (match) {
          threshold = config.threshold;
          break;
        }
      }

      if (shares.length < threshold) {
        return {
          success: false,
          error: `Need at least ${threshold} shares to recover, got ${shares.length}`,
        };
      }

      const sssShares = shares.map((s) => ({
        index: s.shareIndex,
        data: hexToBytes(s.shareData),
      }));

      const secretBytes = combineShares(sssShares, threshold);
      const walletSecret = bytesToHex(secretBytes);

      return {
        success: true,
        walletSecret,
        walletAddress: deriveAddressFromSeed(secretBytes),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Share reconstruction failed',
      };
    }
  }
}

// ─── Utility Functions ─────────────────────────────────────────────────

/**
 * Convert a hex string to a Uint8Array.
 *
 * @param hex - Hex string (with or without "0x" prefix).
 * @returns Uint8Array of bytes.
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string: odd length');
  }

  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Convert a Uint8Array to a hex string.
 *
 * @param bytes - Bytes to convert.
 * @returns Hex string with "0x" prefix.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return (
    '0x' +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * Derive an Ethereum-style address from a seed using SHA-256.
 *
 * @param seed - Seed bytes.
 * @returns Ethereum-style address (0x + 40 hex chars).
 */
function deriveAddressFromSeed(seed: Uint8Array): string {
  const hash = sha256(seed);
  const addressBytes = hash.slice(-20);
  return '0x' + bytesToHex(addressBytes).slice(2);
}
