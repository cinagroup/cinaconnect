/**
 * Mock email provider (SendGrid/SES) for integration tests.
 */

export interface MockEmailDelivery {
  to: string;
  subject: string;
  body: string;
  timestamp: number;
  success: boolean;
}

export class MockEmailClient {
  private _deliveries: MockEmailDelivery[] = [];
  private _shouldFail = false;

  setFailureMode(fail: boolean = false): void {
    this._shouldFail = fail;
  }

  async send(to: string, subject: string, body: string): Promise<{ success: boolean; messageId: string }> {
    const delivery: MockEmailDelivery = {
      to,
      subject,
      body,
      timestamp: Date.now(),
      success: !this._shouldFail,
    };
    this._deliveries.push(delivery);

    if (this._shouldFail) {
      throw new Error('Email delivery simulated failure');
    }

    return { success: true, messageId: `email-${Date.now()}` };
  }

  getDeliveries(): ReadonlyArray<MockEmailDelivery> {
    return [...this._deliveries];
  }

  reset(): void {
    this._deliveries = [];
    this._shouldFail = false;
  }
}

export const mockEmail = new MockEmailClient();
