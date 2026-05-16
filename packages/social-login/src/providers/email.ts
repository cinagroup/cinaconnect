/**
 * Email-based authentication provider for social login.
 *
 * Implements magic link and OTP-based authentication that
 * creates a wallet bound to the user's email identity.
 *
 * Flow:
 * 1. User enters email
 * 2. System sends magic link or OTP
 * 3. User clicks link or enters OTP
 * 4. System verifies and issues JWT + wallet address
 */

import type { EmailLoginParams, SocialLoginResult, MagicLinkParams } from '../types';
import { randomBytes } from 'crypto';

/**
 * Generate a one-time password (OTP) for email verification.
 *
 * @param length - OTP length (default: 6).
 * @returns Numeric OTP string.
 */
export function generateOTP(length: number = 6): string {
  const bytes = randomBytes(4);
  const num = bytes.readUInt32BE(0);
  // Generate a number with exactly `length` digits
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(min + (num % (max - min + 1)));
}

/**
 * Generate a magic link token.
 *
 * @returns Cryptographically secure random token (hex, 32 bytes).
 */
export function generateMagicLinkToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Build a magic link URL.
 *
 * @param params - Magic link parameters.
 * @param token - Pre-generated or newly generated token.
 * @returns Full magic link URL.
 */
export function buildMagicLink(params: MagicLinkParams, token?: string): string {
  const linkToken = token || generateMagicLinkToken();
  const expiresInSeconds = params.expiresInSeconds || 3600;
  const expiry = Math.floor(Date.now() / 1000) + expiresInSeconds;

  const url = new URL(params.redirectUrl);
  url.searchParams.set('token', linkToken);
  url.searchParams.set('email', params.email);
  url.searchParams.set('exp', String(expiry));

  return url.toString();
}

/**
 * Validate a magic link token.
 *
 * @param token - The token from the magic link.
 * @param email - The email address to verify against.
 * @param storedToken - The server-stored token for comparison.
 * @param expiry - Token expiration timestamp (Unix seconds).
 * @returns True if the token is valid.
 */
export function validateMagicLinkToken(
  token: string,
  email: string,
  storedToken: string,
  expiry: number
): boolean {
  // Check expiration
  if (Date.now() / 1000 >= expiry) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (token.length !== storedToken.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Validate an OTP code.
 *
 * @param provided - The OTP entered by the user.
 * @param stored - The server-stored OTP.
 * @param expiry - OTP expiration timestamp (Unix seconds).
 * @returns True if the OTP is valid.
 */
export function validateOTP(
  provided: string,
  stored: string,
  expiry: number
): boolean {
  // Check expiration
  if (Date.now() / 1000 >= expiry) {
    return false;
  }

  return provided === stored;
}

/**
 * Handle the full email login flow.
 *
 * @param email - User's email address.
 * @param sendEmail - Function to send the email (magic link or OTP).
 * @param deriveWallet - Function to derive a wallet from the email identity.
 * @param generateJWT - Function to generate a JWT token for the authenticated user.
 * @param loginMethod - 'magiclink' or 'otp'.
 * @param verifyData - Token/OTP data for verification step.
 * @returns Social login result.
 */
export async function loginWithEmail(
  email: string,
  sendEmail: (to: string, subject: string, body: string) => Promise<void>,
  deriveWallet: (email: string) => Promise<{ address: string; publicKey?: string }>,
  generateJWT: (userId: string, email: string) => Promise<{ token: string; expiresAt: number }>,
  loginMethod: 'magiclink' | 'otp' = 'magiclink',
  verifyData?: { token?: string; otp?: string; storedToken?: string; storedOTP?: string; expiry?: number }
): Promise<SocialLoginResult> {
  // Send step
  if (!verifyData) {
    if (loginMethod === 'magiclink') {
      const token = generateMagicLinkToken();
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      const link = buildMagicLink({
        email,
        redirectUrl: window?.location?.origin || 'https://example.com',
      }, token);

      await sendEmail(
        email,
        'Sign in to your account',
        `Click this link to sign in: ${link}\n\nThis link expires in 1 hour.`
      );

      throw new Error('AUTH_PENDING'); // Signal that auth is pending
    } else {
      const otp = generateOTP();
      const expiry = Math.floor(Date.now() / 1000) + 300;

      await sendEmail(
        email,
        'Your verification code',
        `Your code is: ${otp}\n\nThis code expires in 5 minutes.`
      );

      throw new Error('AUTH_PENDING'); // Signal that auth is pending
    }
  }

  // Verification step
  let isValid: boolean;

  if (loginMethod === 'magiclink') {
    if (!verifyData.token || !verifyData.storedToken || !verifyData.expiry) {
      throw new Error('Invalid verification data for magic link');
    }
    isValid = validateMagicLinkToken(
      verifyData.token,
      email,
      verifyData.storedToken,
      verifyData.expiry
    );
  } else {
    if (!verifyData.otp || !verifyData.storedOTP || !verifyData.expiry) {
      throw new Error('Invalid verification data for OTP');
    }
    isValid = validateOTP(verifyData.otp, verifyData.storedOTP, verifyData.expiry);
  }

  if (!isValid) {
    throw new Error('Invalid or expired verification code');
  }

  // Generate wallet and JWT
  const wallet = await deriveWallet(email);
  const jwt = await generateJWT(email, email);

  return {
    provider: 'email',
    providerUserId: email,
    email,
    jwtToken: jwt.token,
    walletAddress: wallet.address,
    publicKey: wallet.publicKey,
    isNewUser: false,
    expiresAt: jwt.expiresAt,
  };
}
