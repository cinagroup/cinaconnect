/**
 * WalletCard Web Component (i18n-enabled)
 *
 * Single wallet card shown in wallet lists or modal grids.
 *
 * Properties:
 *   - wallet: WalletInfo
 *   - installed: boolean
 *   - recommended: boolean
 *
 * Events:
 *   - ocx-wallet-select: fired on click
 */

import { html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseLitElement } from '../foundation/base-element.js';
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

@customElement('ocx-wallet-card')
export class WalletCard extends BaseLitElement {
  static override get styles() {
    return [
      super.hostStyles,
      css`
        :host {
          display: block;
        }

        .card {
          display: flex;
          align-items: center;
          gap: var(--ocx-space-3, 0.75rem);
          padding: var(--ocx-space-3, 0.75rem);
          background: var(--ocx-color-bg-card, #1E293B);
          border: 1px solid var(--ocx-color-border, #334155);
          border-radius: var(--ocx-radius-lg, 0.75rem);
          cursor: pointer;
          transition: background-color var(--ocx-duration-fast, 150ms) ease,
                      border-color var(--ocx-duration-fast, 150ms) ease;
        }
        .card:hover {
          background: var(--ocx-color-bg-card-hover, #334155);
          border-color: var(--ocx-color-border-hover, #4B5563);
        }
        .card:focus-visible {
          outline: 2px solid var(--ocx-color-border-focus, #3B82F6);
          outline-offset: 2px;
        }

        .icon {
          width: 40px;
          height: 40px;
          border-radius: var(--ocx-radius-md, 0.5rem);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .icon img {
          width: 24px;
          height: 24px;
        }
        .icon-fallback {
          font-size: var(--ocx-font-size-xl, 1.25rem);
        }

        .info {
          flex: 1;
          min-width: 0;
        }
        .name {
          font-size: var(--ocx-font-size-md, 1rem);
          font-weight: var(--ocx-font-weight-medium, 500);
          color: var(--ocx-color-text-primary, #f8fafc);
        }
        .desc {
          font-size: var(--ocx-font-size-xs, 0.75rem);
          color: var(--ocx-color-text-secondary, #94A3B8);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .badge {
          font-size: var(--ocx-font-size-xs, 0.75rem);
          font-weight: var(--ocx-font-weight-medium, 500);
          padding: 2px 8px;
          border-radius: var(--ocx-radius-full, 9999px);
          white-space: nowrap;
        }
        .badge-recommended {
          background: var(--ocx-color-accent-500, #3B82F6);
          color: var(--ocx-color-text-inverse, #fff);
        }
        .badge-installed {
          background: var(--ocx-color-success-bg, rgba(34,197,94,0.15));
          color: var(--ocx-color-success, #22C55E);
        }
      `,
    ];
  }

  @property({ type: Object }) wallet: WalletInfo | null = null;
  @property({ type: Boolean }) installed = false;
  @property({ type: Boolean }) recommended = false;

  override connectedCallback() {
    super.connectedCallback();
    if (isRTL()) this.setAttribute('dir', 'rtl');
  }

  override render() {
    if (!this.wallet) return null;

    return html`
      <div class="card" role="button" tabindex="0"
           aria-label="${t('wallet')} ${this.wallet.name}">
        <div class="icon" style="background:${this.wallet.iconBackground || 'var(--ocx-color-bg-tertiary, #1F2937)'}">
          ${this.wallet.icon
            ? html`<img src="${this.wallet.icon}" alt="" loading="lazy" />`
            : html`<span class="icon-fallback">🔗</span>`
          }
        </div>
        <div class="info">
          <div class="name">${this.wallet.name}</div>
          ${this.wallet.description ? html`<div class="desc">${this.wallet.description}</div>` : ''}
        </div>
        ${this.recommended
          ? html`<span class="badge badge-recommended">${t('recommended')}</span>`
          : this.installed
            ? html`<span class="badge badge-installed">${t('installed')}</span>`
            : ''
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ocx-wallet-card': WalletCard;
  }
}
