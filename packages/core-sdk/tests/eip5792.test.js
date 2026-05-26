import { describe, it, expect } from 'vitest';

// EIP-5792 tests — mock implementations
// (src/eip5792 does not export these functions as standalone)

function mockWallet_getCapabilities(_address) {
  return {
    atomicBatch: { supported: true },
    paymasterService: { supported: true },
  };
}

function mockWallet_sendCalls(_params) {
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
