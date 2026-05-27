/**
 * Tests for @cinacoin/angular — module, service, tokens, and exports.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock Angular core ───────────────────────────────────────────────────────

vi.mock('@angular/core', () => ({
  Injectable: () => (cls: any) => cls,
  Inject: () => (target: any, propertyKey: string, parameterIndex: number) => {},
  NgModule: () => (cls: any) => cls,
  InjectionToken: (name: string) => name,
  OnDestroy: class {},
  ModuleWithProviders: class {},
}));

vi.mock('@angular/common', () => ({
  CommonModule: {},
}));

// ─── Mock RxJS ───────────────────────────────────────────────────────────────

const mockSubject = (initialValue?: any) => ({
  asObservable: vi.fn(() => ({ subscribe: vi.fn() })),
  next: vi.fn(),
  complete: vi.fn(),
  value: initialValue ?? { address: null, chainId: null },
});

vi.mock('rxjs', () => ({
  Observable: class {},
  ReplaySubject: vi.fn(() => mockSubject()),
  BehaviorSubject: vi.fn((val: any) => mockSubject(val)),
  from: vi.fn(),
  EMPTY: {},
}));

vi.mock('rxjs/operators', () => ({
  switchMap: vi.fn(),
  catchError: vi.fn(),
}));

// ─── Mock Connector & Core SDK ───────────────────────────────────────────────

const mockProvider = {
  on: vi.fn(),
  removeListener: vi.fn(),
  request: vi.fn().mockResolvedValue('0xsignature'),
};

const mockConnector = {
  on: vi.fn(),
  off: vi.fn(),
  connect: vi.fn().mockResolvedValue({
    accounts: ['0x1234567890abcdef1234567890abcdef12345678'],
    chainId: 1,
  }),
  disconnect: vi.fn().mockResolvedValue(undefined),
  switchChain: vi.fn().mockResolvedValue(undefined),
  getAccounts: vi.fn().mockResolvedValue(['0x1234']),
  getChainId: vi.fn().mockReturnValue(1),
  getProvider: vi.fn().mockReturnValue(mockProvider),
};

vi.mock('@cinacoin/core-sdk', () => ({
  Connector: vi.fn().mockImplementation(() => mockConnector),
  CinacoinCore: vi.fn().mockImplementation(() => ({
    getConnector: () => mockConnector,
  })),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CinacoinModule', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.resetModules());

  it('should export CinacoinModule', async () => {
    const { CinacoinModule } = await import('../src/lib/cinacoin.module.js');
    expect(CinacoinModule).toBeDefined();
  });

  it('should have forRoot static method', async () => {
    const { CinacoinModule } = await import('../src/lib/cinacoin.module.js');
    expect(typeof CinacoinModule.forRoot).toBe('function');
  });

  it('forRoot should return module with providers', async () => {
    const { CinacoinModule } = await import('../src/lib/cinacoin.module.js');

    const config = {
      projectId: 'test-project-id',
      chains: [{ id: '1', name: 'Ethereum', nativeCurrency: { symbol: 'ETH' } }],
    };

    const result = CinacoinModule.forRoot(config as any);
    expect(result).toBeDefined();
    expect(result.ngModule).toBe(CinacoinModule);
    expect(result.providers).toBeDefined();
    expect(result.providers.length).toBeGreaterThan(0);
  });

  it('forRoot should provide CINA_CONNECT_OPTIONS', async () => {
    const { CinacoinModule } = await import('../src/lib/cinacoin.module.js');
    const config = { projectId: 'abc123' };
    const result = CinacoinModule.forRoot(config as any);

    const optionsProvider = result.providers.find(
      (p: any) => p.provide === 'CINA_CONNECT_OPTIONS'
    );
    expect(optionsProvider).toBeDefined();
    expect(optionsProvider.useValue).toEqual(config);
  });

  it('forRoot factory should create connector from options', async () => {
    const { CinacoinModule } = await import('../src/lib/cinacoin.module.js');
    const config = { projectId: 'abc123', chains: [] };
    const result = CinacoinModule.forRoot(config as any);

    const instanceProvider = result.providers.find(
      (p: any) => p.provide === 'CINA_CONNECT_INSTANCE'
    );
    expect(instanceProvider).toBeDefined();
    expect(typeof instanceProvider.useFactory).toBe('function');
    expect(instanceProvider.deps).toContain('CINA_CONNECT_OPTIONS');
  });

  it('forRoot factory should return custom connector if provided', async () => {
    const { CinacoinModule } = await import('../src/lib/cinacoin.module.js');
    const customConnector = { custom: true };
    const config = { projectId: 'abc123', connector: customConnector };
    const result = CinacoinModule.forRoot(config as any);

    const instanceProvider = result.providers.find(
      (p: any) => p.provide === 'CINA_CONNECT_INSTANCE'
    );
    const factoryResult = instanceProvider.useFactory(config);
    expect(factoryResult).toBe(customConnector);
  });
});

describe('CinacoinService', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.resetModules());

  it('should export CinacoinService', async () => {
    const { CinacoinService } = await import('../src/lib/cinacoin.service.js');
    expect(CinacoinService).toBeDefined();
  });

  it('should have account$, network$, isOpen$ observables', async () => {
    const { CinacoinService } = await import('../src/lib/cinacoin.service.js');
    const service = new CinacoinService(
      { projectId: 'test', chains: [] } as any,
      mockConnector as any
    );

    expect(service.account$).toBeDefined();
    expect(service.network$).toBeDefined();
    expect(service.isOpen$).toBeDefined();
  });

  it('should have open() and close() methods', async () => {
    const { CinacoinService } = await import('../src/lib/cinacoin.service.js');
    const service = new CinacoinService(
      { projectId: 'test', chains: [] } as any,
      mockConnector as any
    );

    expect(typeof service.open).toBe('function');
    expect(typeof service.close).toBe('function');

    service.open();
    service.close();
  });

  it('should have connect() method', async () => {
    const { CinacoinService } = await import('../src/lib/cinacoin.service.js');
    const service = new CinacoinService(
      { projectId: 'test', chains: [] } as any,
      mockConnector as any
    );

    expect(typeof service.connect).toBe('function');
    await service.connect('metamask');
    expect(mockConnector.connect).toHaveBeenCalled();
  });

  it('should have disconnect() method', async () => {
    const { CinacoinService } = await import('../src/lib/cinacoin.service.js');
    const service = new CinacoinService(
      { projectId: 'test', chains: [] } as any,
      mockConnector as any
    );

    expect(typeof service.disconnect).toBe('function');
    await service.disconnect();
    expect(mockConnector.disconnect).toHaveBeenCalled();
  });

  it('should have switchChain() method', async () => {
    const { CinacoinService } = await import('../src/lib/cinacoin.service.js');
    const service = new CinacoinService(
      { projectId: 'test', chains: [] } as any,
      mockConnector as any
    );

    expect(typeof service.switchChain).toBe('function');
    await service.switchChain(1);
  });

  it('should have signMessage() method', async () => {
    const { CinacoinService } = await import('../src/lib/cinacoin.service.js');
    const service = new CinacoinService(
      { projectId: 'test', chains: [] } as any,
      mockConnector as any
    );

    expect(typeof service.signMessage).toBe('function');
  });

  it('should have sendTransaction() method', async () => {
    const { CinacoinService } = await import('../src/lib/cinacoin.service.js');
    const service = new CinacoinService(
      { projectId: 'test', chains: [] } as any,
      mockConnector as any
    );

    expect(typeof service.sendTransaction).toBe('function');
  });

  it('should have request() method', async () => {
    const { CinacoinService } = await import('../src/lib/cinacoin.service.js');
    const service = new CinacoinService(
      { projectId: 'test', chains: [] } as any,
      mockConnector as any
    );

    expect(typeof service.request).toBe('function');
  });

  it('should have ngOnDestroy lifecycle hook', async () => {
    const { CinacoinService } = await import('../src/lib/cinacoin.service.js');
    const service = new CinacoinService(
      { projectId: 'test', chains: [] } as any,
      mockConnector as any
    );

    expect(typeof service.ngOnDestroy).toBe('function');
    service.ngOnDestroy();
  });
});

describe('Tokens', () => {
  it('should export CINA_CONNECT_OPTIONS and CINA_CONNECT_INSTANCE', async () => {
    const tokens = await import('../src/lib/cinacoin.tokens.js');
    expect(tokens.CINA_CONNECT_OPTIONS).toBeDefined();
    expect(tokens.CINA_CONNECT_INSTANCE).toBeDefined();
  });
});

describe('Package exports', () => {
  it('should export module, service, and tokens from index', async () => {
    const index = await import('../src/index.js');
    expect(index.CinacoinModule).toBeDefined();
    expect(index.CinacoinService).toBeDefined();
    expect(index.CINA_CONNECT_OPTIONS).toBeDefined();
    expect(index.CINA_CONNECT_INSTANCE).toBeDefined();
  });
});
