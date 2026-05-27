/**
 * @cinacoin/session-keys
 *
 * Cinacoin Session Keys — temporary signing keys with policies
 * and social recovery for ERC-4337 smart accounts.
 *
 * @example
 * ```ts
 * import {
 *   SessionKeyManager,
 *   SessionKeyPolicyManager,
 *   SocialRecoveryManager,
 * } from '@cinacoin/session-keys';
 *
 * // Create a session key with a DEX policy
 * const policyManager = new SessionKeyPolicyManager();
 * const dexPolicy = policyManager.createPolicy(
 *   SessionKeyPolicyManager.createDexPolicy(
 *     '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3 Router
 *     1n * 10n ** 18n,   // max 1 ETH per tx
 *     5n * 10n ** 18n,   // max 5 ETH per day
 *     Math.floor(Date.now() / 1000) + 86400,  // expires in 24h
 *     1,                  // Ethereum mainnet
 *   )
 * );
 *
 * const keyManager = new SessionKeyManager();
 * const sessionKey = keyManager.generateKey(dexPolicy, 'dapp-session');
 *
 * console.log(`Session key: ${sessionKey.publicKey}`);
 * console.log(`Expires: ${new Date(sessionKey.expiresAt * 1000).toISOString()}`);
 * ```
 */

// Types
export type {
  SessionKey,
  SessionKeyPolicy,
  DailySpend,
  Guardian,
  RecoveryConfig,
  RecoveryRequest,
  RecoveryResult,
} from "./types.js";

// Session Key Management
export { SessionKeyManager, encodeEnableSessionKey, encodeDisableSessionKey, isKeyValidForOperation } from "./session-key.js";

// Policy Management
export { SessionKeyPolicyManager } from "./policy.js";
export type { PolicyParams } from "./policy.js";

// Social Recovery
export { SocialRecoveryManager } from "./social-recovery.js";
