/**
 * AccountModal Web Component (i18n-enabled)
 *
 * Modal for managing connected account — shows balance, copy address,
 * view explorer, switch account, and disconnect.
 *
 * Properties:
 *   - address: connected wallet address
 *   - chainId: current chain ID
 *   - balance: account balance string
 *   - chainSymbol: native currency symbol
 *   - allAccounts: additional account list
 *   - connectedApps: connected dApp list
 *
 * Events:
 *   - ocx-close, ocx-disconnect, ocx-copy-address, ocx-view-explorer, ocx-switch-account
 */

import { html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseLitElement } from '../foundation/base-element.js';
import { t, isRTL } from '../i18n/index.js';

export interface AccountInfo {
  address: string;
  balance?: string;
  chainSymbol?: string;
}

export interface ConnectedAppInfo {
  name: string;
  icon?: string;
  lastUsed?: string;
}

@customElement('ocx-account-modal')
export class AccountModal extends BaseLitElement {
  static override get styles() {
    return [
      super.hostStyles,
      css`
        :host {
          display: none;
        }
        :host([is-open]) {
          display: block;
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: var(--ocx-color-bg-overlay, rgba(0,0,0,0.7));
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: var(--ocx-z-modal-backdrop, 2000);
        }

        .modal {
          background: var(--ocx-color-bg-primary, #0F172A);
          border-radius: var(--ocx-radius-xl, 1.5rem);
          box-shadow: var(--ocx-shadow-lg, 0 10px 15px rgba(0,0,0,0.3));
          width: 100%;
          max-width: 380px;
          max-height: 80vh;
          overflow-y: auto;
          position: relative;
          z-index: var(--ocx-z-modal, 2100);
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--ocx-space-6, 1.5rem);
          border-bottom: 1px solid var(--ocx-color-border, #334155);
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--ocx-color-text-secondary, #94A3B8);
          cursor: pointer;
          font-size: var(--ocx-font-size-lg, 1.125rem);
          padding: var(--ocx-space-2, 0.5rem);
          border-radius: var(--ocx-radius-md, 0.5rem);
        }
        .close-btn:hover {
          background: var(--ocx-color-bg-card, #1E293B);
        }

        .account-card {
          margin: var(--ocx-space-4, 1rem);
          padding: var(--ocx-space-4, 1rem);
          background: var(--ocx-color-bg-card, #1E293B);
          border: 1px solid var(--ocx-color-border, #334155);
          border-radius: var(--ocx-radius-lg, 0.75rem);
          text-align: center;
        }

        .avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--ocx-color-accent-500, #3B82F6);
          margin: 0 auto var(--ocx-space-3, 0.75rem);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--ocx-font-size-xl, 1.25rem);
        }

        .address {
          font-family: var(--ocx-font-family-mono, monospace);
          font-size: var(--ocx-font-size-lg, 1.125rem);
          color: var(--ocx-color-text-primary, #f8fafc);
          margin-bottom: var(--ocx-space-1, 0.25rem);
        }

        .balance {
          font-size: var(--ocx-font-size-xl, 1.25rem);
          font-weight: var(--ocx-font-weight-bold, 700);
          color: var(--ocx-color-text-primary, #f8fafc);
          margin-bottom: var(--ocx-space-3, 0.75rem);
        }

        .actions {
          display: flex;
          justify-content: center;
          gap: var(--ocx-space-3, 0.75rem);
        }

        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--ocx-space-1, 0.25rem);
          background: none;
          border: none;
          color: var(--ocx-color-text-secondary, #94A3B8);
          cursor: pointer;
          font-size: var(--ocx-font-size-xs, 0.75rem);
          padding: var(--ocx-space-2, 0.5rem);
          border-radius: var(--ocx-radius-md, 0.5rem);
          transition: color var(--ocx-duration-fast, 150ms) ease;
        }
        .action-btn:hover {
          color: var(--ocx-color-text-primary, #f8fafc);
          background: var(--ocx-color-bg-card-hover, #334155);
        }

        .section {
          padding: 0 var(--ocx-space-4, 1rem);
          margin-bottom: var(--ocx-space-4, 1rem);
        }

        .section-title {
          font-size: var(--ocx-font-size-sm, 0.875rem);
          font-weight: var(--ocx-font-weight-semibold, 600);
          color: var(--ocx-color-text-secondary, #94A3B8);
          margin-bottom: var(--ocx-space-2, 0.5rem);
        }

        .switch-account-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--ocx-space-2, 0.5rem) var(--ocx-space-3, 0.75rem);
          background: var(--ocx-color-bg-card, #1E293B);
          border-radius: var(--ocx-radius-md, 0.5rem);
          cursor: pointer;
          margin-bottom: var(--ocx-space-2, 0.5rem);
          transition: background-color var(--ocx-duration-fast, 150ms) ease;
        }
        .switch-account-item:hover {
          background: var(--ocx-color-bg-card-hover, #334155);
        }
        .switch-account-item .addr {
          font-family: var(--ocx-font-family-mono, monospace);
          font-size: var(--ocx-font-size-sm, 0.875rem);
        }
        .switch-account-item .bal {
          font-size: var(--ocx-font-size-xs, 0.75rem);
          color: var(--ocx-color-text-secondary, #94A3B8);
        }

        .connected-app-item {
          display: flex;
          align-items: center;
          gap: var(--ocx-space-2, 0.5rem);
          padding: var(--ocx-space-2, 0.5rem) var(--ocx-space-3, 0.75rem);
          margin-bottom: var(--ocx-space-2, 0.5rem);
          font-size: var(--ocx-font-size-sm, 0.875rem);
        }
        .connected-app-item .last {
          margin-left: auto;
          font-size: var(--ocx-font-size-xs, 0.75rem);
          color: var(--ocx-color-text-tertiary, #64748B);
        }

        .disconnect-btn {
          display: block;
          width: calc(100% - 2rem);
          margin: 0 var(--ocx-space-4, 1rem) var(--ocx-space-4, 1rem);
          padding: var(--ocx-space-3, 0.75rem);
          background: var(--ocx-color-error-bg, rgba(239,68,68,0.15));
          color: var(--ocx-color-error, #EF4444);
          border: none;
          border-radius: var(--ocx-radius-lg, 0.75rem);
          font-size: var(--ocx-font-size-sm, 0.875rem);
          font-weight: var(--ocx-font-weight-medium, 500);
          cursor: pointer;
          transition: background-color var(--ocx-duration-fast, 150ms) ease;
        }
        .disconnect-btn:hover {
          background: var(--ocx-color-error, #EF4444);
          color: var(--ocx-color-text-inverse, #fff);
        }
      `,
    ];
  }

  @property({ reflect: true }) address = '';
  @property({ type: Number }) chainId = 1;
  @property() balance = '0.00';
  @property() chainSymbol = 'ETH';
  @property({ type: Array }) allAccounts: AccountInfo[] = [];
  @property({ type: Array }) connectedApps: ConnectedAppInfo[] = [];
  @property({ type: Boolean, attribute: 'is-open', reflect: true }) isOpen = false;

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this._onKeydown);
    if (isRTL()) this.setAttribute('dir', 'rtl');
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._onKeydown);
  }

  private _onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.isOpen) this._close();
  };

  private _close() {
    this.isOpen = false;
    this.dispatchEvent(new CustomEvent('ocx-close', { bubbles: true, composed: true }));
  }

  private _copyAddress() {
    navigator.clipboard?.writeText(this.address).catch(() => {});
    this.dispatchEvent(new CustomEvent('ocx-copy-address', { bubbles: true, composed: true }));
  }

  private _viewExplorer() {
    this.dispatchEvent(new CustomEvent('ocx-view-explorer', { bubbles: true, composed: true }));
  }

  private _disconnect() {
    this.dispatchEvent(new CustomEvent('ocx-disconnect', { bubbles: true, composed: true }));
  }

  private _switchAccount(address: string) {
    this.dispatchEvent(
      new CustomEvent('ocx-switch-account', { detail: { address }, bubbles: true, composed: true })
    );
  }

  override render() {
    if (!this.isOpen) return nothing;

    return html`
      <div class="overlay" @click=${(e: Event) => { if ((e.target as HTMLElement).classList.contains('overlay')) this._close(); }}>
        <div class="modal" role="dialog" aria-modal="true" aria-label="${t('account')}">
          <div class="header">
            <span></span>
            <button class="close-btn" @click=${this._close} aria-label="${t('close')}">✕</button>
          </div>

          <div class="account-card">
            <div class="avatar">🧑</div>
            <div class="address">${this.formatAddress(this.address)}</div>
            <div class="balance">${this.balance} ${this.chainSymbol}</div>
            <div class="actions">
              <button class="action-btn" @click=${this._copyAddress}>📋 ${t('copy_address')}</button>
              <button class="action-btn" @click=${this._viewExplorer}>↗ ${t('view_explorer')}</button>
            </div>
          </div>

          ${this.allAccounts.length
            ? html`
                <div class="section">
                  <div class="section-title">${t('switch_account')}</div>
                  ${this.allAccounts.map(a => html`
                    <div class="switch-account-item" @click=${() => this._switchAccount(a.address)}>
                      <span class="addr">${this.formatAddress(a.address)}</span>
                      <span class="bal">${a.balance} ${a.chainSymbol}</span>
                    </div>
                  `)}
                </div>
              `
            : nothing
          }

          ${this.connectedApps.length
            ? html`
                <div class="section">
                  <div class="section-title">${t('connected_apps')}</div>
                  ${this.connectedApps.map(app => html`
                    <div class="connected-app-item">
                      <span>${app.name}</span>
                      ${app.lastUsed ? html`<span class="last">${app.lastUsed}</span>` : nothing}
                    </div>
                  `)}
                </div>
              `
            : nothing
          }

          <button class="disconnect-btn" @click=${this._disconnect}>🔴 ${t('disconnect')}</button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ocx-account-modal': AccountModal;
  }
}
