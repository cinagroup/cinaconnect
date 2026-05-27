/**
 * Zustand-based state management for the Cinacoin SDK.
 */
import type { Chain, ConnectionResult, PairingData } from './types.js';
/** SDK connection state. */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
/** SDK state managed by Zustand. */
export interface CinacoinState {
    status: ConnectionStatus;
    accounts: string[];
    chainId: number | null;
    sessionId: string | null;
    connectorId: string | null;
    error: Error | null;
    chains: Chain[];
    activeChain: Chain | null;
    pairings: PairingData[];
    activePairing: PairingData | null;
    relayUrl: string | null;
    projectId: string | null;
    setStatus: (status: ConnectionStatus) => void;
    setConnection: (result: ConnectionResult) => void;
    setError: (error: Error | null) => void;
    setChains: (chains: Chain[]) => void;
    setActiveChain: (chain: Chain | null) => void;
    addPairing: (pairing: PairingData) => void;
    setActivePairing: (pairing: PairingData | null) => void;
    setRelayUrl: (url: string) => void;
    setProjectId: (id: string) => void;
    disconnect: () => void;
}
/** Create the SDK store. */
export declare const createCinacoinStore: () => import("zustand").UseBoundStore<import("zustand").StoreApi<CinacoinState>>;
/**
 * SDK configuration for store initialization.
 */
export interface StoreConfig {
    relayUrl: string;
    projectId: string;
    chains: Chain[];
}
/** Initialize the SDK store with configuration. */
export declare function initializeStore(config: StoreConfig): import("zustand").UseBoundStore<import("zustand").StoreApi<CinacoinState>>;
//# sourceMappingURL=store.d.ts.map