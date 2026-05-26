/**
 * Mock Firebase Cloud Messaging (FCM) for integration tests.
 * Simulates FCM delivery without hitting actual Firebase APIs.
 */

export interface MockFcmDelivery {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  timestamp: number;
  success: boolean;
}

export class MockFcmClient {
  private _deliveries: MockFcmDelivery[] = [];
  private _shouldFail = false;
  private _failureRate = 0; // 0-1

  /**
   * Configure whether this mock should simulate failures.
   * @param fail If true, all sends fail.
   * @param failureRate Probability of failure (0-1). Overrides `fail`.
   */
  setFailureMode(fail: boolean = false, failureRate: number = 0): void {
    this._shouldFail = fail;
    this._failureRate = failureRate;
  }

  /**
   * Simulate sending a message via FCM.
   */
  async send(message: {
    notification?: { title: string; body: string };
    data?: Record<string, string>;
    token: string;
  }): Promise<{ success: boolean; messageId: string }> {
    const willFail = this._shouldFail || Math.random() < this._failureRate;
    const delivery: MockFcmDelivery = {
      deviceToken: message.token,
      title: message.notification?.title ?? '',
      body: message.notification?.body ?? '',
      data: message.data,
      timestamp: Date.now(),
      success: !willFail,
    };
    this._deliveries.push(delivery);

    if (willFail) {
      throw new Error('FCM delivery simulated failure');
    }

    return { success: true, messageId: `fcm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  }

  /** Get all simulated deliveries (for test assertions). */
  getDeliveries(): ReadonlyArray<MockFcmDelivery> {
    return [...this._deliveries];
  }

  /** Clear delivery history. */
  reset(): void {
    this._deliveries = [];
    this._shouldFail = false;
    this._failureRate = 0;
  }

  /** Count successful deliveries. */
  get successCount(): number {
    return this._deliveries.filter((d) => d.success).length;
  }

  /** Count failed deliveries. */
  get failureCount(): number {
    return this._deliveries.filter((d) => !d.success).length;
  }
}

/** Singleton mock instance shared across tests. */
export const mockFcm = new MockFcmClient();
