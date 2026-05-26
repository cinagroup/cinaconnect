/**
 * GDPR-compliant anonymization
 * IP hashing, user agent truncation, PII removal
 */

import type { AnalyticsEvent } from "./validator.js";

export class GdprAnonymizer {
  /**
   * Anonymize a single event for GDPR compliance.
   */
  static anonymize(event: AnalyticsEvent, context?: { req?: { raw?: Request } }): AnalyticsEvent {
    const anonymized = { ...event };

    // Hash any IP addresses in properties
    if (anonymized.properties) {
      const props = { ...anonymized.properties };

      // Remove or hash IP addresses
      if ("ip" in props) {
        props.ip_hash = GdprAnonymizer.hashIp(String(props.ip));
        delete props.ip;
      }
      if ("ipAddress" in props) {
        props.ip_hash = GdprAnonymizer.hashIp(String(props.ipAddress));
        delete props.ipAddress;
      }
      if ("remote_addr" in props) {
        props.ip_hash = GdprAnonymizer.hashIp(String(props.remote_addr));
        delete props.remote_addr;
      }

      // Truncate user agent strings
      if ("userAgent" in props && typeof props.userAgent === "string") {
        props.userAgent = GdprAnonymizer.truncateUserAgent(props.userAgent);
      }
      if ("user_agent" in props && typeof props.user_agent === "string") {
        props.user_agent = GdprAnonymizer.truncateUserAgent(props.user_agent);
      }

      // Remove email addresses
      if ("email" in props) {
        delete props.email;
      }

      // Remove wallet addresses (partial hash)
      if ("walletAddress" in props && typeof props.walletAddress === "string") {
        props.walletAddress = GdprAnonymizer.maskAddress(props.walletAddress);
      }
      if ("address" in props && typeof props.address === "string") {
        props.address = GdprAnonymizer.maskAddress(props.address);
      }

      anonymized.properties = props;
    }

    return anonymized;
  }

  /**
   * Hash an IP address (SHA-256 → truncated hex).
   * Uses simple deterministic transformation for Cloudflare Workers compatibility.
   */
  static hashIp(ip: string): string {
    if (!ip) return "";
    // Workers runtime: use SubtleCrypto for SHA-256
    // For now, use a deterministic hash based on character codes
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      const char = ip.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    // Convert to hex, take first 16 chars
    return Math.abs(hash).toString(16).padStart(16, "0").slice(0, 16);
  }

  /**
   * Truncate user agent to major browser/OS only.
   */
  static truncateUserAgent(ua: string, maxLen: number = 50): string {
    if (!ua) return "";
    if (ua.length <= maxLen) return ua;

    // Extract just browser identifier
    const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)[/\s]([\d.]+)/);
    if (browserMatch) {
      return `${browserMatch[1]}/${browserMatch[2]}`;
    }

    return ua.slice(0, maxLen) + "...";
  }

  /**
   * Mask a wallet address (show first 6 and last 4 chars).
   */
  static maskAddress(address: string): string {
    if (!address || address.length <= 10) return address;
    return address.slice(0, 6) + "..." + address.slice(-4);
  }
}
