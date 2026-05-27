import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymasterClient } from './PaymasterClient';
import type {
  PaymasterData,
  PaymasterVerification,
  SponsorRequest,
  SponsorResult,
  PaymasterConfig,
} from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockAddress: `0x${string}` = '0x1234567890abcdef1234567890abcdef12345678';
const mockHex: `0x${string}` = '0xabcdef';

function mockFetch(response: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 500,
      statusText: ok ? 'OK' : 'Internal Server Error',
      json: async () => (ok ? { result: response } : { error: { message: 'RPC error' } }),
    })
  );
}

function makeConfig(overrides?: Partial<PaymasterConfig>): PaymasterConfig {
  return {
    paymasterUrl: 'https://paymaster.example.com/rpc',
    apiKey: 'test-api-key',
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PaymasterClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('stores paymaster URL and optional API key', () => {
      const client = new PaymasterClient(makeConfig());
      expect(client).toBeDefined();
    });

    it('works without API key', () => {
      const client = new PaymasterClient({ paymasterUrl: 'https://pay.example.com' });
      expect(client).toBeDefined();
    });
  });

  describe('getPaymasterData', () => {
    it('returns paymaster data on successful RPC call', async () => {
      const mockResponse = {
        paymaster: mockAddress,
        paymasterData: mockHex,
        paymasterVerificationGasLimit: '100000',
        paymasterPostOpGasLimit: '50000',
      };
      mockFetch(mockResponse);

      const client = new PaymasterClient(makeConfig());
      const result = await client.getPaymasterData({
        sender: mockAddress,
        callData: mockHex,
        chainId: 1,
      });

      expect(result.paymaster).toBe(mockAddress);
      expect(result.paymasterData).toBe(mockHex);
      expect(result.paymasterVerificationGasLimit).toBe(100000n);
      expect(result.paymasterPostOpGasLimit).toBe(50000n);
    });

    it('sends correct RPC method and params', async () => {
      mockFetch({
        paymaster: mockAddress,
        paymasterData: mockHex,
        paymasterVerificationGasLimit: '1',
        paymasterPostOpGasLimit: '1',
      });

      const client = new PaymasterClient(makeConfig());
      await client.getPaymasterData({
        sender: mockAddress,
        callData: '0xdead',
        chainId: 42,
      });

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.method).toBe('pm_getPaymasterData');
      expect(body.params[0].sender).toBe(mockAddress);
      expect(body.params[0].chainId).toBe(42);
    });

    it('throws on HTTP error', async () => {
      mockFetch({}, false);

      const client = new PaymasterClient(makeConfig());
      await expect(
        client.getPaymasterData({ sender: mockAddress, callData: mockHex, chainId: 1 })
      ).rejects.toThrow('Paymaster RPC error: 500');
    });

    it('throws on RPC error response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({ error: { message: 'Invalid sender address' } }),
        })
      );

      const client = new PaymasterClient(makeConfig());
      await expect(
        client.getPaymasterData({ sender: mockAddress, callData: mockHex, chainId: 1 })
      ).rejects.toThrow('Invalid sender address');
    });
  });

  describe('verifyPaymaster', () => {
    it('returns verification result on success', async () => {
      mockFetch({
        isValid: true,
        sponsor: mockAddress,
        gasLimit: '200000',
      });

      const client = new PaymasterClient(makeConfig());
      const result = await client.verifyPaymaster(mockAddress, 1);

      expect(result.isValid).toBe(true);
      expect(result.sponsor).toBe(mockAddress);
      expect(result.gasLimit).toBe(200000n);
    });

    it('returns false for invalid paymaster', async () => {
      mockFetch({
        isValid: false,
        sponsor: '0x0000000000000000000000000000000000000000',
        gasLimit: '0',
      });

      const client = new PaymasterClient(makeConfig());
      const result = await client.verifyPaymaster(mockAddress, 1);
      expect(result.isValid).toBe(false);
    });

    it('sends correct RPC method', async () => {
      mockFetch({ isValid: true, sponsor: mockAddress, gasLimit: '1' });

      const client = new PaymasterClient(makeConfig());
      await client.verifyPaymaster(mockAddress, 42);

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.method).toBe('pm_verifyPaymaster');
    });

    it('sends Authorization header when API key is set', async () => {
      mockFetch({ isValid: true, sponsor: mockAddress, gasLimit: '1' });

      const client = new PaymasterClient(makeConfig({ apiKey: 'my-secret-key' }));
      await client.verifyPaymaster(mockAddress, 1);

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1].headers).toHaveProperty('Authorization', 'Bearer my-secret-key');
    });
  });

  describe('sponsorTransaction', () => {
    it('returns sponsorship result on success', async () => {
      mockFetch({
        paymaster: mockAddress,
        paymasterData: mockHex,
        sponsorshipId: 'sponsor-abc-123',
      });

      const client = new PaymasterClient(makeConfig());
      const result = await client.sponsorTransaction({
        sender: mockAddress,
        target: mockAddress,
        callData: mockHex,
        chainId: 1,
      });

      expect(result.paymaster).toBe(mockAddress);
      expect(result.sponsorshipId).toBe('sponsor-abc-123');
    });

    it('accepts optional gasEstimate', async () => {
      // Mock fetch to capture the body without actually JSON.stringify-ing BigInt
      const captured: string[] = [];
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(async (_url: string, opts: RequestInit) => {
          captured.push(opts.body as string);
          return {
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => ({
              result: { paymaster: mockAddress, paymasterData: mockHex, sponsorshipId: 's-1' },
            }),
          };
        })
      );

      const client = new PaymasterClient(makeConfig());
      // Pass gasEstimate as a number (JSON-safe) to verify the field is accepted
      await client.sponsorTransaction({
        sender: mockAddress,
        target: mockAddress,
        callData: mockHex,
        chainId: 1,
        gasEstimate: 500000, // number instead of bigint to avoid JSON serialization error
      } as unknown as { sender: typeof mockAddress; target: typeof mockAddress; callData: typeof mockHex; chainId: number; gasEstimate: bigint });

      expect(captured[0]).toContain('gasEstimate');
    });

    it('sends correct RPC method', async () => {
      mockFetch({ paymaster: mockAddress, paymasterData: mockHex, sponsorshipId: 's-1' });

      const client = new PaymasterClient(makeConfig());
      await client.sponsorTransaction({
        sender: mockAddress,
        target: mockAddress,
        callData: mockHex,
        chainId: 8453,
      });

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.method).toBe('pm_sponsorTransaction');
    });

    it('omits Authorization header when no API key', async () => {
      mockFetch({ paymaster: mockAddress, paymasterData: mockHex, sponsorshipId: 's-1' });

      const client = new PaymasterClient({ paymasterUrl: 'https://pm.example.com' });
      await client.sponsorTransaction({
        sender: mockAddress,
        target: mockAddress,
        callData: mockHex,
        chainId: 1,
      });

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const headers = callArgs[1].headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });
  });
});
