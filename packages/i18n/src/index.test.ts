import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createI18n, detectLocale } from './i18n';

/* ── Fixtures ───────────────────────────────────────────────────── */

const enLocale = {
  common: { greeting: 'Hello', farewell: 'Goodbye', items: 'You have {{count}} items' },
  wallet: { connect: 'Connect Wallet' },
};

const zhLocale = {
  common: { greeting: '你好', farewell: '再见', items: '你有 {{count}} 件物品' },
  wallet: { connect: '连接钱包' },
};

const esLocale = {
  common: { greeting: 'Hola', farewell: 'Adiós' },
  // no wallet namespace — tests fallback behavior
};

/* ── createI18n ─────────────────────────────────────────────────── */

describe('createI18n', () => {
  it('returns a valid I18nInstance', () => {
    const i18n = createI18n({ 'en-US': enLocale }, 'en-US');
    expect(i18n).toHaveProperty('getMessage');
    expect(i18n).toHaveProperty('setLocale');
    expect(i18n).toHaveProperty('getLocale');
    expect(i18n).toHaveProperty('getLocales');
  });

  it('resolves a key in the current locale', () => {
    const i18n = createI18n({ 'en-US': enLocale }, 'en-US');
    expect(i18n.getMessage('common.greeting')).toBe('Hello');
    expect(i18n.getMessage('wallet.connect')).toBe('Connect Wallet');
  });

  it('interpolates {{key}} placeholders', () => {
    const i18n = createI18n({ 'en-US': enLocale }, 'en-US');
    expect(i18n.getMessage('common.items', { count: 5 })).toBe('You have 5 items');
    expect(i18n.getMessage('common.items', { count: 0 })).toBe('You have 0 items');
  });

  it('interpolates {key} (single-brace) placeholders', () => {
    const locale = { ns: { msg: 'Hello {name}, you have {count} msgs' } };
    const i18n = createI18n({ en: locale }, 'en');
    expect(i18n.getMessage('ns.msg', { name: 'Alice', count: 3 })).toBe(
      'Hello Alice, you have 3 msgs',
    );
  });

  it('returns the key itself when the key is not found (no fallback)', () => {
    const i18n = createI18n({ 'en-US': enLocale }, 'en-US');
    expect(i18n.getMessage('nonexistent.key')).toBe('nonexistent.key');
  });

  it('falls back to the fallback locale when a key is missing in the current locale', () => {
    const i18n = createI18n(
      { 'en-US': enLocale, 'es': esLocale },
      'es',
      'en-US',
    );
    // es has common.greeting but not wallet.connect
    expect(i18n.getMessage('common.greeting')).toBe('Hola');
    expect(i18n.getMessage('wallet.connect')).toBe('Connect Wallet'); // falls back to en-US
  });

  it('switches locale with setLocale', () => {
    const i18n = createI18n(
      { 'en-US': enLocale, 'zh-CN': zhLocale },
      'en-US',
    );
    expect(i18n.getLocale()).toBe('en-US');
    expect(i18n.getMessage('common.greeting')).toBe('Hello');

    i18n.setLocale('zh-CN');
    expect(i18n.getLocale()).toBe('zh-CN');
    expect(i18n.getMessage('common.greeting')).toBe('你好');
  });

  it('falls back when setLocale receives an unknown locale', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const i18n = createI18n(
      { 'en-US': enLocale, 'zh-CN': zhLocale },
      'en-US',
      'zh-CN',
    );
    i18n.setLocale('fr-FR'); // not available → falls back to zh-CN
    expect(i18n.getLocale()).toBe('zh-CN');
    warnSpy.mockRestore();
  });

  it('lists all available locales', () => {
    const i18n = createI18n(
      { 'en-US': enLocale, 'zh-CN': zhLocale, 'es': esLocale },
      'en-US',
    );
    const locales = i18n.getLocales();
    expect(locales).toContain('en-US');
    expect(locales).toContain('zh-CN');
    expect(locales).toContain('es');
    expect(locales).toHaveLength(3);
  });

  it('handles missing params gracefully', () => {
    const i18n = createI18n({ 'en-US': enLocale }, 'en-US');
    // No params passed — placeholder stays as-is
    expect(i18n.getMessage('common.items')).toBe('You have {{count}} items');
  });

  it('leaves unrecognised placeholder tokens unchanged', () => {
    const i18n = createI18n(
      { en: { ns: { msg: 'Hello {{name}} and {{unknown}}' } } },
      'en',
    );
    expect(i18n.getMessage('ns.msg', { name: 'Alice' })).toBe('Hello Alice and {{unknown}}');
  });
});

/* ── detectLocale ───────────────────────────────────────────────── */

describe('detectLocale', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    // Reset navigator mock
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'en-US', languages: ['en-US'] },
      writable: true,
      configurable: true,
    });
  });

  it('returns the default locale when no navigator is available', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(detectLocale(['en-US', 'zh-CN'], 'en-US')).toBe('en-US');
  });

  it('matches an exact browser locale', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'zh-CN', languages: ['zh-CN', 'en-US'] },
      writable: true,
      configurable: true,
    });
    expect(detectLocale(['en-US', 'zh-CN'], 'en-US')).toBe('zh-CN');
  });

  it('fuzzy-matches on language prefix', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'zh-Hant', languages: ['zh-Hant'] },
      writable: true,
      configurable: true,
    });
    expect(detectLocale(['en-US', 'zh-CN'], 'en-US')).toBe('zh-CN');
  });

  it('falls back to defaultLocale when no match is found', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'fr-FR', languages: ['fr-FR'] },
      writable: true,
      configurable: true,
    });
    expect(detectLocale(['en-US', 'zh-CN'], 'en-US')).toBe('en-US');
  });

  it('uses the first matching language from the navigator.languages array', () => {
    // Ensure navigator.languages has 'de' as first matchable
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'de', languages: ['de'] },
      writable: true,
      configurable: true,
    });
    expect(detectLocale(['en-US', 'de'], 'en-US')).toBe('de');
  });
});
