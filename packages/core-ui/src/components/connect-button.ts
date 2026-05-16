/**
 * ConnectButton Web Component (i18n-enabled)
 *
 * Primary entry-point button for wallet connection. Shows connect prompt when
 * disconnected, and address + balance when connected.
 *
 * Attributes:
 *   - variant: 'primary' | 'secondary' | 'ghost'
 *   - size: 'sm' | 'md' | 'lg'
 *   - label: text shown when disconnected (falls back to t('connect_wallet'))
 *   - show-balance: whether to display balance
 *   - show-avatar: whether to show avatar icon
 *   - show-network: whether to show network badge
 *
 * Properties (set via JS):
 *   - address: connected wallet address
 *   - balance: account balance string
 *   - chainSymbol: native currency symbol (e.g. "ETH")
 *   - state: 'disconnected' | 'connecting' | 'connected' | 'wrong_network' | 'error'
 *
 * Events:
 *   - ocx-click: fired when button is clicked
 *   - ocx-disconnect: fired when disconnect action is triggered
 */

import { html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseLitElement, OCXTheme } from '../foundation/base-element.js';
import { animate } from '../foundation/animation-engine.js';
import { t, isRTL, I18nMixin } from '../i18n/index.js';

export type ConnectButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ConnectButtonSize = 'sm' | 'md' | 'lg';
export type ConnectButtonState = 'disconnected' | 'connecting' | 'connected' | 'wrong_network' | 'error';

@customElement('ocx-connect-button')
export class ConnectButton extends I18nMixin(BaseLitElement) {
  static override get styles() {
    return [
      super.hostStyles,
      css`
        :host {
          display: inline-block;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--ocx-space-2, 0.5rem);
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-weight: var(--ocx-font-weight-semibold, 600);
          border-radius: var(--ocx-radius-xl, 1.5rem);
          transition: background-color var(--ocx-duration-fast, 150ms) var(--ocx-easing-default, ease),
                      box-shadow var(--ocx-duration-fast, 150ms) var(--ocx-easing-default, ease);
          white-space: nowrap;
          user-select: none;
        }

        .btn:focus-visible {
          outline: 2px solid var(--ocx-color-border-focus, #3B82F6);
          outline-offset: 2px;
        }

        /* Variant: primary */
        .btn.variant-primary {
          background: var(--ocx-color-accent-500, #3B82F6);
          color: var(--ocx-color-text-inverse, #fff);
          box-shadow: var(--ocx-shadow-glow, 0 0 20px rgba(59, 130, 246, 0.3));
        }
        .btn.variant-primary:hover {
          background: var(--ocx-color-accent-600, #2563EB);
        }

        /* Variant: secondary */
        .btn.variant-secondary {
          background: var(--ocx-color-bg-card, #1E293B);
          color: var(--ocx-color-text-primary, #f8fafc);
          border: 1px solid var(--ocx-color-border, #334155);
        }
        .btn.variant-secondary:hover {
          background: var(--ocx-color-bg-card-hover, #334155);
        }

        /* Variant: ghost */
        .btn.variant-ghost {
          background: transparent;
          color: var(--ocx-color-text-primary, #f8fafc);
        }
        .btn.variant-ghost:hover {
          background: var(--ocx-color-bg-card, #1E293B);
        }

        /* Size: sm */
        .btn.size-sm {
          height: 36px;
          padding: 0 var(--ocx-space-4, 1rem);
          font-size: var(--ocx-font-size-xs, 0.75rem);
        }

        /* Size: md */
        .btn.size-md {
          height: 44px;
          padding: 0 var(--ocx-space-6, 1.5rem);
          font-size: var(--ocx-font-size-sm, 0.875rem);
        }

        /* Size: lg */
        .btn.size-lg {
          height: 52px;
          padding: 0 var(--ocx-space-8, 2rem);
          font-size: var(--ocx-font-size-md, 1rem);
        }

        /* Connected state */
        .btn.state-connected {
          background: var(--ocx-color-bg-card, #1E293B);
          border: 1px solid var(--ocx-color-border, #334155);
          color: var(--ocx-color-text-primary, #f8fafc);
        }

        /* Wrong network */
        .btn.state-wrong_network {
          background: var(--ocx-color-error-bg, rgba(239,68,68,0.15));
          color: var(--ocx-color-error, #EF4444);
          border: 1px solid var(--ocx-color-error, #EF4444);
        }

        /* Error */
        .btn.state-error {
          background: var(--ocx-color-error-bg, rgba(239,68,68,0.15));
          color: var(--ocx-color-error, #EF4444);
        }

        /* Disabled / connecting */
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .avatar {
          width: var(--ocx-font-size-md, 1rem);
          height: var(--ocx-font-size-md, 1rem);
          border-radius: 50%;
          background: var(--ocx-color-accent-500, #3B82F6);
        }

        .address {
          font-family: var(--ocx-font-family-mono, monospace);
          font-size: inherit;
        }

        .balance {
          color: var(--ocx-color-text-secondary, #94A3B8);
          font-size: 0.85em;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .dropdown-arrow {
          display: inline-block;
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 4px solid currentColor;
          margin-left: 2px;
        }

        .dropdown {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          min-width: 180px;
          background: var(--ocx-color-bg-secondary, #111827);
          border: 1px solid var(--ocx-color-border, #334155);
          border-radius: var(--ocx-radius-lg, 0.75rem);
          box-shadow: var(--ocx-shadow-lg, 0 10px 15px rgba(0,0,0,0.3));
          z-index: var(--ocx-z-dropdown, 1000);
          overflow: hidden;
        }

        :host([dir="rtl"]) .dropdown {
          right: auto;
          left: 0;
        }

        :host([dir="rtl"]) .dropdown-arrow {
          margin-left: 0;
          margin-right: 2px;
        }

        .dropdown button {
          display: block;
          width: 100%;
          padding: var(--ocx-space-3, 0.75rem) var(--ocx-space-4, 1rem);
          background: none;
          border: none;
          color: var(--ocx-color-error, #EF4444);
          font-size: var(--ocx-font-size-sm, 0.875rem);
          cursor: pointer;
          text-align: inherit;
        }

        .dropdown button:hover {
          background: var(--ocx-color-bg-card-hover, #334155);
        }
      `,
    ];
  }

  @property({ reflect: true }) variant: ConnectButtonVariant = 'primary';
  @property({ reflect: true }) size: ConnectButtonSize = 'md';
  @property({ reflect: true }) label = '';
  @property({ type: Boolean, attribute: 'show-balance' }) showBalance = false;
  @property({ type: Boolean, attribute: 'show-avatar' }) showAvatar = false;
  @property({ type: Boolean, attribute: 'show-network' }) showNetwork = false;
  @property({ reflect: true }) address = '';
  @property() balance = '';
  @property() chainSymbol = '';
  @property({ reflect: true }) state: ConnectButtonState = 'disconnected';
  @property({ type: Number }) chainId: number | null = null;

  @state() private _menuOpen = false;

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeydown);
    if (isRTL()) this.setAttribute('dir', 'rtl');
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._onClick);
    this.removeEventListener('keydown', this._onKeydown);
  }

  private _onClick = () => {
    if (this.state === 'connecting') return;

    if (this.state === 'connected') {
      this._menuOpen = !this._menuOpen;
      return;
    }

    this.dispatchEvent(new CustomEvent('ocx-click', { bubbles: true, composed: true }));
  };

  private _onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this._menuOpen) {
      this._menuOpen = false;
    }
  };

  private _handleDisconnect(e: Event) {
    e.stopPropagation();
    this._menuOpen = false;
    this.dispatchEvent(new CustomEvent('ocx-disconnect', { bubbles: true, composed: true }));
  }

  override render() {
    const stateClass = `state-${this.state}`;
    const variantClass = `variant-${this.variant}`;
    const sizeClass = `size-${this.size}`;
    const disabled = this.state === 'connecting';

    return html`
      <button
        class="btn ${stateClass} ${variantClass} ${sizeClass}"
        ?disabled=${disabled}
        aria-label=${this._getAriaLabel()}
        aria-haspopup=${this.state === 'connected' ? 'true' : 'false'}
        aria-expanded=${this._menuOpen}
      >
        ${this._renderContent()}
      </button>
      ${this._menuOpen && this.state === 'connected' ? this._renderDropdown() : nothing}
    `;
  }

  private _renderContent() {
    switch (this.state) {
      case 'connecting':
        return html`<span class="spinner"></span> ${t('connecting')}`;

      case 'connected': {
        const truncated = this.formatAddress(this.address);
        return html`
          ${this.showAvatar ? html`<span class="avatar"></span>` : nothing}
          <span class="address">${truncated}</span>
          ${this.showBalance && this.balance ? html`<span class="balance">${this.balance} ${this.chainSymbol}</span>` : nothing}
          <span class="dropdown-arrow"></span>
        `;
      }

      case 'wrong_network':
        return html`⚠️ ${t('wrong_network')}`;

      case 'error':
        return html`❌ ${t('error')}`;

      default:
        return html`${this.label || t('connect_wallet')}`;
    }
  }

  private _renderDropdown() {
    return html`
      <div class="dropdown" role="menu" aria-label="Account menu">
        <button role="menuitem" @click=${this._handleDisconnect}>${t('disconnect')}</button>
      </div>
    `;
  }

  private _getAriaLabel(): string {
    switch (this.state) {
      case 'connected':
        return `${t('connected')} ${this.formatAddress(this.address)}`;
      case 'connecting':
        return t('connecting');
      case 'wrong_network':
        return t('wrong_network');
      case 'error':
        return t('error');
      default:
        return this.label || t('connect_wallet');
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ocx-connect-button': ConnectButton;
  }
}
