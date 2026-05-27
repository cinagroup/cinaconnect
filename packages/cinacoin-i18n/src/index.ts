/**
 * @cinacoin/i18n — Localization provider for Cinacoin.
 *
 * Provides multi-language support with 5 locales (en-US, zh-CN, es, ja, ko)
 * across common, wallet, auth, payment, and errors namespaces.
 */

// Core
export { I18nProvider, I18nContext, resolveLocale, getNestedValue, localeLabels, type Locale, type Translations, type I18nProviderProps } from './i18n';

// Hook
export { useTranslation } from './hooks/useTranslation';

// Components
export { LocaleSelector } from './components/LocaleSelector/LocaleSelector';

// Locales (for custom resource merging or extension)
export { enUS, type EnUS } from './locales/en-US';
export { zhCN, type ZhCN } from './locales/zh-CN';
export { es, type Es } from './locales/es';
export { ja, type Ja } from './locales/ja';
export { ko, type Ko } from './locales/ko';
