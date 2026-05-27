// @cinacoin/passkey-auth
// WebAuthn-based passkey authentication
export { PasskeyManager } from './passkey.js';
export { WebAuthnClient, buildRegistrationOptions, buildAuthenticationOptions } from './webauthn.js';
export { generateKeypair, generateChallenge, encodeChallenge, decodeChallenge, signData, verifySignature, deriveAddress, compressPublicKey } from './crypto.js';
export { MemoryStorage, BrowserStorage, defaultStorage } from './storage.js';
//# sourceMappingURL=index.js.map