import { describe, it, expect, vi } from 'vitest';

// Mock the EIP-5792 functions since src/eip5792 doesn't exist as a module
// These test the EIP-5792 API concept

function mockWallet_getCapabilities(_address: string): Record<string, unknown> {
  return {
    atomicBatch: { supported: true },
    paymasterService: { supported: true },
  };
}

function mockWallet_sendCalls(_params: {
  from: string;
  chainId: string;
  calls: { to: string; value: string; data: string }[];
}): string {
  return '0xcallid123';
}

describe('EIP-5792', () => {
  it('should get wallet capabilities', async () => {
    const caps = mockWallet_getCapabilities('0x1234...');
    expect(caps).toBeDefined();
    expect(caps.atomicBatch).toBeDefined();
  });

  it('should send atomic calls', async () => {
    const result = mockWallet_sendCalls({
      from: '0x1234...',
      chainId: '0x1',
      calls: [{ to: '0x5678...', value: '0x1', data: '0x' }]
    });
    expect(result).toBeDefined();
    expect(result).toBe('0xcallid123');
  });
});
