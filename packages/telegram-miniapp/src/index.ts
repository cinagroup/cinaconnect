/**
 * Cinacoin Telegram Mini App SDK.
 *
 * Wallet connectivity and user identity for Telegram Mini Apps.
 *
 * @packageDocumentation
 */

// Provider
export { TelegramProvider } from './TelegramProvider.js';
export type { TelegramProviderConfig, TelegramWalletState } from './types.js';

// Modal
export { TelegramModal } from './TelegramModal.js';
export type { WalletOption, TelegramModalConfig } from './TelegramModal.js';

// Auth
export {
  validateInitData,
  parseInitData,
  buildLoginResult,
  telegramIdToAddress,
  generateSignInMessage,
  isInitDataExpired,
} from './TelegramAuth.js';

// Types
export type {
  TelegramInitData,
  TelegramUser,
  TelegramChat,
  TelegramWebApp,
  TelegramMainButton,
  TelegramBackButton,
  TelegramHapticFeedback,
  TelegramLoginResult,
  TelegramTheme,
} from './types.js';
