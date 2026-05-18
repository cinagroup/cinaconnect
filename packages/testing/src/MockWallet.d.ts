/**
 * MockWallet — Simulated wallet connector for testing.
 *
 * Mimics the lifecycle of a wallet connector (connect, disconnect, switch chain)
 * without requiring a real browser extension or WalletConnect session.
 */
import { MockProvider } from "./MockProvider.js";
export interface WalletState {
    connected: boolean;
    accounts: string[];
    chainId: string;
    connectorId: string;
}
export interface MockWalletOptions {
    connectorId?: string;
    accounts?: string[];
    chainId?: string;
    /** Simulated connection delay in ms */
    connectDelay?: number;
    /** Simulated disconnection delay in ms */
    disconnectDelay?: number;
    /** Whether connect() should throw */
    connectError?: Error | null;
    /** Whether disconnect() should throw */
    disconnectError?: Error | null;
}
export declare class MockWallet {
    private _provider;
    private _connectorId;
    private _connected;
    private _connectDelay;
    private _disconnectDelay;
    private _connectError;
    private _disconnectError;
    constructor(opts?: MockWalletOptions);
    /** The underlying mock provider */
    get provider(): MockProvider;
    /** Current wallet state snapshot */
    get state(): WalletState;
    /** Whether the wallet is connected */
    get isConnected(): boolean;
    /** Simulate connecting the wallet */
    connect(): Promise<WalletState>;
    /** Simulate disconnecting the wallet */
    disconnect(): Promise<void>;
    /** Switch to a different chain */
    switchChain(chainId: string): Promise<void>;
    /** Reset the wallet to initial state */
    reset(opts?: MockWalletOptions): void;
    /** Convenience: get EIP-1193 events from the provider */
    on: any;
    removeListener: any;
    once: any;
}
//# sourceMappingURL=MockWallet.d.ts.map