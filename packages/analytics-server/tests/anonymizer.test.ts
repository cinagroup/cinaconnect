import { describe, it, expect } from "vitest";
import { GdprAnonymizer } from "../src/anonymizer.js";
import type { AnalyticsEvent } from "../src/validator.js";

describe("GdprAnonymizer", () => {
  describe("hashIp", () => {
    it("produces consistent hashes for same IP", () => {
      const hash1 = GdprAnonymizer.hashIp("192.168.1.1");
      const hash2 = GdprAnonymizer.hashIp("192.168.1.1");
      expect(hash1).toBe(hash2);
    });

    it("produces different hashes for different IPs", () => {
      const hash1 = GdprAnonymizer.hashIp("192.168.1.1");
      const hash2 = GdprAnonymizer.hashIp("10.0.0.1");
      expect(hash1).not.toBe(hash2);
    });

    it("returns empty string for empty input", () => {
      expect(GdprAnonymizer.hashIp("")).toBe("");
    });

    it("returns a fixed-length hex string", () => {
      const hash = GdprAnonymizer.hashIp("255.255.255.255");
      expect(hash).toMatch(/^[0-9a-f]+$/);
      expect(hash.length).toBeLessThanOrEqual(16);
    });
  });

  describe("truncateUserAgent", () => {
    it("truncates long user agents", () => {
      const longUa =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const result = GdprAnonymizer.truncateUserAgent(longUa, 20);
      expect(result.length).toBeGreaterThanOrEqual(6);
    });

    it("extracts browser version", () => {
      const ua = "Mozilla/5.0 Chrome/120.0.0.0 Safari";
      const result = GdprAnonymizer.truncateUserAgent(ua);
      expect(result).toMatch(/Chrome\/[\d.]+/);
    });

    it("returns short user agents as-is", () => {
      const short = "Chrome/120";
      expect(GdprAnonymizer.truncateUserAgent(short)).toBe("Chrome/120");
    });
  });

  describe("maskAddress", () => {
    it("masks long addresses", () => {
      const addr = "0x1234567890abcdef1234567890abcdef12345678";
      const result = GdprAnonymizer.maskAddress(addr);
      expect(result).toBe("0x1234...5678");
    });

    it("returns short addresses unchanged", () => {
      expect(GdprAnonymizer.maskAddress("0x123")).toBe("0x123");
    });

    it("handles empty input", () => {
      expect(GdprAnonymizer.maskAddress("")).toBe("");
    });
  });

  describe("anonymize", () => {
    const baseEvent: AnalyticsEvent = {
      eventId: "evt_1",
      type: "page_viewed",
      timestamp: Date.now(),
      sessionId: "sess_1",
    };

    it("removes ip from properties", () => {
      const event: AnalyticsEvent = {
        ...baseEvent,
        properties: { ip: "192.168.1.1", page: "/home" },
      };
      const result = GdprAnonymizer.anonymize(event);
      expect(result.properties?.ip).toBeUndefined();
      expect(result.properties?.ip_hash).toBeDefined();
    });

    it("truncates userAgent in properties", () => {
      const longUa =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Extra Long User Agent String Here Padding";
      const event: AnalyticsEvent = {
        ...baseEvent,
        properties: { userAgent: longUa },
      };
      const result = GdprAnonymizer.anonymize(event);
      expect((result.properties?.userAgent as string).length).toBeLessThan(longUa.length);
    });

    it("removes email from properties", () => {
      const event: AnalyticsEvent = {
        ...baseEvent,
        properties: { email: "user@example.com" },
      };
      const result = GdprAnonymizer.anonymize(event);
      expect(result.properties?.email).toBeUndefined();
    });

    it("masks wallet addresses", () => {
      const event: AnalyticsEvent = {
        ...baseEvent,
        properties: { walletAddress: "0x1234567890abcdef1234567890abcdef12345678" },
      };
      const result = GdprAnonymizer.anonymize(event);
      expect((result.properties?.walletAddress as string)).toContain("...");
    });

    it("leaves clean events unchanged", () => {
      const event: AnalyticsEvent = {
        ...baseEvent,
        properties: { page: "/home", duration: 120 },
      };
      const result = GdprAnonymizer.anonymize(event);
      expect(result.properties?.page).toBe("/home");
      expect(result.properties?.duration).toBe(120);
    });
  });
});
