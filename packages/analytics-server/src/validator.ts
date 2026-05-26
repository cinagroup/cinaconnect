/**
 * Event validation — schema checks for AnalyticsEvent
 */

export type AnalyticsEventType =
  | "wallet_connected"
  | "wallet_disconnected"
  | "chain_switched"
  | "transaction_attempted"
  | "transaction_confirmed"
  | "transaction_failed"
  | "error_occurred"
  | "page_viewed"
  | "button_clicked"
  | "feature_used";

export interface AnalyticsEvent {
  eventId: string;
  type: AnalyticsEventType;
  timestamp: number;
  chainId?: number;
  wallet?: string;
  txHash?: string;
  error?: string;
  properties?: Record<string, string | number | boolean>;
  sessionId: string;
  appId?: string;
}

const VALID_EVENT_TYPES = new Set<string>([
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
]);

export interface ValidationResult {
  valid: boolean;
  event?: AnalyticsEvent;
  error?: string;
}

export class EventValidator {
  static validate(raw: unknown): ValidationResult {
    if (!raw || typeof raw !== "object") {
      return { valid: false, error: "Event must be an object" };
    }

    const event = raw as Record<string, unknown>;

    // Required: eventId (string)
    if (!event.eventId || typeof event.eventId !== "string") {
      return { valid: false, error: `Missing or invalid eventId` };
    }

    // Required: type (valid enum)
    if (!event.type || typeof event.type !== "string") {
      return { valid: false, error: `Missing or invalid type` };
    }
    if (!VALID_EVENT_TYPES.has(event.type)) {
      return { valid: false, error: `Unknown event type: ${event.type}` };
    }

    // Required: timestamp (number)
    if (typeof event.timestamp !== "number") {
      return { valid: false, error: `Missing or invalid timestamp` };
    }

    // Required: sessionId (string)
    if (!event.sessionId || typeof event.sessionId !== "string") {
      return { valid: false, error: `Missing or invalid sessionId` };
    }

    // Optional fields validation
    if (event.chainId !== undefined && typeof event.chainId !== "number") {
      return { valid: false, error: `chainId must be a number` };
    }

    if (event.properties !== undefined) {
      if (typeof event.properties !== "object" || event.properties === null || Array.isArray(event.properties)) {
        return { valid: false, error: `properties must be an object` };
      }
    }

    if (event.txHash !== undefined && typeof event.txHash !== "string") {
      return { valid: false, error: `txHash must be a string` };
    }

    // Build clean event object
    const cleanEvent: AnalyticsEvent = {
      eventId: event.eventId as string,
      type: event.type as AnalyticsEventType,
      timestamp: event.timestamp as number,
      sessionId: event.sessionId as string,
    };

    if (event.chainId !== undefined) cleanEvent.chainId = event.chainId as number;
    if (event.wallet !== undefined) cleanEvent.wallet = String(event.wallet);
    if (event.txHash !== undefined) cleanEvent.txHash = event.txHash as string;
    if (event.error !== undefined) cleanEvent.error = String(event.error);
    if (event.properties !== undefined) cleanEvent.properties = event.properties as Record<string, string | number | boolean>;
    if (event.appId !== undefined) cleanEvent.appId = String(event.appId);

    return { valid: true, event: cleanEvent };
  }

  static validateBatch(events: unknown[]): { valid: AnalyticsEvent[]; errors: string[] } {
    const valid: AnalyticsEvent[] = [];
    const errors: string[] = [];

    for (let i = 0; i < events.length; i++) {
      const result = EventValidator.validate(events[i]);
      if (result.valid && result.event) {
        valid.push(result.event);
      } else {
        errors.push(`Event[${i}]: ${result.error}`);
      }
    }

    return { valid, errors };
  }
}
