/**
 * ConnectModal Web Component (i18n-enabled)
 *
 * Modal dialog for wallet connection. Supports wallet list, social login,
 * email login, and QR scan views.
 *
 * Attributes:
 *   - is-open: whether the modal is visible
 *   - default-view: 'wallets' | 'social' | 'email' | 'scan'
 *
 * Properties:
 *   - wallets: WalletInfo[]
 *   - recommendedWalletIds: string[]
 *
 * Events:
 *   - ocx-close: fired when modal is closed
 *   - ocx-wallet-select: fired when a wallet is selected (detail: WalletInfo)
 */

import { html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseLitElement } from '../foundation/base-element.js';
import { animate } from '../foundation/animation-engine.js';
import { t, isRTL } from '../i18n/index.js';

export interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  iconBackground?: string;
  description?: string;
  downloadUrl?: string;
  rdns?: string;
}

export type ConnectModalView = 'wallets' | 'social' | 'email' | 'scan';

@customElement('ocx-connect-modal')
export class ConnectModal extends BaseLitElement {
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
          max-width: 420px;
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

        .header h2 {
          margin: 0;
          font-size: var(--ocx-font-size-xl, 1.25rem);
          font-weight: var(--ocx-font-weight-semibold, 600);
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--ocx-color-text-secondary, #94A3B8);
          cursor: pointer;
          font-size: var(--ocx-font-size-lg, 1.125rem);
          padding: var(--ocx-space-2, 0.5rem);
          border-radius: var(--ocx-radius-md, 0.5rem);
          line-height: 1;
        }
        .close-btn:hover {
          background: var(--ocx-color-bg-card, #1E293B);
          color: var(--ocx-color-text-primary, #f8fafc);
        }

        .content {
          padding: var(--ocx-space-6, 1.5rem);
        }

        .wallet-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--ocx-space-3, 0.75rem);
        }

        .divider {
          display: flex;
          align-items: center;
          gap: var(--ocx-space-4, 1rem);
          margin: var(--ocx-space-4, 1rem) 0;
          color: var(--ocx-color-text-tertiary, #64748B);
          font-size: var(--ocx-font-size-sm, 0.875rem);
        }
        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--ocx-color-border, #334155);
        }

        .alt-actions {
          display: flex;
          flex-direction: column;
          gap: var(--ocx-space-3, 0.75rem);
        }

        .alt-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--ocx-space-2, 0.5rem);
          width: 100%;
          padding: var(--ocx-space-3, 0.75rem);
          background: var(--ocx-color-bg-card, #1E293B);
          border: 1px solid var(--ocx-color-border, #334155);
          border-radius: var(--ocx-radius-lg, 0.75rem);
          color: var(--ocx-color-text-primary, #f8fafc);
          font-size: var(--ocx-font-size-sm, 0.875rem);
          font-weight: var(--ocx-font-weight-medium, 500);
          cursor: pointer;
          transition: background-color var(--ocx-duration-fast, 150ms) ease;
        }
        .alt-btn:hover {
          background: var(--ocx-color-bg-card-hover, #334155);
        }
        .alt-btn:focus-visible {
          outline: 2px solid var(--ocx-color-border-focus, #3B82F6);
          outline-offset: 2px;
        }

        .footer {
          padding: var(--ocx-space-4, 1rem) var(--ocx-space-6, 1.5rem);
          text-align: center;
          font-size: var(--ocx-font-size-xs, 0.75rem);
          color: var(--ocx-color-text-tertiary, #64748B);
          border-top: 1px solid var(--ocx-color-border, #334155);
        }

        .view-tabs {
          display: flex;
          gap: var(--ocx-space-2, 0.5rem);
          margin-bottom: var(--ocx-space-4, 1rem);
        }

        .view-tab {
          flex: 1;
          padding: var(--ocx-space-2, 0.5rem);
          background: transparent;
          border: 1px solid var(--ocx-color-border, #334155);
          border-radius: var(--ocx-radius-md, 0.5rem);
          color: var(--ocx-color-text-secondary, #94A3B8);
          font-size: var(--ocx-font-size-sm, 0.875rem);
          cursor: pointer;
          transition: all var(--ocx-duration-fast, 150ms) ease;
        }
        .view-tab:hover {
          color: var(--ocx-color-text-primary, #f8fafc);
        }
        .view-tab.active {
          background: var(--ocx-color-bg-card, #1E293B);
          color: var(--ocx-color-text-primary, #f8fafc);
          border-color: var(--ocx-color-accent-500, #3B82F6);
        }

        .install-link {
          color: var(--ocx-color-accent-500, #3B82F6);
          text-decoration: none;
          font-size: var(--ocx-font-size-xs, 0.75rem);
        }
        .install-link:hover {
          text-decoration: underline;
        }
      `,
    ];
  }

  @property({ type: Boolean, attribute: 'is-open', reflect: true }) isOpen = false;
  @property({ attribute: 'default-view' }) defaultView: ConnectModalView = 'wallets';
  @property({ type: Array }) wallets: WalletInfo[] = [];
  @property({ attribute: false }) recommendedWalletIds: string[] = [];

  @state() private _currentView: ConnectModalView = 'wallets';

  override connectedCallback() {
    super.connectedCallback();
    this._currentView = this.defaultView;
    document.addEventListener('keydown', this._onKeydown);
    if (isRTL()) this.setAttribute('dir', 'rtl');
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._onKeydown);
  }

  private _onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.isOpen) {
      this._close();
    }
  };

  private _close() {
    this.isOpen = false;
    this.dispatchEvent(new CustomEvent('ocx-close', { bubbles: true, composed: true }));
  }

  private _selectWallet(wallet: WalletInfo) {
    this.dispatchEvent(
      new CustomEvent('ocx-wallet-select', {
        bubbles: true,
        composed: true,
        detail: wallet,
      })
    );
  }

  override render() {
    if (!this.isOpen) return nothing;

    return html`
      <div class="overlay" @click=${this._onOverlayClick} role="dialog" aria-modal="true" aria-label="${t('connect_wallet')}">
        <div class="modal">
          <div class="header">
            <h2>${t('connect_your_wallet')}</h2>
            <button class="close-btn" @click=${this._close} aria-label="${t('close')}">✕</button>
          </div>

          <div class="content">
            <div class="view-tabs">
              <button class="view-tab ${this._currentView === 'wallets' ? 'active' : ''}"
                      @click=${() => { this._currentView = 'wallets'; }}>
                ${t('wallet')}
              </button>
              <button class="view-tab ${this._currentView === 'social' ? 'active' : ''}"
                      @click=${() => { this._currentView = 'social'; }}>
                ${t('social')}
              </button>
              <button class="view-tab ${this._currentView === 'email' ? 'active' : ''}"
                      @click=${() => { this._currentView = 'email'; }}>
                ${t('email')}
              </button>
              <button class="view-tab ${this._currentView === 'scan' ? 'active' : ''}"
                      @click=${() => { this._currentView = 'scan'; }}>
                ${t('scan')}
              </button>
            </div>

            ${this._renderCurrentView()}

            ${this._currentView === 'wallets' ? html`
              <div class="divider">${t('or')}</div>
              <div class="alt-actions">
                <button class="alt-btn" @click=${() => { this._currentView = 'email'; }}>
                  📧 ${t('login_with_email')}
                </button>
                <button class="alt-btn" @click=${() => { this._currentView = 'social'; }}>
                  🔑 ${t('social_login')}
                </button>
                <button class="alt-btn" @click=${() => { this._currentView = 'scan'; }}>
                  📱 ${t('scan_qr')}
                </button>
              </div>
            ` : nothing}
          </div>

          <div class="footer">
            ${t('powered_by', { brand: 'Cinacoin' })}
          </div>
        </div>
      </div>
    `;
  }

  private _onOverlayClick(e: Event) {
    if ((e.target as HTMLElement).classList.contains('overlay')) {
      this._close();
    }
  }

  private _renderCurrentView() {
    switch (this._currentView) {
      case 'wallets':
        return html`
          <div class="wallet-grid">
            ${this.wallets.map(w => this._renderWalletCard(w))}
          </div>
        `;
      case 'social':
        return html`
          <div class="alt-actions">
            <button class="alt-btn" @click=${() => this._selectWallet({ id: 'google', name: 'Google', icon: '' })}>
              ${t('continue_with_google')}
            </button>
            <button class="alt-btn" @click=${() => this._selectWallet({ id: 'apple', name: 'Apple', icon: '' })}>
              ${t('continue_with_apple')}
            </button>
            <button class="alt-btn" @click=${() => this._selectWallet({ id: 'twitter', name: 'X / Twitter', icon: '' })}>
              ${t('continue_with_x')}
            </button>
          </div>
        `;
      case 'email':
        return html`
          <div class="alt-actions">
            <input
              type="email"
              placeholder="${t('enter_email')}"
              style="width:100%;padding:var(--ocx-space-3, 0.75rem);background:var(--ocx-color-bg-input,#111827);border:1px solid var(--ocx-color-border,#334155);border-radius:var(--ocx-radius-lg,0.75rem);color:var(--ocx-color-text-primary,#f8fafc);font-size:var(--ocx-font-size-sm,0.875rem);"
            />
            <button class="alt-btn" @click=${() => this._selectWallet({ id: 'email', name: 'Email Wallet', icon: '' })}>
              ${t('continue_with_email')}
            </button>
          </div>
        `;
      case 'scan':
        return html`
          <div style="text-align:center;padding:var(--ocx-space-8,2rem) 0;color:var(--ocx-color-text-secondary,#94A3B8);">
            <p style="font-size:var(--ocx-font-size-lg,1.125rem);margin-bottom:var(--ocx-space-4,1rem);">${t('scan_with_wallet')}</p>
            <div style="width:200px;height:200px;margin:0 auto;background:var(--ocx-color-bg-card,#1E293B);border-radius:var(--ocx-radius-lg,0.75rem);display:flex;align-items:center;justify-content:center;font-size:var(--ocx-font-size-2xl,1.5rem);">
              📱
            </div>
          </div>
        `;
      default:
        return nothing;
    }
  }

  private _renderWalletCard(wallet: WalletInfo) {
    const isRecommended = this.recommendedWalletIds.includes(wallet.id);
    return html`
      <button class="alt-btn" style="flex-direction:column;gap:var(--ocx-space-2,0.5rem);padding:var(--ocx-space-4,1rem);"
              @click=${() => this._selectWallet(wallet)}>
        <div style="width:40px;height:40px;border-radius:var(--ocx-radius-md,0.5rem);background:${wallet.iconBackground || 'var(--ocx-color-bg-tertiary)'};display:flex;align-items:center;justify-content:center;">
          ${wallet.icon ? html`<img src="${wallet.icon}" alt="${wallet.name}" style="width:24px;height:24px;" />` : '🔗'}
        </div>
        <span>${wallet.name}</span>
        ${isRecommended ? html`<span style="font-size:var(--ocx-font-size-xs,0.75rem);color:var(--ocx-color-accent-500,#3B82F6);">${t('recommended')}</span>` : nothing}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ocx-connect-modal': ConnectModal;
  }
}
