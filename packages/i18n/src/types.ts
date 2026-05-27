/**
 * @fileoverview Type definitions for @cinacoin/i18n package.
 */

/**
 * Supported locale codes.
 */
export type LocaleCode = 'en-US' | 'zh-CN' | 'es' | 'ja' | 'ko' | 'fr' | 'de' | 'ru' | 'pt-BR' | 'ar';

/**
 * Dot-delimited namespace + key path, e.g. 'wallet.connect'.
 */
export type TranslationKeys = string;

/**
 * A single namespace dictionary (flat key → string).
 */
export type NamespaceDict = Record<string, string>;

/**
 * Collection of namespace dictionaries keyed by namespace name.
 */
export type NamespaceMap = Record<string, NamespaceDict>;

/**
 * Full locale dictionary — every namespace for a single locale.
 */
export type Locale = Record<string, NamespaceDict>;

/**
 * Union of namespace identifiers available in a locale.
 */
export type Namespace = string;

/**
 * Interpolation parameter values for translation strings.
 * e.g. { count: 5 } → "You have 5 messages"
 */
export type InterpolationParams = Record<string, string | number>;

/**
 * Locale metadata for display purposes.
 */
export interface LocaleInfo {
  code: LocaleCode;
  name: string;
  nativeName: string;
}
