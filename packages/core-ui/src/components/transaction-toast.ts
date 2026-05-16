/**
 * TransactionToast Web Component (i18n-enabled)
 *
 * Toast notification for transaction status updates.
 *
 * Properties:
 *   - hash: transaction hash
 *   - chainId: chain ID
 *   - status: 'pending' | 'confirmed' | 'failed' | 'replaced'
 *   - confirmations: current confirmation count
 *   - targetConfirmations: required confirmations
 *   - autoDismiss: auto-dismiss timeout in ms (0 = no auto-dismiss)
 *   - explorerUrl: block explorer URL
 *
 * Events:
 *   - ocx-dismiss: fired when toast is dismissed
 *   - ocx-retry: fired when retry button is clicked (failed tx)
 *   - ocx-view-explorer: fired when view on explorer is clicked
 */

import { html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseLitElement } from '../foundation/base-element.js';
import { t, isRTL } from '../i18n/index.js';

export type TxStatus = 'pending' | 'confirmed' | 'failed' | 'replaced';

@customElement('ocx-transaction-toast')
export class TransactionToast extends BaseLitElement {
  static override get styles() {
    return [
      super.hostStyles,
      css`
        :host {
          display: block;
        }

        .toast {
          display: flex;
          align-items: flex-start;
          gap: var(--ocx-space-3, 0.75rem);
          padding: var(--ocx-space-3, 0.75rem);
          background: var(--ocx-color-bg-card, #1E293B);
          border: 1px solid var(--ocx-color-border, #334155);
          border-radius: var(--ocx-radius-lg, 0.75rem);
          box-shadow: var(--ocx-shadow-lg, 0 10px 15px rgba(0,0,0,0.3));
          max-width: 380px;
          min-width: 280px;
          position: relative;
          overflow: hidden;
        }

        .icon {
          font-size: var(--ocx-font-size-lg, 1.125rem);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .content {
          flex: 1;
          min-width: 0;
        }

        .title {
          font-size: var(--ocx-font-size-sm, 0.875rem);
          font-weight: var(--ocx-font-weight-medium, 500);
          margin-bottom: 2px;
        }

        .subtitle {
          font-size: var(--ocx-font-size-xs, 0.75rem);
          color: var(--ocx-color-text-secondary, #94A3B8);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .actions {
          display: flex;
          gap: var(--ocx-space-2, 0.5rem);
          margin-top: var(--ocx-space-2, 0.5rem);
        }

        .action-link {
          font-size: var(--ocx-font-size-xs, 0.75rem);
          color: var(--ocx-color-accent-500, #3B82F6);
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          text-decoration: none;
        }
        .action-link:hover {
          text-decoration: underline;
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--ocx-color-text-tertiary, #64748B);
          cursor: pointer;
          font-size: var(--ocx-font-size-sm, 0.875rem);
          padding: var(--ocx-space-1, 0.25rem);
          flex-shrink: 0;
          line-height: 1;
        }
        .close-btn:hover {
          color: var(--ocx-color-text-primary, #f8fafc);
        }

        .progress-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: var(--ocx-color-accent-500, #3B82F6);
          transition: width 0.3s ease;
        }

        /* Status colors */
        :host([status="confirmed"]) .icon { color: var(--ocx-color-success, #22C55E); }
        :host([status="failed"]) .icon { color: var(--ocx-color-error, #EF4444); }
        :host([status="pending"]) .icon { color: var(--ocx-color-warning, #EAB308); }
        :host([status="replaced"]) .icon { color: var(--ocx-color-info, #3B82F6); }
      `,
    ];
  }

  @property() hash = '';
  @property({ type: Number }) chainId = 1;
  @property({ reflect: true }) status: TxStatus = 'pending';
  @property({ type: Number }) confirmations = 0;
  @property({ type: Number }) targetConfirmations = 12;
  @property({ type: Number }) autoDismiss = 8000;
  @property() explorerUrl = '';

  @state() private _progressWidth = 0;
  private _dismissTimer: ReturnType<typeof setTimeout> | null = null;

  override connectedCallback() {
    super.connectedCallback();
    this._startProgress();
    if (this.autoDismiss > 0 && this.status !== 'pending') {
      this._dismissTimer = setTimeout(() => this._dismiss(), this.autoDismiss);
    }
    if (isRTL()) this.setAttribute('dir', 'rtl');
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this._dismissTimer) clearTimeout(this._dismissTimer);
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('status')) {
      if (this.autoDismiss > 0 && this.status !== 'pending') {
        this._dismissTimer = setTimeout(() => this._dismiss(), this.autoDismiss);
      }
    }
  }

  private _startProgress() {
    if (this.status !== 'pending') return;
    const interval = setInterval(() => {
      this._progressWidth += 1;
      if (this._progressWidth >= 100) {
        clearInterval(interval);
      }
    }, this.autoDismiss / 100);
  }

  private _dismiss() {
    this.dispatchEvent(new CustomEvent('ocx-dismiss', { bubbles: true, composed: true }));
  }

  private _retry() {
    this.dispatchEvent(new CustomEvent('ocx-retry', { bubbles: true, composed: true }));
  }

  private _viewExplorer() {
    this.dispatchEvent(new CustomEvent('ocx-view-explorer', {
      bubbles: true,
      composed: true,
      detail: { hash: this.hash, explorerUrl: this.explorerUrl },
    }));
  }

  override render() {
    const truncated = this.hash.length > 10
      ? `${this.hash.slice(0, 6)}...${this.hash.slice(-4)}`
      : this.hash;

    return html`
      <div class="toast" role="alert" aria-live="polite">
        <span class="icon">${this._statusIcon}</span>
        <div class="content">
          <div class="title">${this._statusTitle}</div>
          <div class="subtitle">${this._statusMessage} — ${truncated}</div>
          <div class="actions">
            ${this.explorerUrl ? html`<button class="action-link" @click=${this._viewExplorer}>↗ ${t('view')}</button>` : nothing}
            ${this.status === 'failed' ? html`<button class="action-link" @click=${this._retry}>${t('retry')}</button>` : nothing}
          </div>
        </div>
        <button class="close-btn" @click=${this._dismiss} aria-label="${t('close')}">✕</button>
        ${this.status === 'pending' ? html`<div class="progress-bar" style="width:${this._progressWidth}%"></div>` : nothing}
      </div>
    `;
  }

  private get _statusIcon(): string {
    switch (this.status) {
      case 'confirmed': return '✅';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      case 'replaced': return '🔄';
      default: return '⏳';
    }
  }

  private get _statusTitle(): string {
    switch (this.status) {
      case 'confirmed': return t('transaction_confirmed');
      case 'failed': return t('transaction_failed');
      case 'pending': return t('transaction_pending');
      case 'replaced': return t('transaction_replaced');
      default: return t('transaction_pending');
    }
  }

  private get _statusMessage(): string {
    if (this.status === 'pending' && this.targetConfirmations > 0) {
      return `(${this.confirmations}/${this.targetConfirmations})`;
    }
    return '';
  }
}

declare global {
  interface HTMLElementTagNameMap {
  'ocx-transaction-toast': TransactionToast;
  }
}
