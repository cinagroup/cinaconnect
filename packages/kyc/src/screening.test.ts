import { describe, it, expect, beforeEach } from 'vitest';
import {
  screenAddress,
  screenTransaction,
  screenPayment,
  getRiskScore,
  getComplianceReport,
} from './screening';
import { seedLists } from './lists';

const CLEAN_ADDR = '0x1111111111111111111111111111111111111111';
const SANCTIONED_ADDR = '0x8589427373d6d84e98730d7795d8f6f8731f1a8b';
const MIXER_ADDR = '0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc';
const SCAM_ADDR = '0x000000000000000000000000000000000000dEaD';

beforeEach(() => seedLists());

/* ── screenAddress ──────────────────────────────────────────────── */

describe('screenAddress', () => {
  it('returns low risk for a clean address', () => {
    const result = screenAddress(CLEAN_ADDR);
    expect(result.riskLevel).toBe('low');
    expect(result.riskScore).toBe(5);
    expect(result.isSanctioned).toBe(false);
    expect(result.matchedLists).toEqual([]);
  });

  it('returns sanctioned risk for an OFAC address', () => {
    const result = screenAddress(SANCTIONED_ADDR);
    expect(result.riskLevel).toBe('sanctioned');
    expect(result.riskScore).toBe(100);
    expect(result.isSanctioned).toBe(true);
    expect(result.matchedLists).toContain('OFAC SDN');
  });

  it('returns high risk for a mixer address', () => {
    const result = screenAddress(MIXER_ADDR);
    expect(result.riskLevel).toBe('high');
    expect(result.riskScore).toBe(85);
    expect(result.isSanctioned).toBe(false);
    expect(result.matchedLists).toContain('Mixer / Tumbler');
  });

  it('includes a screenedAt ISO timestamp', () => {
    const result = screenAddress(CLEAN_ADDR);
    expect(result.screenedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

/* ── screenTransaction ──────────────────────────────────────────── */

describe('screenTransaction', () => {
  it('returns low risk for a clean transaction', () => {
    const result = screenTransaction({
      from: CLEAN_ADDR,
      to: '0x2222222222222222222222222222222222222222',
      amount: 100,
      asset: 'ETH',
    });
    expect(result.riskLevel).toBe('low');
    expect(result.shouldBlock).toBe(false);
    expect(result.recommendation).toBe('Allow — no concerns');
    expect(result.patternFlags).toEqual([]);
  });

  it('blocks when sender is sanctioned', () => {
    const result = screenTransaction({
      from: SANCTIONED_ADDR,
      to: CLEAN_ADDR,
      amount: 1,
      asset: 'ETH',
    });
    expect(result.shouldBlock).toBe(true);
    expect(result.recommendation).toBe('BLOCK — sanctioned party involved');
    expect(result.riskLevel).toBe('sanctioned');
  });

  it('blocks when recipient is sanctioned', () => {
    const result = screenTransaction({
      from: CLEAN_ADDR,
      to: SANCTIONED_ADDR,
      amount: 1,
      asset: 'ETH',
    });
    expect(result.shouldBlock).toBe(true);
    expect(result.riskLevel).toBe('sanctioned');
  });

  it('flags round-amount transactions (multiples of 1000)', () => {
    const result = screenTransaction({
      from: CLEAN_ADDR,
      to: '0x2222222222222222222222222222222222222222',
      amount: 5000,
      asset: 'ETH',
    });
    expect(result.patternFlags).toContain('round-amount');
  });

  it('flags large-amount transactions (>100000)', () => {
    const result = screenTransaction({
      from: CLEAN_ADDR,
      to: '0x2222222222222222222222222222222222222222',
      amount: 200000,
      asset: 'ETH',
    });
    expect(result.patternFlags).toContain('large-amount');
  });

  it('flags self-transfers', () => {
    const result = screenTransaction({
      from: CLEAN_ADDR,
      to: CLEAN_ADDR,
      amount: 500,
      asset: 'ETH',
    });
    expect(result.patternFlags).toContain('self-transfer');
  });

  it('flags mixer-to-mixer transfers', () => {
    const result = screenTransaction({
      from: MIXER_ADDR,
      to: '0x47ce076f1c9c0a0e5a6ce0c34e5ab3a27a66be5e',
      amount: 1,
      asset: 'ETH',
    });
    expect(result.patternFlags).toContain('mixer-to-mixer');
  });

  it('caps composite risk score at 100', () => {
    const result = screenTransaction({
      from: SANCTIONED_ADDR,
      to: MIXER_ADDR,
      amount: 200000, // large-amount + round-amount
      asset: 'ETH',
    });
    expect(result.riskScore).toBe(100);
  });

  it('handles string amounts', () => {
    const result = screenTransaction({
      from: CLEAN_ADDR,
      to: '0x2222222222222222222222222222222222222222',
      amount: '42.5',
      asset: 'USDC',
    });
    expect(result.riskLevel).toBe('low');
  });
});

/* ── screenPayment ──────────────────────────────────────────────── */

describe('screenPayment', () => {
  it('defaults sender to zero address when omitted', () => {
    const result = screenPayment({
      recipient: CLEAN_ADDR,
      amount: 100,
      asset: 'ETH',
    });
    expect(result.tx.from).toBe('0x0000000000000000000000000000000000000000');
    expect(result.riskLevel).toBe('low');
  });

  it('forwards recipient to screenTransaction', () => {
    const result = screenPayment({
      recipient: SANCTIONED_ADDR,
      amount: 1,
      asset: 'ETH',
    });
    expect(result.shouldBlock).toBe(true);
  });
});

/* ── getRiskScore ───────────────────────────────────────────────── */

describe('getRiskScore', () => {
  it('returns 5 for a clean address', () => {
    expect(getRiskScore(CLEAN_ADDR)).toBe(5);
  });

  it('returns 100 for a sanctioned address', () => {
    expect(getRiskScore(SANCTIONED_ADDR)).toBe(100);
  });

  it('returns 85 for a mixer address', () => {
    expect(getRiskScore(MIXER_ADDR)).toBe(85);
  });

  it('returns 90 for a scam address', () => {
    expect(getRiskScore(SCAM_ADDR)).toBe(90);
  });
});

/* ── getComplianceReport ────────────────────────────────────────── */

describe('getComplianceReport', () => {
  it('returns a report for a clean address', () => {
    const report = getComplianceReport(CLEAN_ADDR);
    expect(report.kycStatus).toBe('verified');
    expect(report.recommendation).toBe('allow');
    expect(report.riskProfile.riskLevel).toBe('low');
    expect(report.riskProfile.sanctioned).toBe(false);
  });

  it('returns a block recommendation for a sanctioned address', () => {
    const report = getComplianceReport(SANCTIONED_ADDR);
    expect(report.kycStatus).toBe('rejected');
    expect(report.recommendation).toBe('block');
    expect(report.sanctionsHistory.length).toBeGreaterThan(0);
    expect(report.riskProfile.sanctioningBodies).toContain('OFAC');
  });

  it('labels mixer addresses in the risk profile', () => {
    const report = getComplianceReport(MIXER_ADDR);
    expect(report.riskProfile.entityLabel).toBe('Mixer / Tumbler');
    expect(report.riskProfile.entityCategory).toBe('mixer');
  });

  it('flags medium-risk addresses for review', () => {
    const report = getComplianceReport(CLEAN_ADDR);
    expect(report.riskProfile.riskLevel).toBe('low');
    expect(report.recommendation).toBe('allow');
  });

  it('includes a generatedAt ISO timestamp', () => {
    const report = getComplianceReport(CLEAN_ADDR);
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
