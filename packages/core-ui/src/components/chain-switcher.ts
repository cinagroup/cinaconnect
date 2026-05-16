/**
 * ChainSwitcher Web Component (i18n-enabled)
 *
 * Dropdown for switching between blockchain networks.
 *
 * Properties:
 *   - chains: ChainInfo[]
 *   - activeChainId: currently selected chain ID
 *
 * Events:
 *   - ocx-chain-change: fired when a chain is selected (detail: chainId)
 */

import { html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseLitElement } from '../foundation/base-element.js';
import { t, isRTL } from '../i18n/index.js';

export interface ChainInfo {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  iconUrl?: string;
  blockExplorerUrl?: string;
  testnet?: boolean;
}

@customElement('ocx-chain-switcher')
export class ChainSwitcher extends BaseLitElement {
  static override get styles() {
    return [
      super.hostStyles,
      css`
        :host {
          display: inline-block;
          position: relative;
        }

        .trigger {
          display: inline-flex;
          align-items: center;
          gap: var(--ocx-space-2, 0.5rem);
          padding: var(--ocx-space-2, 0.5rem) var(--ocx-space-3, 0.75rem);
          background: var(--ocx-color-bg-card, #1E293B);
          border: 1px solid var(--ocx-color-border, #334155);
          border-radius: var(--ocx-radius-lg, 0.75rem);
          cursor: pointer;
          color: var(--ocx-color-text-primary, #f8fafc);
          font-size: var(--ocx-font-size-sm, 0.875rem);
          transition: border-color var(--ocx-duration-fast, 150ms) ease;
        }
        .trigger:hover {
          border-color: var(--ocx-color-border-hover, #4B5563);
        }
        .trigger:focus-visible {
          outline: 2px solid var(--ocx-color-border-focus, #3B82F6);
          outline-offset: 2px;
        }

        .chain-icon {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .chain-icon img {
          width: 16px;
          height: 16px;
        }

        .arrow {
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 4px solid var(--ocx-color-text-secondary, #94A3B8);
          transition: transform var(--ocx-duration-fast, 150ms) ease;
        }
        .arrow.open {
          transform: rotate(180deg);
        }

        .dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          min-width: 220px;
          background: var(--ocx-color-bg-secondary, #111827);
          border: 1px solid var(--ocx-color-border, #334155);
          border-radius: var(--ocx-radius-lg, 0.75rem);
          box-shadow: var(--ocx-shadow-lg, 0 10px 15px rgba(0,0,0,0.3));
          z-index: var(--ocx-z-dropdown, 1000);
          max-height: 300px;
          overflow-y: auto;
        }

        :host([dir="rtl"]) .dropdown {
          left: auto;
          right: 0;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: var(--ocx-space-2, 0.5rem);
          padding: var(--ocx-space-2, 0.5rem) var(--ocx-space-3, 0.75rem);
          cursor: pointer;
          transition: background-color var(--ocx-duration-fast, 150ms) ease;
          color: var(--ocx-color-text-primary, #f8fafc);
          font-size: var(--ocx-font-size-sm, 0.875rem);
        }
        .dropdown-item:hover {
          background: var(--ocx-color-bg-card-hover, #334155);
        }
        .dropdown-item.active {
          color: var(--ocx-color-accent-500, #3B82F6);
        }
        .dropdown-item:focus-visible {
          outline: 2px solid var(--ocx-color-border-focus, #3B82F6);
          outline-offset: -2px;
        }

        .check {
          width: 16px;
          color: var(--ocx-color-accent-500, #3B82F6);
          flex-shrink: 0;
        }

        .testnet-badge {
          font-size: var(--ocx-font-size-xs, 0.75rem);
          padding: 1px 6px;
          background: var(--ocx-color-warning-bg, rgba(234,179,8,0.15));
          color: var(--ocx-color-warning, #EAB308);
          border-radius: var(--ocx-radius-sm, 0.25rem);
          margin-left: auto;
        }
      `,
    ];
  }

  @property({ type: Array }) chains: ChainInfo[] = [];
  @property({ type: Number, attribute: 'active-chain-id' }) activeChainId = 1;

  @state() private _open = false;

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._onOutsideClick);
    if (isRTL()) this.setAttribute('dir', 'rtl');
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._onOutsideClick);
  }

  private _onOutsideClick = (e: Event) => {
    if (this._open && !this.contains(e.target as Node)) {
      this._open = false;
    }
  };

  private _toggle() {
    this._open = !this._open;
  }

  private _select(chain: ChainInfo) {
    this._open = false;
    if (chain.id !== this.activeChainId) {
      this.dispatchEvent(
        new CustomEvent('ocx-chain-change', {
          bubbles: true,
          composed: true,
          detail: { chainId: chain.id },
        })
      );
    }
  }

  override render() {
    const active = this.chains.find(c => c.id === this.activeChainId);

    return html`
      <button class="trigger"
              @click=${this._toggle}
              aria-haspopup="listbox"
              aria-expanded=${this._open}
              aria-label="${t('switch_network')}">
        ${this._renderChainIcon(active)}
        <span>${active ? active.name : t('select_network')}</span>
        <span class="arrow ${this._open ? 'open' : ''}"></span>
      </button>

      ${this._open ? html`
        <div class="dropdown" role="listbox" aria-label="${t('select_network')}">
          ${this.chains.map(chain => html`
            <div class="dropdown-item ${chain.id === this.activeChainId ? 'active' : ''}"
                 role="option"
                 aria-selected=${chain.id === this.activeChainId}
                 tabindex="0"
                 @click=${() => this._select(chain)}
                 @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') this._select(chain); }}>
              ${chain.id === this.activeChainId ? html`<span class="check">✓</span>` : html`<span class="check"></span>`}
              ${this._renderChainIcon(chain)}
              <span>${chain.name}</span>
              ${chain.testnet ? html`<span class="testnet-badge">${t('testnet')}</span>` : nothing}
            </div>
          `)}
        </div>
      ` : nothing}
    `;
  }

  private _renderChainIcon(chain?: ChainInfo) {
    if (!chain) return nothing;
    return html`
      <span class="chain-icon">
        ${chain.iconUrl
          ? html`<img src="${chain.iconUrl}" alt="" />`
          : html`<span style="font-size:12px;">⛓</span>`
        }
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ocx-chain-switcher': ChainSwitcher;
  }
}
