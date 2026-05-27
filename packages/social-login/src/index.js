/**
 * @cinacoin/social-login — Social Login for Web3
 *
 * OAuth2 and email-based authentication with deterministic
 * HD wallet derivation for Google, Apple, Twitter/X, and email.
 *
 * @packageDocumentation
 */
// Social login core
export { loginWithEmail, generateOTP, generateMagicLinkToken, buildMagicLink, validateMagicLinkToken, validateOTP } from './providers/email.js';
export { buildGoogleAuthUrl, exchangeCodeForTokens, fetchGoogleUserProfile, loginWithGoogle } from './providers/google.js';
export { buildAppleAuthUrl, exchangeAppleCode, decodeAppleIdToken, loginWithApple, verifyAppleToken, generateAppleClientSecret } from './providers/apple.js';
export { buildTwitterAuthUrl, exchangeTwitterCode, fetchTwitterUserProfile, loginWithTwitter, generatePKCE } from './providers/twitter.js';
// Wallet derivation
export { deriveSeedFromIdentity, deriveAddressFromSeed, deriveAddressFromEmail, deriveAddressFromProvider, generateRandomMnemonic, } from './wallet-derivation.js';
//# sourceMappingURL=index.js.map