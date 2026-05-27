/**
 * SMS provider implementations for OTP delivery.
 *
 * Includes Twilio (production), Vonage/Nexmo, and a mock provider
 * for development/testing. All implement the SMSProvider interface
 * defined in `auth/phone-otp.ts`.
 *
 * @packageDocumentation
 */

import type { SMSProvider } from './auth/phone-otp.js';

// ─── Twilio Provider ────────────────────────────────────────────────────

/**
 * Configuration for the Twilio SMS provider.
 */
export interface TwilioConfig {
  /** Twilio Account SID. */
  accountSid: string;
  /** Twilio Auth Token. */
  authToken: string;
  /** Twilio phone number (E.164 format, e.g., "+1234567890"). */
  fromNumber: string;
  /** Optional custom Twilio API base URL (for testing/stubbing). */
  baseUrl?: string;
}

/**
 * Twilio API response for sending an SMS.
 */
interface TwilioMessageResponse {
  sid: string;
  status: string;
  error_message?: string;
}

/**
 * SMS provider that sends messages via the Twilio REST API.
 *
 * @example
 * ```ts
 * const twilio = new TwilioProvider({
 *   accountSid: process.env.TWILIO_ACCOUNT_SID!,
 *   authToken: process.env.TWILIO_AUTH_TOKEN!,
 *   fromNumber: process.env.TWILIO_PHONE_NUMBER!,
 * });
 *
 * await twilio.send('+1234567890', 'Your code is: 123456');
 * ```
 */
export class TwilioProvider implements SMSProvider {
  private config: TwilioConfig;
  private baseUrl: string;

  constructor(config: TwilioConfig) {
    if (!config.accountSid || !config.authToken || !config.fromNumber) {
      throw new Error(
        'TwilioProvider requires accountSid, authToken, and fromNumber'
      );
    }
    this.config = config;
    this.baseUrl = config.baseUrl || `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}`;
  }

  /**
   * Send an SMS message via Twilio.
   *
   * @param to - Destination phone number (E.164 format).
   * @param message - SMS body content (max 1600 characters for concatenated SMS).
   * @throws Error if the Twilio API returns an error.
   */
  async send(to: string, message: string): Promise<void> {
    const credentials = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64');

    const body = new URLSearchParams({
      From: this.config.fromNumber,
      To: to,
      Body: message,
    });

    const response = await fetch(`${this.baseUrl}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Twilio SMS failed (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as TwilioMessageResponse;

    if (result.status === 'failed' || result.status === 'undelivered') {
      throw new Error(
        `Twilio SMS ${result.status}: ${result.error_message || 'Unknown error'}`
      );
    }
  }

  /**
   * Get the last sent message SID (useful for logging/tracking).
   * This is exposed for testing purposes.
   */
  get lastMessageSid(): string | undefined {
    return undefined; // Could cache last SID if needed
  }
}

// ─── Vonage / Nexmo Provider ────────────────────────────────────────────

/**
 * Configuration for the Vonage (Nexmo) SMS provider.
 */
export interface VonageConfig {
  /** Vonage API Key. */
  apiKey: string;
  /** Vonage API Secret. */
  apiSecret: string;
  /** Sender ID (alphanumeric or phone number). */
  from: string;
  /** Optional custom Vonage API base URL. */
  baseUrl?: string;
}

/**
 * SMS provider that sends messages via the Vonage (Nexmo) Messages API.
 *
 * @example
 * ```ts
 * const vonage = new VonageProvider({
 *   apiKey: process.env.VONAGE_API_KEY!,
 *   apiSecret: process.env.VONAGE_API_SECRET!,
 *   from: 'Cinacoin',
 * });
 *
 * await vonage.send('+1234567890', 'Your code is: 123456');
 * ```
 */
export class VonageProvider implements SMSProvider {
  private config: VonageConfig;
  private baseUrl: string;

  constructor(config: VonageConfig) {
    if (!config.apiKey || !config.apiSecret || !config.from) {
      throw new Error('VonageProvider requires apiKey, apiSecret, and from');
    }
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://rest.nexmo.com/sms/json';
  }

  /**
   * Send an SMS message via Vonage.
   *
   * @param to - Destination phone number (E.164 format).
   * @param message - SMS body content.
   * @throws Error if the Vonage API returns an error.
   */
  async send(to: string, message: string): Promise<void> {
    const body = new URLSearchParams({
      api_key: this.config.apiKey,
      api_secret: this.config.apiSecret,
      from: this.config.from,
      to,
      text: message,
    });

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vonage SMS failed (${response.status}): ${errorText}`);
    }

    const result = await response.json() as {
      messages?: Array<{ status: string; errorText?: string; 'message-id'?: string }>;
    };

    const msg = result.messages?.[0];
    if (msg && msg.status !== '0') {
      throw new Error(`Vonage SMS error: ${msg.errorText || `status ${msg.status}`}`);
    }
  }
}

// ─── AWS SNS Provider ───────────────────────────────────────────────────

/**
 * Configuration for the AWS SNS SMS provider.
 */
export interface AwsSnsConfig {
  /** AWS Access Key ID. */
  accessKeyId: string;
  /** AWS Secret Access Key. */
  secretAccessKey: string;
  /** AWS Region (e.g., "us-east-1"). */
  region: string;
  /** Optional SNS endpoint override (for localstack/testing). */
  endpoint?: string;
}

/**
 * SMS provider that sends messages via AWS SNS.
 *
 * Uses the AWS SNS Publish API with Signature Version 4 signing.
 *
 * @example
 * ```ts
 * const sns = new AwsSnsProvider({
 *   accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
 *   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
 *   region: 'us-east-1',
 * });
 *
 * await sns.send('+1234567890', 'Your code is: 123456');
 * ```
 */
export class AwsSnsProvider implements SMSProvider {
  private config: AwsSnsConfig;

  constructor(config: AwsSnsConfig) {
    if (!config.accessKeyId || !config.secretAccessKey || !config.region) {
      throw new Error('AwsSnsProvider requires accessKeyId, secretAccessKey, and region');
    }
    this.config = config;
  }

  /**
   * Send an SMS message via AWS SNS.
   *
   * @param to - Destination phone number (E.164 format).
   * @param message - SMS body content.
   * @throws Error if the AWS SNS API returns an error.
   */
  async send(to: string, message: string): Promise<void> {
    // Build the AWS SNS request with SigV4 signing
    const service = 'sns';
    const region = this.config.region;
    const host = `sns.${region}.amazonaws.com`;
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

    // Action parameters
    const actionParams = new URLSearchParams({
      Action: 'Publish',
      PhoneNumber: to,
      Message: message,
      Version: '2010-03-31',
    });
    const requestBody = actionParams.toString();

    // Create canonical request
    const canonicalUri = '/';
    const canonicalQueryString = '';
    const payloadHash = await this.sha256Hex(requestBody);

    const canonicalHeaders = `content-type:application/x-www-form-urlencoded; charset=utf-8\nhost:${host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-date';

    const canonicalRequest = [
      'POST',
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    // Create string to sign
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      await this.sha256Hex(canonicalRequest),
    ].join('\n');

    // Calculate signature
    const kDate = await this.hmacSha256(`AWS4${this.config.secretAccessKey}`, dateStamp);
    const kRegion = await this.hmacSha256(kDate, region);
    const kService = await this.hmacSha256(kRegion, service);
    const kSigning = await this.hmacSha256(kService, 'aws4_request');
    const signature = await this.hmacSha256Hex(kSigning, stringToSign);

    // Build authorization header
    const authorization = [
      `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(', ');

    const response = await fetch(`https://${host}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        'X-Amz-Date': amzDate,
        'Authorization': authorization,
      },
      body: requestBody,
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`AWS SNS failed (${response.status}): ${responseText}`);
    }

    // Check for AWS error response in XML
    if (responseText.includes('<Error>')) {
      const errorMatch = responseText.match(/<Message>([^<]+)<\/Message>/);
      const errorMessage = errorMatch ? errorMatch[1] : responseText;
      throw new Error(`AWS SNS error: ${errorMessage}`);
    }
  }

  private async sha256Hex(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async hmacSha256(key: string | Uint8Array, data: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const keyData = typeof key === 'string' ? encoder.encode(key) : new Uint8Array(key.buffer, key.byteOffset, key.byteLength);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData as BufferSource,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
    return new Uint8Array(signature);
  }

  private async hmacSha256Hex(key: Uint8Array, data: string): Promise<string> {
    const result = await this.hmacSha256(key, data);
    return Array.from(result)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

// ─── Mock SMS Provider ──────────────────────────────────────────────────

/**
 * Callback for capturing sent SMS messages (for testing).
 */
export type OnMessageCaptured = (to: string, message: string) => void;

/**
 * Mock SMS provider for development and testing.
 *
 * Instead of sending real SMS messages, it captures them
 * in memory for inspection. Supports optional callbacks
 * for test assertions.
 *
 * @example
 * ```ts
 * const messages: Array<{ to: string; message: string }> = [];
 * const mock = new MockSMSProvider({
 *   onMessage: (to, message) => messages.push({ to, message }),
 *   failNumbers: ['+9999999999'], // Numbers that should fail
 * });
 *
 * await mock.send('+1234567890', 'Test message');
 * console.log(messages[0].message); // "Test message"
 * ```
 */
export class MockSMSProvider implements SMSProvider {
  /** History of all sent messages. */
  readonly sentMessages: Array<{ to: string; message: string; timestamp: Date }> = [];

  /** Phone numbers that should trigger a send failure. */
  private failNumbers: Set<string>;

  /** Optional callback invoked for each message. */
  private onMessage?: OnMessageCaptured;

  /** Whether to simulate network delay. */
  private delayMs: number;

  constructor(options: {
    onMessage?: OnMessageCaptured;
    failNumbers?: string[];
    delayMs?: number;
  } = {}) {
    this.onMessage = options.onMessage;
    this.failNumbers = new Set(options.failNumbers || []);
    this.delayMs = options.delayMs ?? 0;
  }

  /**
   * "Send" an SMS message (captured in memory for testing).
   *
   * @param to - Destination phone number.
   * @param message - SMS body content.
   * @throws Error if the phone number is in the fail list.
   */
  async send(to: string, message: string): Promise<void> {
    if (this.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }

    if (this.failNumbers.has(to)) {
      throw new Error(`MockSMSProvider: simulated failure for ${to}`);
    }

    const entry = { to, message, timestamp: new Date() };
    this.sentMessages.push(entry);

    if (this.onMessage) {
      this.onMessage(to, message);
    }
  }

  /**
   * Get all messages sent to a specific phone number.
   *
   * @param phone - Phone number to filter by.
   * @returns Array of messages sent to that number.
   */
  getMessagesTo(phone: string): typeof this.sentMessages {
    return this.sentMessages.filter(m => m.to === phone);
  }

  /**
   * Clear all captured messages.
   */
  clear(): void {
    this.sentMessages.length = 0;
  }

  /**
   * Get the count of messages sent.
   */
  get count(): number {
    return this.sentMessages.length;
  }
}
