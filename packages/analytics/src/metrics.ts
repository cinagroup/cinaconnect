/**
 * Metric calculations for analytics events.
 */

import { AnalyticsEvent } from '../types.js';

/** Extended event fields for connection-related events. */
interface ConnectionEvent extends AnalyticsEvent {
  success?: boolean;
  duration?: number;
  walletId?: string;
}

/** Extended event fields for chain switch events. */
interface ChainSwitchEvent extends AnalyticsEvent {
  toChainId?: number;
}

export interface ConnectionMetrics {
  /** Total connection attempts. */
  totalAttempts: number;
  /** Successful connections. */
  successful: number;
  /** Failed connections. */
  failed: number;
  /** Connection success rate (0-1). */
  successRate: number;
  /** Average connection time (ms). */
  avgConnectionTime: number;
}

export interface WalletMetrics {
  /** Number of unique wallets seen. */
  uniqueWallets: number;
  /** Wallet popularity: walletId -> connection count. */
  walletPopularity: Map<string, number>;
}

export interface ChainMetrics {
  /** Chain usage distribution: chainId -> switch count. */
  chainUsage: Map<number, number>;
  /** Most common destination chain. */
  mostSwitchedToChain?: number;
}

export class MetricsCalculator {
  /** Calculate all metrics from events */
  calculate(events: AnalyticsEvent[]): {
    connection: ConnectionMetrics;
    wallet: WalletMetrics;
    chain: ChainMetrics;
  } {
    return {
      connection: this.calculateConnectionMetrics(events),
      wallet: this.calculateWalletMetrics(events),
      chain: this.calculateChainMetrics(events),
    };
  }

  /** Calculate connection success rate and avg time */
  private calculateConnectionMetrics(events: AnalyticsEvent[]): ConnectionMetrics {
    const connectEvents = events.filter((e) => e.type === 'wallet_connect');
    const totalAttempts = connectEvents.length;
    const successful = connectEvents.filter((e) => (e as ConnectionEvent).success === true).length;
    const failed = totalAttempts - successful;
    const successRate = totalAttempts > 0 ? successful / totalAttempts : 0;

    const durations = connectEvents
      .map((e) => (e as ConnectionEvent).duration)
      .filter((d): d is number => d != null);
    const avgConnectionTime = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    return { totalAttempts, successful, failed, successRate, avgConnectionTime };
  }

  /** Calculate wallet popularity */
  private calculateWalletMetrics(events: AnalyticsEvent[]): WalletMetrics {
    const popularity = new Map<string, number>();
    for (const event of events) {
      if (event.type === 'wallet_connect') {
        const walletId = (event as ConnectionEvent).walletId;
        if (walletId == null) continue;
        popularity.set(walletId, (popularity.get(walletId) ?? 0) + 1);
      }
    }
    return { uniqueWallets: popularity.size, walletPopularity: popularity };
  }

  /** Calculate chain usage distribution */
  private calculateChainMetrics(events: AnalyticsEvent[]): ChainMetrics {
    const usage = new Map<number, number>();
    let maxCount = 0;
    let mostSwitchedTo: number | undefined;

    for (const event of events) {
      if (event.type === 'chain_switch') {
        const toChain = (event as ChainSwitchEvent).toChainId;
        if (toChain == null) continue;
        const count = (usage.get(toChain) ?? 0) + 1;
        usage.set(toChain, count);
        if (count > maxCount) {
          maxCount = count;
          mostSwitchedTo = toChain;
        }
      }
    }

    return { chainUsage: usage, mostSwitchedToChain: mostSwitchedTo };
  }
}
