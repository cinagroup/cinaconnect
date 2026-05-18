/**
 * Bitcoin State Sync Adapter
 *
 * Syncs state for Bitcoin accounts (including Taproot and legacy).
 */

import type { ChainAccount, SessionState, StateStorage } from "./types.js";

/** Bitcoin-specific account info */
export interface BitcoinAccount extends ChainAccount {
  chain: "bitcoin";
  /** Address type (legacy, segwit, taproot) */
  addressType: "legacy" | "segwit" | "taproot";
  /** UTXO count */
  utxoCount?: number;
}

/**
 * Sync Bitcoin chain state.
 */
export async function syncBitcoinState(
  account: BitcoinAccount,
  storage: StateStorage
): Promise<boolean> {
  const session: SessionState = {
    chain: "bitcoin",
    address: account.address,
    expiresAt: Date.now() + 3600_000,
    data: {
      addressType: account.addressType,
      utxoCount: String(account.utxoCount ?? 0),
    },
  };

  const key = `btc-session:${account.address}`;
  await storage.set(key, session);

  account.lastSyncedAt = Date.now();
  await storage.set(`btc-account:${account.address}`, account);

  return true;
}

/**
 * Fetch Bitcoin session from storage.
 */
export async function getBitcoinSession(
  address: string,
  storage: StateStorage
): Promise<SessionState | null> {
  const key = `btc-session:${address}`;
  return storage.get<SessionState>(key);
}
