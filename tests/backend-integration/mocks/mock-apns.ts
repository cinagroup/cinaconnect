/**
 * Mock Apple Push Notification service (APNs) for integration tests.
 * Simulates APNs delivery without hitting actual Apple servers.
 */

export interface MockApnsDelivery {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  timestamp: number;
  success: boolean;
  apnsId?: string;
}

export class MockApnsClient {
  private _deliveries: MockApnsDelivery[] = [];
  private _shouldFail = false;
  private _failureRate = 0;

  setFailureMode(fail: boolean = false, failureRate: number = 0): void {
    this._shouldFail = fail;
    this._failureRate = failureRate;
  }

  /**
   * Simulate sending a push notification via APNs.
   */
  async send(payload: {
    token: string;
    payload: {
      aps: {
        alert: { title: string; body: string };
        badge?: number;
        sound?: string;
      };
      data?: Record<string, unknown>;
    };
  }): Promise<{ success: boolean; apnsId: string }> {
    const willFail = this._shouldFail || Math.random() < this._failureRate;
    const apnsId = `apns-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const delivery: MockApnsDelivery = {
      deviceToken: payload.token,
      title: payload.payload.aps.alert.title,
      body: payload.payload.aps.alert.body,
      data: payload.payload.data,
      timestamp: Date.now(),
      success: !willFail,
      apnsId,
    };
    this._deliveries.push(delivery);

    if (willFail) {
      throw new Error('APNs delivery simulated failure');
    }

    return { success: true, apnsId };
  }

  getDeliveries(): ReadonlyArray<MockApnsDelivery> {
    return [...this._deliveries];
  }

  reset(): void {
    this._deliveries = [];
    this._shouldFail = false;
    this._failureRate = 0;
  }

  get successCount(): number {
    return this._deliveries.filter((d) => d.success).length;
  }

  get failureCount(): number {
    return this._deliveries.filter((d) => !d.success).length;
  }
}

/** Singleton mock instance shared across tests. */
export const mockApns = new MockApnsClient();
