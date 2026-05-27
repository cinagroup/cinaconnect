/**
 * Telegram WebApp wallet provider.
 *
 * Adapts the Telegram WebApp environment to the EIP-1193 provider interface,
 * enabling wallet operations inside Telegram Mini Apps.
 *
 * @packageDocumentation
 */
import type { TelegramProviderConfig, TelegramWebAppData, TelegramUser, TelegramWalletState } from './types.js';

/**
 * Minimal Telegram WebApp interface we depend on.
 */
interface TelegramWebApp {
  initDataUnsafe: Record<string, unknown>;
  initData: string;
  platform: string;
  version: string;
  themeParams: Record<string, string>;
  colorScheme?: 'light' | 'dark';
  isVersionAtLeast: (version: string) => boolean;
  expand: () => void;
  close: () => void;
  ready: () => void;
  showAlert?: (message: string) => void;
  showConfirm?: (message: string) => boolean;
  openLink?: (url: string) => void;
  openTelegramLink?: (url: string) => void;
  onEvent?: (eventType: string, callback: () => void) => void;
  offEvent?: (eventType: string, callback: () => void) => void;
  HapticFeedback?: {
    impactOccurred: (style: string) => void;
    notificationOccurred: (type: string) => void;
    selectionChanged: () => void;
  };
  MainButton?: {
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    onTap: (callback: () => void) => void;
    offTap: (callback: () => void) => void;
    text?: string;
    isVisible?: boolean;
    isActive?: boolean;
    isProgressVisible?: boolean;
    color?: string;
    textColor?: string;
  };
  BackButton?: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  isAvailable?: boolean;
}

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
  /** Telegram WebApp instance (may be mocked). */
  private _webApp: TelegramWebApp | null;

  /** Parsed WebApp data. */
  private _data: TelegramWebAppData | null = null;

  /** Whether the provider has been initialized. */
  private _initialized = false;

  /** Whether the provider is ready. */
  private _ready = false;

  /** Currently connected wallet address. */
  private _account: `0x${string}` | null = null;

  /** Current chain ID. */
  private _chainId: number;

  /** Current wallet state. */
  private _state: TelegramWalletState = { connected: false };

  /** Event listeners. */
  private _listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  /** Supported chains. */
  private readonly _chains: number[];

  /** App name. */
  readonly appName: string;

  /** RPC URL. */
  private readonly _rpcUrl?: string;

  constructor(config?: TelegramProviderConfig) {
    this._chains = config?.chains ?? [1, 5, 11155111, 137, 8453];
    this.appName = config?.appName ?? 'Cinacoin App';
    this._chainId = config?.defaultChainId ?? config?.chains?.[0] ?? DEFAULT_CHAIN_ID;
    this._rpcUrl = config?.rpcUrl;
    this._webApp = this._detectWebApp(config?.initDataOverride ?? (config as any)?.webApp);
  }

  // -----------------------------------------------------------------------
  // Lifecycle (legacy API)
  // -----------------------------------------------------------------------

  /** Initialize the provider (legacy API). */
  async initialize(): Promise<boolean> {
    if (this._initialized) return true;
    if (!this._webApp) return false;

    try {
      this._data = this._parseInitData(this._webApp);
      this._ready = true;
      this._initialized = true;
      this._webApp.ready?.();
      this._webApp.expand?.();
      return true;
    } catch {
      return false;
    }
  }

  /** Initialize the provider (new API). */
  async init(): Promise<TelegramWebAppData | null> {
    const ok = await this.initialize();
    return ok ? this._data : null;
  }

  /** Check if the provider is available. */
  isAvailable(): boolean {
    return this._webApp !== null;
  }

  /** Check if initialized. */
  isInitialized(): boolean {
    return this._initialized;
  }

  // -----------------------------------------------------------------------
  // Connection
  // -----------------------------------------------------------------------

  /** Connect the wallet. */
  connect(account: `0x${string}`, chainId?: number): TelegramWalletState {
    if (!this._initialized && this.isAvailable()) {
      // Auto-initialize if available
      this._data = this._parseInitData(this._webApp!);
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
    if (chainId) this._chainId = chainId;

    this._emit('connected', [this._state]);
    this.triggerHaptic('success');
    return { ...this._state };
  }

  /** Disconnect the wallet. */
  disconnect(): void {
    const wasConnected = this._state.connected;
    this._state = { connected: false };
    this._account = null;
    if (wasConnected) {
      this._emit('disconnected', [this._state]);
      this.triggerHaptic('warning');
    }
  }

  /** Get current connection state. */
  getState(): TelegramWalletState {
    return { ...this._state };
  }

  // -----------------------------------------------------------------------
  // User
  // -----------------------------------------------------------------------

  /** Get parsed Telegram WebApp data. */
  get webAppData(): TelegramWebAppData | null {
    return this._data;
  }

  /** Get the Telegram user. */
  get user(): TelegramUser | null {
    return this._data?.user ?? this._getRawUser();
  }

  /** Get raw user from webApp initDataUnsafe (before initialization). */
  private _getRawUser(): TelegramUser | null {
    const u = this._webApp?.initDataUnsafe?.user as TelegramUser | undefined;
    return u ?? null;
  }

  /** Get user data (legacy API). */
  getUser(): TelegramUser | undefined {
    const u = this.user;
    return u ?? undefined;
  }

  /** Get display name. */
  getDisplayName(): string {
    const u = this.getUser();
    if (!u) return '';
    if (u.last_name) return `${u.first_name} ${u.last_name}`;
    return u.first_name ?? '';
  }

  /** Get user ID. */
  getUserId(): number | undefined {
    return this.getUser()?.id;
  }

  /** Check if premium user. */
  isPremiumUser(): boolean {
    return this.getUser()?.is_premium === true;
  }

  // -----------------------------------------------------------------------
  // Theme & Platform
  // -----------------------------------------------------------------------

  getColorScheme(): 'light' | 'dark' {
    return this._webApp?.colorScheme ?? 'light';
  }

  getPlatform(): string {
    return this._webApp?.platform ?? 'unknown';
  }

  getVersion(): string {
    return this._webApp?.version ?? '0.0.0';
  }

  // -----------------------------------------------------------------------
  // Getters
  // -----------------------------------------------------------------------

  /** Get the current account address. */
  get account(): `0x${string}` | null {
    return this._account;
  }

  /** Get the current chain ID. */
  get chainId(): number {
    return this._chainId;
  }

  /** Check if running inside Telegram. */
  get isInTelegram(): boolean {
    return this._webApp !== null;
  }

  /** Check if ready. */
  get isReady(): boolean {
    return this._ready;
  }

  /** Get Farcaster context (always null for Telegram). */
  get context(): null {
    return null;
  }

  /** Check if running inside Farcaster. */
  get isInFarcaster(): boolean {
    return false;
  }

  getInitData(): string {
    return this._webApp?.initData ?? '';
  }

  getRpcUrl(): string {
    return this._rpcUrl ?? DEFAULT_RPC_URL;
  }

  getChainId(): number {
    return this._state.chainId ?? this._chainId;
  }

  // -----------------------------------------------------------------------
  // Chain & Account
  // -----------------------------------------------------------------------

  setAccount(address: `0x${string}`): void {
    const prev = this._account;
    this._account = address;
    if (prev !== address) {
      this._emit('accountsChanged', [[address]]);
    }
  }

  switchChain(chainId: number): void {
    if (!this._chains.includes(chainId)) {
      throw new Error(`Chain ${chainId} not supported`);
    }
    const prev = this._chainId;
    this._chainId = chainId;
    if (prev !== chainId) {
      this._emit('chainChanged', [[chainId]]);
    }
  }

  getSupportedChains(): number[] {
    return [...this._chains];
  }

  // -----------------------------------------------------------------------
  // EIP-1193
  // -----------------------------------------------------------------------

  async request(args: { method: string; params?: unknown[] }): Promise<unknown> {
    const { method, params } = args;
    switch (method) {
      case 'eth_requestAccounts':
        return this._handleRequestAccounts();
      case 'eth_accounts':
        return this._handleAccounts();
      case 'eth_chainId':
        return `0x${this._chainId.toString(16)}`;
      case 'wallet_switchEthereumChain': {
        const chain = (params?.[0] as { chainId: string })?.chainId;
        if (!chain) throw new Error('Missing chainId');
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

  showAlert(message: string): void {
    this._webApp?.showAlert?.(message);
  }

  async showConfirm(message: string): Promise<boolean> {
    if (this._webApp?.showConfirm) return this._webApp.showConfirm(message);
    return typeof window !== 'undefined' ? window.confirm(message) : false;
  }

  openLink(url: string): void {
    this._webApp?.openLink?.(url);
  }

  openTelegramLink(url: string): void {
    this._webApp?.openTelegramLink?.(url);
  }

  triggerHaptic(type: 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy'): void {
    const haptic = this._webApp?.HapticFeedback;
    if (!haptic) return;
    if (type === 'success' || type === 'error' || type === 'warning') {
      haptic.notificationOccurred(type);
    } else {
      haptic.impactOccurred(type);
    }
  }

  hapticImpact(style: string = 'medium'): void {
    this._webApp?.HapticFeedback?.impactOccurred(style);
  }

  hapticNotification(type: string = 'success'): void {
    this._webApp?.HapticFeedback?.notificationOccurred(type);
  }

  closeApp(): void {
    this._webApp?.close?.();
  }

  /** Close the Telegram Mini App (alias). */
  close(): void {
    this.closeApp();
  }

  setMainButtonText(text: string): void {
    this._webApp?.MainButton?.setText?.(text);
  }

  showMainButton(): void {
    this._webApp?.MainButton?.show?.();
  }

  hideMainButton(): void {
    this._webApp?.MainButton?.hide?.();
  }

  onMainButtonClick(callback: () => void): void {
    this._webApp?.MainButton?.onClick?.(callback);
  }

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------

  on(event: string, callback: (...args: unknown[]) => void): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: (...args: unknown[]) => void): void {
    this._listeners.get(event)?.delete(callback);
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private _detectWebApp(initDataOverride?: string | unknown): TelegramWebApp | null {
    if (typeof initDataOverride === 'string' && initDataOverride) {
      return {
        initData: initDataOverride,
        initDataUnsafe: {},
        platform: 'test',
        version: '1.0',
        themeParams: {},
        isVersionAtLeast: () => true,
        expand: () => {},
        close: () => {},
        ready: () => {},
      };
    }
    if (initDataOverride && typeof initDataOverride === 'object') {
      return initDataOverride as TelegramWebApp;
    }
    if (typeof window !== 'undefined' && (window as any).TelegramWebApp) {
      return (window as any).TelegramWebApp;
    }
    if (typeof window !== 'undefined' && (window as any).Telegram) {
      return (window as any).Telegram.WebApp;
    }
    return null;
  }

  private _parseInitData(webApp: TelegramWebApp): TelegramWebAppData {
    const userRaw = webApp.initDataUnsafe?.user as TelegramUser | undefined;
    return {
      initData: { query: webApp.initData, user: userRaw } as any,
      user: userRaw ?? null,
      themeParams: webApp.themeParams || {},
      platform: webApp.platform,
      version: webApp.version,
    };
  }

  private _handleRequestAccounts(): Promise<string[]> {
    if (!this._account) {
      throw new Error('No wallet connected. Use setAccount() first.');
    }
    return Promise.resolve([this._account]);
  }

  private _handleAccounts(): Promise<string[]> {
    return Promise.resolve(this._account ? [this._account] : []);
  }

  private _emit(event: string, args: unknown[]): void {
    this._listeners.get(event)?.forEach((cb) => {
      try { cb(...args); } catch { /* ignore */ }
    });
  }
}
