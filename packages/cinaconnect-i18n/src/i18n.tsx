import React, { createContext, useMemo, useState, useCallback, useEffect } from 'react';
import { enUS, type EnUS } from './locales/en-US';
import { zhCN, type ZhCN } from './locales/zh-CN';
import { es, type Es } from './locales/es';
import { ja, type Ja } from './locales/ja';
import { ko, type Ko } from './locales/ko';

// ─── Types ───────────────────────────────────────────────────────────────────

/** All supported locale identifiers */
export type Locale = 'en-US' | 'zh-CN' | 'es' | 'ja' | 'ko';

/** Human-readable locale labels for UI display */
export const localeLabels: Record<Locale, string> = {
  'en-US': 'English',
  'zh-CN': '中文',
  es: 'Español',
  ja: '日本語',
  ko: '한국어',
};

/** Union type of all translation resources */
export type Translations = EnUS | ZhCN | Es | Ja | Ko;

/** All locale resources keyed by locale id */
const localeResources: Record<Locale, Translations> = {
  'en-US': enUS,
  'zh-CN': zhCN,
  es,
  ja,
  ko,
};

// ─── Context ─────────────────────────────────────────────────────────────────

interface I18nContextValue {
  /** Current active locale */
  locale: Locale;
  /** Switch to a different locale */
  setLocale: (locale: Locale) => void;
  /** All supported locale identifiers */
  locales: Locale[];
  /** The raw resources object for the current locale */
  resources: Translations;
}

/** React context for i18n — consumed by useTranslation hook */
export const I18nContext = createContext<I18nContextValue | null>(null);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve a browser language string to a supported Locale.
 * Falls back to 'en-US' if no match is found.
 */
export function resolveLocale(browserLang: string | undefined): Locale {
  if (!browserLang) return 'en-US';
  const normalized = browserLang.toLowerCase();

  if (normalized.startsWith('zh') || normalized.startsWith('cmn')) return 'zh-CN';
  if (normalized.startsWith('es') || normalized.startsWith('spa')) return 'es';
  if (normalized.startsWith('ja') || normalized.startsWith('jpn')) return 'ja';
  if (normalized.startsWith('ko') || normalized.startsWith('kor')) return 'ko';

  return 'en-US';
}

/**
 * Get the initial locale from navigator or a provided default.
 * Runs only on the client side.
 */
function getInitialLocale(defaultLocale?: Locale): Locale {
  if (defaultLocale) return defaultLocale;
  if (typeof navigator === 'undefined') return 'en-US';

  // Check navigator.languages first, then navigator.language
  const langs = navigator.languages ? navigator.languages : [navigator.language];
  for (const lang of langs) {
    const resolved = resolveLocale(lang);
    return resolved;
  }
  return 'en-US';
}

/**
 * Type-safe nested property accessor using dot-notation strings.
 * Returns undefined if the path is invalid.
 */
export function getNestedValue<T extends Record<string, unknown>>(
  obj: T,
  path: string
): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' ? current : undefined;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export interface I18nProviderProps {
  children: React.ReactNode;
  /** Optional initial locale (auto-detected from browser if omitted) */
  defaultLocale?: Locale;
  /** Callback fired when locale changes (persist here) */
  onLocaleChange?: (locale: Locale) => void;
}

/**
 * I18nProvider — wraps your app with localization context.
 * Auto-detects browser language and provides the `useTranslation` hook.
 *
 * @example
 * ```tsx
 * <I18nProvider defaultLocale="en-US">
 *   <App />
 * </I18nProvider>
 * ```
 */
export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  defaultLocale,
  onLocaleChange,
}) => {
  const [locale, setLocaleState] = useState<Locale>(() => getInitialLocale(defaultLocale));

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      onLocaleChange?.(newLocale);
    },
    [onLocaleChange]
  );

  // Persist locale to localStorage on change
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cc-locale', locale);
    }
  }, [locale]);

  const resources = useMemo(() => localeResources[locale], [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      locales: Object.keys(localeResources) as Locale[],
      resources,
    }),
    [locale, setLocale, resources]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
