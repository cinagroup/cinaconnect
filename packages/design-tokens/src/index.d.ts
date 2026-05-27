/**
 * @cinacoin/design-tokens
 *
 * Exports design tokens as both CSS variable strings and JS objects.
 *
 * Usage:
 *   import { cssVariables, tokens } from '@cinacoin/design-tokens';
 *   // cssVariables  →  string of "--ocx-*: value;\n" lines
 *   // tokens.dark   →  JS object with all resolved values for the dark theme
 */
import globalTokens from '../tokens/global.json.js';
import semanticTokens from '../tokens/semantic.json.js';
import componentTokens from '../tokens/components.json.js';
export type ThemeTokenMap = Record<string, string>;
export interface ThemeGroup {
    name: string;
    mode: 'dark' | 'light';
    colors: ThemeTokenMap;
    radii: ThemeTokenMap;
    shadows: ThemeTokenMap;
    typography: ThemeTokenMap;
    spacing: ThemeTokenMap;
    animations: ThemeTokenMap;
    zIndex: ThemeTokenMap;
}
export interface TokensCatalog {
    global: typeof globalTokens;
    semantic: typeof semanticTokens;
    components: typeof componentTokens;
    themes: {
        dark: ThemeGroup;
        light: ThemeGroup;
        minimal: ThemeGroup;
    };
}
/** Raw (non‑semantic) global tokens. */
export declare const global: any;
/** Semantic token mappings. */
export declare const semantic: any;
/** Component‑level token mappings. */
export declare const components: any;
/** All three built‑in themes as flat JS maps. */
export declare const themes: TokensCatalog['themes'];
/** Flat CSS variable map for the default (dark) theme. */
export declare const cssVariablesMap: ThemeTokenMap;
/** CSS text block that can be placed inside `:root { … }`. */
export declare const cssVariables: string;
/** Light theme CSS text. */
export declare const cssVariablesLight: string;
/** Minimal theme CSS text. */
export declare const cssVariablesMinimal: string;
/** Aggregate catalog for programmatic access. */
export declare const tokens: TokensCatalog;
declare const _default: {
    global: any;
    semantic: any;
    components: any;
    themes: {
        dark: ThemeGroup;
        light: ThemeGroup;
        minimal: ThemeGroup;
    };
    cssVariables: string;
    cssVariablesLight: string;
    cssVariablesMinimal: string;
    cssVariablesMap: ThemeTokenMap;
};
export default _default;
//# sourceMappingURL=index.d.ts.map