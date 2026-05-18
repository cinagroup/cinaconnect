/**
 * Event Tracker & Analytics
 *
 * Core event tracking with provider-agnostic design.
 * Exports both the new EventTracker API and a legacy-compatible Analytics class.
 */
import type { AnalyticsEvent, AnalyticsEventType, AnalyticsProvider, WalletProvider } from "./types.js";
export declare class EventTracker {
    private providers;
    private sessionId;
    private trackingEnabled;
    private events;
    constructor(sessionId?: string);
    private generateSessionId;
    addProvider(provider: AnalyticsProvider): void;
    setEnabled(enabled: boolean): void;
    isEnabled(): boolean;
    getSessionId(): string;
    resetSession(): string;
    track(type: AnalyticsEventType, options?: {
        chainId?: number;
        wallet?: WalletProvider;
        txHash?: string;
        error?: string;
        properties?: Record<string, string | number | boolean>;
    }): Promise<void>;
    trackWalletConnected(wallet: WalletProvider, chainId?: number): Promise<void>;
    trackWalletDisconnected(wallet: WalletProvider): Promise<void>;
    trackChainSwitched(chainId: number, wallet?: WalletProvider): Promise<void>;
    trackTransactionAttempted(txHash: string, chainId: number, wallet?: WalletProvider): Promise<void>;
    trackTransactionConfirmed(txHash: string, chainId: number, wallet?: WalletProvider): Promise<void>;
    trackError(error: string, properties?: Record<string, string | number | boolean>): Promise<void>;
    getEvents(): Promise<AnalyticsEvent[]>;
    clear(): Promise<void>;
}
export interface AnalyticsConfig {
    local?: boolean;
    remote?: {
        endpoint: string;
        apiKey?: string;
    };
}
export interface AnalyticsState {
    sessionId: string;
    tracking: boolean;
    eventCount: number;
}
export interface WalletConnectParams {
    walletId: string;
    chainId?: number;
    address?: string;
    connectorType?: string;
    duration?: number;
    success: boolean;
}
export interface TransactionAttemptParams {
    chainId: number;
    method: string;
    duration?: number;
    success: boolean;
    error?: string;
}
export interface AnalyticsMetrics {
    connection: {
        totalAttempts: number;
        successful: number;
        failed: number;
        successRate: number;
        avgDuration: number;
    };
    wallet: {
        uniqueWallets: number;
        topWallets: Array<{
            walletId: string;
            count: number;
        }>;
    };
    chain: {
        chainUsage: Array<{
            chainId: number;
            count: number;
        }>;
    };
}
interface InternalEvent {
    type: string;
    timestamp: number;
    walletId?: string;
    chainId?: number;
    address?: string;
    connectorType?: string;
    duration?: number;
    success?: boolean;
    method?: string;
    error?: string;
    errorCode?: string;
    reason?: string;
    properties?: Record<string, unknown>;
}
export declare class Analytics {
    private events;
    private sessionId;
    private tracking;
    private config;
    constructor(config?: AnalyticsConfig);
    getState(): AnalyticsState;
    trackWalletConnect(params: WalletConnectParams): void;
    trackWalletDisconnect(walletId: string, reason?: string): void;
    trackChainSwitch(fromChainId: number, toChainId: number): void;
    trackTransactionAttempt(params: TransactionAttemptParams): void;
    trackError(errorCode: string, message: string, context?: Record<string, unknown>): void;
    disable(): void;
    enable(): void;
    getEvents(): InternalEvent[];
    clear(): void;
    getMetrics(): AnalyticsMetrics;
}
export {};
//# sourceMappingURL=tracker.d.ts.map