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
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
import { html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseLitElement } from '../foundation/base-element.js';
import { t, isRTL } from '../i18n/index.js';
let ConnectModal = (() => {
    let _classDecorators = [customElement('ocx-connect-modal')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseLitElement;
    let _isOpen_decorators;
    let _isOpen_initializers = [];
    let _isOpen_extraInitializers = [];
    let _defaultView_decorators;
    let _defaultView_initializers = [];
    let _defaultView_extraInitializers = [];
    let _wallets_decorators;
    let _wallets_initializers = [];
    let _wallets_extraInitializers = [];
    let _recommendedWalletIds_decorators;
    let _recommendedWalletIds_initializers = [];
    let _recommendedWalletIds_extraInitializers = [];
    let __currentView_decorators;
    let __currentView_initializers = [];
    let __currentView_extraInitializers = [];
    var ConnectModal = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.isOpen = __runInitializers(this, _isOpen_initializers, false);
            this.defaultView = (__runInitializers(this, _isOpen_extraInitializers), __runInitializers(this, _defaultView_initializers, 'wallets'));
            this.wallets = (__runInitializers(this, _defaultView_extraInitializers), __runInitializers(this, _wallets_initializers, []));
            this.recommendedWalletIds = (__runInitializers(this, _wallets_extraInitializers), __runInitializers(this, _recommendedWalletIds_initializers, []));
            this._currentView = (__runInitializers(this, _recommendedWalletIds_extraInitializers), __runInitializers(this, __currentView_initializers, 'wallets'));
            this._onKeydown = (__runInitializers(this, __currentView_extraInitializers), (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this._close();
                }
            });
        }
        static get styles() {
            return [
                super.hostStyles,
                css `
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
        connectedCallback() {
            super.connectedCallback();
            this._currentView = this.defaultView;
            document.addEventListener('keydown', this._onKeydown);
            if (isRTL())
                this.setAttribute('dir', 'rtl');
        }
        disconnectedCallback() {
            super.disconnectedCallback();
            document.removeEventListener('keydown', this._onKeydown);
        }
        _close() {
            this.isOpen = false;
            this.dispatchEvent(new CustomEvent('ocx-close', { bubbles: true, composed: true }));
        }
        _selectWallet(wallet) {
            this.dispatchEvent(new CustomEvent('ocx-wallet-select', {
                bubbles: true,
                composed: true,
                detail: wallet,
            }));
        }
        render() {
            if (!this.isOpen)
                return nothing;
            return html `
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

            ${this._currentView === 'wallets' ? html `
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
        _onOverlayClick(e) {
            if (e.target.classList.contains('overlay')) {
                this._close();
            }
        }
        _renderCurrentView() {
            switch (this._currentView) {
                case 'wallets':
                    return html `
          <div class="wallet-grid">
            ${this.wallets.map(w => this._renderWalletCard(w))}
          </div>
        `;
                case 'social':
                    return html `
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
                    return html `
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
                    return html `
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
        _renderWalletCard(wallet) {
            const isRecommended = this.recommendedWalletIds.includes(wallet.id);
            return html `
      <button class="alt-btn" style="flex-direction:column;gap:var(--ocx-space-2,0.5rem);padding:var(--ocx-space-4,1rem);"
              @click=${() => this._selectWallet(wallet)}>
        <div style="width:40px;height:40px;border-radius:var(--ocx-radius-md,0.5rem);background:${wallet.iconBackground || 'var(--ocx-color-bg-tertiary)'};display:flex;align-items:center;justify-content:center;">
          ${wallet.icon ? html `<img src="${wallet.icon}" alt="${wallet.name}" style="width:24px;height:24px;" />` : '🔗'}
        </div>
        <span>${wallet.name}</span>
        ${isRecommended ? html `<span style="font-size:var(--ocx-font-size-xs,0.75rem);color:var(--ocx-color-accent-500,#3B82F6);">${t('recommended')}</span>` : nothing}
      </button>
    `;
        }
    };
    __setFunctionName(_classThis, "ConnectModal");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        _isOpen_decorators = [property({ type: Boolean, attribute: 'is-open', reflect: true })];
        _defaultView_decorators = [property({ attribute: 'default-view' })];
        _wallets_decorators = [property({ type: Array })];
        _recommendedWalletIds_decorators = [property({ attribute: false })];
        __currentView_decorators = [state()];
        __esDecorate(null, null, _isOpen_decorators, { kind: "field", name: "isOpen", static: false, private: false, access: { has: obj => "isOpen" in obj, get: obj => obj.isOpen, set: (obj, value) => { obj.isOpen = value; } }, metadata: _metadata }, _isOpen_initializers, _isOpen_extraInitializers);
        __esDecorate(null, null, _defaultView_decorators, { kind: "field", name: "defaultView", static: false, private: false, access: { has: obj => "defaultView" in obj, get: obj => obj.defaultView, set: (obj, value) => { obj.defaultView = value; } }, metadata: _metadata }, _defaultView_initializers, _defaultView_extraInitializers);
        __esDecorate(null, null, _wallets_decorators, { kind: "field", name: "wallets", static: false, private: false, access: { has: obj => "wallets" in obj, get: obj => obj.wallets, set: (obj, value) => { obj.wallets = value; } }, metadata: _metadata }, _wallets_initializers, _wallets_extraInitializers);
        __esDecorate(null, null, _recommendedWalletIds_decorators, { kind: "field", name: "recommendedWalletIds", static: false, private: false, access: { has: obj => "recommendedWalletIds" in obj, get: obj => obj.recommendedWalletIds, set: (obj, value) => { obj.recommendedWalletIds = value; } }, metadata: _metadata }, _recommendedWalletIds_initializers, _recommendedWalletIds_extraInitializers);
        __esDecorate(null, null, __currentView_decorators, { kind: "field", name: "_currentView", static: false, private: false, access: { has: obj => "_currentView" in obj, get: obj => obj._currentView, set: (obj, value) => { obj._currentView = value; } }, metadata: _metadata }, __currentView_initializers, __currentView_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ConnectModal = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ConnectModal = _classThis;
})();
export { ConnectModal };
//# sourceMappingURL=connect-modal.js.map