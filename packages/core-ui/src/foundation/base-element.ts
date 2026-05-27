/**
 * BaseLitElement — base class for all Cinacoin Web Components.
 *
 * Provides:
 * - Automatic CSS variable injection from design tokens
 * - Theme switching via `data-ocx-theme` attribute
 * - Scoped shadow DOM styling
 * - Accessibility defaults
 */

import { LitElement, css, CSSResultGroup } from 'lit';

/** Supported theme identifiers. */
export type OCXTheme = 'dark' | 'light' | 'minimal';

/** Base element class that all OCX components extend. */
export abstract class BaseLitElement extends LitElement {
  /** Current theme name. */
  protected theme: OCXTheme = 'dark';

  /** Host-level CSS variables injected into the component. */
  static hostStyles = css`
    :host {
      display: block;
      font-family: var(--ocx-font-family, 'Inter', system-ui, sans-serif);
      color: var(--ocx-color-text-primary, #f8fafc);
      font-size: var(--ocx-font-size-md, 1rem);
      line-height: var(--ocx-line-height, 1.5);
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    :host *,
    :host *::before,
    :host *::after {
      box-sizing: border-box;
    }
  `;

  /** Override in subclasses to provide component-specific styles. */
  static override get styles(): CSSResultGroup {
    return [(this as typeof BaseLitElement).hostStyles];
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._applyTheme();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    super.attributeChangedCallback(name, _old, value);
    if (name === 'data-ocx-theme' || name === 'theme') {
      this.theme = (value as OCXTheme) || 'dark';
      this._applyTheme();
    }
  }

  /** Read the effective theme from the host or inherited attribute. */
  private _applyTheme(): void {
    const attr =
      this.getAttribute('data-ocx-theme') ??
      this.getAttribute('theme') ??
      this.closest('[data-ocx-theme]')?.getAttribute('data-ocx-theme');
    if (attr && ['dark', 'light', 'minimal'].includes(attr)) {
      this.theme = attr as OCXTheme;
    }
  }

  /** Utility: format an Ethereum address as 0x1234...5678. */
  protected formatAddress(address: string, prefix = 4, suffix = 4): string {
    if (address.length <= prefix + suffix + 2) return address;
    return `${address.slice(0, prefix + 2)}...${address.slice(-suffix)}`;
  }

  /** Utility: format a balance with locale-aware separators. */
  protected formatBalance(value: number | string, decimals = 2): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0.00';
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
}
