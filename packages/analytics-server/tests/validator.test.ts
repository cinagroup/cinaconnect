import { describe, it, expect } from "vitest";
import { EventValidator } from "../src/validator.js";

describe("EventValidator", () => {
  describe("validate", () => {
    it("rejects non-objects", () => {
      expect(EventValidator.validate(null).valid).toBe(false);
      expect(EventValidator.validate("string").valid).toBe(false);
      expect(EventValidator.validate(42).valid).toBe(false);
    });

    it("rejects missing eventId", () => {
      const result = EventValidator.validate({
        type: "page_viewed",
        timestamp: Date.now(),
        sessionId: "sess_123",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("eventId");
    });

    it("rejects invalid event type", () => {
      const result = EventValidator.validate({
        eventId: "evt_123",
        type: "invalid_type",
        timestamp: Date.now(),
        sessionId: "sess_123",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unknown event type");
    });

    it("rejects missing timestamp", () => {
      const result = EventValidator.validate({
        eventId: "evt_123",
        type: "page_viewed",
        sessionId: "sess_123",
      });
      expect(result.valid).toBe(false);
    });

    it("rejects missing sessionId", () => {
      const result = EventValidator.validate({
        eventId: "evt_123",
        type: "page_viewed",
        timestamp: Date.now(),
      });
      expect(result.valid).toBe(false);
    });

    it("accepts valid minimal event", () => {
      const result = EventValidator.validate({
        eventId: "evt_123",
        type: "page_viewed",
        timestamp: Date.now(),
        sessionId: "sess_123",
      });
      expect(result.valid).toBe(true);
      expect(result.event?.eventId).toBe("evt_123");
      expect(result.event?.type).toBe("page_viewed");
    });

    it("accepts valid event with all optional fields", () => {
      const result = EventValidator.validate({
        eventId: "evt_456",
        type: "transaction_confirmed",
        timestamp: 1700000000000,
        chainId: 1,
        wallet: "metamask",
        txHash: "0xabc123",
        sessionId: "sess_456",
        properties: { amount: 100, token: "USDC" },
      });
      expect(result.valid).toBe(true);
      expect(result.event?.chainId).toBe(1);
      expect(result.event?.wallet).toBe("metamask");
      expect(result.event?.txHash).toBe("0xabc123");
      expect(result.event?.properties).toEqual({ amount: 100, token: "USDC" });
    });

    it("rejects non-numeric chainId", () => {
      const result = EventValidator.validate({
        eventId: "evt_789",
        type: "chain_switched",
        timestamp: Date.now(),
        chainId: "not-a-number",
        sessionId: "sess_789",
      });
      expect(result.valid).toBe(false);
    });

    it("rejects non-object properties", () => {
      const result = EventValidator.validate({
        eventId: "evt_789",
        type: "button_clicked",
        timestamp: Date.now(),
        properties: "not-an-object",
        sessionId: "sess_789",
      });
      expect(result.valid).toBe(false);
    });

    it("accepts all valid event types", () => {
      const types = [
        "wallet_connected",
        "wallet_disconnected",
        "chain_switched",
        "transaction_attempted",
        "transaction_confirmed",
        "transaction_failed",
        "error_occurred",
        "page_viewed",
        "button_clicked",
        "feature_used",
      ];

      for (const type of types) {
        const result = EventValidator.validate({
          eventId: `evt_${type}`,
          type,
          timestamp: Date.now(),
          sessionId: "sess_test",
        });
        expect(result.valid, `type ${type} should be valid`).toBe(true);
      }
    });
  });

  describe("validateBatch", () => {
    it("validates mixed valid/invalid events", () => {
      const events = [
        { eventId: "evt_1", type: "page_viewed", timestamp: Date.now(), sessionId: "sess_1" },
        { eventId: "evt_2", type: "invalid", timestamp: Date.now(), sessionId: "sess_2" },
        { eventId: "evt_3", type: "button_clicked", timestamp: Date.now(), sessionId: "sess_3" },
      ];
      const { valid, errors } = EventValidator.validateBatch(events);
      expect(valid).toHaveLength(2);
      expect(errors).toHaveLength(1);
    });

    it("handles empty array", () => {
      const { valid, errors } = EventValidator.validateBatch([]);
      expect(valid).toHaveLength(0);
      expect(errors).toHaveLength(0);
    });
  });
});
