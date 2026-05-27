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

// ---------------------------------------------------------------------------
// Re-export resolved theme data
// ---------------------------------------------------------------------------

import defaultTheme from '../tokens/themes/default.json.js' with { type: 'json' };
import lightTheme from '../tokens/themes/light.json.js' with { type: 'json' };
import minimalTheme from '../tokens/themes/minimal.json.js' with { type: 'json' };
import globalTokens from '../tokens/global.json.js' with { type: 'json' };
import semanticTokens from '../tokens/semantic.json.js' with { type: 'json' };
import componentTokens from '../tokens/components.json.js' with { type: 'json' };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a theme's nested token groups into a flat { cssVar: value } map. */
function flattenTheme(theme: typeof defaultTheme): ThemeTokenMap {
  const flat: ThemeTokenMap = {};
  const { colors, radii, shadows, typography, spacing, animations, zIndex } = theme.theme;
  for (const group of [colors, radii, shadows, typography, spacing, animations, zIndex]) {
    for (const [key, value] of Object.entries(group)) {
      flat[key] = String(value);
    }
  }
  return flat;
}

/** Produce a CSS string that can be injected into a <style> tag or :root block. */
function toCssVariables(tokenMap: ThemeTokenMap): string {
  return Object.entries(tokenMap)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** Raw (non‑semantic) global tokens. */
export const global = globalTokens;

/** Semantic token mappings. */
export const semantic = semanticTokens;

/** Component‑level token mappings. */
export const components = componentTokens;

/** All three built‑in themes as flat JS maps. */
export const themes: TokensCatalog['themes'] = {
  dark: {
    name: defaultTheme.theme.name,
    mode: defaultTheme.theme.mode as 'dark' | 'light',
    ...{
      colors: defaultTheme.theme.colors,
      radii: defaultTheme.theme.radii,
      shadows: defaultTheme.theme.shadows,
      typography: defaultTheme.theme.typography,
      spacing: defaultTheme.theme.spacing,
      animations: defaultTheme.theme.animations,
      zIndex: defaultTheme.theme.zIndex,
    },
  },
  light: {
    name: lightTheme.theme.name,
    mode: lightTheme.theme.mode as 'dark' | 'light',
    ...{
      colors: lightTheme.theme.colors,
      radii: lightTheme.theme.radii,
      shadows: lightTheme.theme.shadows,
      typography: lightTheme.theme.typography,
      spacing: lightTheme.theme.spacing,
      animations: lightTheme.theme.animations,
      zIndex: lightTheme.theme.zIndex,
    },
  },
  minimal: {
    name: minimalTheme.theme.name,
    mode: minimalTheme.theme.mode as 'dark' | 'light',
    ...{
      colors: minimalTheme.theme.colors,
      radii: minimalTheme.theme.radii,
      shadows: minimalTheme.theme.shadows,
      typography: minimalTheme.theme.typography,
      spacing: minimalTheme.theme.spacing,
      animations: minimalTheme.theme.animations,
      zIndex: minimalTheme.theme.zIndex,
    },
  },
};

/** Flat CSS variable map for the default (dark) theme. */
export const cssVariablesMap: ThemeTokenMap = flattenTheme(defaultTheme);

/** CSS text block that can be placed inside `:root { … }`. */
export const cssVariables = `:root {\n${toCssVariables(cssVariablesMap)}\n}`;

/** Light theme CSS text. */
export const cssVariablesLight = (() => {
  const map = flattenTheme(lightTheme);
  return `.ocx-theme-light {\n${toCssVariables(map)}\n}`;
})();

/** Minimal theme CSS text. */
export const cssVariablesMinimal = (() => {
  const map = flattenTheme(minimalTheme);
  return `.ocx-theme-minimal {\n${toCssVariables(map)}\n}`;
})();

/** Aggregate catalog for programmatic access. */
export const tokens: TokensCatalog = {
  global,
  semantic,
  components,
  themes,
};

// ---------------------------------------------------------------------------
// Default export for convenience
// ---------------------------------------------------------------------------

export default {
  global,
  semantic,
  components,
  themes,
  cssVariables,
  cssVariablesLight,
  cssVariablesMinimal,
  cssVariablesMap,
};
