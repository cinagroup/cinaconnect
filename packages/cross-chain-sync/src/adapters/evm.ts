/**
 * EVM State Sync Adapter
 *
 * Syncs state for EVM-compatible chains (Ethereum, Polygon, Arbitrum, etc.)
 */

import type { ChainAccount, SessionState, StateStorage } from "./types.js";

/** EVM-specific account info */
export interface EvmAccount extends ChainAccount {
  chain: "evm";
  chainId: number;
  /** ENS name if resolved */
  ensName?: string;
  /** Current nonce */
  nonce?: number;
}

/**
 * Sync EVM chain state.
 */
export async function syncEvmState(
  account: EvmAccount,
  storage: StateStorage
): Promise<boolean> {
  const session: SessionState = {
    chain: "evm",
    chainId: account.chainId,
    address: account.address,
    expiresAt: Date.now() + 3600_000, // 1 hour
    data: {
      ensName: account.ensName ?? "",
      nonce: String(account.nonce ?? 0),
    },
  };

  const key = `evm-session:${account.chainId}:${account.address}`;
  await storage.set(key, session);

  account.lastSyncedAt = Date.now();
  await storage.set(`evm-account:${account.chainId}:${account.address}`, account);

  return true;
}

/**
 * Fetch EVM session from storage.
 */
export async function getEvmSession(
  chainId: number,
  address: string,
  storage: StateStorage
): Promise<SessionState | null> {
  const key = `evm-session:${chainId}:${address}`;
  return storage.get<SessionState>(key);
}
