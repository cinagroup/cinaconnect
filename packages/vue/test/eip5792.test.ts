/**
 * Basic tests for EIP-5792 Vue composables.
 *
 * Tests composables can be imported and return the correct shapes.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import {
  useWalletCapabilities,
  useSendCalls,
  useAtomicBatch,
  useCallsStatus,
} from '../composables/useEIP5792.js';

// Mock the useCinacoin context getter
vi.mock('../composables.js', () => ({
  useCinacoin: () => ({
    config: {},
    connectors: ref([]),
    account: ref({ address: null, balance: '0', chainId: 1, chainSymbol: 'ETH' }),
    status: ref('disconnected'),
    connect: vi.fn(),
    disconnect: vi.fn(),
    switchChain: vi.fn(),
    isSwitchingChain: ref(false),
  }),
}));

describe('useWalletCapabilities', () => {
  it('returns the correct shape with reactive refs', () => {
    // Mock the global context
    const mockContext = {
      provider: null,
      address: null,
      chainIdHex: null,
      isConnected: false,
    };
    (globalThis as any).__ocx_eip5792_context = () => mockContext;

    const result = useWalletCapabilities();

    expect(result).toHaveProperty('capabilities');
    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('refetch');
    expect(result).toHaveProperty('has');
    expect(result).toHaveProperty('getChainCaps');
    expect(result).toHaveProperty('supportedChains');
    expect(result).toHaveProperty('filterBy');
    expect(typeof result.refetch).toBe('function');
    expect(typeof result.has).toBe('function');
    expect(typeof result.getChainCaps).toBe('function');
    expect(typeof result.filterBy).toBe('function');

    delete (globalThis as any).__ocx_eip5792_context;
  });
});

describe('useSendCalls', () => {
  it('returns the correct shape with reactive refs', () => {
    const mockContext = {
      provider: null,
      address: null,
      chainIdHex: null,
      isConnected: false,
    };
    (globalThis as any).__ocx_eip5792_context = () => mockContext;

    const result = useSendCalls();

    expect(result).toHaveProperty('sendCalls');
    expect(result).toHaveProperty('isSending');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('lastCallId');
    expect(typeof result.sendCalls).toBe('function');

    delete (globalThis as any).__ocx_eip5792_context;
  });

  it('throws when no wallet is connected', async () => {
    const mockContext = {
      provider: null,
      address: null,
      chainIdHex: '0x1',
      isConnected: false,
    };
    (globalThis as any).__ocx_eip5792_context = () => mockContext;

    const { sendCalls } = useSendCalls();

    await expect(sendCalls([])).rejects.toThrow('No wallet connected');

    delete (globalThis as any).__ocx_eip5792_context;
  });
});

describe('useAtomicBatch', () => {
  it('returns the correct shape with reactive refs', () => {
    const mockContext = {
      provider: null,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainIdHex: '0x1',
      isConnected: false,
    };
    (globalThis as any).__ocx_eip5792_context = () => mockContext;

    const result = useAtomicBatch();

    expect(result).toHaveProperty('executeBatch');
    expect(result).toHaveProperty('buildBatch');
    expect(result).toHaveProperty('isExecuting');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('lastCallId');
    expect(result).toHaveProperty('isAtomicSupported');
    expect(typeof result.executeBatch).toBe('function');
    expect(typeof result.buildBatch).toBe('function');
    // 0x1 is in KNOWN_ATOMIC_CHAINS
    expect(result.isAtomicSupported.value).toBe(true);

    delete (globalThis as any).__ocx_eip5792_context;
  });
});

describe('useCallsStatus', () => {
  it('returns the correct shape with reactive refs', () => {
    const mockContext = {
      provider: null,
      address: null,
      chainIdHex: null,
      isConnected: false,
    };
    (globalThis as any).__ocx_eip5792_context = () => mockContext;

    const result = useCallsStatus();

    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('result');
    expect(result).toHaveProperty('isPolling');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('startPolling');
    expect(result).toHaveProperty('stopPolling');
    expect(result).toHaveProperty('allSucceeded');
    expect(result).toHaveProperty('failedReceipts');
    expect(typeof result.startPolling).toBe('function');
    expect(typeof result.stopPolling).toBe('function');

    delete (globalThis as any).__ocx_eip5792_context;
  });

  it('stopPolling clears the polling state', () => {
    const mockContext = {
      provider: null,
      address: null,
      chainIdHex: null,
      isConnected: false,
    };
    (globalThis as any).__ocx_eip5792_context = () => mockContext;

    const { stopPolling, isPolling } = useCallsStatus();
    stopPolling();
    expect(isPolling.value).toBe(false);

    delete (globalThis as any).__ocx_eip5792_context;
  });
});
