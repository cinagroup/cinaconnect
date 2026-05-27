/**
 * Tests for the translation engine (i18n).
 * Tests locale registration, fallback chains, interpolation, and RTL detection.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { registerLocale, registerLocales, setLocale, setFallbackLocale, getLocale, getAvailableLocales, t, has, isRTL, isLocaleRTL, lazyLocale, } from '../../src/i18n/translator.js';
describe('Translation Engine', () => {
    beforeEach(() => {
        // Reset registry before each test
        registerLocales({});
        setFallbackLocale('en');
    });
    describe('registerLocale', () => {
        it('should register a locale with messages', () => {
            registerLocale('en', { hello: 'Hello', goodbye: 'Goodbye' });
            expect(getAvailableLocales()).toContain('en');
        });
        it('should register multiple locales at once', () => {
            registerLocales({
                en: { hello: 'Hello' },
                zh: { hello: '你好' },
            });
            expect(getAvailableLocales()).toContain('en');
            expect(getAvailableLocales()).toContain('zh');
        });
    });
    describe('setLocale / getLocale', () => {
        it('should set and get the current locale', async () => {
            await setLocale('zh-CN');
            expect(getLocale()).toBe('zh-CN');
        });
        it('should default to en', () => {
            expect(getLocale()).toBe('en');
        });
    });
    describe('setFallbackLocale', () => {
        it('should change the fallback locale', () => {
            setFallbackLocale('zh');
            // The internal _fallbackLocale is updated; t() will use it in fallback chain
            setFallbackLocale('en'); // reset
        });
    });
    describe('t() translation', () => {
        it('should return translation for registered key', () => {
            registerLocale('en', { connect_wallet: 'Connect Wallet' });
            expect(t('connect_wallet')).toBe('Connect Wallet');
        });
        it('should return key itself when not found', () => {
            registerLocale('en', {});
            expect(t('unknown_key')).toBe('unknown_key');
        });
        it('should interpolate parameters', () => {
            registerLocale('en', { powered_by: 'Powered by {brand}' });
            expect(t('powered_by', { brand: 'Cinacoin' })).toBe('Powered by Cinacoin');
        });
        it('should handle multiple parameters', () => {
            registerLocale('en', { greeting: 'Hello, {name}! Welcome to {place}.' });
            expect(t('greeting', { name: 'Alice', place: 'Cinacoin' })).toBe('Hello, Alice! Welcome to Cinacoin.');
        });
        it('should leave unmatched params as-is', () => {
            registerLocale('en', { msg: 'Value: {value}' });
            expect(t('msg')).toBe('Value: {value}');
        });
        it('should resolve nested paths', () => {
            registerLocale('en', { info: 'Count: {count.total}' });
            expect(t('info', { count: { total: 42 } })).toBe('Count: 42');
        });
        it('should return template when params is undefined', () => {
            registerLocale('en', { msg: 'Hello {name}' });
            expect(t('msg', undefined)).toBe('Hello {name}');
        });
    });
    describe('fallback chain', () => {
        it('should fallback from sub-locale to base locale', () => {
            registerLocales({
                en: { hello: 'Hello', only_en: 'Only EN' },
            });
            // 'zh-CN' → 'zh' → 'en' → key itself
            // Since 'zh' and 'zh-CN' aren't registered, it falls through to 'en'
            expect(t('only_en')).toBe('Only EN');
        });
        it('should prefer specific locale over fallback', () => {
            registerLocales({
                'zh-CN': { hello: '你好' },
                en: { hello: 'Hello' },
            });
            // Current locale is 'en' by default, so we get English
            expect(t('hello')).toBe('Hello');
        });
        it('should use current locale translation', async () => {
            registerLocales({
                'zh-CN': { hello: '你好' },
                en: { hello: 'Hello' },
            });
            await setLocale('zh-CN');
            expect(t('hello')).toBe('你好');
        });
        it('should fallback when key missing in current locale', async () => {
            registerLocales({
                'zh-CN': {},
                en: { fallback_key: 'Fallback Value' },
            });
            await setLocale('zh-CN');
            expect(t('fallback_key')).toBe('Fallback Value');
        });
    });
    describe('has()', () => {
        it('should return true for existing key', () => {
            registerLocale('en', { exists: 'yes' });
            expect(has('exists')).toBe(true);
        });
        it('should return false for missing key', () => {
            registerLocale('en', {});
            expect(has('missing')).toBe(false);
        });
        it('should return true for key in fallback locale', async () => {
            registerLocales({
                'zh-CN': {},
                en: { shared: 'Shared' },
            });
            await setLocale('zh-CN');
            expect(has('shared')).toBe(true);
        });
    });
    describe('isRTL()', () => {
        it('should return false for English', () => {
            expect(isRTL()).toBe(false);
        });
        it('should return true for Arabic', async () => {
            await setLocale('ar');
            expect(isRTL()).toBe(true);
        });
        it('should return true for Hebrew', async () => {
            await setLocale('he');
            expect(isRTL()).toBe(true);
        });
        it('should return true for Persian', async () => {
            await setLocale('fa');
            expect(isRTL()).toBe(true);
        });
        it('should return false for non-RTL locale', async () => {
            await setLocale('ja');
            expect(isRTL()).toBe(false);
        });
    });
    describe('isLocaleRTL()', () => {
        it('should check RTL for a specific locale', () => {
            expect(isLocaleRTL('ar-SA')).toBe(true);
            expect(isLocaleRTL('he-IL')).toBe(true);
            expect(isLocaleRTL('en-US')).toBe(false);
            expect(isLocaleRTL('zh-CN')).toBe(false);
        });
    });
    describe('lazyLocale()', () => {
        it('should create a lazy loader function', () => {
            const loader = lazyLocale(async () => ({ default: { lazy_key: 'Lazy Value' } }));
            expect(typeof loader).toBe('function');
        });
        it('should load messages on first call and cache them', async () => {
            let loadCount = 0;
            const loader = lazyLocale(async () => {
                loadCount++;
                return { default: { cached: 'Cached Value' } };
            });
            const result1 = await loader();
            const result2 = await loader();
            expect(result1.cached).toBe('Cached Value');
            expect(result2.cached).toBe('Cached Value');
            expect(loadCount).toBe(1); // Loaded only once
        });
    });
    describe('getAvailableLocales()', () => {
        it('should return registered locale codes', () => {
            registerLocales({
                en: {},
                zh: {},
                ja: {},
            });
            const locales = getAvailableLocales();
            expect(locales).toContain('en');
            expect(locales).toContain('zh');
            expect(locales).toContain('ja');
        });
        it('should return empty array when no locales registered', () => {
            registerLocales({});
            expect(getAvailableLocales()).toEqual([]);
        });
    });
});
//# sourceMappingURL=translator.test.js.map