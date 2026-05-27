import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  seedLists,
  isSanctioned,
  isMixer,
  isScamAddress,
  isRiskyExchange,
  getMatchedLists,
  listBasedRiskLevel,
  updateLists,
} from './lists';

/* ── seedLists ──────────────────────────────────────────────────── */

describe('seedLists', () => {
  it('seeds the built-in OFAC SDN list', () => {
    seedLists();
    expect(isSanctioned('0x8589427373d6d84e98730d7795d8f6f8731f1a8b')).toBe(true);
  });

  it('seeds the built-in mixer list', () => {
    seedLists();
    expect(isMixer('0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc')).toBe(true);
  });

  it('seeds the built-in scam list', () => {
    seedLists();
    expect(isScamAddress('0x000000000000000000000000000000000000dEaD')).toBe(true);
  });

  it('clears previous lists before reseeding', () => {
    // First seed
    seedLists();
    updateLists({ ofacSdn: ['0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'] });
    expect(isSanctioned('0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(true);
    // Re-seed → should clear custom list
    seedLists();
    expect(isSanctioned('0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(false);
  });
});

/* ── List checks ────────────────────────────────────────────────── */

describe('isSanctioned / isMixer / isScamAddress / isRiskyExchange', () => {
  beforeEach(() => seedLists());

  it('isSanctioned returns false for clean addresses', () => {
    expect(isSanctioned('0x1234567890abcdef1234567890abcdef12345678')).toBe(false);
  });

  it('isSanctioned is case-insensitive', () => {
    expect(isSanctioned('0x8589427373D6D84E98730D7795D8F6F8731F1A8B')).toBe(true);
  });

  it('isMixer returns false for clean addresses', () => {
    expect(isMixer('0x1234567890abcdef1234567890abcdef12345678')).toBe(false);
  });

  it('isScamAddress returns false for clean addresses', () => {
    expect(isScamAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(false);
  });

  it('isRiskyExchange returns false for clean addresses', () => {
    expect(isRiskyExchange('0x1234567890abcdef1234567890abcdef12345678')).toBe(false);
  });

  it('isRiskyExchange returns true for an address in the risky exchange list', () => {
    updateLists({ riskyExchanges: ['0xBAD0000000000000000000000000000000000000'] });
    expect(isRiskyExchange('0xBAD0000000000000000000000000000000000000')).toBe(true);
  });
});

/* ── getMatchedLists ────────────────────────────────────────────── */

describe('getMatchedLists', () => {
  beforeEach(() => seedLists());

  it('returns empty array for a clean address', () => {
    const lists = getMatchedLists('0x1234567890abcdef1234567890abcdef12345678');
    expect(lists).toEqual([]);
  });

  it('returns OFAC SDN for a sanctioned address', () => {
    const lists = getMatchedLists('0x8589427373d6d84e98730d7795d8f6f8731f1a8b');
    expect(lists).toContain('OFAC SDN');
  });

  it('returns Mixer / Tumbler for a mixer address', () => {
    const lists = getMatchedLists('0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc');
    expect(lists).toContain('Mixer / Tumbler');
  });

  it('returns Known Scam for a scam address', () => {
    const lists = getMatchedLists('0x000000000000000000000000000000000000dEaD');
    expect(lists).toContain('Known Scam');
  });
});

/* ── listBasedRiskLevel ─────────────────────────────────────────── */

describe('listBasedRiskLevel', () => {
  beforeEach(() => seedLists());

  it('returns "sanctioned" for OFAC addresses', () => {
    expect(listBasedRiskLevel('0x8589427373d6d84e98730d7795d8f6f8731f1a8b')).toBe('sanctioned');
  });

  it('returns "high" for mixer addresses', () => {
    expect(listBasedRiskLevel('0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc')).toBe('high');
  });

  it('returns "high" for scam addresses', () => {
    expect(listBasedRiskLevel('0x000000000000000000000000000000000000dEaD')).toBe('high');
  });

  it('returns "medium" for risky exchange addresses', () => {
    updateLists({ riskyExchanges: ['0xBAD0000000000000000000000000000000000000'] });
    expect(listBasedRiskLevel('0xBAD0000000000000000000000000000000000000')).toBe('medium');
  });

  it('returns "low" for clean addresses', () => {
    expect(listBasedRiskLevel('0x1234567890abcdef1234567890abcdef12345678')).toBe('low');
  });
});

/* ── updateLists ────────────────────────────────────────────────── */

describe('updateLists', () => {
  beforeEach(() => seedLists());

  it('replaces the OFAC SDN list', () => {
    updateLists({
      ofacSdn: ['0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
    });
    expect(isSanctioned('0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(true);
    // Old seed data should be gone
    expect(isSanctioned('0x8589427373d6d84e98730d7795d8f6f8731f1a8b')).toBe(false);
  });

  it('replaces multiple lists at once', () => {
    updateLists({
      mixers: ['0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'],
      scams: ['0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'],
    });
    expect(isMixer('0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB')).toBe(true);
    expect(isScamAddress('0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC')).toBe(true);
    // Old seed data should be gone
    expect(isMixer('0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc')).toBe(false);
  });

  it('does not clear lists that are not included in the update', () => {
    updateLists({
      scams: ['0xNEW1111111111111111111111111111111111111111'],
    });
    // Mixer list still has seed data
    expect(isMixer('0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc')).toBe(true);
  });
});
