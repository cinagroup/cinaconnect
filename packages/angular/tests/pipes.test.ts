/**
 * Tests for @cinacoin/angular — pipes (BalancePipe, AddressPipe).
 */

import { describe, it, expect } from 'vitest';

// We need to mock Angular core before importing the pipe
import { vi } from 'vitest';

vi.mock('@angular/core', () => ({
  Pipe: (meta: any) => (cls: any) => {
    // Attach metadata for inspection
    (cls as any).__pipeMeta = meta;
    return cls;
  },
  PipeTransform: class {},
}));

describe('BalancePipe', () => {
  let BalancePipe: any;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../src/lib/pipes/balance.pipe.js');
    BalancePipe = mod.BalancePipe;
  });

  it('should be defined with pipe metadata', () => {
    expect(BalancePipe).toBeDefined();
    expect((BalancePipe as any).__pipeMeta.name).toBe('cinaBalance');
  });

  it('should return "0 ETH" for null', () => {
    const pipe = new BalancePipe();
    expect(pipe.transform(null)).toBe('0 ETH');
  });

  it('should return "0 ETH" for undefined', () => {
    const pipe = new BalancePipe();
    expect(pipe.transform(undefined)).toBe('0 ETH');
  });

  it('should return "0 ETH" for empty string', () => {
    const pipe = new BalancePipe();
    expect(pipe.transform('')).toBe('0 ETH');
  });

  it('should return "0 ETH" for "0" string', () => {
    const pipe = new BalancePipe();
    expect(pipe.transform('0')).toBe('0 ETH');
  });

  it('should format 1 ETH correctly (bigint)', () => {
    const pipe = new BalancePipe();
    expect(pipe.transform(BigInt('1000000000000000000'))).toBe('1 ETH');
  });

  it('should format 0.5 ETH correctly', () => {
    const pipe = new BalancePipe();
    // 0.5 ETH = 5 * 10^17 wei
    expect(pipe.transform(BigInt('500000000000000000'))).toContain('0.5');
    expect(pipe.transform(BigInt('500000000000000000'))).toContain('ETH');
  });

  it('should format 1.5 ETH correctly', () => {
    const pipe = new BalancePipe();
    expect(pipe.transform(BigInt('1500000000000000000'))).toBe('1.5 ETH');
  });

  it('should handle string input (wei)', () => {
    const pipe = new BalancePipe();
    expect(pipe.transform('1000000000000000000')).toBe('1 ETH');
  });

  it('should handle number input', () => {
    const pipe = new BalancePipe();
    expect(pipe.transform(1000000000000000000)).toBe('1 ETH');
  });

  it('should respect decimals parameter', () => {
    const pipe = new BalancePipe();
    // 1.123456 ETH
    const result = pipe.transform(BigInt('1123456000000000000'), 2);
    expect(result).toBe('1.12 ETH');
  });

  it('should default to 4 decimals', () => {
    const pipe = new BalancePipe();
    const result = pipe.transform(BigInt('1123456789012345678'));
    // 1.1234... ETH
    expect(result).toContain('1.1234');
    expect(result).toContain('ETH');
  });

  it('should handle invalid string gracefully', () => {
    const pipe = new BalancePipe();
    expect(pipe.transform('not-a-number')).toBe('0 ETH');
  });
});

describe('AddressPipe', () => {
  let AddressPipe: any;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../src/lib/pipes/address.pipe.js');
    AddressPipe = mod.AddressPipe;
  });

  it('should be defined with pipe metadata', () => {
    expect(AddressPipe).toBeDefined();
    expect((AddressPipe as any).__pipeMeta.name).toBe('cinaAddress');
  });

  it('should return empty string for null', () => {
    const pipe = new AddressPipe();
    expect(pipe.transform(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    const pipe = new AddressPipe();
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should return empty string for empty string', () => {
    const pipe = new AddressPipe();
    expect(pipe.transform('')).toBe('');
  });

  it('should truncate a full Ethereum address', () => {
    const pipe = new AddressPipe();
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    const result = pipe.transform(addr);
    expect(result).toBe('0x1234...5678');
  });

  it('should truncate with custom char count', () => {
    const pipe = new AddressPipe();
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    const result = pipe.transform(addr, 6);
    expect(result).toBe('0x123456...345678');
  });

  it('should handle address without 0x prefix', () => {
    const pipe = new AddressPipe();
    const addr = '1234567890abcdef1234567890abcdef12345678';
    const result = pipe.transform(addr);
    expect(result).toBe('1234...5678');
  });

  it('should return full address if shorter than truncation threshold', () => {
    const pipe = new AddressPipe();
    const short = '0x1234';
    expect(pipe.transform(short)).toBe('0x1234');
  });

  it('should trim whitespace from input', () => {
    const pipe = new AddressPipe();
    const addr = '  0x1234567890abcdef1234567890abcdef12345678  ';
    const result = pipe.transform(addr);
    expect(result).toBe('0x1234...5678');
  });
});
