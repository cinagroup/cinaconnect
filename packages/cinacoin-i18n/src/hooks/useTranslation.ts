import { useContext, useCallback } from 'react';
import { I18nContext, getNestedValue, type Translations } from '../i18n';
import type { Locale } from '../i18n';

/**
 * useTranslation hook — returns the `t` translation function and locale info.
 *
 * Must be used inside an `I18nProvider`.
 *
 * @example
 * ```tsx
 * const { t, locale, setLocale } = useTranslation();
 * <p>{t('common.welcome')}</p>
 * ```
 */
export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }

  /**
   * Translate a dot-notation key into the current locale's string.
   * Falls back to the key itself if not found.
   *
   * Supports interpolation with an optional params object:
   *   t('greeting', { name: 'Alice' })  → "Hello, Alice!"
   *   where the resource value is "Hello, {{name}}!"
   */
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const value = getNestedValue(ctx.resources as Translations, key);
      if (value === undefined) {
        // Fallback: return the key as-is
        return key;
      }

      if (!params) return value;

      // Simple {{key}} interpolation
      let result = value;
      for (const [paramKey, paramValue] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramValue));
      }
      return result;
    },
    [ctx.resources]
  );

  return {
    t,
    /** Current active locale identifier */
    locale: ctx.locale,
    /** Switch to a different locale */
    setLocale: ctx.setLocale,
    /** All supported locale identifiers */
    locales: ctx.locales,
    /** The raw resources object for the current locale */
    resources: ctx.resources,
  };
}

export { type Locale } from '../i18n';
