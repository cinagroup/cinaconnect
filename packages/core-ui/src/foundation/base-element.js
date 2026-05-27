/**
 * BaseLitElement — base class for all Cinacoin Web Components.
 *
 * Provides:
 * - Automatic CSS variable injection from design tokens
 * - Theme switching via `data-ocx-theme` attribute
 * - Scoped shadow DOM styling
 * - Accessibility defaults
 */
import { LitElement, css } from 'lit';
/** Base element class that all OCX components extend. */
export class BaseLitElement extends LitElement {
    constructor() {
        super(...arguments);
        /** Current theme name. */
        this.theme = 'dark';
    }
    /** Override in subclasses to provide component-specific styles. */
    static get styles() {
        return [this.hostStyles];
    }
    connectedCallback() {
        super.connectedCallback();
        this._applyTheme();
    }
    attributeChangedCallback(name, _old, value) {
        super.attributeChangedCallback(name, _old, value);
        if (name === 'data-ocx-theme' || name === 'theme') {
            this.theme = value || 'dark';
            this._applyTheme();
        }
    }
    /** Read the effective theme from the host or inherited attribute. */
    _applyTheme() {
        const attr = this.getAttribute('data-ocx-theme') ??
            this.getAttribute('theme') ??
            this.closest('[data-ocx-theme]')?.getAttribute('data-ocx-theme');
        if (attr && ['dark', 'light', 'minimal'].includes(attr)) {
            this.theme = attr;
        }
    }
    /** Utility: format an Ethereum address as 0x1234...5678. */
    formatAddress(address, prefix = 4, suffix = 4) {
        if (address.length <= prefix + suffix + 2)
            return address;
        return `${address.slice(0, prefix + 2)}...${address.slice(-suffix)}`;
    }
    /** Utility: format a balance with locale-aware separators. */
    formatBalance(value, decimals = 2) {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num))
            return '0.00';
        return num.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    }
}
/** Host-level CSS variables injected into the component. */
BaseLitElement.hostStyles = css `
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
//# sourceMappingURL=base-element.js.map