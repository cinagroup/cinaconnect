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
  private registeredDevices: Map<string, { platform: 'ios' | 'android'; userId?: string; registeredAt: number }> = new Map();

  constructor(config: PushServerConfig) {
    this.config = config;
  }

  /**
   * Validate a notification request.
   */
  private validateNotification(notification: PushNotification): string | null {
    if (!notification.deviceToken || typeof notification.deviceToken !== 'string') {
      return 'Missing or invalid deviceToken';
    }
    if (notification.deviceToken.length > 4096) {
      return 'deviceToken too long (max 4096 chars)';
    }
    if (!notification.title || typeof notification.title !== 'string') {
      return 'Missing or invalid title';
    }
    if (notification.title.length > 256) {
      return 'title too long (max 256 chars)';
    }
    if (!notification.body || typeof notification.body !== 'string') {
      return 'Missing or invalid body';
    }
    if (notification.body.length > 4096) {
      return 'body too long (max 4096 chars)';
    }
    if (notification.platform !== 'ios' && notification.platform !== 'android') {
      return 'platform must be "ios" or "android"';
    }
    return null;
  }

  /**
   * Send a push notification to a single device.
   */
  async send(notification: PushNotification): Promise<DeliveryResult> {
    const validationError = this.validateNotification(notification);
    if (validationError) {
      return { success: false, message: validationError, timestamp: Date.now() };
    }
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
    // Rate limit: max 100 per batch
    if (notifications.length > 100) {
      return notifications.slice(0, 100).map((n) => ({
        success: false,
        message: 'Batch size exceeded (max 100)',
        timestamp: Date.now(),
      }));
    }
    return Promise.all(notifications.map((n) => this.send(n)));
  }

  /**
   * Register a device token for push notifications.
   */
  async registerDevice(req: { deviceToken: string; platform: 'ios' | 'android'; userId?: string }): Promise<{ success: boolean; message: string }> {
    if (!req.deviceToken || !req.platform) {
      return { success: false, message: 'Missing required fields: deviceToken, platform' };
    }
    if (req.deviceToken.length > 4096) {
      return { success: false, message: 'deviceToken too long' };
    }
    if (!['ios', 'android'].includes(req.platform)) {
      return { success: false, message: 'Invalid platform' };
    }
    this.registeredDevices.set(req.deviceToken, {
      platform: req.platform,
      userId: req.userId,
      registeredAt: Date.now(),
    });
    return { success: true, message: 'Device registered' };
  }

  /**
   * Unregister a device token.
   */
  async unregisterDevice(deviceToken: string): Promise<{ success: boolean; message: string }> {
    if (!deviceToken) {
      return { success: false, message: 'Missing deviceToken' };
    }
    this.registeredDevices.delete(deviceToken);
    return { success: true, message: 'Device unregistered' };
  }

  /**
   * Get delivery log for auditing.
   */
  getDeliveryLog(limit = 100, offset = 0): unknown {
    return {
      logs: this.deliveryLog.slice(offset, offset + limit),
      total: this.deliveryLog.length,
      limit,
      offset,
    };
  }

  /** Clear delivery log */
  clearDeliveryLog(): void {
    this.deliveryLog = [];
  }

  /**
   * Get server metrics.
   */
  getMetrics(): unknown {
    const successCount = this.deliveryLog.filter((log) => log.success).length;
    const failureCount = this.deliveryLog.length - successCount;
    const successRate = this.deliveryLog.length > 0
      ? ((successCount / this.deliveryLog.length) * 100).toFixed(2)
      : "0.00";

    return {
      service: "cinacoin-push-server",
      delivery_log_size: this.deliveryLog.length,
      success_count: successCount,
      failure_count: failureCount,
      success_rate_percent: parseFloat(successRate),
      timestamp: Date.now(),
    };
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
