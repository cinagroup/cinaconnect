/**
 * Tests for BaseLitElement theming and utilities.
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('BaseLitElement', () => {
  let BaseLitElement: any;
  let TestElement: any;

  beforeAll(async () => {
    const mod = await import('../../src/foundation/base-element.js');
    BaseLitElement = mod.BaseLitElement;

    // Create a concrete subclass for testing
    class ConcreteElement extends BaseLitElement {
      render() {
        return null;
      }
    }
    // Don't register as custom element to avoid jsdom issues
    TestElement = ConcreteElement;
  });

  it('should have correct default theme', () => {
    const el = new TestElement();
    expect(el.theme).toBe('dark');
  });

  it('should define hostStyles', () => {
    expect(BaseLitElement.hostStyles).toBeDefined();
    const styles = String(BaseLitElement.hostStyles);
    expect(styles).toContain(':host');
    expect(styles).toContain('font-family');
  });

  it('should provide formatAddress utility', () => {
    const el = new TestElement();
    const full = '0x1234567890abcdef1234567890abcdef12345678';
    const formatted = el.formatAddress(full);
    expect(formatted).toBe('0x12...5678');
  });

  it('should format address with custom prefix and suffix', () => {
    const el = new TestElement();
    const full = '0x1234567890abcdef1234567890abcdef12345678';
    const formatted = el.formatAddress(full, 6, 6);
    expect(formatted).toBe('0x1234...345678');
  });

  it('should return address unchanged when shorter than prefix+suffix+2', () => {
    const el = new TestElement();
    const short = '0x1234';
    expect(el.formatAddress(short)).toBe('0x1234');
  });

  it('should format balance with decimals', () => {
    const el = new TestElement();
    expect(el.formatBalance(1234.567)).toBe('1,234.57');
  });

  it('should format balance from string input', () => {
    const el = new TestElement();
    expect(el.formatBalance('1234.567')).toBe('1,234.57');
  });

  it('should return "0.00" for NaN balance', () => {
    const el = new TestElement();
    expect(el.formatBalance('not-a-number')).toBe('0.00');
    expect(el.formatBalance(NaN)).toBe('0.00');
  });

  it('should format balance with custom decimal places', () => {
    const el = new TestElement();
    expect(el.formatBalance(100.1, 4)).toBe('100.1000');
  });

  it('should return styles from subclass get styles', () => {
    const styles = (TestElement as any).styles;
    expect(Array.isArray(styles)).toBe(true);
    expect(styles.length).toBeGreaterThanOrEqual(1);
  });

  it('should apply theme from data-ocx-theme attribute', () => {
    const el = new TestElement();
    el.setAttribute('data-ocx-theme', 'light');
    el.connectedCallback();
    expect(el.theme).toBe('light');
  });

  it('should apply theme from theme attribute', () => {
    const el = new TestElement();
    el.setAttribute('theme', 'minimal');
    el.connectedCallback();
    expect(el.theme).toBe('minimal');
  });

  it('should default to dark theme for unknown theme values', () => {
    const el = new TestElement();
    el.setAttribute('data-ocx-theme', 'invalid-theme');
    el.connectedCallback();
    // Unknown themes don't change the default
    expect(el.theme).toBe('dark');
  });
});
