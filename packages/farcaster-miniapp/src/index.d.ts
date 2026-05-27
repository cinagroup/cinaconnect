/**
 * Cinacoin Farcaster Mini App SDK.
 *
 * Wallet connectivity and identity for Farcaster Mini Apps,
 * including Sign-In with Farcaster (SIWF).
 *
 * @packageDocumentation
 */
export { FarcasterProvider } from './FarcasterProvider.js';
export type { FarcasterProviderConfig, FarcasterWalletState } from './types.js';
export { generateSignInMessage, parseSignInMessage, buildSignInResult, createSessionPayload, validateSignature, generateNonce, } from './FarcasterAuth.js';
export type { FarcasterUser, FarcasterContext, SignInWithFarcasterResult, FarcasterFrameAction, FarcasterFrameResponse, FarcasterMiniAppEvent, } from './types.js';
//# sourceMappingURL=index.d.ts.map