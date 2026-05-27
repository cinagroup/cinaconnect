/**
 * Telegram Mini App provider types.
 */

/** Telegram WebApp initData structure. */
export interface TelegramInitData {
  /** Unique session identifier. */
  query_id?: string;
  /** User object. */
  user?: TelegramUser;
  /** Chat object (if opened in a group). */
  chat?: TelegramChat;
  /** Chat type. */
  chat_type?: string;
  /** Chat instance identifier. */
  chat_instance?: string;
  /** Bot command if bot was launched via link. */
  start_param?: string;
  /** Auth date. */
  auth_date: number;
  /** Hash for validation. */
  hash: string;
  /** Signature of init data. */
  signature?: string;
}

/** Telegram user data. */
export interface TelegramUser {
  /** Telegram user ID. */
  id: number;
  /** Whether user is a Telegram Premium user. */
  is_premium?: boolean;
  /** Whether user is a bot. */
  is_bot?: boolean;
  /** First name. */
  first_name: string;
  /** Last name (optional). */
  last_name?: string;
  /** Username (optional). */
  username?: string;
  /** Language code. */
  language_code?: string;
  /** URL of user profile photo (optional). */
  photo_url?: string;
}

/** Telegram chat data. */
export interface TelegramChat {
  /** Chat ID. */
  id: number;
  /** Chat type. */
  type: 'group' | 'supergroup' | 'channel';
  /** Chat title. */
  title: string;
  /** Username (optional). */
  username?: string;
  /** URL of chat photo (optional). */
  photo_url?: string;
}

/** Telegram WebApp interface (subset of @twa-dev/types). */
export interface TelegramWebApp {
  /** WebApp initialization data. */
  initData: string;
  /** Parsed init data. */
  initDataUnsafe: TelegramInitData;
  /** Whether the WebApp is available. */
  isAvailable?: boolean;
  /** Telegram WebApp version. */
  version: string;
  /** Current theme. */
  colorScheme: 'light' | 'dark';
  /** Platform name. */
  platform: string;
  /** Expand the WebApp to full height. */
  expand: () => void;
  /** Close the WebApp. */
  close: () => void;
  /** Show main button. */
  MainButton: TelegramMainButton;
  /** Show/hide back button. */
  BackButton: TelegramBackButton;
  /** Show native alert. */
  showAlert: (message: string) => void;
  /** Show native confirm. */
  showConfirm: (message: string) => Promise<boolean>;
  /** Open Telegram link. */
  openTelegramLink: (url: string) => void;
  /** Open external link. */
  openLink: (url: string) => void;
  /** Haptic feedback. */
  HapticFeedback: TelegramHapticFeedback;
  /** Set header color. */
  setHeaderColor: (color: string) => void;
  /** Set background color. */
  setBackgroundColor: (color: string) => void;
}

/** Parsed Telegram WebApp data returned by the provider. */
export interface TelegramWebAppData {
  /** Parsed init data with query and user. */
  initData: { query: string; user?: TelegramUser };
  /** Telegram user from initDataUnsafe. */
  user: TelegramUser | null;
  /** Theme parameters from the WebApp. */
  themeParams: Record<string, string>;
  /** Platform identifier. */
  platform: string;
  /** WebApp version. */
  version: string;
}

/** Telegram Main Button. */
export interface TelegramMainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
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
}

/** Telegram Back Button. */
export interface TelegramBackButton {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
}

/** Telegram Haptic Feedback. */
export interface TelegramHapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
}

/** Wallet connection state within Telegram. */
export interface TelegramWalletState {
  /** Whether wallet is connected. */
  connected: boolean;
  /** Connected account address. */
  account?: string;
  /** Connected chain ID. */
  chainId?: number;
  /** Telegram user data. */
  user?: TelegramUser;
}

/** Configuration for TelegramProvider. */
export interface TelegramProviderConfig {
  /** Bot token (server-side validation only — never expose client-side). */
  botToken?: string;
  /** Default chain ID. */
  defaultChainId?: number;
  /** RPC endpoint URL. */
  rpcUrl?: string;
  /** Custom WebApp instance (for testing). */
  webApp?: TelegramWebApp;
}

/** Telegram login result. */
export interface TelegramLoginResult {
  /** Telegram user ID. */
  telegramId: number;
  /** Telegram username (if available). */
  username?: string;
  /** Display name. */
  displayName: string;
  /** Whether user has Telegram Premium. */
  isPremium: boolean;
  /** Raw init data (for server-side validation). */
  initData: string;
}

/** Theme configuration from Telegram. */
export interface TelegramTheme {
  bg_color: string;
  text_color: string;
  hint_color: string;
  link_color: string;
  button_color: string;
  button_text_color: string;
  secondary_bg_color: string;
}
