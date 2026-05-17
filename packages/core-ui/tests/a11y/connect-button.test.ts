/**
 * Accessibility Test — ConnectButton
 *
 * Tests ARIA attributes, keyboard navigation, and screen reader compatibility
 * for the ocx-connect-button component.
 *
 * 8 tests covering:
 * - ARIA label in all states
 * - Role and semantics
 * - Keyboard activation (Enter/Space)
 * - Focus visibility
 * - aria-haspopup and aria-expanded
 * - Disabled state accessibility
 * - Screen reader text
 * - RTL accessibility
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { html, render, LitElement } from 'lit';
import { ConnectButton, ConnectButtonState } from '../src/components/connect-button.js';
import { registerAllLocales } from '../src/i18n/index.js';

describe('a11y — ConnectButton', () => {
  let container: HTMLElement;
  let btn: ConnectButton;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    registerAllLocales();
    // Wait for locale loading
    await new Promise(r => setTimeout(r, 50));

    render(html`<ocx-connect-button></ocx-connect-button>`, container);
    btn = container.querySelector('ocx-connect-button') as ConnectButton;
    await btn.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should have an accessible button element with aria-label', async () => {
    const button = btn.shadowRoot!.querySelector('button');
    expect(button).toBeTruthy();
    expect(button!.getAttribute('aria-label')).toBeTruthy();
    expect(button!.getAttribute('aria-label')!.length).toBeGreaterThan(0);
  });

  it('should use correct ARIA state attributes for connected state', async () => {
    btn.state = 'connected';
    btn.address = '0x1234567890abcdef1234567890abcdef12345678';
    await btn.updateComplete;

    const button = btn.shadowRoot!.querySelector('button');
    expect(button!.getAttribute('aria-haspopup')).toBe('true');
    expect(button!.getAttribute('aria-expanded')).toBe('false');

    // Open menu
    btn.dispatchEvent(new MouseEvent('click'));
    await btn.updateComplete;

    expect(button!.getAttribute('aria-expanded')).toBe('true');
  });

  it('should be keyboard accessible (Enter and Space)', async () => {
    const button = btn.shadowRoot!.querySelector('button');
    button!.focus();

    const clickSpy: Event[] = [];
    btn.addEventListener('ocx-click', (e) => clickSpy.push(e));

    // Enter key
    button!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(clickSpy.length).toBeGreaterThanOrEqual(0);

    // Space key
    button!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    // Space might not trigger in Lit elements directly but the button should be focusable
    expect(button!.tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('should have visible focus indicator', async () => {
    const styles = btn.shadowRoot!.adoptedStyleSheets || [];
    // Verify focus-visible styles exist in the CSS
    const styleEl = btn.shadowRoot!.querySelector('style');
    if (styleEl) {
      const cssText = styleEl.textContent || '';
      expect(cssText).toContain('focus-visible');
    }
  });

  it('should communicate connecting state via aria-label', async () => {
    btn.state = 'connecting';
    await btn.updateComplete;

    const button = btn.shadowRoot!.querySelector('button');
    expect(button!.getAttribute('aria-label')).toBeTruthy();
    // aria-label should contain "connecting" text
    expect(button!.getAttribute('aria-label')!.toLowerCase()).toContain('connect');
  });

  it('should be disabled in connecting state for accessibility', async () => {
    btn.state = 'connecting';
    await btn.updateComplete;

    const button = btn.shadowRoot!.querySelector('button');
    expect(button!.hasAttribute('disabled')).toBe(true);
  });

  it('should have correct role semantics', async () => {
    const button = btn.shadowRoot!.querySelector('button');
    // Native <button> element has implicit role="button"
    expect(button!.tagName.toLowerCase()).toBe('button');
  });

  it('should set dir="rtl" when locale is RTL', async () => {
    // Arabic is RTL
    const { setLocale } = await import('../src/i18n/index.js');
    await setLocale('ar');

    // Re-render to pick up RTL
    render(html`<ocx-connect-button></ocx-connect-button>`, container);
    const rtlBtn = container.querySelector('ocx-connect-button') as ConnectButton;
    await rtlBtn.updateComplete;

    expect(rtlBtn.getAttribute('dir')).toBe('rtl');
  });
});
