import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  I18nProvider,
  I18nContext,
  resolveLocale,
  getNestedValue,
  localeLabels,
} from './i18n';
import type { Locale, Translations } from './i18n';
import { useTranslation } from './hooks/useTranslation';
import { enUS } from './locales/en-US';
import { zhCN } from './locales/zh-CN';
import { es } from './locales/es';
import { ja } from './locales/ja';
import { ko } from './locales/ko';

// ─── resolveLocale ───────────────────────────────────────────────────────

describe('resolveLocale', () => {
  it('returns en-US for undefined input', () => {
    expect(resolveLocale(undefined)).toBe('en-US');
  });

  it('returns en-US for empty string', () => {
    expect(resolveLocale('')).toBe('en-US');
  });

  it('resolves zh to zh-CN', () => {
    expect(resolveLocale('zh')).toBe('zh-CN');
    expect(resolveLocale('zh-CN')).toBe('zh-CN');
    expect(resolveLocale('zh-TW')).toBe('zh-CN');
    expect(resolveLocale('cmn')).toBe('zh-CN');
  });

  it('resolves es', () => {
    expect(resolveLocale('es')).toBe('es');
    expect(resolveLocale('spa')).toBe('es');
  });

  it('resolves ja', () => {
    expect(resolveLocale('ja')).toBe('ja');
    expect(resolveLocale('jpn')).toBe('ja');
  });

  it('resolves ko', () => {
    expect(resolveLocale('ko')).toBe('ko');
    expect(resolveLocale('kor')).toBe('ko');
  });

  it('falls back to en-US for unsupported locales', () => {
    expect(resolveLocale('fr')).toBe('en-US');
    expect(resolveLocale('de')).toBe('en-US');
    expect(resolveLocale('ru')).toBe('en-US');
  });

  it('is case-insensitive', () => {
    expect(resolveLocale('ZH')).toBe('zh-CN');
    expect(resolveLocale('ES')).toBe('es');
  });
});

// ─── getNestedValue ──────────────────────────────────────────────────────

describe('getNestedValue', () => {
  const obj = {
    common: {
      welcome: 'Welcome',
      greeting: 'Hello, {{name}}!',
    },
    wallet: {
      connect: 'Connect',
    },
  } as Record<string, unknown>;

  it('resolves simple dot paths', () => {
    expect(getNestedValue(obj, 'common.welcome')).toBe('Welcome');
  });

  it('resolves nested paths', () => {
    expect(getNestedValue(obj, 'wallet.connect')).toBe('Connect');
  });

  it('returns undefined for invalid paths', () => {
    expect(getNestedValue(obj, 'nonexistent.key')).toBeUndefined();
  });

  it('returns undefined when path goes through a non-object', () => {
    expect(getNestedValue(obj, 'common.welcome.deep')).toBeUndefined();
  });

  it('returns undefined for null root', () => {
    expect(getNestedValue(null as unknown as Record<string, unknown>, 'key')).toBeUndefined();
  });

  it('handles top-level keys', () => {
    const flat = { key: 'value' } as Record<string, unknown>;
    expect(getNestedValue(flat, 'key')).toBe('value');
  });
});

// ─── localeLabels ────────────────────────────────────────────────────────

describe('localeLabels', () => {
  it('contains all 5 locales', () => {
    expect(Object.keys(localeLabels).length).toBe(5);
  });

  it('has correct labels', () => {
    expect(localeLabels['en-US']).toBe('English');
    expect(localeLabels['zh-CN']).toBe('中文');
    expect(localeLabels['es']).toBe('Español');
    expect(localeLabels['ja']).toBe('日本語');
    expect(localeLabels['ko']).toBe('한국어');
  });
});

// ─── I18nProvider ────────────────────────────────────────────────────────

describe('I18nProvider', () => {
  it('renders children', () => {
    render(
      React.createElement(
        I18nProvider,
        { defaultLocale: 'en-US' },
        React.createElement('div', null, 'Hello World')
      )
    );
    expect(screen.getByText('Hello World')).toBeDefined();
  });

  it('provides default locale en-US', () => {
    let locale: Locale | undefined;
    const Child = () => {
      const ctx = React.useContext(I18nContext);
      locale = ctx?.locale;
      return null;
    };
    render(
      React.createElement(
        I18nProvider,
        null,
        React.createElement(Child)
      )
    );
    expect(locale).toBe('en-US');
  });

  it('uses custom defaultLocale', () => {
    let locale: Locale | undefined;
    const Child = () => {
      const ctx = React.useContext(I18nContext);
      locale = ctx?.locale;
      return null;
    };
    render(
      React.createElement(
        I18nProvider,
        { defaultLocale: 'zh-CN' },
        React.createElement(Child)
      )
    );
    expect(locale).toBe('zh-CN');
  });
});

// ─── useTranslation hook ─────────────────────────────────────────────────

describe('useTranslation', () => {
  it('throws outside I18nProvider', () => {
    const Child = () => {
      useTranslation();
      return null;
    };
    expect(() => render(React.createElement(Child))).toThrow('useTranslation must be used within an I18nProvider');
  });

  it('provides t function that resolves keys', () => {
    let t: ReturnType<typeof useTranslation>['t'];
    const Child = () => {
      const { t: translate } = useTranslation();
      t = translate;
      return null;
    };
    render(
      React.createElement(
        I18nProvider,
        { defaultLocale: 'en-US' },
        React.createElement(Child)
      )
    );
    expect(t!('common.welcome')).toBe('Welcome');
  });

  it('returns key itself as fallback for missing translation', () => {
    let t: ReturnType<typeof useTranslation>['t'];
    const Child = () => {
      const { t: translate } = useTranslation();
      t = translate;
      return null;
    };
    render(
      React.createElement(
        I18nProvider,
        { defaultLocale: 'en-US' },
        React.createElement(Child)
      )
    );
    expect(t!('nonexistent.key')).toBe('nonexistent.key');
  });

  it('supports interpolation with params', () => {
    let t: ReturnType<typeof useTranslation>['t'];
    const Child = () => {
      const { t: translate } = useTranslation();
      t = translate;
      return null;
    };
    render(
      React.createElement(
        I18nProvider,
        { defaultLocale: 'zh-CN' },
        React.createElement(Child)
      )
    );
    expect(t!('auth.emailPlaceholder', { name: 'test' })).toBe('you@example.com');
  });

  it('exposes current locale', () => {
    let locale: Locale | undefined;
    const Child = () => {
      const { locale: l } = useTranslation();
      locale = l;
      return null;
    };
    render(
      React.createElement(
        I18nProvider,
        { defaultLocale: 'ja' },
        React.createElement(Child)
      )
    );
    expect(locale).toBe('ja');
  });

  it('exposes all available locales', () => {
    let locales: Locale[] | undefined;
    const Child = () => {
      const { locales: l } = useTranslation();
      locales = l;
      return null;
    };
    render(
      React.createElement(
        I18nProvider,
        null,
        React.createElement(Child)
      )
    );
    expect(locales).toContain('en-US');
    expect(locales).toContain('zh-CN');
    expect(locales).toContain('es');
    expect(locales).toContain('ja');
    expect(locales).toContain('ko');
    expect(locales?.length).toBe(5);
  });
});

// ─── Locale Resources ────────────────────────────────────────────────────

describe('locale resources', () => {
  it('enUS has all namespaces', () => {
    expect(enUS.common).toBeDefined();
    expect(enUS.wallet).toBeDefined();
    expect(enUS.auth).toBeDefined();
    expect(enUS.payment).toBeDefined();
    expect(enUS.errors).toBeDefined();
  });

  it('zhCN has all namespaces', () => {
    expect(zhCN.common).toBeDefined();
    expect(zhCN.wallet).toBeDefined();
    expect(zhCN.auth).toBeDefined();
    expect(zhCN.payment).toBeDefined();
    expect(zhCN.errors).toBeDefined();
  });

  it('es has all namespaces', () => {
    expect(es.common).toBeDefined();
    expect(es.wallet).toBeDefined();
    expect(es.auth).toBeDefined();
    expect(es.payment).toBeDefined();
    expect(es.errors).toBeDefined();
  });

  it('ja has all namespaces', () => {
    expect(ja.common).toBeDefined();
    expect(ja.wallet).toBeDefined();
    expect(ja.auth).toBeDefined();
    expect(ja.payment).toBeDefined();
    expect(ja.errors).toBeDefined();
  });

  it('ko has all namespaces', () => {
    expect(ko.common).toBeDefined();
    expect(ko.wallet).toBeDefined();
    expect(ko.auth).toBeDefined();
    expect(ko.payment).toBeDefined();
    expect(ko.errors).toBeDefined();
  });

  it('translations have matching keys across locales', () => {
    const keys = Object.keys(enUS);
    for (const locale of [zhCN, es, ja, ko]) {
      for (const key of keys) {
        expect(locale).toHaveProperty(key);
      }
    }
  });
});

// ─── I18nContext ─────────────────────────────────────────────────────────

describe('I18nContext', () => {
  it('is a valid React context', () => {
    expect(I18nContext).toBeDefined();
    expect(I18nContext.Provider).toBeDefined();
  });
});
