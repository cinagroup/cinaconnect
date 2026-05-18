/**
 * @cinaconnect/social-login — Social Login for Web3
 *
 * OAuth2 and email/phone-based authentication with deterministic
 * HD wallet derivation for Google, Apple, X, GitHub, Discord,
 * Facebook, email, and Phone OTP.
 *
 * @packageDocumentation
 */

// Social login core
export { loginWithEmail, generateOTP, generateMagicLinkToken, buildMagicLink, validateMagicLinkToken, validateOTP } from './providers/email.js';
export { buildGoogleAuthUrl, exchangeCodeForTokens, fetchGoogleUserProfile, loginWithGoogle } from './providers/google.js';
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

// Wallet derivation
export {
  deriveSeedFromIdentity,
  deriveAddressFromSeed,
  deriveAddressFromEmail,
  deriveAddressFromProvider,
  generateRandomMnemonic,
} from './wallet-derivation.js';

// Types
export type {
  SocialProvider,
  SocialLoginParams,
  GoogleLoginParams,
  AppleLoginParams,
  TwitterLoginParams,
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
