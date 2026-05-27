/**
 * @cinacoin/social-login — Social Login for Web3
 *
 * OAuth2 and email/phone-based authentication with deterministic
 * HD wallet derivation for Google, Apple, X, GitHub, Discord,
 * Facebook, email, and Phone OTP.
 *
 * @packageDocumentation
 */

// Social login core
export { loginWithEmail, generateOTP, generateMagicLinkToken, buildMagicLink, validateMagicLinkToken, validateOTP } from './providers/email.js';

// Email OTP (JWT magic links)
export {
  MagicLinkManager,
  type MagicLinkSendParams,
  type MagicLinkSendResult,
  type MagicLinkVerifyParams,
  type MagicLinkVerifyResult,
  type MagicLinkConfig,
} from './email-otp.js';
export { buildGoogleAuthUrl, exchangeCodeForTokens, fetchGoogleUserProfile, loginWithGoogle } from './providers/google.js';
export { buildGitHubAuthUrl, exchangeCodeForTokens as exchangeGitHubCode, fetchGitHubUserProfile, fetchGitHubUserEmails, loginWithGitHub } from './providers/github.js';
export { buildAppleAuthUrl, exchangeAppleCode, decodeAppleIdToken, loginWithApple, verifyAppleToken, generateAppleClientSecret } from './providers/apple.js';
export { buildTwitterAuthUrl, exchangeTwitterCode, fetchTwitterUserProfile, loginWithTwitter, generatePKCE } from './providers/twitter.js';

// Phone OTP authentication
export {
  sendPhoneOTP,
  verifyPhoneOTP,
  loginWithPhoneOTP,
  createWalletFromPhone,
  resendPhoneOTP,
  generatePhoneOTP,
  generateSessionId,
  isValidPhoneNumber,
} from './auth/phone-otp.js';

// SMS providers
export {
  TwilioProvider,
  VonageProvider,
  AwsSnsProvider,
  MockSMSProvider,
  type TwilioConfig,
  type VonageConfig,
  type AwsSnsConfig,
  type OnMessageCaptured,
} from './sms-providers.js';

// Wallet derivation
export {
  deriveSeedFromIdentity,
  deriveAddressFromSeed,
  deriveAddressFromEmail,
  deriveAddressFromProvider,
  generateRandomMnemonic,
} from './wallet-derivation.js';

// Token verification
export {
  TokenVerifier,
  type TokenProvider,
  type TokenVerifyResult,
  type TokenVerifierConfig,
} from './token-verifier.js';

// Session management
export {
  SessionManager,
  type SessionPayload,
  type SessionCreateResult,
  type SessionValidateResult,
  type SessionManagerConfig,
} from './session-manager.js';

// Social wallet integration
export {
  SocialWalletManager,
  type SocialProviderIdentity,
  type LinkProviderResult,
  type SocialWalletResult,
  type SocialWalletManagerConfig,
} from './social-wallet.js';

// Types
export type {
  SocialProvider,
  SocialLoginParams,
  GoogleLoginParams,
  AppleLoginParams,
  TwitterLoginParams,
  GitHubLoginParams,
  EmailLoginParams,
  SocialLoginResult,
  OAuth2TokenResponse,
  OAuth2UserProfile,
  MagicLinkParams,
} from './types.js';

// Phone OTP types
export type {
  PhoneOTPParams,
  PhoneOTPSendResult,
  PhoneOTPVerifyParams,
  PhoneOTPVerifyResult,
  PhoneWalletCreationParams,
  PhoneWalletCreationResult,
  SMSProvider,
  PhoneOTPSession,
} from './auth/phone-otp.js';

// Email OTP types (already exported above in the email-otp export block)
// Re-export for type-only convenience
export type {
  MagicLinkSendParams as EmailMagicLinkSendParams,
  MagicLinkSendResult as EmailMagicLinkSendResult,
  MagicLinkVerifyParams as EmailMagicLinkVerifyParams,
  MagicLinkVerifyResult as EmailMagicLinkVerifyResult,
  MagicLinkConfig as EmailMagicLinkConfig,
} from './email-otp.js';
