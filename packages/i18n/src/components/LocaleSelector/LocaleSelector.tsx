import React, { useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import type { LocaleCode, LocaleInfo } from '../../types';

/* ------------------------------------------------------------------ */
/*  Locale metadata                                                   */
/* ------------------------------------------------------------------ */

const LOCALE_INFO: Record<string, LocaleInfo> = {
  'en-US':  { code: 'en-US',  name: 'English (US)',         nativeName: 'English (US)' },
  'zh-CN':  { code: 'zh-CN',  name: 'Chinese (Simplified)', nativeName: '简体中文' },
  es:       { code: 'es',      name: 'Spanish',              nativeName: 'Español' },
  ja:       { code: 'ja',      name: 'Japanese',             nativeName: '日本語' },
  ko:       { code: 'ko',      name: 'Korean',               nativeName: '한국어' },
  fr:       { code: 'fr',      name: 'French',               nativeName: 'Français' },
  de:       { code: 'de',      name: 'German',               nativeName: 'Deutsch' },
  ru:       { code: 'ru',      name: 'Russian',              nativeName: 'Русский' },
  'pt-BR':  { code: 'pt-BR',   name: 'Portuguese (Brazil)',  nativeName: 'Português (BR)' },
  ar:       { code: 'ar',      name: 'Arabic',               nativeName: 'العربية' },
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export interface LocaleSelectorProps {
  /** CSS class applied to the root `<select>` element. */
  className?: string;

  /** Whether to display the native name instead of the English name. */
  showNativeName?: boolean;

  /** Optional `onChange` callback. */
  onChange?: (locale: string) => void;
}

/**
 * Locale picker dropdown.
 *
 * Renders a `<select>` populated with all available locales.
 * Automatically syncs with the `I18nProvider` context.
 *
 * @example
 *   <LocaleSelector showNativeName />
 *   <LocaleSelector className="my-select" onChange={console.log} />
 */
export function LocaleSelector({
  className,
  showNativeName = false,
  onChange,
}: LocaleSelectorProps) {
  const { locale, setLocale, locales } = useTranslation();

  /** Build the option list — only include locales that are registered. */
  const options = useMemo(() => {
    return locales
      .map((code) => {
        const info = LOCALE_INFO[code];
        if (info) return info;
        // Fallback for custom / unknown locale codes
        return {
          code: code as LocaleCode,
          name: code,
          nativeName: code,
        };
      })
      .sort((a, b) => a.nativeName.localeCompare(b.nativeName));
  }, [locales]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    setLocale(newLocale);
    onChange?.(newLocale);
  };

  return (
    <select
      className={className}
      value={locale}
      onChange={handleChange}
      aria-label="Select language"
      data-testid="locale-selector"
    >
      {options.map((opt) => (
        <option key={opt.code} value={opt.code}>
          {showNativeName ? opt.nativeName : opt.name}
        </option>
      ))}
    </select>
  );
}

export default LocaleSelector;
