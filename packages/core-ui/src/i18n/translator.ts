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

// ─── Registry ───────────────────────────────────────────────────────

const _registry: LocaleRegistry = {};
let _currentLocale: string = 'en';
let _fallbackLocale: string = 'en';

/** Register a locale's messages. */
export function registerLocale(
  locale: string,
  messages: TranslationMessages | LocaleLoader,
): void {
  _registry[locale] = messages;
}

/** Register multiple locales at once. */
export function registerLocales(registry: LocaleRegistry): void {
  Object.entries(registry).forEach(([locale, messages]) => {
    _registry[locale] = messages;
  });
}

// ─── Core API ───────────────────────────────────────────────────────

/**
 * Set the active locale.
 * @param locale - Locale code (e.g. "en", "zh-CN", "ja").
 */
export async function setLocale(locale: string): Promise<void> {
  _currentLocale = locale;

  // Ensure the locale's messages are loaded
  const entry = _registry[locale];
  if (entry && typeof entry === 'function') {
    _registry[locale] = await (entry as LocaleLoader)();
  }

  // Also load base locale if it's a sub-locale
  const base = getBaseLocale(locale);
  if (base !== locale) {
    const baseEntry = _registry[base];
    if (baseEntry && typeof baseEntry === 'function') {
      _registry[base] = await (baseEntry as LocaleLoader)();
    }
  }
}

/**
 * Set the fallback locale (default: "en").
 * @param locale - Fallback locale code.
 */
export function setFallbackLocale(locale: string): void {
  _fallbackLocale = locale;
}

/**
 * Get the current locale.
 */
export function getLocale(): string {
  return _currentLocale;
}

/**
 * Get all available locale codes that have been registered.
 */
export function getAvailableLocales(): string[] {
  return Object.keys(_registry);
}

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
export function t(key: string, params?: Record<string, unknown>): string {
  const chain = _buildFallbackChain(_currentLocale, _fallbackLocale);

  for (const locale of chain) {
    const entry = _registry[locale];
    if (!entry || typeof entry === 'function') continue;

    const messages = entry as TranslationMessages;
    if (key in messages) {
      return _interpolate(messages[key], params);
    }
  }

  // Last resort: return the key itself
  return key;
}

/**
 * Check if a translation key exists in the current locale chain.
 */
export function has(key: string): boolean {
  const chain = _buildFallbackChain(_currentLocale, _fallbackLocale);

  for (const locale of chain) {
    const entry = _registry[locale];
    if (!entry || typeof entry === 'function') continue;
    if (key in (entry as TranslationMessages)) return true;
  }

  return false;
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Build the fallback chain for a locale.
 * e.g. "zh-CN" → ["zh-CN", "zh", "en"]
 *      "en-US" → ["en-US", "en"]
 *      "en"    → ["en"]
 */
function _buildFallbackChain(locale: string, fallback: string): string[] {
  const chain: string[] = [locale];
  const base = getBaseLocale(locale);

  if (base !== locale) {
    chain.push(base);
  }

  if (fallback !== locale && fallback !== base) {
    chain.push(fallback);
  }

  return chain;
}

/**
 * Extract base locale from a sub-locale.
 * e.g. "zh-CN" → "zh", "pt-BR" → "pt", "en" → "en"
 */
function getBaseLocale(locale: string): string {
  const dashIndex = locale.indexOf('-');
  if (dashIndex === -1) return locale;
  return locale.substring(0, dashIndex);
}

/**
 * Interpolate parameters into a translation string.
 * Supports {key} and {key.fallback} syntax.
 */
function _interpolate(
  template: string,
  params?: Record<string, unknown>,
): string {
  if (!params) return template;

  return template.replace(/\{(\w+(?:\.\w+)*)\}/g, (match, path: string) => {
    const value = _resolvePath(params, path);
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Resolve a dot-separated path in an object.
 */
function _resolvePath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

// ─── RTL Detection ──────────────────────────────────────────────────

const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi']);

/**
 * Check if the current locale is RTL.
 */
export function isRTL(): boolean {
  const base = getBaseLocale(_currentLocale);
  return RTL_LOCALES.has(base);
}

/**
 * Check if a specific locale is RTL.
 */
export function isLocaleRTL(locale: string): boolean {
  const base = getBaseLocale(locale);
  return RTL_LOCALES.has(base);
}

// ─── Default Locale Loaders ─────────────────────────────────────────

/**
 * Create a lazy loader for a locale JSON file.
 * @param importFn - Dynamic import function returning { default: messages }.
 */
export function lazyLocale(
  importFn: () => Promise<{ default: TranslationMessages }>,
): LocaleLoader {
  let cached: TranslationMessages | null = null;
  return async () => {
    if (!cached) {
      const mod = await importFn();
      cached = mod.default;
    }
    return cached;
  };
}
