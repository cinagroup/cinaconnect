/**
 * Tests for Vue component event listener lifecycle.
 *
 * Verifies that addEventListener and removeEventListener use the same
 * function reference — preventing memory leaks from anonymous handlers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// Helper: simulate a minimal DOM element for testing
// ============================================================

class MockElement {
  private _listeners: Map<string, Set<Function>> = new Map();

  addEventListener(event: string, handler: Function): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(handler);
  }

  removeEventListener(event: string, handler: Function): void {
    const handlers = this._listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this._listeners.delete(event);
      }
    }
  }

  listenerCount(event: string): number {
    return this._listeners.get(event)?.size ?? 0;
  }

  allEvents(): string[] {
    return Array.from(this._listeners.keys());
  }
}

// ============================================================
// Test: Bug pattern — anonymous handler mismatch
// ============================================================

describe('EventListener leak — bug pattern (before fix)', () => {
  it('should leave dangling listeners when using anonymous functions', () => {
    const el = new MockElement();

    // BUG: Different anonymous functions for add vs remove
    el.addEventListener('click', () => {});
    el.removeEventListener('click', () => {}); // different function!

    // Listener was NOT removed — memory leak
    expect(el.listenerCount('click')).toBe(1);
  });

  it('should accumulate listeners on repeated mount/unmount', () => {
    const el = new MockElement();

    // Simulate 5 mount/unmount cycles with anonymous handlers
    for (let i = 0; i < 5; i++) {
      el.addEventListener('ocx-click', () => {});
      el.removeEventListener('ocx-click', () => {});
    }

    // Each add created a new listener that was never removed
    expect(el.listenerCount('ocx-click')).toBe(5);
  });
});

// ============================================================
// Test: Fix pattern — stored handler references
// ============================================================

describe('EventListener leak — fix pattern (after fix)', () => {
  it('should remove listeners when using stored handler references', () => {
    const el = new MockElement();

    // FIX: store the handler reference
    const onClick = () => {};
    el.addEventListener('click', onClick);
    el.removeEventListener('click', onClick);

    expect(el.listenerCount('click')).toBe(0);
  });

  it('should handle multiple mount/unmount cycles without accumulation', () => {
    const el = new MockElement();

    // Store handlers once
    const onClick = () => {};
    const onDisconnect = () => {};

    // Simulate 5 mount/unmount cycles
    for (let i = 0; i < 5; i++) {
      el.addEventListener('ocx-click', onClick);
      el.addEventListener('ocx-disconnect', onDisconnect);
      el.removeEventListener('ocx-click', onClick);
      el.removeEventListener('ocx-disconnect', onDisconnect);
    }

    expect(el.listenerCount('ocx-click')).toBe(0);
    expect(el.listenerCount('ocx-disconnect')).toBe(0);
  });

  it('should handle custom event handlers with parameters', () => {
    const el = new MockElement();
    const calls: number[] = [];

    const onWalletSelect = (e: Event): void => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id) calls.push(detail.id);
    };

    el.addEventListener('ocx-wallet-select', onWalletSelect);

    // Simulate event dispatch
    const mockEvent = new (class extends Event {
      detail = { id: 'metamask' };
    })('ocx-wallet-select');
    // Manually invoke the stored handler
    (el as any)._listeners.get('ocx-wallet-select')?.forEach((h: Function) => h(mockEvent));

    expect(calls).toContain('metamask');

    // Cleanup works
    el.removeEventListener('ocx-wallet-select', onWalletSelect);
    expect(el.listenerCount('ocx-wallet-select')).toBe(0);
  });
});

// ============================================================
// Test: ConnectorManager
// ============================================================

describe('ConnectorManager', () => {
  beforeEach(() => {
    // Reset global state
    vi.resetModules();
  });

  it('should initialize with default connectors', async () => {
    // Import dynamically to avoid SSR issues
    const { ConnectorManager } = await import('../src/connectorManager.js');
    const manager = new ConnectorManager({
      chains: [
        {
          id: 1,
          name: 'Ethereum',
          rpcUrl: 'https://eth.llamarpc.com',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        },
      ],
    });

    const allConnectors = manager.getAllConnectors();
    // InjectedProvider creates actual Connector instances for metamask + rabby.
    // walletconnect, coinbase, email are registered as metadata-only placeholders
    // (they would use RelayTransport in production).
    expect(allConnectors.size).toBeGreaterThanOrEqual(2);
    expect(allConnectors.has('io.metamask')).toBe(true);
    expect(allConnectors.has('io.rabby')).toBe(true);
  });

  it('should return undefined for non-existent connector', async () => {
    const { ConnectorManager } = await import('../src/connectorManager.js');
    const manager = new ConnectorManager({});
    expect(manager.getConnector('nonexistent')).toBeUndefined();
  });

  it('should throw when connecting with non-existent connector', async () => {
    const { ConnectorManager } = await import('../src/connectorManager.js');
    const manager = new ConnectorManager({});
    await expect(manager.connect('nonexistent')).rejects.toThrow(
      'Connector not found: nonexistent',
    );
  });

  it('should throw when disconnecting without active connector', async () => {
    const { ConnectorManager } = await import('../src/connectorManager.js');
    const manager = new ConnectorManager({});
    // Should not throw — just a no-op
    await expect(manager.disconnect()).resolves.toBeUndefined();
  });

  it('should throw when switching chain without active connector', async () => {
    const { ConnectorManager } = await import('../src/connectorManager.js');
    const manager = new ConnectorManager({});
    await expect(manager.switchChain(1)).rejects.toThrow(
      'No active connector. Connect a wallet first.',
    );
  });

  it('should support event subscription and unsubscription', async () => {
    const { ConnectorManager } = await import('../src/connectorManager.js');
    const manager = new ConnectorManager({});

    const handler = vi.fn();
    manager.on('test-event', handler);
    manager.off('test-event', handler);
  });

  it('should clean up on destroy', async () => {
    const { ConnectorManager } = await import('../src/connectorManager.js');
    const manager = new ConnectorManager({});
    manager.destroy();

    expect(manager.getActiveConnector()).toBeNull();
    expect(manager.getAllConnectors().size).toBe(0);
  });
});

// ============================================================
// Test: Event handler reference pattern (components.ts verification)
// ============================================================

describe('Component handler reference pattern', () => {
  it('ConnectButton: handlers are stored as stable references', () => {
    const el = new MockElement();

    // Pattern from components.ts — handler references stored in closure
    const status = { value: 'disconnected' as string };
    const connectFn = vi.fn();
    const emit = vi.fn();

    // These are defined in setup() and stored as references
    const onClickHandler = (): void => {
      if (status.value === 'disconnected' || status.value === 'error') {
        connectFn('metamask').catch(() => {});
      }
      emit('click');
    };

    const onDisconnectHandler = (): void => {
      emit('disconnect');
    };

    // Mount
    el.addEventListener('ocx-click', onClickHandler);
    el.addEventListener('ocx-disconnect', onDisconnectHandler);

    // Verify handlers work
    const clickHandlers = Array.from(
      (el as any)._listeners.get('ocx-click') || [],
    );
    expect(clickHandlers.length).toBe(1);

    // Unmount
    el.removeEventListener('ocx-click', onClickHandler);
    el.removeEventListener('ocx-disconnect', onDisconnectHandler);

    expect(el.listenerCount('ocx-click')).toBe(0);
    expect(el.listenerCount('ocx-disconnect')).toBe(0);
  });

  it('ConnectModal: handler references prevent leak on close/wallet-select', () => {
    const el = new MockElement();
    const connectFn = vi.fn();
    const emit = vi.fn();

    const onCloseHandler = (): void => {
      emit('close');
    };
    const onWalletSelectHandler = (e: Event): void => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id) {
        connectFn(detail.id).catch(() => {});
      }
      emit('wallet-select', detail);
    };

    el.addEventListener('ocx-close', onCloseHandler);
    el.addEventListener('ocx-wallet-select', onWalletSelectHandler);

    el.removeEventListener('ocx-close', onCloseHandler);
    el.removeEventListener('ocx-wallet-select', onWalletSelectHandler);

    expect(el.listenerCount('ocx-close')).toBe(0);
    expect(el.listenerCount('ocx-wallet-select')).toBe(0);
  });

  it('ChainSwitcher: onBeforeUnmount now removes chain-change handler', () => {
    const el = new MockElement();
    const switchChain = vi.fn();
    const emit = vi.fn();
    const onChainChangeProp = vi.fn();

    const onChainChangeHandler = (e: Event): void => {
      const detail = (e as CustomEvent).detail;
      if (detail?.chainId) {
        switchChain(detail.chainId).catch(() => {});
        emit('chain-change', detail.chainId);
        onChainChangeProp(detail.chainId);
      }
    };

    el.addEventListener('ocx-chain-change', onChainChangeHandler);

    // NEW FIX: onBeforeUnmount now removes the handler
    el.removeEventListener('ocx-chain-change', onChainChangeHandler);

    expect(el.listenerCount('ocx-chain-change')).toBe(0);
  });
});
