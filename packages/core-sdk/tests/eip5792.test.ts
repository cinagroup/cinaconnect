import { describe, it, expect } from 'vitest';
import { wallet_getCapabilities, wallet_sendCalls, wallet_getCallsStatus } from '../src/eip5792';

describe('EIP-5792', () => {
  it('should get wallet capabilities', async () => {
    const caps = await wallet_getCapabilities('0x1234...');
    expect(caps).toBeDefined();
  });
  
  it('should send atomic calls', async () => {
    const result = await wallet_sendCalls({
      from: '0x1234...',
      chainId: '0x1',
      calls: [{ to: '0x5678...', value: '0x1', data: '0x' }]
    });
    expect(result).toBeDefined();
  });
});
