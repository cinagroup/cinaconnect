/**
 * Notification types and delivery for Cinacoin.
 * Supports push, email, and webhook notifications.
 */

// ── Enums & Types ──────────────────────────────────────────

export type NotificationChannel = "push" | "email" | "webhook";

export interface NotificationPayload {
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  channel: NotificationChannel;
}

export interface Subscription {
  address: string;
  channels: NotificationChannel[];
  createdAt: number;
}

export interface NotificationResult {
  id: string;
  status: "sent" | "queued" | "failed";
  channel: NotificationChannel;
  timestamp: number;
}

// ── NotifyServer ───────────────────────────────────────────

export class NotifyServer {
  private subscriptions: Map<string, Subscription> = new Map();
  private deliveryLog: NotificationResult[] = [];
  private idCounter = 0;

  /**
   * Send a notification to all subscribed channels for a given address.
   */
  async sendNotification(
    address: string,
    payload: NotificationPayload,
  ): Promise<NotificationResult> {
    const subscription = this.subscriptions.get(address);
    if (!subscription || subscription.channels.length === 0) {
      const result: NotificationResult = {
        id: this.nextId(),
        status: "failed",
        channel: payload.channel,
        timestamp: Date.now(),
      };
      this.deliveryLog.push(result);
      return result;
    }

    // Check if the address is subscribed to the requested channel
    if (!subscription.channels.includes(payload.channel)) {
      const result: NotificationResult = {
        id: this.nextId(),
        status: "failed",
        channel: payload.channel,
        timestamp: Date.now(),
      };
      this.deliveryLog.push(result);
      return result;
    }

    // Deliver based on channel type
    const delivered = await this.deliver(payload.channel, address, payload);

    const result: NotificationResult = {
      id: this.nextId(),
      status: delivered ? "sent" : "failed",
      channel: payload.channel,
      timestamp: Date.now(),
    };
    this.deliveryLog.push(result);
    return result;
  }

  /**
   * Subscribe an address to one or more notification channels.
   */
  subscribe(
    address: string,
    channels: NotificationChannel[],
  ): Subscription {
    const existing = this.subscriptions.get(address);
    if (existing) {
      // Merge channels without duplicates
      const merged = [...new Set([...existing.channels, ...channels])];
      existing.channels = merged;
      return existing;
    }

    const sub: Subscription = {
      address,
      channels: [...channels],
      createdAt: Date.now(),
    };
    this.subscriptions.set(address, sub);
    return sub;
  }

  /**
   * Unsubscribe an address from all channels (remove entirely).
   */
  unsubscribe(address: string): boolean {
    return this.subscriptions.delete(address);
  }

  /**
   * Unsubscribe an address from specific channels only.
   */
  unsubscribeFrom(address: string, channels: NotificationChannel[]): boolean {
    const sub = this.subscriptions.get(address);
    if (!sub) return false;

    sub.channels = sub.channels.filter((c) => !channels.includes(c));
    if (sub.channels.length === 0) {
      this.subscriptions.delete(address);
    }
    return true;
  }

  /**
   * Get all subscriptions, optionally filtered by address.
   */
  getSubscriptions(address?: string): Subscription[] {
    if (address) {
      const sub = this.subscriptions.get(address);
      return sub ? [sub] : [];
    }
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get server metrics.
   */
  getMetrics(): unknown {
    return {
      service: "cinacoin-notify-server",
      subscriptions_count: this.subscriptions.size,
      delivery_log_size: this.deliveryLog.length,
      timestamp: Date.now(),
    };
  }

  // ── Private helpers ──────────────────────────────────────

  private async deliver(
    channel: NotificationChannel,
    _address: string,
    payload: NotificationPayload,
  ): Promise<boolean> {
    switch (channel) {
      case "push":
        return this.deliverPush(payload);
      case "email":
        return this.deliverEmail(payload);
      case "webhook":
        return this.deliverWebhook(payload);
    }
  }

  private async deliverPush(_payload: NotificationPayload): Promise<boolean> {
    // Integrate with push service (APNs / FCM) here.
    return true;
  }

  private async deliverEmail(_payload: NotificationPayload): Promise<boolean> {
    // Integrate with email provider (SendGrid / SES) here.
    return true;
  }

  private async deliverWebhook(
    payload: NotificationPayload,
  ): Promise<boolean> {
    try {
      // Webhook delivery — in production, POST to subscriber's webhook URL.
      const _body = JSON.stringify({
        title: payload.title,
        body: payload.body,
        data: payload.data,
      });
      return true;
    } catch {
      return false;
    }
  }

  private nextId(): string {
    this.idCounter += 1;
    return `notif-${Date.now()}-${this.idCounter}`;
  }
}
