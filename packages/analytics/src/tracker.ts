/**
 * Event Tracker & Analytics
 *
 * Core event tracking with provider-agnostic design.
 * Exports both the new EventTracker API and a legacy-compatible Analytics class.
 */

import { randomUUID } from "crypto";
import type {
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsProvider,
  WalletProvider,
} from "./types.js";

// ============================================================
// EventTracker — new unified API
// ============================================================

export class EventTracker {
  private providers: AnalyticsProvider[] = [];
  private sessionId: string;
  private trackingEnabled: boolean = true;
  private events: AnalyticsEvent[] = [];

  constructor(sessionId?: string) {
    this.sessionId = sessionId ?? this.generateSessionId();
  }

  private generateSessionId(): string {
    return `sess_${randomUUID().slice(0, 12)}`;
  }

  addProvider(provider: AnalyticsProvider): void {
    this.providers.push(provider);
  }

  setEnabled(enabled: boolean): void {
    this.trackingEnabled = enabled;
  }

  isEnabled(): boolean {
    return this.trackingEnabled;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  resetSession(): string {
    this.sessionId = this.generateSessionId();
    return this.sessionId;
  }

  async track(type: AnalyticsEventType, options?: {
    chainId?: number;
    wallet?: WalletProvider;
    txHash?: string;
    error?: string;
    properties?: Record<string, string | number | boolean>;
  }): Promise<void> {
    if (!this.trackingEnabled) return;

    const event: AnalyticsEvent = {
      eventId: randomUUID(),
      type,
      timestamp: Date.now(),
      chainId: options?.chainId,
      wallet: options?.wallet,
      txHash: options?.txHash,
      error: options?.error,
      properties: options?.properties,
      sessionId: this.sessionId,
    };

    this.events.push(event);
    await Promise.allSettled(
      this.providers.map((p) => p.track(event))
    );
  }

  async trackWalletConnected(wallet: WalletProvider, chainId?: number): Promise<void> {
    await this.track("wallet_connected", { wallet, chainId });
  }

  async trackWalletDisconnected(wallet: WalletProvider): Promise<void> {
    await this.track("wallet_disconnected", { wallet });
  }

  async trackChainSwitched(chainId: number, wallet?: WalletProvider): Promise<void> {
    await this.track("chain_switched", { chainId, wallet });
  }

  async trackTransactionAttempted(
    txHash: string,
    chainId: number,
    wallet?: WalletProvider
  ): Promise<void> {
    await this.track("transaction_attempted", { txHash, chainId, wallet });
  }

  async trackTransactionConfirmed(
    txHash: string,
    chainId: number,
    wallet?: WalletProvider
  ): Promise<void> {
    await this.track("transaction_confirmed", { txHash, chainId, wallet });
  }

  async trackError(error: string, properties?: Record<string, string | number | boolean>): Promise<void> {
    await this.track("error_occurred", { error, properties });
  }

  async getEvents(): Promise<AnalyticsEvent[]> {
    const allEvents: AnalyticsEvent[][] = await Promise.all(
      this.providers.map((p) => p.getEvents())
    );
    const combined = [...this.events, ...allEvents.flat()];
    const seen = new Set<string>();
    return combined.filter((e) => {
      if (seen.has(e.eventId)) return false;
      seen.add(e.eventId);
      return true;
    });
  }

  async clear(): Promise<void> {
    this.events = [];
    await Promise.allSettled(this.providers.map((p) => p.clear()));
  }
}

// ============================================================
// Analytics — legacy-compatible API for existing tests
// ============================================================

export interface AnalyticsConfig {
  local?: boolean;
  remote?: { endpoint: string; apiKey?: string };
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
    topWallets: Array<{ walletId: string; count: number }>;
  };
  chain: {
    chainUsage: Array<{ chainId: number; count: number }>;
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

export class Analytics {
  private events: InternalEvent[] = [];
  private sessionId: string;
  private tracking: boolean = true;
  private config: AnalyticsConfig;

  constructor(config?: AnalyticsConfig) {
    this.config = config ?? {};
    this.sessionId = `sess_${randomUUID().slice(0, 12)}`;
  }

  getState(): AnalyticsState {
    return {
      sessionId: this.sessionId,
      tracking: this.tracking,
      eventCount: this.events.length,
    };
  }

  trackWalletConnect(params: WalletConnectParams): void {
    if (!this.tracking) return;
    this.events.push({
      type: "wallet_connect",
      timestamp: Date.now(),
      walletId: params.walletId,
      chainId: params.chainId,
      address: params.address,
      connectorType: params.connectorType,
      duration: params.duration,
      success: params.success,
    });
  }

  trackWalletDisconnect(walletId: string, reason?: string): void {
    if (!this.tracking) return;
    this.events.push({
      type: "wallet_disconnect",
      timestamp: Date.now(),
      walletId,
      reason,
    });
  }

  trackChainSwitch(fromChainId: number, toChainId: number): void {
    if (!this.tracking) return;
    this.events.push({
      type: "chain_switch",
      timestamp: Date.now(),
      chainId: toChainId,
      properties: { fromChainId, toChainId },
    });
  }

  trackTransactionAttempt(params: TransactionAttemptParams): void {
    if (!this.tracking) return;
    this.events.push({
      type: params.success ? "transaction_success" : "transaction_failure",
      timestamp: Date.now(),
      chainId: params.chainId,
      method: params.method,
      duration: params.duration,
      success: params.success,
      error: params.error,
    });
  }

  trackError(errorCode: string, message: string, context?: Record<string, unknown>): void {
    if (!this.tracking) return;
    this.events.push({
      type: "error",
      timestamp: Date.now(),
      errorCode,
      error: message,
      properties: context,
    });
  }

  disable(): void {
    this.tracking = false;
  }

  enable(): void {
    this.tracking = true;
  }

  getEvents(): InternalEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }

  getMetrics(): AnalyticsMetrics {
    const connectEvents = this.events.filter((e) => e.type === "wallet_connect");
    const successful = connectEvents.filter((e) => e.success);
    const failed = connectEvents.filter((e) => !e.success);

    const avgDuration = successful.length > 0
      ? successful.reduce((sum, e) => sum + (e.duration ?? 0), 0) / successful.length
      : 0;

    const walletCounts = new Map<string, number>();
    for (const e of connectEvents) {
      if (e.walletId) {
        walletCounts.set(e.walletId, (walletCounts.get(e.walletId) ?? 0) + 1);
      }
    }

    const topWallets = [...walletCounts.entries()]
      .map(([walletId, count]) => ({ walletId, count }))
      .sort((a, b) => b.count - a.count);

    const chainCounts = new Map<number, number>();
    for (const e of connectEvents) {
      if (e.chainId !== undefined) {
        chainCounts.set(e.chainId, (chainCounts.get(e.chainId) ?? 0) + 1);
      }
    }

    return {
      connection: {
        totalAttempts: connectEvents.length,
        successful: successful.length,
        failed: failed.length,
        successRate: connectEvents.length > 0 ? successful.length / connectEvents.length : 0,
        avgDuration,
      },
      wallet: {
        uniqueWallets: walletCounts.size,
        topWallets,
      },
      chain: {
        chainUsage: [...chainCounts.entries()]
          .map(([chainId, count]) => ({ chainId, count }))
          .sort((a, b) => b.count - a.count),
      },
    };
  }
}
