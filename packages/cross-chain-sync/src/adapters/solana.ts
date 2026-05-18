/**
 * Solana State Sync Adapter
 *
 * Syncs state for Solana accounts.
 */

import type { ChainAccount, SessionState, StateStorage } from "./types.js";

/** Solana-specific account info */
export interface SolanaAccount extends ChainAccount {
  chain: "solana";
  /** Associated token accounts */
  tokenAccounts?: string[];
}

/**
 * Sync Solana chain state.
 */
export async function syncSolanaState(
  account: SolanaAccount,
  storage: StateStorage
): Promise<boolean> {
  const session: SessionState = {
    chain: "solana",
    address: account.address,
    expiresAt: Date.now() + 3600_000,
    data: {
      tokenAccounts: account.tokenAccounts?.join(",") ?? "",
    },
  };

  const key = `solana-session:${account.address}`;
  await storage.set(key, session);

  account.lastSyncedAt = Date.now();
  await storage.set(`solana-account:${account.address}`, account);

  return true;
}

/**
 * Fetch Solana session from storage.
 */
export async function getSolanaSession(
  address: string,
  storage: StateStorage
): Promise<SessionState | null> {
  const key = `solana-session:${address}`;
  return storage.get<SessionState>(key);
}
