/**
 * @fileoverview React hook for accessing i18n translations.
 *
 * Provides `t(key, params?)`, current `locale`, `setLocale()`,
 * and the list of available `locales`.
 *
 * Requires an `I18nProvider` context to be set up in the app root.
 */

import { createContext, useContext, useState, useCallback } from 'react';
import type { LocaleCode, InterpolationParams } from './types';
import type { I18nInstance } from './i18n';

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

export interface I18nContextValue {
  /** Translate a dot-delimited key, e.g. t('wallet.connect'). */
  t: (key: string, params?: InterpolationParams) => string;

  /** Current locale code, e.g. 'en-US'. */
  locale: string;

  /** Switch to a different locale. */
  setLocale: (locale: string) => void;

  /** All available locale codes. */
  locales: string[];

  /** Raw i18n instance (escape hatch for advanced usage). */
  instance: I18nInstance;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */

export interface I18nProviderProps {
  i18n: I18nInstance;
  children: React.ReactNode;
}

/**
 * Provider component that wraps your app and exposes the i18n context.
 *
 * @example
 *   <I18nProvider i18n={i18n}>
 *     <App />
 *   </I18nProvider>
 */
export function I18nProvider({ i18n, children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState(i18n.getLocale());
  const locales = i18n.getLocales();

  const setLocale = useCallback(
    (newLocale: string) => {
      i18n.setLocale(newLocale);
      setLocaleState(newLocale);
    },
    [i18n],
  );

  const t = useCallback(
    (key: string, params?: InterpolationParams) =>
      i18n.getMessage(key, params),
    [i18n],
  );

  const value: I18nContextValue = {
    t,
    locale,
    setLocale,
    locales,
    instance: i18n,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

/**
 * Access translation function and locale state.
 *
 * @example
 *   const { t, locale, setLocale } = useTranslation();
 *
 *   // Simple key
 *   t('common.loading')
 *
 *   // With interpolation
 *   t('wallet.balance', { amount: 100 })
 *
 *   // Switch locale
 *   setLocale('zh-CN')
 *
 * @throws if called outside an `I18nProvider`.
 */
export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error(
      'useTranslation() must be used within an <I18nProvider>',
    );
  }
  return ctx;
}
