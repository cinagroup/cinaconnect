/**
 * @fileoverview i18n provider — create, configure, and switch locales.
 *
 * Usage:
 *   const i18n = createI18n({ 'en-US': enUS, 'zh-CN': zhCN }, 'en-US');
 *   i18n.setLocale('zh-CN');
 *   i18n.getLocale();  // 'zh-CN'
 *   i18n.getMessage('common.loading');
 */

import type { Locale, LocaleCode, NamespaceDict, NamespaceMap } from './types';

/** ------------------------------------------------------------------ */
/**  Internal lookup helpers                                           */
/** ------------------------------------------------------------------ */

/**
 * Resolve a dot-delimited key (e.g. "wallet.connect") inside a NamespaceMap.
 * Returns the raw string or `undefined` when not found.
 */
function resolveKey(
  locale: NamespaceMap | undefined,
  key: string,
): string | undefined {
  if (!locale) return undefined;

  const parts = key.split('.');
  let cursor: unknown = locale;

  for (const part of parts) {
    if (cursor == null || typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }

  return typeof cursor === 'string' ? cursor : undefined;
}

/**
 * Interpolate placeholders in a translation string.
 * Supports `{{name}}` and `{name}` syntax.
 */
function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;

  return template.replace(/\{\{?(\w+)\}\}?/g, (_, k: string) => {
    const v = params[k];
    return v !== undefined ? String(v) : `{{${k}}}`;
  });
}

/** ------------------------------------------------------------------ */
/**  Public API                                                        */
/** ------------------------------------------------------------------ */

export interface I18nInstance {
  /** Translate a key with optional interpolation params. */
  getMessage(key: string, params?: Record<string, string | number>): string;

  /** Set the active locale. */
  setLocale(code: string): void;

  /** Get the current locale code. */
  getLocale(): string;

  /** List all available locale codes. */
  getLocales(): string[];
}

export interface I18nConfig {
  locales: Record<string, NamespaceMap>;
  defaultLocale: string;
  fallbackLocale?: string;
}

/**
 * Create an i18n instance from locale dictionaries.
 *
 * @example
 *   const i18n = createI18n(
 *     { 'en-US': enUS, 'zh-CN': zhCN },
 *     'en-US'
 *   );
 */
export function createI18n(
  locales: Record<string, NamespaceMap>,
  defaultLocale: string,
  fallbackLocale?: string,
): I18nInstance {
  let current = defaultLocale;
  const fallback = fallbackLocale ?? defaultLocale;

  return {
    getMessage(key: string, params?: Record<string, string | number>): string {
      // Try current locale first
      const primary = resolveKey(locales[current], key);
      if (primary !== undefined) {
        return interpolate(primary, params);
      }

      // Fall back to fallback locale
      if (current !== fallback) {
        const fb = resolveKey(locales[fallback], key);
        if (fb !== undefined) return interpolate(fb, params);
      }

      // Last resort — return the key itself
      return key;
    },

    setLocale(code: string): void {
      if (locales[code]) {
        current = code;
      } else {
        console.warn(
          `[i18n] Locale "${code}" not found. Falling back to "${fallback}".`,
        );
        current = fallback;
      }
    },

    getLocale(): string {
      return current;
    },

    getLocales(): string[] {
      return Object.keys(locales);
    },
  };
}

/**
 * Attempt to detect the user's preferred locale from the browser.
 * Falls back to `defaultLocale` if no match is found.
 *
 * @param availableLocales - Array of locale codes the app supports.
 * @param defaultLocale    - Fallback when detection fails.
 */
export function detectLocale(
  availableLocales: string[],
  defaultLocale: string = 'en-US',
): string {
  if (typeof navigator === 'undefined') return defaultLocale;

  const browserLocales =
    navigator.languages ?? [navigator.language];

  // Exact match first
  for (const bl of browserLocales) {
    if (availableLocales.includes(bl)) return bl;
  }

  // Fuzzy match on language prefix (e.g. "zh-Hant" → "zh-CN")
  for (const bl of browserLocales) {
    const prefix = bl.split('-')[0];
    const match = availableLocales.find((al) => al.startsWith(prefix));
    if (match) return match;
  }

  return defaultLocale;
}
