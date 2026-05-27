/**
 * Tests for @cinacoin/custom-connectors — useConnectors hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectorFactory } from '../ConnectorFactory.js';
import type { ConnectorConfig } from '../types.js';

interface UseConnectorsReturn {
  connectors: ConnectorConfig[];
  registerConnector: (config: ConnectorConfig) => void;
  getConnector: (connectorId: string) => ConnectorConfig | undefined;
  getAllConnectors: () => ConnectorConfig[];
  unregisterConnector: (connectorId: string) => void;
}

describe('useConnectors', () => {
  let useConnectors: () => UseConnectorsReturn;

  beforeEach(() => {
    vi.resetModules();
    ConnectorFactory.clearAll();

    // Mock React hooks
    vi.mock('react', () => ({
      useState: vi.fn((init: unknown) => {
        let state = typeof init === 'function' ? init() : init;
        const setState = vi.fn((next: unknown) => {
          state = typeof next === 'function' ? next(state) : next;
        });
        return [state, setState];
      }),
      useEffect: vi.fn(() => {}),
      useCallback: vi.fn(<T extends (...args: never[]) => unknown>(fn: T) => fn),
    }));
  });

  it('should export useConnectors from package index', async () => {
    const index = await import('../index.js');
    expect(index.useConnectors).toBeDefined();
    expect(typeof index.useConnectors).toBe('function');
  });

  it('should return an object with expected methods', async () => {
    const mod = await import('../hooks/useConnectors.js');
    useConnectors = mod.useConnectors;

    // Mock useState to return initial connectors
    const result = useConnectors();

    expect(result).toHaveProperty('connectors');
    expect(result).toHaveProperty('registerConnector');
    expect(result).toHaveProperty('getConnector');
    expect(result).toHaveProperty('getAllConnectors');
    expect(result).toHaveProperty('unregisterConnector');
    expect(Array.isArray(result.connectors)).toBe(true);
    expect(typeof result.registerConnector).toBe('function');
    expect(typeof result.getConnector).toBe('function');
    expect(typeof result.getAllConnectors).toBe('function');
    expect(typeof result.unregisterConnector).toBe('function');
  });

  it('should start with empty connectors when registry is clear', async () => {
    const mod = await import('../hooks/useConnectors.js');
    useConnectors = mod.useConnectors;
    ConnectorFactory.clearAll();

    const result = useConnectors();
    expect(result.connectors).toEqual([]);
  });

  it('should include registered connectors via registerConnector callback', async () => {
    const mod = await import('../hooks/useConnectors.js');
    useConnectors = mod.useConnectors;

    const result = useConnectors();
    expect(typeof result.registerConnector).toBe('function');
    expect(typeof result.getAllConnectors).toBe('function');

    const config = {
      id: 'hook-test-wallet',
      name: 'Hook Test Wallet',
      icon: '',
      type: 'custom' as const,
      init: async () => {},
      connect: async () => ({ accounts: [], chainId: '0x1' }),
      disconnect: async () => {},
      request: async () => ({}),
      getAccounts: async () => [],
      getChainId: async () => '0x1',
      isAvailable: () => false,
      on: () => {},
      off: () => {},
    };

    // Use the hook's registerConnector to add a connector
    result.registerConnector(config);
    expect(result.getAllConnectors().length).toBeGreaterThanOrEqual(1);
    const ids = result.getAllConnectors().map((c: { id: string }) => c.id);
    expect(ids).toContain('hook-test-wallet');
  });
});
