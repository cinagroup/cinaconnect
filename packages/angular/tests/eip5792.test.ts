/**
 * Tests for EIP-5792 service, standalone components, and exports — @cinacoin/angular.
 *
 * Covers Eip5792Service capabilities, sendCalls, atomicBatch,
 * getCallsStatus, helpers, SSR guards, and standalone migration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock Angular core ───────────────────────────────────────────────────────

const mockComponent = vi.fn((meta: any) => (cls: any) => {
  // Attach metadata so we can assert on standalone/imports
  (cls as any).__ngComponentMeta = meta;
  return cls;
});

vi.mock('@angular/core', () => ({
  Injectable: () => (cls: any) => cls,
  Inject: () => (target: any, propertyKey: string, parameterIndex: number) => {},
  NgModule: () => (cls: any) => cls,
  InjectionToken: (name: string) => name,
  OnDestroy: class {},
  ModuleWithProviders: class {},
  PLATFORM_ID: 'platformId',
  Component: mockComponent,
  Input: () => (target: any, propertyKey: string) => {},
  HostListener: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {},
  ElementRef: class {},
  Renderer2: class {},
  Pipe: () => (cls: any) => cls,
  Directive: () => (cls: any) => cls,
}));

vi.mock('@angular/common', () => ({
  CommonModule: {},
  isPlatformBrowser: vi.fn((platformId: string) => platformId === 'browser'),
}));

// ─── Mock RxJS ───────────────────────────────────────────────────────────────

class MockReplaySubject<T> {
  _value: T | null = null;
  _observers: Array<(v: T) => void> = [];
  constructor(bufferSize?: number) {}
  asObservable() {
    return { subscribe: vi.fn((fn: (v: T) => void) => { this._observers.push(fn); if (this._value != null) fn(this._value); }) };
  }
  next(val: T) { this._value = val; this._observers.forEach(fn => fn(val)); }
  complete() {}
  get value() { return this._value; }
}

class MockBehaviorSubject<T> {
  _value: T;
  _observers: Array<(v: T) => void> = [];
  constructor(initialValue: T) { this._value = initialValue; }
  asObservable() {
    return { subscribe: vi.fn((fn: (v: T) => void) => { this._observers.push(fn); fn(this._value); }) };
  }
  next(val: T) { this._value = val; this._observers.forEach(fn => fn(val)); }
  complete() {}
  get value() { return this._value; }
}

const mockTimer = vi.fn(() => ({ pipe: vi.fn(() => ({ subscribe: vi.fn() })) }));
const mockFrom = vi.fn((p: Promise<any>) => p);
const mockDefer = vi.fn((factory: () => Promise<any>) => ({
  pipe: vi.fn(() => ({
    subscribe: vi.fn(),
  })),
}));
const mockEmpty = {};
const mockThrowError = vi.fn((fn: () => Error) => ({ pipe: vi.fn() }));

vi.mock('rxjs', () => ({
  Observable: class {},
  ReplaySubject: vi.fn(() => new MockReplaySubject()),
  BehaviorSubject: vi.fn((val: any) => new MockBehaviorSubject(val)),
  from: (...args: any[]) => mockFrom(...args),
  timer: mockTimer,
  EMPTY: mockEmpty,
  throwError: mockThrowError,
  defer: mockDefer,
}));

vi.mock('rxjs/operators', () => ({
  switchMap: vi.fn((fn: any) => fn),
  catchError: vi.fn((fn: any) => fn),
  takeWhile: vi.fn(),
  tap: vi.fn((fn: any) => fn),
  shareReplay: vi.fn(),
  map: vi.fn((fn: any) => fn),
  filter: vi.fn(),
  take: vi.fn(),
}));

// ─── Mock Connector & Core SDK ───────────────────────────────────────────────

const mockProvider = {
  on: vi.fn(),
  removeListener: vi.fn(),
  request: vi.fn().mockResolvedValue({ id: 'batch-123' }),
};

const mockConnector = {
  on: vi.fn(),
  off: vi.fn(),
  connect: vi.fn().mockResolvedValue({
    accounts: ['0x1234567890abcdef1234567890abcdef12345678'],
    chainId: 1,
  }),
  disconnect: vi.fn().mockResolvedValue(undefined),
  getAccounts: vi.fn().mockResolvedValue(['0x1234']),
  getChainId: vi.fn().mockReturnValue(1),
  getProvider: vi.fn().mockReturnValue(mockProvider),
};

const mockCapabilities: any = {
  '0x1': {
    paymasterService: { supported: true },
    atomicBatch: { supported: true },
  },
  '0x89': {
    paymasterService: { supported: false },
  },
};

vi.mock('@cinacoin/core-sdk', async () => {
  return {
    Connector: vi.fn().mockImplementation(() => mockConnector),
    CinacoinCore: vi.fn().mockImplementation(() => ({
      getConnector: () => mockConnector,
    })),
    walletGetCapabilities: vi.fn().mockResolvedValue(mockCapabilities),
    walletSendCalls: vi.fn().mockResolvedValue({ id: 'batch-123' }),
    walletGetCallsStatus: vi.fn().mockResolvedValue({
      status: 'CONFIRMED',
      receipts: [{ id: 'call-1', receipt: { status: '0x1', transactionHash: '0xtx' } }],
    }),
    buildAtomicBatch: vi.fn().mockReturnValue({
      params: { version: '1.0.0', calls: [], chainId: '0x1', from: '0xaddr' },
      isAtomic: true,
    }),
    executeAtomicBatch: vi.fn().mockResolvedValue({ id: 'atomic-batch-456' }),
    supportsAtomicBatch: vi.fn((chainId: string) => chainId === '0x1' || chainId === '0x89'),
    hasCapability: vi.fn((caps: any, chainId: string, cap: string) => {
      return caps[chainId]?.[cap]?.supported === true;
    }),
    getChainCapabilities: vi.fn((caps: any, chainId: string) => caps[chainId] ?? {}),
    getSupportedChains: vi.fn((caps: any) => Object.keys(caps)),
    filterByCapability: vi.fn((caps: any, cap: string) => {
      const result: any = {};
      for (const [chainId, chainCaps] of Object.entries(caps)) {
        if ((chainCaps as any)[cap]?.supported) {
          result[chainId] = chainCaps;
        }
      }
      return result;
    }),
    allCallsSucceeded: vi.fn((result: any) => {
      if (result.status !== 'CONFIRMED') return false;
      if (!result.receipts || result.receipts.length === 0) return false;
      return result.receipts.every((r: any) => r.receipt.status === '0x1');
    }),
    getFailedReceipts: vi.fn((result: any) => {
      if (result.status !== 'CONFIRMED' || !result.receipts) return [];
      return result.receipts.filter((r: any) => r.receipt.status === '0x0');
    }),
  };
});

// ─── Mock injection tokens ──────────────────────────────────────────────────

vi.mock('../src/lib/cinacoin.tokens.js', () => ({
  CINA_CONNECT_INSTANCE: 'CINA_CONNECT_INSTANCE',
  CINA_CONNECT_OPTIONS: 'CINA_CONNECT_OPTIONS',
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Eip5792Service', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.resetModules());

  describe('Constructor & initialization', () => {
    it('should create Eip5792Service in browser mode', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      expect(service).toBeDefined();
    });

    it('should create Eip5792Service in SSR mode', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'server');
      expect(service).toBeDefined();
    });

    it('should set up event listeners in browser mode', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      new Eip5792Service(mockConnector as any, 'browser');
      expect(mockProvider.on).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
      expect(mockProvider.on).toHaveBeenCalledWith('chainChanged', expect.any(Function));
      expect(mockProvider.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should not set up event listeners in SSR mode', async () => {
      vi.clearAllMocks();
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      new Eip5792Service(mockConnector as any, 'server');
      expect(mockProvider.on).not.toHaveBeenCalled();
    });
  });

  describe('Reactive observables', () => {
    it('should expose walletCapabilities$', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      expect(service.walletCapabilities$).toBeDefined();
    });

    it('should expose address$', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      expect(service.address$).toBeDefined();
    });

    it('should expose chainIdHex$', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      expect(service.chainIdHex$).toBeDefined();
    });

    it('should expose isConnected$', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      expect(service.isConnected$).toBeDefined();
    });
  });

  describe('SSR guards', () => {
    it('fetchWalletCapabilities should return EMPTY on server', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'server');
      const result = service.fetchWalletCapabilities();
      expect(result).toBe(mockEmpty);
    });

    it('sendCalls should return EMPTY on server', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'server');
      const result = service.sendCalls([]);
      expect(result).toBe(mockEmpty);
    });

    it('atomicBatch should return EMPTY on server', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'server');
      const result = service.atomicBatch([]);
      expect(result).toBe(mockEmpty);
    });

    it('getCallsStatus should return EMPTY on server', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'server');
      const result = service.getCallsStatus('batch-123');
      expect(result).toBe(mockEmpty);
    });
  });

  describe('Helper methods', () => {
    it('has() should return true when capability is supported', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      const result = service.has(mockCapabilities, '0x1', 'paymasterService');
      expect(result).toBe(true);
    });

    it('has() should return false when capability is not supported', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      const result = service.has(mockCapabilities, '0x89', 'paymasterService');
      expect(result).toBe(false);
    });

    it('has() should return false for null capabilities', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      const result = service.has(null, '0x1', 'atomicBatch');
      expect(result).toBe(false);
    });

    it('getChainCaps() should return chain-specific capabilities', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      const result = service.getChainCaps(mockCapabilities, '0x1');
      expect(result).toEqual({
        paymasterService: { supported: true },
        atomicBatch: { supported: true },
      });
    });

    it('getChainCaps() should return empty for unknown chain', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      const result = service.getChainCaps(mockCapabilities, '0x999');
      expect(result).toEqual({});
    });

    it('filterBy() should return only chains with the capability', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      const result = service.filterBy(mockCapabilities, 'paymasterService');
      expect(Object.keys(result)).toContain('0x1');
      expect(Object.keys(result)).not.toContain('0x89');
    });

    it('filterBy() should return empty for null capabilities', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      const result = service.filterBy(null, 'atomicBatch');
      expect(result).toEqual({});
    });

    it('getSupportedChains() should return all chain keys', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      const result = service.getSupportedChains(mockCapabilities);
      expect(result).toContain('0x1');
      expect(result).toContain('0x89');
    });

    it('getSupportedChains() should return empty for null', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      const result = service.getSupportedChains(null);
      expect(result).toEqual([]);
    });
  });

  describe('isAtomicSupported', () => {
    it('should return true for supported chain', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      expect(service.isAtomicSupported('0x1')).toBe(true);
    });

    it('should return false for unsupported chain', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      expect(service.isAtomicSupported('0x999')).toBe(false);
    });
  });

  describe('buildBatch', () => {
    it('should build atomic batch params', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      // Simulate a connected address
      (service as any)._address.next('0x1234567890abcdef1234567890abcdef12345678');
      const result = service.buildBatch([]);
      expect(result).toBeDefined();
      expect(result.isAtomic).toBe(true);
      expect(result.params).toBeDefined();
    });
  });

  describe('allSucceeded helper', () => {
    it('should return true for confirmed batch with all successes', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      const result = service.allSucceeded({
        status: 'CONFIRMED',
        receipts: [
          { id: '1', receipt: { status: '0x1', transactionHash: '0xtx' } },
        ],
      });
      expect(result).toBe(true);
    });

    it('should return false for pending batch', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      const result = service.allSucceeded({
        status: 'PENDING',
        receipts: [],
      });
      expect(result).toBe(false);
    });

    it('should return false for null result', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      const result = service.allSucceeded(null);
      expect(result).toBe(false);
    });
  });

  describe('failedReceipts helper', () => {
    it('should return failed receipts', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      const result = service.failedReceipts({
        status: 'CONFIRMED',
        receipts: [
          { id: '1', receipt: { status: '0x1', transactionHash: '0xtx1' } },
          { id: '2', receipt: { status: '0x0', transactionHash: '0xtx2' } },
        ],
      });
      expect(result).toHaveLength(1);
      expect(result![0].id).toBe('2');
    });

    it('should return empty for null result', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      const result = service.failedReceipts(null);
      expect(result).toEqual([]);
    });
  });

  describe('ngOnDestroy', () => {
    it('should call ngOnDestroy without error', async () => {
      const { Eip5792Service } = await import('../src/lib/eip5792/eip5792.service.js');
      const service = new Eip5792Service(mockConnector as any, 'browser');
      expect(() => service.ngOnDestroy()).not.toThrow();
    });
  });
});

describe('EIP-5792 Exports (source verification)', () => {
  it('should export Eip5792Service from index.ts', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      require.resolve('../src/index.ts'),
      'utf-8',
    );
    expect(src).toContain("Eip5792Service");
    expect(src).toContain("SendCallsResultObs");
    expect(src).toContain("SendCallsOptions");
    expect(src).toContain("AtomicBatchOptions");
    expect(src).toContain("CallsStatusObs");
  });

  it('should export Eip5792Service from eip5792/index.ts', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      require.resolve('../src/lib/eip5792/index.ts'),
      'utf-8',
    );
    expect(src).toContain("Eip5792Service");
  });

  it('should export Eip5792Service from cinacoin.module.ts', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      require.resolve('../src/lib/cinacoin.module.ts'),
      'utf-8',
    );
    expect(src).toContain("export { Eip5792Service }");
  });
});

describe('Standalone Components (source verification)', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.resetModules());

  it('ConnectButtonComponent source should contain standalone: true', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      require.resolve('../src/lib/components/connect-button.component.ts'),
      'utf-8',
    );
    expect(src).toContain('standalone: true');
  });

  it('AccountButtonComponent source should contain standalone: true', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      require.resolve('../src/lib/components/account-button.component.ts'),
      'utf-8',
    );
    expect(src).toContain('standalone: true');
  });

  it('NetworkButtonComponent source should contain standalone: true', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      require.resolve('../src/lib/components/network-button.component.ts'),
      'utf-8',
    );
    expect(src).toContain('standalone: true');
  });

  it('ConnectButtonComponent should import CommonModule', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      require.resolve('../src/lib/components/connect-button.component.ts'),
      'utf-8',
    );
    expect(src).toContain("import { CommonModule } from '@angular/common'");
    expect(src).toContain('imports: [CommonModule]');
  });

  it('AccountButtonComponent should import CommonModule', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      require.resolve('../src/lib/components/account-button.component.ts'),
      'utf-8',
    );
    expect(src).toContain("import { CommonModule } from '@angular/common'");
    expect(src).toContain('imports: [CommonModule]');
  });

  it('NetworkButtonComponent should import CommonModule', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      require.resolve('../src/lib/components/network-button.component.ts'),
      'utf-8',
    );
    expect(src).toContain("import { CommonModule } from '@angular/common'");
    expect(src).toContain('imports: [CommonModule]');
  });
});

describe('Module backward compatibility', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.resetModules());

  it('CinacoinModule should still export forRoot', async () => {
    const { CinacoinModule } = await import('../src/lib/cinacoin.module.js');
    expect(typeof CinacoinModule.forRoot).toBe('function');
  });

  it('CinacoinModule should import standalone components in imports array', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      require.resolve('../src/lib/cinacoin.module.ts'),
      'utf-8',
    );
    // Should NOT have button components in declarations (only in imports)
    const declarationsMatch = src.match(/declarations:\s*\[([\s\S]*?)\]/);
    expect(declarationsMatch).not.toBeNull();
    const declarationsBlock = declarationsMatch![1];
    expect(declarationsBlock).not.toContain('ConnectButtonComponent');
    expect(declarationsBlock).not.toContain('AccountButtonComponent');
    expect(declarationsBlock).not.toContain('NetworkButtonComponent');
    // Should have them in imports
    expect(src).toContain('ConnectButtonComponent');
    expect(src).toContain('AccountButtonComponent');
    expect(src).toContain('NetworkButtonComponent');
  });

  it('CinacoinModule should still declare pipes and directive', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      require.resolve('../src/lib/cinacoin.module.ts'),
      'utf-8',
    );
    expect(src).toContain('declarations:');
    expect(src).toContain('AddressPipe');
    expect(src).toContain('BalancePipe');
    expect(src).toContain('ConnectDirective');
  });
});
