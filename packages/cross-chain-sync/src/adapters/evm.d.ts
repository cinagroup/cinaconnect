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
export declare function syncEvmState(account: EvmAccount, storage: StateStorage): Promise<boolean>;
/**
 * Fetch EVM session from storage.
 */
export declare function getEvmSession(chainId: number, address: string, storage: StateStorage): Promise<SessionState | null>;
//# sourceMappingURL=evm.d.ts.map