/**
 * Privacy controls for GDPR-compliant analytics.
 *
 * Manages user consent, data minimization, and retention policies.
 */
const CONSENT_KEY = '@cinacoin/consent';
export class PrivacyManager {
    constructor(config = {}) {
        this.consent = null;
        this.config = {
            allowByDefault: config.allowByDefault ?? true,
            retentionDays: config.retentionDays ?? 365,
            anonymizeIp: config.anonymizeIp ?? true,
            excludeAddresses: config.excludeAddresses ?? false,
        };
        this.loadConsent();
    }
    /** Check if an event can be tracked based on consent */
    canTrack(event) {
        if (!this.consent) {
            return this.config.allowByDefault;
        }
        return this.consent.consented;
    }
    /** Apply data minimization to an event */
    sanitize(event) {
        if (!this.config.excludeAddresses)
            return event;
        const sanitized = { ...event };
        // Remove or hash sensitive fields
        if ('address' in sanitized) {
            sanitized.address = this.hashAddress(sanitized.address);
        }
        return sanitized;
    }
    /** Record user consent */
    recordConsent(consented, categories = ['analytics']) {
        this.consent = {
            consented,
            timestamp: Date.now(),
            categories,
        };
        this.persistConsent();
    }
    /** Get current consent status */
    getConsent() {
        return this.consent;
    }
    /** Check if consent has expired */
    isConsentValid() {
        if (!this.consent)
            return this.config.allowByDefault;
        const age = Date.now() - this.consent.timestamp;
        const maxAge = this.config.retentionDays * 24 * 60 * 60 * 1000;
        return age < maxAge;
    }
    /** Withdraw consent */
    withdrawConsent() {
        this.consent = { consented: false, timestamp: Date.now(), categories: [] };
        this.persistConsent();
    }
    /** Hash an address for anonymization */
    hashAddress(address) {
        // Simple truncation for demo; use a proper hash in production
        if (address.length <= 8)
            return address;
        return address.slice(0, 6) + '...' + address.slice(-4);
    }
    /** Load consent from storage */
    loadConsent() {
        try {
            const raw = this.getStorage()?.getItem(CONSENT_KEY);
            if (raw) {
                this.consent = JSON.parse(raw);
            }
        }
        catch {
            // Ignore
        }
    }
    /** Persist consent to storage */
    persistConsent() {
        try {
            if (this.consent) {
                this.getStorage()?.setItem(CONSENT_KEY, JSON.stringify(this.consent));
            }
        }
        catch {
            // Ignore
        }
    }
    /** Get storage API */
    getStorage() {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage;
        }
        return null;
    }
}
//# sourceMappingURL=privacy.js.map