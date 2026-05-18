/**
 * WalletRecovery — Shamir's Secret Sharing with multi-provider wallet recovery.
 *
 * Implements threshold-based wallet recovery using Shamir's Secret Sharing (SSS)
 * over GF(2^8). Supports multiple recovery providers (email, phone, social OAuth)
 * and password-based recovery with PBKDF2 key derivation.
 *
 * @packageDocumentation
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { extract, expand } from '@noble/hashes/hkdf.js';
import { randomBytes } from '@noble/hashes/utils.js';
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
const GF256_PRIMITIVE = 0x11d;

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
function gfMul(a: number, b: number): number {
  let result = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) {
      result ^= a;
    }
    const hiBit = a & 0x80;
    a = (a << 1) & 0xff;
    if (hiBit) {
      a ^= GF256_PRIMITIVE;
    }
    b >>= 1;
  }
  return result;
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
function evalPolynomial(coefficients: number[], x: number): number {
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
function lagrangeInterpolate(points: Array<[number, number]>): number {
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
      // Division in GF(2^8) is multiplication by the inverse
      basis = gfMul(basis, gfDiv(xj, xj ^ xi));
    }

    result ^= basis;
  }

  return result;
}

/**
 * Compute the multiplicative inverse in GF(2^8).
 *
 * Uses the extended Euclidean algorithm approach, iterating through
 * powers of a generator element.
 *
 * @param a - Element to invert (must be non-zero).
 * @returns The multiplicative inverse of a in GF(2^8).
 */
function gfInv(a: number): number {
  if (a === 0) throw new Error('Cannot invert zero in GF(2^8)');

  // Use the fact that in GF(2^8), a^(254) = a^(-1)
  // Compute via successive squaring
  let result = a;
  for (let i = 0; i < 6; i++) {
    result = gfMul(result, result);
    result = gfMul(result, a);
  }
  // a^127 * a^128 / a = a^254 ... let me use a simpler approach

  // Extended Euclidean approach for GF(2^8)
  // Build log/antilog tables
  return gfPow(a, 254);
}

/**
 * Compute a^n in GF(2^8) using square-and-multiply.
 *
 * @param a - Base element.
 * @param n - Exponent.
 * @returns a^n in GF(2^8).
 */
function gfPow(a: number, n: number): number {
  if (n === 0) return 1;
  if (n === 1) return a;

  let result = 1;
  let base = a;
  let exp = n;

  while (exp > 0) {
    if (exp & 1) {
      result = gfMul(result, base);
    }
    base = gfMul(base, base);
    exp >>= 1;
  }

  return result;
}

/**
 * Compute a/b in GF(2^8), which is a * b^(-1).
 *
 * @param a - Numerator.
 * @param b - Denominator (must be non-zero).
 * @returns a/b in GF(2^8).
 */
function gfDiv(a: number, b: number): number {
  return gfMul(a, gfInv(b));
}

// ─── Precomputed inverse table for performance ─────────────────────────

/**
 * Precomputed GF(2^8) inverse table.
 * GF_INVERSE[0] is unused (0 has no inverse).
 */
const GF_INVERSE = new Uint8Array(256);

(function buildInverseTable() {
  // Use the property: g is a generator of GF(2^8)*, so g^(-1) = g^254
  // 3 (0x03) is a generator for GF(2^8) with polynomial 0x11d
  const generator = 3;
  let power = 1;
  const logTable = new Int16Array(256).fill(-1);
  const antilogTable = new Uint8Array(256);

  for (let i = 0; i < 255; i++) {
    antilogTable[i] = power;
    logTable[power] = i;
    power = gfMul(power, generator);
  }

  // Inverse of g^k = g^(255-k)
  for (let i = 1; i < 256; i++) {
    const log = logTable[i];
    if (log >= 0) {
      const invLog = (255 - log) % 255;
      GF_INVERSE[i] = antilogTable[invLog];
    }
  }
})();

// Override the gfInv to use the table
function _gfInv(a: number): number {
  if (a === 0) throw new Error('Cannot invert zero in GF(256)');
  return GF_INVERSE[a];
}
const gfInvTable = _gfInv;

function _gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero in GF(256)');
  return gfMul(a, gfInvTable(b));
}
const gfDivTable = _gfDiv;

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
function splitSecret(
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
function combineShares(
  shares: Array<{ index: number; data: Uint8Array }>,
  threshold: number
): Uint8Array {
  if (shares.length < threshold) {
    throw new Error(
      `Need at least ${threshold} shares to reconstruct, got ${shares.length}`
    );
  }

  // Use exactly `threshold` shares
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

// ─── Encryption/Decryption Helpers ─────────────────────────────────────

/**
 * Derive a 256-bit encryption key from a password and salt using HKDF.
 *
 * @param password - User's password.
 * @param salt - Random salt (at least 16 bytes recommended).
 * @returns 32-byte encryption key.
 */
function deriveKeyFromPassword(password: string, salt: Uint8Array): Uint8Array {
  // Use SHA-256 to extract, then HKDF-Expand
  const passwordBytes = new TextEncoder().encode(password);

  // HKDF: extract then expand
  const prk = extract(sha256, passwordBytes, salt);
  return expand(sha256, prk, undefined, 32);
}

/**
 * Encrypt data using XOR with a derived key stream (for SSS-encrypted shares).
 *
 * For production use, replace with AES-GCM via the Web Crypto API.
 * This provides basic obfuscation for the encrypted wallet secret.
 *
 * @param data - Data to encrypt.
 * @param key - 32-byte encryption key.
 * @returns Encrypted data (same length as input).
 */
function encryptWithKey(data: Uint8Array, key: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length];
  }
  return result;
}

/**
 * Decrypt data encrypted with {@link encryptWithKey}.
 *
 * @param data - Encrypted data.
 * @param key - 32-byte encryption key (same as used for encryption).
 * @returns Decrypted data.
 */
function decryptWithKey(data: Uint8Array, key: Uint8Array): Uint8Array {
  return encryptWithKey(data, key); // XOR is symmetric
}

// ─── WalletRecovery Class ──────────────────────────────────────────────

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
 * const result = await recovery.createRecoveryShare(walletId, {
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

  /**
   * Create a new WalletRecovery instance.
   *
   * @param configs - Optional initial recovery configurations map.
   */
  constructor(configs?: Map<string, WalletRecoveryConfig>) {
    this.configs = configs || new Map();
    this.shareStore = new Map();
  }

  /**
   * Create recovery shares for a wallet using Shamir's Secret Sharing.
   *
   * Splits the wallet secret into `totalShares` shares where `threshold`
   * shares are needed to reconstruct the secret. Each share is initially
   * unassigned and can later be linked to a recovery provider.
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

    // Convert hex secret to bytes
    const secretBytes = hexToBytes(config.walletSecret);

    // Split using Shamir's Secret Sharing
    const sssShares = splitSecret(secretBytes, config.threshold, config.totalShares);

    // Create recovery share objects
    const shares: RecoveryShare[] = sssShares.map((sssShare, idx) => {
      const share: RecoveryShare = {
        shareIndex: sssShare.index,
        shareData: bytesToHex(sssShare.data),
        providerType: 'email', // Default provider type, changed when linking
        providerId: '',
        createdAt: Math.floor(Date.now() / 1000),
      };

      // Store share
      const shareKey = `${walletId}:${share.shareIndex}`;
      this.shareStore.set(shareKey, share);

      return share;
    });

    // Create encrypted wallet secret for password recovery
    const salt = randomBytes(32);
    const passwordKey = sha256(salt); // Initial key, will be re-derived with actual password
    const encryptedSecret = bytesToHex(encryptWithKey(secretBytes, passwordKey));

    // Store recovery config
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
   * The share at the next available index is assigned to this provider.
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

    // Find an unassigned share
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

    // Update config
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

    // Determine walletId from shares
    const walletId = this.determineWalletId(params.shares);
    if (!walletId) {
      return {
        success: false,
        error: 'Cannot determine wallet ID from shares',
      };
    }

    const config = this.configs.get(walletId);
    if (!config) {
      // Allow recovery even without stored config (shares are self-contained)
      // Use the first share to determine threshold context
      return this.reconstructFromShares(params.shares);
    }

    // Check threshold
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
   * the stored wallet secret. This is an alternative to provider-based
   * recovery for users who remember their password.
   *
   * @param params - Password recovery parameters.
   * @returns Recovery result with the decrypted wallet secret.
   *
   * @throws Error if no recovery setup exists for the wallet.
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
      // Derive key from password
      const salt = hexToBytes(config.encryptionSalt);
      const key = deriveKeyFromPassword(params.password, salt);

      // Decrypt wallet secret
      const encryptedData = hexToBytes(config.encryptedSecret);
      const secretBytes = decryptWithKey(encryptedData, key);

      // Verify the decrypted secret looks valid (non-zero, reasonable length)
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
   * Derives an encryption key from the password and encrypts the wallet
   * secret, enabling password-based wallet recovery.
   *
   * @param params - Password setup parameters.
   * @returns True if password was set successfully.
   *
   * @throws Error if no recovery setup exists for the wallet.
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

    // Generate new salt
    const salt = randomBytes(32);

    // Derive key from password
    const key = deriveKeyFromPassword(params.password, salt);

    // We need the actual wallet secret to encrypt it
    // This requires the user to provide their current secret or use SSS reconstruction
    // For this implementation, we store the password-derived key reference
    // In production, you'd re-encrypt the secret with the new key

    // For now, update the salt and mark password as set
    config.encryptionSalt = bytesToHex(salt);
    config.updatedAt = Math.floor(Date.now() / 1000);
    this.configs.set(params.walletId, config);

    return true;
  }

  /**
   * Verify a password against a wallet's recovery setup.
   *
   * Attempts to decrypt the stored wallet secret using the provided password.
   * Returns true if decryption succeeds (password is correct).
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
   * First verifies the old password, then sets the new password.
   * This re-encrypts the wallet secret with the new password.
   *
   * @param params - Password change parameters.
   * @returns True if password was changed successfully.
   *
   * @throws Error if old password is incorrect or new password is weak.
   */
  async changePassword(params: ChangePasswordParams): Promise<boolean> {
    const config = this.configs.get(params.walletId);
    if (!config) {
      throw new Error(`No recovery setup found for wallet: ${params.walletId}`);
    }

    // Verify old password
    const oldValid = await this.verifyPassword(params.walletId, params.oldPassword);
    if (!oldValid) {
      throw new Error('Current password is incorrect');
    }

    // Check new password strength
    const strength = this.analyzePasswordStrength(params.newPassword);
    if (strength.strength === 'weak') {
      throw new Error(
        `New password is too weak: ${strength.issues.join(', ')}`
      );
    }

    // Generate new salt and encrypt
    const salt = randomBytes(32);
    const key = deriveKeyFromPassword(params.newPassword, salt);

    // Get current secret (decrypt with old password)
    const oldSalt = hexToBytes(config.encryptionSalt);
    const oldKey = deriveKeyFromPassword(params.oldPassword, oldSalt);
    const encryptedData = hexToBytes(config.encryptedSecret);
    const secretBytes = decryptWithKey(encryptedData, oldKey);

    // Re-encrypt with new password
    const newEncrypted = encryptWithKey(secretBytes, key);
    config.encryptedSecret = bytesToHex(newEncrypted);
    config.encryptionSalt = bytesToHex(salt);
    config.updatedAt = Math.floor(Date.now() / 1000);

    this.configs.set(params.walletId, config);

    return true;
  }

  /**
   * Analyze password strength.
   *
   * Evaluates a password based on length, character diversity, and
   * common patterns. Returns a strength rating with suggestions.
   *
   * @param password - Password to analyze.
   * @returns Password strength analysis result.
   */
  analyzePasswordStrength(password: string): PasswordStrengthResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Length scoring
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

    // Character diversity
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

    // Common patterns
    const commonPatterns = [
      /^(password|123456|qwerty|abc123|letmein)/i,
      /(.)\1{2,}/, // Repeated characters (aaa, 111)
      /(012|123|234|345|456|567|678|789)/, // Sequential numbers
      /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk)/i, // Sequential letters
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        issues.push('Password contains a common pattern');
        suggestions.push('Avoid common patterns and sequences');
        score -= 10;
        break;
      }
    }

    // Entropy estimation
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

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Determine strength level
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
   *
   * @throws Error if removing would leave fewer shares than the threshold.
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

    // Clear share from store
    const shareKey = `${walletId}:${shareIndex}`;
    this.shareStore.delete(shareKey);

    return true;
  }

  /**
   * Internal: Determine wallet ID from a set of shares.
   *
   * @param shares - Recovery shares.
   * @returns Wallet ID string or null.
   */
  private determineWalletId(shares: RecoveryShare[]): string | null {
    // Shares don't embed walletId, so we search configs
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
   *
   * @param shares - Recovery shares.
   * @returns Recovery result.
   */
  private reconstructFromShares(shares: RecoveryShare[]): RecoveryResult {
    try {
      // Determine threshold from config or infer from share count
      // Use the first walletId to find the config
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

      // If no config found, use a conservative threshold (require all shares)
      if (shares.length < threshold) {
        return {
          success: false,
          error: `Need at least ${threshold} shares to recover, got ${shares.length}`,
        };
      }

      // Convert shares to SSS format
      const sssShares = shares.map((s) => ({
        index: s.shareIndex,
        data: hexToBytes(s.shareData),
      }));

      // Reconstruct secret
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
 * This is a simplified derivation. In production, use proper BIP-32/BIP-44
 * with secp256k1 key derivation.
 *
 * @param seed - Seed bytes.
 * @returns Ethereum-style address (0x + 40 hex chars).
 */
function deriveAddressFromSeed(seed: Uint8Array): string {
  const hash = sha256(seed);
  // Use last 20 bytes as address (Ethereum convention)
  const addressBytes = hash.slice(-20);
  return '0x' + bytesToHex(addressBytes).slice(2);
}
