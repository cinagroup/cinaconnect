// @cinacoin/passkey-auth
// WebAuthn-based passkey authentication

export { PasskeyManager } from './passkey.js';
export { WebAuthnClient, buildRegistrationOptions, buildAuthenticationOptions } from './webauthn.js';
export { generateKeypair, generateChallenge, encodeChallenge, decodeChallenge, signData, verifySignature, deriveAddress, compressPublicKey } from './crypto.js';
export { MemoryStorage, BrowserStorage, defaultStorage } from './storage.js';

// Password management
export {
  setPassword,
  verifyPassword,
  changePassword,
  calculatePasswordStrength,
  hashPassword,
  generateSalt,
  getPasswordEntry,
  removePassword,
  clearAllPasswords,
} from './password.js';
export type { StoredPassword, PasswordStrength } from './password.js';

export type {
  PasskeyConfig,
  PasskeyStorage,
  StoredPasskey,
  RegistrationResult,
  AuthenticationResult,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  CryptoKeypair,
} from './types.js';
