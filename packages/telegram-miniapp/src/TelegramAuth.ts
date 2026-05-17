/**
 * Telegram login integration.
 *
 * Validates Telegram init data on the server side and maps
 * Telegram users to wallet accounts.
 */

import type { TelegramUser, TelegramLoginResult } from './types.js';
import type { TelegramProvider } from './TelegramProvider.js';
import { createHash, createHmac } from 'node:crypto';

/**
 * Validate Telegram init data hash server-side.
 *
 * Implements the Telegram WebApp data validation algorithm:
 * 1. Sort the data-check-string parameters alphabetically
 * 2. Concatenate with \n
 * 3. HMAC-SHA256 with SHA256(botToken) as key
 * 4. Compare with the hash field
 *
 * @param initData - Raw init data string from Telegram.
 * @param botToken - Telegram Bot API token (server-side only).
 * @returns True if the data is valid.
 */
export function validateInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return false;

  // Remove hash from params for validation
  params.delete('hash');

  // Sort keys alphabetically and build data check string
  const sortedKeys = Array.from(params.keys()).sort();
  const dataCheckString = sortedKeys
    .map((key) => `${key}=${params.get(key)}`)
    .join('\n');

  // Compute HMAC
  const secretKey = createHash('sha256')
    .update(botToken)
    .digest();

  const hmac = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return hmac === hash;
}

/**
 * Parse init data string into a structured object.
 *
 * @param initData - Raw init data string.
 * @returns Parsed parameters as Record<string, string>.
 */
export function parseInitData(initData: string): Record<string, string> {
  const params = new URLSearchParams(initData);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * Build a login result from provider data.
 *
 * @param provider - TelegramProvider instance.
 * @returns TelegramLoginResult or null if not available.
 */
export function buildLoginResult(provider: TelegramProvider): TelegramLoginResult | null {
  const user = provider.getUser();
  if (!user) return null;

  const displayName = provider.getDisplayName();
  if (!displayName) return null;

  return {
    telegramId: user.id,
    username: user.username,
    displayName,
    isPremium: user.is_premium === true,
    initData: provider.getInitData(),
  };
}

/**
 * Create a wallet-compatible identifier from Telegram user ID.
 *
 * This generates a deterministic string that can be used as a
 * key to map Telegram users to wallet accounts.
 *
 * @param telegramId - Telegram user ID.
 * @returns Deterministic identifier string.
 * @deprecated Prefer server-side account mapping.
 */
export function telegramIdToAddress(telegramId: number): string {
  // Pad the ID and create a pseudo-address format
  const hex = telegramId.toString(16).padStart(40, '0');
  return `0x${hex}`;
}

/**
 * Generate a Sign-In message for Telegram users.
 *
 * Creates a message that can be used with SIWE (Sign-In With Ethereum)
 * to link a wallet to a Telegram account.
 *
 * @param user - Telegram user data.
 * @param domain - The domain requesting the sign-in.
 * @param nonce - Random nonce for replay protection.
 * @returns Sign-in message string.
 */
export function generateSignInMessage(
  user: TelegramUser,
  domain: string,
  nonce: string,
): string {
  const displayName = user.last_name
    ? `${user.first_name} ${user.last_name}`
    : user.first_name;

  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    `Telegram User ID: ${user.id}`,
    ``,
    `Display Name: ${displayName}`,
    `Premium: ${user.is_premium ? 'Yes' : 'No'}`,
    ``,
    `URI: ${domain}`,
    `Version: 1`,
    `Chain ID: 1`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join('\n');
}

/**
 * Check if init data is expired.
 *
 * @param initData - Raw init data string.
 * @param maxAgeMs - Maximum age in milliseconds (default: 24 hours).
 * @returns True if the data is expired.
 */
export function isInitDataExpired(
  initData: string,
  maxAgeMs: number = 24 * 60 * 60 * 1000,
): boolean {
  const params = new URLSearchParams(initData);
  const authDate = parseInt(params.get('auth_date') ?? '0', 10);
  if (authDate === 0) return true;

  const authTimeMs = authDate * 1000;
  return Date.now() - authTimeMs > maxAgeMs;
}
