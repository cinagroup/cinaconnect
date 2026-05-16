/**
 * i18n System for OnChainUI
 *
 * Provides translation engine, locale registration, and a Lit mixin
 * for consuming translations in web components.
 */

import {
  t as translate,
  setLocale as setLocaleInternal,
  setFallbackLocale as setFallbackInternal,
  getLocale as getLocaleInternal,
  getAvailableLocales as getAvailableInternal,
  has as hasInternal,
  isRTL as isRTLInternal,
  isLocaleRTL as isLocaleRTLInternal,
  registerLocale as registerLocaleInternal,
  registerLocales as registerLocalesInternal,
  lazyLocale as lazyLocaleFactory,
} from './translator.js';

export {
  translate as t,
  setLocaleInternal as setLocale,
  setFallbackInternal as setFallbackLocale,
  getLocaleInternal as getLocale,
  getAvailableInternal as getAvailableLocales,
  hasInternal as has,
  isRTLInternal as isRTL,
  isLocaleRTLInternal as isLocaleRTL,
  registerLocaleInternal as registerLocale,
  registerLocalesInternal as registerLocales,
  lazyLocaleFactory as lazyLocale,
} from './translator.js';

export type { TranslationMessages, LocaleLoader, LocaleRegistry } from './translator.js';

// ─── Pre-registered Locales ─────────────────────────────────────────

import {
  registerLocales,
  setFallbackLocale,
  setLocale,
  isRTL,
} from './translator.js';

/**
 * Register all built-in locales with lazy loading.
 * Call `initI18n()` to eagerly load the default locale.
 */
export function registerAllLocales(): void {
  registerLocales({
    'en': lazyLocaleFactory(() => import('./locales/en.json')),
    'zh-CN': lazyLocaleFactory(() => import('./locales/zh-CN.json')),
    'zh': lazyLocaleFactory(() => import('./locales/zh-CN.json')),
    'ja': lazyLocaleFactory(() => import('./locales/ja.json')),
    'ko': lazyLocaleFactory(() => import('./locales/ko.json')),
    'es': lazyLocaleFactory(() => import('./locales/es.json')),
    'fr': lazyLocaleFactory(() => import('./locales/fr.json')),
    'de': lazyLocaleFactory(() => import('./locales/de.json')),
    'ru': lazyLocaleFactory(() => import('./locales/ru.json')),
    'ar': lazyLocaleFactory(() => import('./locales/ar.json')),
    'pt': lazyLocaleFactory(() => import('./locales/pt.json')),
  });

  setFallbackLocale('en');
}

/**
 * Initialize i18n with the browser's detected locale or a specified default.
 * @param defaultLocale - Fallback locale if detection fails (default: 'en').
 */
export async function initI18n(defaultLocale: string = 'en'): Promise<void> {
  registerAllLocales();

  // Detect from browser
  const browserLocale = detectBrowserLocale();
  const target = browserLocale || defaultLocale;

  await setLocale(target);
}

/**
 * Detect the user's preferred locale from the browser.
 */
export function detectBrowserLocale(): string | null {
  if (typeof navigator === 'undefined') return null;

  const langs = navigator.languages || [navigator.language];
  const available = getAvailableInternal();

  for (const lang of langs) {
    const normalized = normalizeLocale(lang);
    if (available.includes(normalized)) return normalized;

    // Try base locale
    const base = normalized.split('-')[0];
    if (available.includes(base)) return base;
  }

  return null;
}

function normalizeLocale(lang: string): string {
  const parts = lang.toLowerCase().split('-');
  if (parts.length === 1) return parts[0];
  return `${parts[0]}-${parts[1].toUpperCase()}`;
}

// ─── Lit i18n Mixin ─────────────────────────────────────────────────

import type { LitElement } from 'lit';
import type { Constructor } from '../foundation/base-element.js';

/**
 * Mixin that adds i18n support to a LitElement.
 *
 * Usage:
 *   class MyComponent extends I18nMixin(BaseLitElement) {
 *     render() {
 *       return html`<p>${this.t('hello_world')}</p>`;
 *     }
 *   }
 *
 * The mixin also sets `dir="rtl"` on the host element when the current
 * locale is RTL (Arabic, Hebrew, etc.).
 */
export function I18nMixin<TBase extends Constructor<LitElement>>(Base: TBase) {
  class I18nElement extends Base {
    /**
     * Translate a key. Calls the global t() function.
     */
    t(key: string, params?: Record<string, unknown>): string {
      return translate(key, params);
    }

    /** Whether the current locale is RTL. */
    get i18nIsRTL(): boolean {
      return isRTL();
    }

    override connectedCallback(): void {
      super.connectedCallback();
      // Apply RTL direction if needed
      if (isRTL()) {
        this.setAttribute('dir', 'rtl');
      } else {
        this.removeAttribute('dir');
      }
    }
  }

  return I18nElement as Constructor<I18nElement> & TBase;
}
