import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GasSponsor } from './GasSponsor';
import { getPaymasterData, getPaymasterAndData, detectProvider } from './paymaster';
import type { PublicClient, UserOperation, Address, Hex } from 'viem';
import type { SponsorshipConfig } from './types';

/* ── detectProvider ─────────────────────────────────────────────── */

describe('detectProvider', () => {
  it('detects Pimlico from URL', () => {
    expect(detectProvider('https://api.pimlico.io/v1/...')).toBe('pimlico');
  });

  it('detects Alchemy from URL', () => {
    expect(detectProvider('https://dashboard.alchemy.com/...')).toBe('alchemy');
  });

  it('detects Candle from URL', () => {
    expect(detectProvider('https://candle.example.com/...')).toBe('candle');
  });

  it('defaults to pimlico for unrecognized URLs', () => {
    expect(detectProvider('https://some-random-api.com/paymaster')).toBe('pimlico');
  });

  it('is case-insensitive', () => {
    expect(detectProvider('https://API.PIMLICO.IO/v1/')).toBe('pimlico');
    expect(detectProvider('https://ALCHEMY.COM/...')).toBe('alchemy');
  });
});

/* ── getPaymasterData / getPaymasterAndData ─────────────────────── */

describe('getPaymasterData & getPaymasterAndData', () => {
  const mockUserOp: UserOperation = {
    sender: '0x1234567890abcdef1234567890abcdef12345678' as Address,
    nonce: 1n,
    initCode: '0x',
    callData: '0x',
    callGasLimit: 50_000n,
    verificationGasLimit: 100_000n,
    preVerificationGas: 30_000n,
    maxFeePerGas: 1_000_000_000n,
    maxPriorityFeePerGas: 100_000_000n,
    paymasterAndData: '0x' as Hex,
  };

  const mockResult = { paymasterAndData: '0xABCDEF' as Hex, isFinal: true };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: mockResult }),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the correct Pimlico RPC method', async () => {
    await getPaymasterData(mockUserOp, 'https://api.pimlico.io/v1/key', 1);
    expect(fetch).toHaveBeenCalledOnce();
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.method).toBe('pm_getPaymasterStubData');
  });

  it('calls the correct Alchemy RPC method', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: { paymasterAndData: '0xALCHEMY' } }),
    }));
    await getPaymasterData(mockUserOp, 'https://alchemy.com/api', 1);
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.method).toBe('alchemy_requestGasAndPaymasterAndData');
  });

  it('returns paymasterAndData from getPaymasterAndData', async () => {
    const result = await getPaymasterAndData(mockUserOp, 'https://api.pimlico.io/v1/key', 1);
    expect(result).toBe('0xABCDEF');
  });

  it('throws when the RPC returns an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error: { message: 'insufficient balance' } }),
    }));
    await expect(
      getPaymasterData(mockUserOp, 'https://api.pimlico.io/v1/key', 1),
    ).rejects.toThrow('Paymaster RPC pm_getPaymasterStubData error');
  });

  it('throws when the RPC returns a non-OK HTTP status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }));
    await expect(
      getPaymasterData(mockUserOp, 'https://api.pimlico.io/v1/key', 1),
    ).rejects.toThrow('Paymaster RPC pm_getPaymasterStubData failed: 500');
  });
});

/* ── GasSponsor class ───────────────────────────────────────────── */

describe('GasSponsor', () => {
  let gasSponsor: GasSponsor;
  let mockClient: PublicClient;

  beforeEach(() => {
    mockClient = {
      getGasPrice: vi.fn().mockResolvedValue(20_000_000_000n),
      getBlock: vi.fn().mockResolvedValue({ baseFeePerGas: 15_000_000_000n }),
      getBalance: vi.fn().mockResolvedValue(1_000_000_000_000_000_000n), // 1 ETH
    } as unknown as PublicClient;

    gasSponsor = new GasSponsor(mockClient);

    // Mock fetch for price lookups
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ethereum: { usd: 2000 } }),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('constructs with a public client', () => {
    expect(gasSponsor.publicClient).toBe(mockClient);
  });

  it('estimates gas for a user operation', async () => {
    const estimate = await gasSponsor.estimateGas(
      {
        sender: '0x1234567890abcdef1234567890abcdef12345678',
        callData: '0x',
        verificationGasLimit: 100_000,
        callGasLimit: 50_000,
        preVerificationGas: 30_000,
        maxFeePerGas: 1_000_000_000,
        maxPriorityFeePerGas: 100_000_000,
      } as Partial<UserOperation>,
      1,
    );

    expect(estimate.verificationGasLimit).toBe(100_000n);
    expect(estimate.callGasLimit).toBe(50_000n);
    expect(estimate.preVerificationGas).toBe(30_000n);
    expect(estimate.totalGasLimit).toBe(180_000n);
    expect(estimate.estimatedCostWei).toBe(180_000n * 1_000_000_000n);
    expect(estimate.chainId).toBe(1);
    expect(estimate.estimatedCostUsd).toBeGreaterThan(0);
  });

  it('uses default gas limits when not provided', async () => {
    const estimate = await gasSponsor.estimateGas(
      {
        sender: '0x1234567890abcdef1234567890abcdef12345678',
        callData: '0x',
      } as Partial<UserOperation>,
      1,
    );

    expect(estimate.verificationGasLimit).toBe(100_000n);
    expect(estimate.callGasLimit).toBe(50_000n);
    expect(estimate.preVerificationGas).toBe(30_000n);
  });

  it('fetches gas price from client', async () => {
    const price = await gasSponsor.getGasPrice(1);
    expect(price).toBe(20_000_000_000n);
    expect(mockClient.getGasPrice).toHaveBeenCalled();
  });

  it('falls back to default gas price when client fails', async () => {
    (mockClient.getGasPrice as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    const price = await gasSponsor.getGasPrice(1);
    expect(price).toBe(20_000_000_000n); // Default for Ethereum mainnet
  });

  it('falls back to default for unknown chain', async () => {
    (mockClient.getGasPrice as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    const price = await gasSponsor.getGasPrice(999_999);
    expect(price).toBe(1_000_000_000n); // Global default
  });

  it('fetches max fee per gas from block', async () => {
    const fee = await gasSponsor.getMaxFeePerGas(1);
    // baseFee 15e9 * 2 = 30e9
    expect(fee).toBe(30_000_000_000n);
  });

  it('falls back to default max fee when block fetch fails', async () => {
    (mockClient.getBlock as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Block error'));
    const fee = await gasSponsor.getMaxFeePerGas(1);
    expect(fee).toBe(40_000_000_000n); // Default for Ethereum mainnet
  });

  it('gets paymaster balance', async () => {
    const balance = await gasSponsor.getSponsoredBalance(
      '0xPAYMASTER' as Address,
      1,
    );

    expect(balance.paymasterAddress).toBe('0xPAYMASTER');
    expect(balance.chainId).toBe(1);
    expect(balance.balanceWei).toBe(1_000_000_000_000_000_000n);
    expect(balance.balanceFormatted).toContain('ETH');
  });

  it('detects low balance when threshold is provided', async () => {
    const balance = await gasSponsor.getSponsoredBalance(
      '0xPAYMASTER' as Address,
      1,
      2_000_000_000_000_000_000n, // 2 ETH threshold
    );
    expect(balance.isLow).toBe(true);
  });

  it('does not flag balance as low when above threshold', async () => {
    const balance = await gasSponsor.getSponsoredBalance(
      '0xPAYMASTER' as Address,
      1,
      500_000_000_000_000_000n, // 0.5 ETH threshold
    );
    expect(balance.isLow).toBe(false);
  });

  it('isLow is false when no threshold is provided', async () => {
    const balance = await gasSponsor.getSponsoredBalance(
      '0xPAYMASTER' as Address,
      1,
    );
    expect(balance.isLow).toBe(false);
  });

  it('fundPaymaster returns transaction parameters', async () => {
    const tx = await gasSponsor.fundPaymaster(
      '0xPAYMASTER' as Address,
      1,
      1_000_000_000_000_000_000n,
    );
    expect(tx.to).toBe('0xPAYMASTER');
    expect(tx.value).toBe(1_000_000_000_000_000_000n);
    expect(tx.data).toBe('0x');
  });

  it('sponsorUserOperation throws when sponsorGas is false', async () => {
    const config: SponsorshipConfig = {
      paymasterUrl: 'https://api.pimlico.io/v1/key',
      sponsorGas: false,
    };

    await expect(
      gasSponsor.sponsorUserOperation(
        {} as UserOperation,
        config,
        1,
      ),
    ).rejects.toThrow('Gas sponsorship is disabled');
  });

  it('sponsorUserOperation attaches paymaster data when sponsorGas is true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: { paymasterAndData: '0xSPONSORED', isFinal: true } }),
    }));

    const config: SponsorshipConfig = {
      paymasterUrl: 'https://api.pimlico.io/v1/key',
      sponsorGas: true,
    };

    const userOp: UserOperation = {
      sender: '0x1234567890abcdef1234567890abcdef12345678' as Address,
      nonce: 0n,
      initCode: '0x',
      callData: '0x',
      callGasLimit: 50_000n,
      verificationGasLimit: 100_000n,
      preVerificationGas: 30_000n,
      maxFeePerGas: 1_000_000_000n,
      maxPriorityFeePerGas: 100_000_000n,
      paymasterAndData: '0x' as Hex,
    };

    const result = await gasSponsor.sponsorUserOperation(userOp, config, 1);
    expect(result.paymasterAndData).toBe('0xSPONSORED');
    expect(result.sponsoredUserOperation.paymasterAndData).toBe('0xSPONSORED');
    expect(result.chainId).toBe(1);
  });
});
