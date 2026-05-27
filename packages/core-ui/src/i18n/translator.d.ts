/**
 * Translation Engine for OnChainUI
 *
 * Supports parameterized translations, locale fallback chains,
 * and dynamic locale loading.
 *
 * Fallback chain: specific locale → base locale → en → key itself
 * Examples:
 *   "zh-CN" → "zh" → "en" → raw key
 *   "pt-BR" → "pt" → "en" → raw key
 *   "en-US" → "en" → raw key
 */
export interface TranslationMessages {
    [key: string]: string;
}
/** Locale loader function — used for dynamic imports. */
export type LocaleLoader = () => Promise<TranslationMessages>;
/** Registry of locale loaders keyed by locale code. */
export interface LocaleRegistry {
    [locale: string]: TranslationMessages | LocaleLoader;
}
/** Register a locale's messages. */
export declare function registerLocale(locale: string, messages: TranslationMessages | LocaleLoader): void;
/** Register multiple locales at once. */
export declare function registerLocales(registry: LocaleRegistry): void;
/**
 * Set the active locale.
 * @param locale - Locale code (e.g. "en", "zh-CN", "ja").
 */
export declare function setLocale(locale: string): Promise<void>;
/**
 * Set the fallback locale (default: "en").
 * @param locale - Fallback locale code.
 */
export declare function setFallbackLocale(locale: string): void;
/**
 * Get the current locale.
 */
export declare function getLocale(): string;
/**
 * Get all available locale codes that have been registered.
 */
export declare function getAvailableLocales(): string[];
/**
 * Translate a key with optional parameter interpolation.
 *
 * @param key - Translation key (snake_case, e.g. "connect_wallet").
 * @param params - Optional params for interpolation, e.g. { brand: "Cinacoin" }.
 * @returns Translated string, or the key itself if not found.
 *
 * Usage:
 *   t('connect_wallet')                         → "Connect Wallet"
 *   t('powered_by', { brand: "Cinacoin" })     → "Powered by Cinacoin"
 *   t('days_ago', { count: 3 })                 → "3 days ago"
 */
export declare function t(key: string, params?: Record<string, unknown>): string;
/**
 * Check if a translation key exists in the current locale chain.
 */
export declare function has(key: string): boolean;
/**
 * Check if the current locale is RTL.
 */
export declare function isRTL(): boolean;
/**
 * Check if a specific locale is RTL.
 */
export declare function isLocaleRTL(locale: string): boolean;
/**
 * Create a lazy loader for a locale JSON file.
 * @param importFn - Dynamic import function returning { default: messages }.
 */
export declare function lazyLocale(importFn: () => Promise<{
    default: TranslationMessages;
}>): LocaleLoader;
//# sourceMappingURL=translator.d.ts.map