/**
 * @cinacoin/embedded-wallet
 *
 * Embedded wallet system with deterministic key derivation, social auth,
 * encrypted backup, and React integration.
 */

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  AuthMethod,
  EmbeddedWalletConfig,
  LinkedProvider,
  WalletBackup,
  WalletSession,
  UnsignedTransaction,
  SignedTransaction,
} from './types';

// ─── Core wallet ─────────────────────────────────────────────────────────────
export { EmbeddedWallet } from './EmbeddedWallet';

// ─── Lifecycle manager ───────────────────────────────────────────────────────
export { WalletManager } from './WalletManager';

// ─── Backup / recovery ───────────────────────────────────────────────────────
export { backupWallet, recoverWallet } from './backup';

// ─── React integration (optional peer dep) ───────────────────────────────────
export {
  EmbeddedWalletProvider,
  useEmbeddedWallet,
  type EmbeddedWalletProviderProps,
} from './hooks/useEmbeddedWallet';
