export interface PushServerConfig {
  /** APNs configuration for iOS */
  apns?: {
    keyId: string;
    teamId: string;
    bundleId: string;
    privateKey: string;
  };
  /** FCM configuration for Android */
  fcm?: {
    projectId: string;
    serviceAccountKey: string;
  };
  /** Delivery timeout in milliseconds */
  timeoutMs?: number;
}

export interface PushNotification {
  /** Device token (APNs or FCM) */
  deviceToken: string;
  /** Platform: 'ios' or 'android' */
  platform: 'ios' | 'android';
  /** Notification title */
  title: string;
  /** Notification body */
  body: string;
  /** Optional data payload */
  data?: Record<string, string>;
}

export interface DeliveryResult {
  /** Whether the notification was successfully delivered */
  success: boolean;
  /** Provider message or error */
  message: string;
  /** Delivery timestamp */
  timestamp: number;
}

/**
 * PushServer — handles push notification delivery via APNs (iOS) and FCM (Android).
 */
export class PushServer {
  private readonly config: PushServerConfig;
  private deliveryLog: DeliveryResult[] = [];

  constructor(config: PushServerConfig) {
    this.config = config;
  }

  /**
   * Send a push notification to a single device.
   */
  async send(notification: PushNotification): Promise<DeliveryResult> {
    try {
      if (notification.platform === 'ios') {
        return await this.sendApns(notification);
      } else {
        return await this.sendFcm(notification);
      }
    } catch (err) {
      const result: DeliveryResult = {
        success: false,
        message: (err as Error).message,
        timestamp: Date.now(),
      };
      this.deliveryLog.push(result);
      return result;
    }
  }

  /**
   * Send push notifications to multiple devices in batch.
   */
  async sendBatch(notifications: PushNotification[]): Promise<DeliveryResult[]> {
    return Promise.all(notifications.map((n) => this.send(n)));
  }

  /**
   * Get delivery log for auditing.
   */
  getDeliveryLog(): DeliveryResult[] {
    return [...this.deliveryLog];
  }

  /** Clear delivery log */
  clearDeliveryLog(): void {
    this.deliveryLog = [];
  }

  private async sendApns(notification: PushNotification): Promise<DeliveryResult> {
    // In production, this would use @badrap/node-apn or similar APNs client.
    // For now, validate config and simulate delivery.
    if (!this.config.apns) {
      throw new Error('APNs configuration not set');
    }
    const payload = {
      aps: {
        alert: { title: notification.title, body: notification.body },
        badge: 1,
        sound: 'default',
      },
      data: notification.data ?? {},
    };
    // Simulated APNs delivery
    return {
      success: true,
      message: `APNs notification sent to ${notification.deviceToken.slice(0, 8)}...`,
      timestamp: Date.now(),
    };
  }

  private async sendFcm(notification: PushNotification): Promise<DeliveryResult> {
    // In production, this would use firebase-admin or FCM HTTP v1 API.
    // For now, validate config and simulate delivery.
    if (!this.config.fcm) {
      throw new Error('FCM configuration not set');
    }
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data ?? {},
      token: notification.deviceToken,
    };
    // Simulated FCM delivery
    return {
      success: true,
      message: `FCM notification sent to ${notification.deviceToken.slice(0, 8)}...`,
      timestamp: Date.now(),
    };
  }
}
