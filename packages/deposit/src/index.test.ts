import { describe, it, expect } from 'vitest';
import { DepositService } from './provider';
import { EXCHANGES } from './exchanges';
import { DepositStatus } from './types';
import type { ExchangeInfo } from './types';

describe('DepositService', () => {
  it('should initialize with default exchanges', () => {
    const service = new DepositService();
    const exchanges = service.getSupportedExchanges();

    expect(exchanges).toContain('binance');
    expect(exchanges).toContain('okx');
    expect(exchanges).toContain('bybit');
    expect(exchanges).toContain('kucoin');
    expect(exchanges).toContain('coinbase');
  });

  it('should accept custom exchanges', () => {
    const custom: ExchangeInfo[] = [
      {
        id: 'my-exchange',
        name: 'My Exchange',
        logo: 'https://example.com/logo.png',
        supportedAssets: [],
        supportedNetworks: ['eth'],
        feeStructure: { depositFeePercent: 0 },
        minAmount: 1,
        baseUrl: 'https://example.com/deposit',
        supportsDeepLink: false,
      },
    ];

    const service = new DepositService(custom);
    const exchanges = service.getSupportedExchanges();
    expect(exchanges).toEqual(['my-exchange']);
  });

  it('should return exchange info by id', () => {
    const service = new DepositService();
    const binance = service.getExchangeInfo('binance');

    expect(binance).toBeDefined();
    expect(binance!.id).toBe('binance');
    expect(binance!.name).toBe('Binance');
    expect(binance!.feeStructure.depositFeePercent).toBe(0);
  });

  it('should return undefined for unknown exchange', () => {
    const service = new DepositService();
    const result = service.getExchangeInfo('unknown');
    expect(result).toBeUndefined();
  });

  it('should return supported assets for an exchange', () => {
    const service = new DepositService();
    const assets = service.getSupportedAssets('binance');

    expect(assets.length).toBeGreaterThan(0);
    const symbols = assets.map((a) => a.symbol);
    expect(symbols).toContain('USDC');
    expect(symbols).toContain('USDT');
    expect(symbols).toContain('ETH');
  });

  it('should throw when requesting assets for unknown exchange', () => {
    const service = new DepositService();
    expect(() => service.getSupportedAssets('nonexistent')).toThrow(
      'Exchange "nonexistent" is not supported.'
    );
  });

  it('should return all exchanges', () => {
    const service = new DepositService();
    const all = service.getAllExchanges();
    expect(all.length).toBe(EXCHANGES.length);
  });

  it('should generate deposit URL for Binance', () => {
    const service = new DepositService();
    const url = service.getDepositUrl({
      exchangeId: 'binance',
      asset: 'USDC',
      network: 'eth',
      receivingAddress: '0x1234567890abcdef',
    });

    expect(url).toContain('binance.com');
    expect(url).toContain('coin=USDC');
    expect(url).toContain('network=ETH');
    expect(url).toContain('address=0x1234567890abcdef');
  });

  it('should generate deposit URL for OKX', () => {
    const service = new DepositService();
    const url = service.getDepositUrl({
      exchangeId: 'okx',
      asset: 'USDT',
      network: 'polygon',
    });

    expect(url).toContain('okx.com');
    expect(url).toContain('currency=usdt');
    expect(url).toContain('chain=polygon');
  });

  it('should generate deposit URL for Coinbase', () => {
    const service = new DepositService();
    const url = service.getDepositUrl({
      exchangeId: 'coinbase',
      asset: 'ETH',
      network: 'eth',
    });

    expect(url).toContain('coinbase.com');
    expect(url).toContain('asset=eth');
    expect(url).toContain('network=eth');
  });

  it('should throw when generating URL for unknown exchange', () => {
    const service = new DepositService();
    expect(() =>
      service.getDepositUrl({
        exchangeId: 'ghost',
        asset: 'USDC',
        network: 'eth',
      })
    ).toThrow('Exchange "ghost" not found.');
  });

  it('should initiate a valid deposit', () => {
    const service = new DepositService();
    const result = service.initiateDeposit({
      exchangeId: 'binance',
      asset: 'USDC',
      network: 'eth',
      amount: 100,
      receivingAddress: '0x1234567890abcdef',
    });

    expect(result.depositId).toMatch(/^dep_[a-zA-Z0-9]{16}/);
    expect(result.status).toBe(DepositStatus.PENDING);
    expect(result.exchangeId).toBe('binance');
    expect(result.asset).toBe('USDC');
    expect(result.network).toBe('eth');
    expect(result.amount).toBe(100);
    expect(result.depositUrl).toBeDefined();
    expect(result.depositUrl).toContain('binance.com');
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });

  it('should throw when deposit amount is below minimum', () => {
    const service = new DepositService();
    expect(() =>
      service.initiateDeposit({
        exchangeId: 'binance',
        asset: 'USDC',
        network: 'eth',
        amount: 5, // Below minAmount of 10
      })
    ).toThrow('Minimum deposit on Binance is 10.');
  });

  it('should throw when initiating deposit for unknown exchange', () => {
    const service = new DepositService();
    expect(() =>
      service.initiateDeposit({
        exchangeId: 'ghost',
        asset: 'USDC',
        network: 'eth',
        amount: 100,
      })
    ).toThrow('Exchange "ghost" not found.');
  });

  it('should track a deposit', () => {
    const service = new DepositService();
    const result = service.trackDeposit({
      depositId: 'dep_test123',
      exchangeId: 'binance',
    });

    expect(result.depositId).toBe('dep_test123');
    expect(result.status).toBe(DepositStatus.PROCESSING);
    expect(result.exchangeId).toBe('binance');
  });

  it('should track a deposit without exchangeId', () => {
    const service = new DepositService();
    const result = service.trackDeposit({
      depositId: 'dep_test456',
    });

    expect(result.exchangeId).toBe('unknown');
  });
});

describe('EXCHANGES', () => {
  it('should have all required exchanges configured', () => {
    const ids = EXCHANGES.map((e) => e.id);
    expect(ids).toContain('binance');
    expect(ids).toContain('okx');
    expect(ids).toContain('bybit');
    expect(ids).toContain('kucoin');
    expect(ids).toContain('coinbase');
  });

  it('should have valid fee structures', () => {
    for (const exchange of EXCHANGES) {
      expect(exchange.feeStructure.depositFeePercent).toBeGreaterThanOrEqual(0);
      expect(exchange.feeStructure.depositFeePercent).toBeLessThanOrEqual(100);
    }
  });

  it('should have positive minimum amounts', () => {
    for (const exchange of EXCHANGES) {
      expect(exchange.minAmount).toBeGreaterThan(0);
    }
  });

  it('should have valid base URLs', () => {
    for (const exchange of EXCHANGES) {
      expect(exchange.baseUrl).toMatch(/^https:\/\//);
    }
  });

  it('should have at least one supported asset per exchange', () => {
    for (const exchange of EXCHANGES) {
      expect(exchange.supportedAssets.length).toBeGreaterThan(0);
    }
  });
});
