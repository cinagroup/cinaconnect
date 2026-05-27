/**
 * Phone OTP authentication for social login.
 *
 * Implements SMS-based one-time password authentication with
 * deterministic wallet derivation bound to the user's phone number.
 *
 * Flow:
 * 1. User enters phone number (E.164 format)
 * 2. System generates and sends OTP via SMS
 * 3. User enters the OTP code
 * 4. System verifies OTP and returns JWT + wallet address
 *
 * @packageDocumentation
 */

import { randomBytes, createHash } from 'crypto';
import type { SocialLoginResult } from '../types.js';

// ─── Types ──────────────────────────────────────────────────────────────

/**
 * Parameters for sending a Phone OTP.
 */
export interface PhoneOTPParams {
  /** Phone number in E.164 format (e.g., "+1234567890"). */
  phone: string;
  /** Optional custom OTP length (default: 6). */
  otpLength?: number;
  /** Optional custom OTP TTL in seconds (default: 300). */
  otpTtlSeconds?: number;
}

/**
 * Result of sending a Phone OTP.
 */
export interface PhoneOTPSendResult {
  /** Whether the OTP was sent successfully. */
  success: boolean;
  /** Opaque session ID for the verification step. */
  sessionId: string;
  /** OTP expiry timestamp (Unix seconds). */
  expiresAt: number;
  /** Error message if sending failed. */
  error?: string;
}

/**
 * Parameters for verifying a Phone OTP.
 */
export interface PhoneOTPVerifyParams {
  /** The phone number that received the OTP. */
  phone: string;
  /** The OTP code entered by the user. */
  code: string;
  /** Session ID returned from sendPhoneOTP. */
  sessionId: string;
}

/**
 * Result of verifying a Phone OTP.
 */
export interface PhoneOTPVerifyResult {
  /** Whether the verification was successful. */
  success: boolean;
  /** JWT authentication token (on success). */
  jwtToken?: string;
  /** Derived wallet address (on success). */
  walletAddress?: string;
  /** Public key for the derived wallet. */
  publicKey?: string;
  /** Whether this is a first-time login (new account). */
  isNewUser: boolean;
  /** Token expiration timestamp (Unix seconds). */
  expiresAt: number;
  /** Error message if verification failed. */
  error?: string;
}

/**
 * Parameters for creating a wallet from a phone number.
 */
export interface PhoneWalletCreationParams {
  /** Phone number in E.164 format. */
  phone: string;
  /** Optional derivation key for wallet derivation. */
  derivationKey?: string;
}

/**
 * Result of creating a wallet from a phone number.
 */
export interface PhoneWalletCreationResult {
  /** The derived wallet address. */
  walletAddress: string;
  /** The wallet's public key. */
  publicKey: string;
  /** Whether this wallet was just created. */
  isNew: boolean;
  /** The derivation path used. */
  derivationPath: string;
}

/**
 * SMS provider interface for sending OTP codes.
 * Implement this to integrate Twilio, Vonage, SNS, etc.
 */
export interface SMSProvider {
  /**
   * Send an SMS message.
   *
   * @param to - Destination phone number (E.164).
   * @param message - SMS body content.
   * @returns Promise resolving when SMS is sent.
   */
  send(to: string, message: string): Promise<void>;
}

/**
 * Phone OTP session state (server-side).
 */
export interface PhoneOTPSession {
  /** Unique session identifier. */
  sessionId: string;
  /** Phone number for this session. */
  phone: string;
  /** The OTP code (stored for verification). */
  otp: string;
  /** Session creation timestamp (Unix seconds). */
  createdAt: number;
  /** OTP expiry timestamp (Unix seconds). */
  expiresAt: number;
  /** Number of verification attempts. */
  attempts: number;
  /** Maximum allowed attempts. */
  maxAttempts: number;
  /** Whether this session has been verified. */
  verified: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────

/** In-memory OTP session store. In production, replace with Redis or a database. */
const OTP_SESSIONS = new Map<string, PhoneOTPSession>();

/** Default OTP length. */
const DEFAULT_OTP_LENGTH = 6;

/** Default OTP TTL in seconds (5 minutes). */
const DEFAULT_OTP_TTL = 300;

/** Maximum verification attempts per session. */
const MAX_ATTEMPTS = 5;

// ─── Core Functions ─────────────────────────────────────────────────────

/**
 * Generate a one-time password (OTP) for phone verification.
 *
 * Produces a cryptographically random numeric code of the specified length.
 *
 * @param length - OTP length (default: 6).
 * @returns Numeric OTP string.
 *
 * @example
 * ```ts
 * const otp = generatePhoneOTP();       // "847293"
 * const otp4 = generatePhoneOTP(4);     // "4721"
 * ```
 */
export function generatePhoneOTP(length: number = DEFAULT_OTP_LENGTH): string {
  if (length < 4 || length > 10) {
    throw new Error('OTP length must be between 4 and 10');
  }
  const bytes = randomBytes(4);
  const num = bytes.readUInt32BE(0);
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(min + (num % (max - min + 1)));
}

/**
 * Generate a unique session ID for an OTP flow.
 *
 * @returns Hex-encoded random session identifier (32 bytes).
 */
export function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validate a phone number string against E.164 format.
 *
 * E.164 format: +[country code][subscriber number], max 15 digits.
 *
 * @param phone - Phone number string to validate.
 * @returns True if the phone number is valid E.164 format.
 *
 * @example
 * ```ts
 * isValidPhoneNumber('+1234567890'); // true
 * isValidPhoneNumber('1234567890');  // false (missing +)
 * isValidPhoneNumber('+0123456');    // false (country code can't start with 0)
 * ```
 */
export function isValidPhoneNumber(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Send a Phone OTP to the user's phone number via SMS.
 *
 * Generates a random OTP, creates a session, and sends the code
 * via the configured SMS provider.
 *
 * @param params - Phone OTP parameters.
 * @param smsProvider - SMS provider implementation for sending the OTP.
 * @returns Send result with session ID and expiry.
 *
 * @example
 * ```ts
 * const result = await sendPhoneOTP(
 *   { phone: '+1234567890' },
 *   twilioSmsProvider
 * );
 * console.log(result.sessionId);  // use for verification step
 * console.log(result.expiresAt);  // OTP expiry timestamp
 * ```
 */
export async function sendPhoneOTP(
  params: PhoneOTPParams,
  smsProvider: SMSProvider
): Promise<PhoneOTPSendResult> {
  if (!isValidPhoneNumber(params.phone)) {
    return {
      success: false,
      sessionId: '',
      expiresAt: 0,
      error: `Invalid phone number format: "${params.phone}". Use E.164 format (e.g., +1234567890)`,
    };
  }

  const otpLength = params.otpLength ?? DEFAULT_OTP_LENGTH;
  const ttlSeconds = params.otpTtlSeconds ?? DEFAULT_OTP_TTL;

  // Generate OTP and session
  const otp = generatePhoneOTP(otpLength);
  const sessionId = generateSessionId();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + ttlSeconds;

  // Store session
  OTP_SESSIONS.set(sessionId, {
    sessionId,
    phone: params.phone,
    otp,
    createdAt: now,
    expiresAt,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    verified: false,
  });

  // Build and send SMS
  const message = `Your Cinacoin verification code is: ${otp}\n\nThis code expires in ${Math.floor(ttlSeconds / 60)} minutes. Do not share this code with anyone.`;

  try {
    await smsProvider.send(params.phone, message);
    return { success: true, sessionId, expiresAt };
  } catch (error) {
    // Clean up the session on send failure
    OTP_SESSIONS.delete(sessionId);
    return {
      success: false,
      sessionId: '',
      expiresAt: 0,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
    };
  }
}

/**
 * Verify a Phone OTP code submitted by the user.
 *
 * Checks the OTP against the stored session, validates expiration
 * and attempt limits, and returns a verification result.
 *
 * After successful verification, the caller should generate a JWT
 * and derive the wallet address.
 *
 * @param params - Verification parameters.
 * @returns Verification result indicating success or failure.
 *
 * @example
 * ```ts
 * const result = await verifyPhoneOTP({
 *   phone: '+1234567890',
 *   code: '123456',
 *   sessionId: 'abc123...',
 * });
 *
 * if (result.success) {
 *   // Generate JWT, derive wallet, etc.
 * }
 * ```
 */
export async function verifyPhoneOTP(
  params: PhoneOTPVerifyParams
): Promise<PhoneOTPVerifyResult> {
  const session = OTP_SESSIONS.get(params.sessionId);

  if (!session) {
    return { success: false, isNewUser: false, expiresAt: 0, error: 'Invalid or expired session' };
  }

  // Check if already verified
  if (session.verified) {
    return { success: false, isNewUser: false, expiresAt: 0, error: 'OTP has already been used' };
  }

  // Check expiration
  if (Date.now() / 1000 >= session.expiresAt) {
    OTP_SESSIONS.delete(params.sessionId);
    return { success: false, isNewUser: false, expiresAt: 0, error: 'OTP has expired' };
  }

  // Check attempt limit
  session.attempts += 1;
  if (session.attempts > session.maxAttempts) {
    OTP_SESSIONS.delete(params.sessionId);
    return {
      success: false,
      isNewUser: false,
      expiresAt: 0,
      error: 'Maximum verification attempts exceeded',
    };
  }

  // Verify OTP
  if (params.code !== session.otp) {
    OTP_SESSIONS.set(params.sessionId, session);
    return {
      success: false,
      isNewUser: false,
      expiresAt: 0,
      error: `Invalid OTP code (${session.maxAttempts - session.attempts} attempts remaining)`,
    };
  }

  // Success — mark verified and clean up
  session.verified = true;

  // Derive wallet from phone number
  const wallet = deriveAddressFromPhone(params.phone);

  return {
    success: true,
    jwtToken: '', // Caller should generate JWT
    walletAddress: wallet.address,
    publicKey: wallet.publicKey,
    isNewUser: true, // Caller should check against their DB
    expiresAt: session.expiresAt,
  };
}

/**
 * Complete Phone OTP login flow: send OTP, verify, and return full result.
 *
 * This is a convenience function that combines send and verify steps.
 * In production, these are typically separated (send on one page,
 * verify on another).
 *
 * **Usage pattern:**
 * 1. Call with empty `sessionId` → sends OTP, throws `AUTH_PENDING`
 * 2. Call again with the `sessionId` and user's `code` → returns full login result
 *
 * @param phone - User's phone number (E.164 format).
 * @param code - The OTP code the user entered (empty for send step).
 * @param sessionId - Session ID from sendPhoneOTP (empty for send step).
 * @param smsProvider - SMS provider for sending the OTP.
 * @param generateJWT - Function to generate a JWT for the authenticated user.
 * @param otpParams - Optional OTP configuration (length, TTL).
 * @returns Full social login result with JWT and wallet.
 *
 * @example
 * ```ts
 * // Step 1: Send OTP
 * try {
 *   await loginWithPhoneOTP('+1234567890', '', '', smsProvider, generateJWT);
 * } catch (e) {
 *   if (e.message === 'AUTH_PENDING') {
 *     // OTP sent, wait for user input
 *   }
 * }
 *
 * // Step 2: Verify (user enters code "847293")
 * const result = await loginWithPhoneOTP(
 *   '+1234567890', '847293', sessionId, smsProvider, generateJWT
 * );
 * ```
 */
export async function loginWithPhoneOTP(
  phone: string,
  code: string,
  sessionId: string,
  smsProvider: SMSProvider,
  generateJWT: (userId: string, phone: string) => Promise<{ token: string; expiresAt: number }>,
  otpParams?: { otpLength?: number; otpTtlSeconds?: number }
): Promise<SocialLoginResult> {
  // Send step
  if (!sessionId) {
    const sendResult = await sendPhoneOTP(
      { phone, ...otpParams },
      smsProvider
    );

    if (!sendResult.success) {
      throw new Error(sendResult.error || 'Failed to send OTP');
    }

    throw new Error('AUTH_PENDING');
  }

  // Verify step
  const verifyResult = await verifyPhoneOTP({ phone, code, sessionId });

  if (!verifyResult.success) {
    throw new Error(verifyResult.error || 'OTP verification failed');
  }

  // Generate JWT
  const jwt = await generateJWT(phone, phone);

  return {
    provider: 'phone',
    providerUserId: phone,
    jwtToken: jwt.token,
    walletAddress: verifyResult.walletAddress!,
    publicKey: verifyResult.publicKey,
    isNewUser: verifyResult.isNewUser,
    expiresAt: jwt.expiresAt,
  };
}

/**
 * Create a wallet deterministically from a phone number.
 *
 * Uses SHA-256 hashing of the normalized phone number to derive
 * a consistent seed, which is then used to generate the wallet address.
 *
 * The same phone number will always produce the same wallet address.
 *
 * @param params - Wallet creation parameters.
 * @returns Wallet creation result with address and public key.
 *
 * @example
 * ```ts
 * const wallet = await createWalletFromPhone({
 *   phone: '+1234567890',
 *   derivationKey: 'my-app-secret' // optional
 * });
 * console.log(wallet.address); // "0x..."
 * ```
 */
export async function createWalletFromPhone(
  params: PhoneWalletCreationParams
): Promise<PhoneWalletCreationResult> {
  if (!isValidPhoneNumber(params.phone)) {
    throw new Error(`Invalid phone number: ${params.phone}`);
  }

  const wallet = deriveAddressFromPhone(params.phone, params.derivationKey);

  return {
    walletAddress: wallet.address,
    publicKey: wallet.publicKey,
    isNew: false, // Caller should check their DB
    derivationPath: "m/44'/60'/0'/0/phone",
  };
}

/**
 * Resend OTP to the same phone number.
 *
 * Invalidates the previous OTP and generates a new one with a fresh session.
 * Useful when the user requests a new code or the previous one expired.
 *
 * @param sessionId - The current (expired or unused) session ID.
 * @param smsProvider - SMS provider for sending the new OTP.
 * @param params - Optional parameters for the new OTP.
 * @returns New send result with a fresh session ID.
 */
export async function resendPhoneOTP(
  sessionId: string,
  smsProvider: SMSProvider,
  params?: Pick<PhoneOTPParams, 'otpLength' | 'otpTtlSeconds'>
): Promise<PhoneOTPSendResult> {
  const existingSession = OTP_SESSIONS.get(sessionId);

  if (!existingSession) {
    return {
      success: false,
      sessionId: '',
      expiresAt: 0,
      error: 'Session not found',
    };
  }

  // Remove old session
  OTP_SESSIONS.delete(sessionId);

  // Send new OTP
  return sendPhoneOTP({ phone: existingSession.phone, ...params }, smsProvider);
}

// ─── Internal Helpers ───────────────────────────────────────────────────

/**
 * Internal: Derive an Ethereum-style wallet address from a phone number.
 *
 * Uses the phone number (normalized) + optional derivation key
 * as input to SHA-256, producing a deterministic 32-byte seed.
 *
 * The seed is then used as a private key to derive the address.
 *
 * @param phone - Phone number in E.164 format.
 * @param derivationKey - Optional additional salt/key for derivation.
 * @returns Object with address and public key.
 */
function deriveAddressFromPhone(
  phone: string,
  derivationKey?: string
): { address: string; publicKey: string } {
  const normalizedPhone = phone.trim().replace(/[\s\-()]/g, '');
  const salt = derivationKey || 'cinacoin-phone-v1';

  const seed = createHash('sha256')
    .update(`${salt}:${normalizedPhone}`)
    .digest();

  // Derive address from seed (simplified — use secp256k1 in production)
  const hash = createHash('sha256').update(seed).digest();
  const addressBytes = hash.slice(-20);

  return {
    address: `0x${addressBytes.toString('hex')}`,
    publicKey: `0x${hash.toString('hex')}`,
  };
}
