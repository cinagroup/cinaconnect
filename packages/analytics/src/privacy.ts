/**
 * Privacy controls for GDPR-compliant analytics.
 *
 * Manages user consent, data minimization, and retention policies.
 */

import { AnalyticsEvent } from '../types.js';

export interface PrivacyConfig {
  /** Whether tracking is allowed by default. */
  allowByDefault?: boolean;
  /** Maximum event retention in days. */
  retentionDays?: number;
  /** Whether to anonymize IP addresses (handled server-side). */
  anonymizeIp?: boolean;
  /** Whether to exclude wallet addresses from events. */
  excludeAddresses?: boolean;
}

export interface ConsentRecord {
  consented: boolean;
  timestamp: number;
  categories: string[];
}

const CONSENT_KEY = '@cinacoin/consent';

export class PrivacyManager {
  private config: Required<PrivacyConfig>;
  private consent: ConsentRecord | null = null;

  constructor(config: PrivacyConfig = {}) {
    this.config = {
      allowByDefault: config.allowByDefault ?? true,
      retentionDays: config.retentionDays ?? 365,
      anonymizeIp: config.anonymizeIp ?? true,
      excludeAddresses: config.excludeAddresses ?? false,
    };

    this.loadConsent();
  }

  /** Check if an event can be tracked based on consent */
  canTrack(event: AnalyticsEvent): boolean {
    if (!this.consent) {
      return this.config.allowByDefault;
    }
    return this.consent.consented;
  }

  /** Apply data minimization to an event */
  sanitize(event: AnalyticsEvent): AnalyticsEvent {
    if (!this.config.excludeAddresses) return event;

    const sanitized = { ...event };
    // Remove or hash sensitive fields
    if ('address' in sanitized) {
      (sanitized as any).address = this.hashAddress((sanitized as any).address);
    }
    return sanitized;
  }

  /** Record user consent */
  recordConsent(consented: boolean, categories: string[] = ['analytics']): void {
    this.consent = {
      consented,
      timestamp: Date.now(),
      categories,
    };
    this.persistConsent();
  }

  /** Get current consent status */
  getConsent(): ConsentRecord | null {
    return this.consent;
  }

  /** Check if consent has expired */
  isConsentValid(): boolean {
    if (!this.consent) return this.config.allowByDefault;
    const age = Date.now() - this.consent.timestamp;
    const maxAge = this.config.retentionDays * 24 * 60 * 60 * 1000;
    return age < maxAge;
  }

  /** Withdraw consent */
  withdrawConsent(): void {
    this.consent = { consented: false, timestamp: Date.now(), categories: [] };
    this.persistConsent();
  }

  /** Hash an address for anonymization */
  private hashAddress(address: string): string {
    // Simple truncation for demo; use a proper hash in production
    if (address.length <= 8) return address;
    return address.slice(0, 6) + '...' + address.slice(-4);
  }

  /** Load consent from storage */
  private loadConsent(): void {
    try {
      const raw = this.getStorage()?.getItem(CONSENT_KEY);
      if (raw) {
        this.consent = JSON.parse(raw) as ConsentRecord;
      }
    } catch {
      // Ignore
    }
  }

  /** Persist consent to storage */
  private persistConsent(): void {
    try {
      if (this.consent) {
        this.getStorage()?.setItem(CONSENT_KEY, JSON.stringify(this.consent));
      }
    } catch {
      // Ignore
    }
  }

  /** Get storage API */
  private getStorage(): Storage | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    return null;
  }
}
