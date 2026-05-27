/** Default RPC URL. */
const DEFAULT_RPC_URL = 'https://ethereum-rpc.publicnode.com';
const DEFAULT_CHAIN_ID = 1;
/**
 * TelegramProvider adapts Telegram WebApp to a wallet provider interface.
 *
 * It parses initData, extracts user info, and provides EIP-1193-compatible
 * request handling for wallet operations within Telegram Mini Apps.
 */
export class TelegramProvider {
    constructor(config) {
        /** Parsed WebApp data. */
        this._data = null;
        /** Whether the provider has been initialized. */
        this._initialized = false;
        /** Whether the provider is ready. */
        this._ready = false;
        /** Currently connected wallet address. */
        this._account = null;
        /** Current wallet state. */
        this._state = { connected: false };
        /** Event listeners. */
        this._listeners = new Map();
        this._chains = config?.chains ?? [1, 5, 11155111, 137, 8453];
        this.appName = config?.appName ?? 'Cinacoin App';
        this._chainId = config?.defaultChainId ?? config?.chains?.[0] ?? DEFAULT_CHAIN_ID;
        this._rpcUrl = config?.rpcUrl;
        this._webApp = this._detectWebApp(config?.initDataOverride ?? config?.webApp);
    }
    // -----------------------------------------------------------------------
    // Lifecycle (legacy API)
    // -----------------------------------------------------------------------
    /** Initialize the provider (legacy API). */
    async initialize() {
        if (this._initialized)
            return true;
        if (!this._webApp)
            return false;
        try {
            this._data = this._parseInitData(this._webApp);
            this._ready = true;
            this._initialized = true;
            this._webApp.ready?.();
            this._webApp.expand?.();
            return true;
        }
        catch {
            return false;
        }
    }
    /** Initialize the provider (new API). */
    async init() {
        const ok = await this.initialize();
        return ok ? this._data : null;
    }
    /** Check if the provider is available. */
    isAvailable() {
        return this._webApp !== null;
    }
    /** Check if initialized. */
    isInitialized() {
        return this._initialized;
    }
    // -----------------------------------------------------------------------
    // Connection
    // -----------------------------------------------------------------------
    /** Connect the wallet. */
    connect(account, chainId) {
        if (!this._initialized && this.isAvailable()) {
            // Auto-initialize if available
            this._data = this._parseInitData(this._webApp);
            this._ready = true;
            this._initialized = true;
        }
        this._state = {
            connected: true,
            account,
            chainId: chainId ?? this._chainId,
            user: this.getUser(),
        };
        this._account = account;
        if (chainId)
            this._chainId = chainId;
        this._emit('connected', [this._state]);
        this.triggerHaptic('success');
        return { ...this._state };
    }
    /** Disconnect the wallet. */
    disconnect() {
        const wasConnected = this._state.connected;
        this._state = { connected: false };
        this._account = null;
        if (wasConnected) {
            this._emit('disconnected', [this._state]);
            this.triggerHaptic('warning');
        }
    }
    /** Get current connection state. */
    getState() {
        return { ...this._state };
    }
    // -----------------------------------------------------------------------
    // User
    // -----------------------------------------------------------------------
    /** Get parsed Telegram WebApp data. */
    get webAppData() {
        return this._data;
    }
    /** Get the Telegram user. */
    get user() {
        return this._data?.user ?? this._getRawUser();
    }
    /** Get raw user from webApp initDataUnsafe (before initialization). */
    _getRawUser() {
        const u = this._webApp?.initDataUnsafe?.user;
        return u ?? null;
    }
    /** Get user data (legacy API). */
    getUser() {
        const u = this.user;
        return u ?? undefined;
    }
    /** Get display name. */
    getDisplayName() {
        const u = this.getUser();
        if (!u)
            return '';
        if (u.last_name)
            return `${u.first_name} ${u.last_name}`;
        return u.first_name ?? '';
    }
    /** Get user ID. */
    getUserId() {
        return this.getUser()?.id;
    }
    /** Check if premium user. */
    isPremiumUser() {
        return this.getUser()?.is_premium === true;
    }
    // -----------------------------------------------------------------------
    // Theme & Platform
    // -----------------------------------------------------------------------
    getColorScheme() {
        return this._webApp?.colorScheme ?? 'light';
    }
    getPlatform() {
        return this._webApp?.platform ?? 'unknown';
    }
    getVersion() {
        return this._webApp?.version ?? '0.0.0';
    }
    // -----------------------------------------------------------------------
    // Getters
    // -----------------------------------------------------------------------
    /** Get the current account address. */
    get account() {
        return this._account;
    }
    /** Get the current chain ID. */
    get chainId() {
        return this._chainId;
    }
    /** Check if running inside Telegram. */
    get isInTelegram() {
        return this._webApp !== null;
    }
    /** Check if ready. */
    get isReady() {
        return this._ready;
    }
    /** Get Farcaster context (always null for Telegram). */
    get context() {
        return null;
    }
    /** Check if running inside Farcaster. */
    get isInFarcaster() {
        return false;
    }
    getInitData() {
        return this._webApp?.initData ?? '';
    }
    getRpcUrl() {
        return this._rpcUrl ?? DEFAULT_RPC_URL;
    }
    getChainId() {
        return this._state.chainId ?? this._chainId;
    }
    // -----------------------------------------------------------------------
    // Chain & Account
    // -----------------------------------------------------------------------
    setAccount(address) {
        const prev = this._account;
        this._account = address;
        if (prev !== address) {
            this._emit('accountsChanged', [[address]]);
        }
    }
    switchChain(chainId) {
        if (!this._chains.includes(chainId)) {
            throw new Error(`Chain ${chainId} not supported`);
        }
        const prev = this._chainId;
        this._chainId = chainId;
        if (prev !== chainId) {
            this._emit('chainChanged', [[chainId]]);
        }
    }
    getSupportedChains() {
        return [...this._chains];
    }
    // -----------------------------------------------------------------------
    // EIP-1193
    // -----------------------------------------------------------------------
    async request(args) {
        const { method, params } = args;
        switch (method) {
            case 'eth_requestAccounts':
                return this._handleRequestAccounts();
            case 'eth_accounts':
                return this._handleAccounts();
            case 'eth_chainId':
                return `0x${this._chainId.toString(16)}`;
            case 'wallet_switchEthereumChain': {
                const chain = params?.[0]?.chainId;
                if (!chain)
                    throw new Error('Missing chainId');
                this.switchChain(parseInt(chain, 16));
                return null;
            }
            case 'eth_sendTransaction':
                throw new Error('eth_sendTransaction not supported in Telegram Mini App mode');
            default:
                throw new Error(`Method ${method} not supported by TelegramProvider`);
        }
    }
    // -----------------------------------------------------------------------
    // UI Helpers
    // -----------------------------------------------------------------------
    showAlert(message) {
        this._webApp?.showAlert?.(message);
    }
    async showConfirm(message) {
        if (this._webApp?.showConfirm)
            return this._webApp.showConfirm(message);
        return typeof window !== 'undefined' ? window.confirm(message) : false;
    }
    openLink(url) {
        this._webApp?.openLink?.(url);
    }
    openTelegramLink(url) {
        this._webApp?.openTelegramLink?.(url);
    }
    triggerHaptic(type) {
        const haptic = this._webApp?.HapticFeedback;
        if (!haptic)
            return;
        if (type === 'success' || type === 'error' || type === 'warning') {
            haptic.notificationOccurred(type);
        }
        else {
            haptic.impactOccurred(type);
        }
    }
    hapticImpact(style = 'medium') {
        this._webApp?.HapticFeedback?.impactOccurred(style);
    }
    hapticNotification(type = 'success') {
        this._webApp?.HapticFeedback?.notificationOccurred(type);
    }
    closeApp() {
        this._webApp?.close?.();
    }
    /** Close the Telegram Mini App (alias). */
    close() {
        this.closeApp();
    }
    setMainButtonText(text) {
        this._webApp?.MainButton?.setText?.(text);
    }
    showMainButton() {
        this._webApp?.MainButton?.show?.();
    }
    hideMainButton() {
        this._webApp?.MainButton?.hide?.();
    }
    onMainButtonClick(callback) {
        this._webApp?.MainButton?.onClick?.(callback);
    }
    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);
        return () => this.off(event, callback);
    }
    off(event, callback) {
        this._listeners.get(event)?.delete(callback);
    }
    // -----------------------------------------------------------------------
    // Private
    // -----------------------------------------------------------------------
    _detectWebApp(initDataOverride) {
        if (typeof initDataOverride === 'string' && initDataOverride) {
            return {
                initData: initDataOverride,
                initDataUnsafe: {},
                platform: 'test',
                version: '1.0',
                themeParams: {},
                isVersionAtLeast: () => true,
                expand: () => { },
                close: () => { },
                ready: () => { },
            };
        }
        if (initDataOverride && typeof initDataOverride === 'object') {
            return initDataOverride;
        }
        if (typeof window !== 'undefined' && window.TelegramWebApp) {
            return window.TelegramWebApp;
        }
        if (typeof window !== 'undefined' && window.Telegram) {
            return window.Telegram.WebApp;
        }
        return null;
    }
    _parseInitData(webApp) {
        const userRaw = webApp.initDataUnsafe?.user;
        return {
            initData: { query: webApp.initData, user: userRaw },
            user: userRaw ?? null,
            themeParams: webApp.themeParams || {},
            platform: webApp.platform,
            version: webApp.version,
        };
    }
    _handleRequestAccounts() {
        if (!this._account) {
            throw new Error('No wallet connected. Use setAccount() first.');
        }
        return Promise.resolve([this._account]);
    }
    _handleAccounts() {
        return Promise.resolve(this._account ? [this._account] : []);
    }
    _emit(event, args) {
        this._listeners.get(event)?.forEach((cb) => {
            try {
                cb(...args);
            }
            catch { /* ignore */ }
        });
    }
}
//# sourceMappingURL=TelegramProvider.js.map