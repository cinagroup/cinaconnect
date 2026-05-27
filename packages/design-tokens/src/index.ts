/**
 * @cinacoin/design-tokens
 *
 * Comprehensive design token system for Cinacoin UI.
 *
 * Exports design tokens as both CSS variable strings and JS objects.
 * Includes color palette, typography scale, spacing scale, border radius,
 * shadow definitions, and animation tokens.
 *
 * Usage:
 *   import { cssVariables, tokens, ColorPalette, Spacing } from '@cinacoin/design-tokens';
 *
 *   // cssVariables → string of "--ocx-*: value;\n" lines
 *   // tokens.dark  → JS object with all resolved values for the dark theme
 *   // ColorPalette.primary → "#3B82F6"
 */

// ---------------------------------------------------------------------------
// Re-export resolved theme data (backward-compatible)
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
  mode: 'dark' | 'light' | 'minimal';
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
// Color Palette
// ---------------------------------------------------------------------------

/**
 * Standalone color palette definitions.
 * These are the canonical values used across all Cinacoin UI surfaces.
 */
export const ColorPalette = {
  // ── Primary ───────────────────────────────────────────────────
  primary50:  '#EFF6FF',
  primary100: '#DBEAFE',
  primary200: '#BFDBFE',
  primary300: '#93C5FD',
  primary400: '#60A5FA',
  primary500: '#3B82F6',  // Main brand color
  primary600: '#2563EB',
  primary700: '#1D4ED8',
  primary800: '#1E40AF',
  primary900: '#1E3A8A',

  // ── Secondary ─────────────────────────────────────────────────
  secondary50:  '#F5F3FF',
  secondary100: '#EDE9FE',
  secondary200: '#DDD6FE',
  secondary300: '#C4B5FD',
  secondary400: '#A78BFA',
  secondary500: '#8B5CF6',  // Accent color
  secondary600: '#7C3AED',
  secondary700: '#6D28D9',
  secondary800: '#5B21B6',
  secondary900: '#4C1D95',

  // ── Success ───────────────────────────────────────────────────
  success50:  '#F0FDF4',
  success100: '#DCFCE7',
  success200: '#BBF7D0',
  success300: '#86EFAC',
  success400: '#4ADE80',
  success500: '#22C55E',
  success600: '#16A34A',
  success700: '#15803D',
  success800: '#166534',
  success900: '#14532D',

  // ── Error ─────────────────────────────────────────────────────
  error50:  '#FEF2F2',
  error100: '#FEE2E2',
  error200: '#FECACA',
  error300: '#FCA5A5',
  error400: '#F87171',
  error500: '#EF4444',
  error600: '#DC2626',
  error700: '#B91C1C',
  error800: '#991B1B',
  error900: '#7F1D1D',

  // ── Warning ───────────────────────────────────────────────────
  warning50:  '#FFFBEB',
  warning100: '#FEF3C7',
  warning200: '#FDE68A',
  warning300: '#FCD34D',
  warning400: '#FBBF24',
  warning500: '#F59E0B',
  warning600: '#D97706',
  warning700: '#B45309',
  warning800: '#92400E',
  warning900: '#78350F',

  // ── Neutral / Slate ──────────────────────────────────────────
  neutral50:  '#F8FAFC',
  neutral100: '#F1F5F9',
  neutral200: '#E2E8F0',
  neutral300: '#CBD5E1',
  neutral400: '#94A3B8',
  neutral500: '#64748B',
  neutral600: '#475569',
  neutral700: '#334155',
  neutral800: '#1E293B',
  neutral900: '#0F172A',

  // ── Surface ───────────────────────────────────────────────────
  surfaceDark:   '#0F172A',
  surfaceDarkM:  '#111827',
  surfaceCard:   '#1E293B',
  surfaceHover:  '#334155',
  surfaceLight:  '#FFFFFF',
  surfaceLightM: '#F8FAFC',

  // ── Text ──────────────────────────────────────────────────────
  textDarkPrimary:   '#F8FAFC',
  textDarkSecondary: '#94A3B8',
  textDarkTertiary:  '#64748B',
  textLightPrimary:  '#0F172A',
  textLightSecondary:'#64748B',
  textLightTertiary: '#94A3B8',
} as const;

export type ColorToken = keyof typeof ColorPalette;

// ---------------------------------------------------------------------------
// Typography Scale
// ---------------------------------------------------------------------------

/**
 * Typography scale following a modular ratio system.
 * Base: 16px (1rem). Scale: Major Third (1.250).
 */
export const Typography = {
  // ── Font Families ─────────────────────────────────────────────
  fontFamilySans:   '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMono:   '"JetBrains Mono", "Fira Code", "SF Mono", monospace',

  // ── Font Sizes (rem) ─────────────────────────────────────────
  fontSizeXs:     '0.75rem',    // 12px
  fontSizeSm:     '0.875rem',   // 14px
  fontSizeBase:   '1rem',       // 16px
  fontSizeLg:     '1.125rem',   // 18px
  fontSizeXl:     '1.25rem',    // 20px
  fontSize2Xl:    '1.5rem',     // 24px
  fontSize3Xl:    '1.875rem',   // 30px
  fontSize4Xl:    '2.25rem',    // 36px
  fontSize5Xl:    '3rem',       // 48px
  fontSize6Xl:    '3.75rem',    // 60px

  // ── Font Weights ──────────────────────────────────────────────
  fontWeightLight:   '300',
  fontWeightNormal:  '400',
  fontWeightMedium:  '500',
  fontWeightSemibold:'600',
  fontWeightBold:    '700',

  // ── Line Heights ──────────────────────────────────────────────
  lineHeightTight:  '1.25',
  lineHeightSnug:   '1.375',
  lineHeightNormal: '1.5',
  lineHeightRelaxed:'1.625',
  lineHeightLoose:  '2',

  // ── Letter Spacing ────────────────────────────────────────────
  letterSpacingTight:  '-0.025em',
  letterSpacingNormal: '0',
  letterSpacingWide:   '0.025em',
  letterSpacingWider:  '0.05em',
} as const;

// ---------------------------------------------------------------------------
// Spacing Scale
// ---------------------------------------------------------------------------

/**
 * 4px-based spacing scale (Tailwind-compatible).
 */
export const Spacing = {
  px:   '1px',
  '0':  '0',
  '0_5':'0.125rem',   // 2px
  '1':  '0.25rem',    // 4px
  '1_5':'0.375rem',   // 6px
  '2':  '0.5rem',     // 8px
  '2_5':'0.625rem',   // 10px
  '3':  '0.75rem',    // 12px
  '3_5':'0.875rem',   // 14px
  '4':  '1rem',       // 16px
  '5':  '1.25rem',    // 20px
  '6':  '1.5rem',     // 24px
  '7':  '1.75rem',    // 28px
  '8':  '2rem',       // 32px
  '9':  '2.25rem',    // 36px
  '10': '2.5rem',     // 40px
  '11': '2.75rem',    // 44px
  '12': '3rem',       // 48px
  '14': '3.5rem',     // 56px
  '16': '4rem',       // 64px
  '20': '5rem',       // 80px
  '24': '6rem',       // 96px
  '28': '7rem',       // 112px
  '32': '8rem',       // 128px
  '36': '9rem',       // 144px
  '40': '10rem',      // 160px
  '44': '11rem',      // 176px
  '48': '12rem',      // 192px
  '52': '13rem',      // 208px
  '56': '14rem',      // 224px
  '60': '15rem',      // 240px
  '64': '16rem',      // 256px
  '72': '18rem',      // 288px
  '80': '20rem',      // 320px
  '96': '24rem',      // 384px
} as const;

// ---------------------------------------------------------------------------
// Border Radius
// ---------------------------------------------------------------------------

/**
 * Border radius tokens for consistent corner rounding.
 */
export const BorderRadius = {
  none:     '0',
  sm:       '0.125rem',   // 2px
  base:     '0.25rem',    // 4px
  md:       '0.375rem',   // 6px
  lg:       '0.5rem',     // 8px
  xl:       '0.75rem',    // 12px
  '2xl':    '1rem',       // 16px
  '3xl':    '1.5rem',     // 24px
  full:     '9999px',     // pill / circle
} as const;

// ---------------------------------------------------------------------------
// Shadow Definitions
// ---------------------------------------------------------------------------

/**
 * Box shadow definitions for depth and elevation.
 */
export const Shadows = {
  none:    'none',
  sm:      '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base:    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md:      '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg:      '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl:      '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl':   '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner:   'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',

  // Cinacoin brand glow shadows
  primaryGlow:  '0 0 20px rgba(59, 130, 246, 0.3)',
  primaryGlowLg:'0 0 40px rgba(59, 130, 246, 0.4)',
  successGlow:  '0 0 16px rgba(34, 197, 94, 0.3)',
  errorGlow:    '0 0 16px rgba(239, 68, 68, 0.3)',
  warningGlow:  '0 0 16px rgba(245, 158, 11, 0.3)',
} as const;

// ---------------------------------------------------------------------------
// Z-Index Scale
// ---------------------------------------------------------------------------

export const ZIndex = {
  auto:     'auto',
  '0':      '0',
  '10':     '10',
  '20':     '20',
  '30':     '30',
  '40':     '40',
  '50':     '50',
  dropdown: '100',
  sticky:   '200',
  overlay:  '300',
  modal:    '400',
  popover:  '500',
  toast:    '600',
  tooltip:  '700',
} as const;

// ---------------------------------------------------------------------------
// Animation Tokens
// ---------------------------------------------------------------------------

export const Animations = {
  durationFast:   '150ms',
  durationNormal: '250ms',
  durationSlow:   '350ms',

  easeOut:    'cubic-bezier(0, 0, 0.2, 1)',
  easeIn:     'cubic-bezier(0.4, 0, 1, 1)',
  easeInOut:  'cubic-bezier(0.4, 0, 0.2, 1)',
  easeBounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',

  fadeIn:     'fadeIn 250ms cubic-bezier(0, 0, 0.2, 1)',
  fadeOut:    'fadeOut 250ms cubic-bezier(0, 0, 0.2, 1)',
  slideUp:    'slideUp 250ms cubic-bezier(0, 0, 0.2, 1)',
  slideDown:  'slideDown 250ms cubic-bezier(0, 0, 0.2, 1)',
  scaleIn:    'scaleIn 150ms cubic-bezier(0, 0, 0.2, 1)',
  scaleOut:   'scaleOut 150ms cubic-bezier(0.4, 0, 1, 1)',
} as const;

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
// CSS Custom Variables (standalone, self-contained)
// ---------------------------------------------------------------------------

/**
 * Generate a complete CSS custom properties block from the Cinacoin
 * standalone token definitions (ColorPalette, Spacing, etc.).
 */
function generateStandaloneCssVariables(): string {
  const lines: string[] = [];

  // Colors
  for (const [key, value] of Object.entries(ColorPalette)) {
    lines.push(`  --ocx-color-${key}: ${value};`);
  }

  // Typography
  lines.push(`  --ocx-font-family-sans: ${Typography.fontFamilySans};`);
  lines.push(`  --ocx-font-family-mono: ${Typography.fontFamilyMono};`);
  for (const [key, value] of Object.entries(Typography)) {
    if (key.startsWith('fontFamily')) continue;
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    lines.push(`  --ocx-${cssKey}: ${value};`);
  }

  // Spacing
  for (const [key, value] of Object.entries(Spacing)) {
    const cssKey = key.replace(/_/g, '-');
    lines.push(`  --ocx-spacing-${cssKey}: ${value};`);
  }

  // Border radius
  for (const [key, value] of Object.entries(BorderRadius)) {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    lines.push(`  --ocx-radius-${cssKey}: ${value};`);
  }

  // Shadows
  for (const [key, value] of Object.entries(Shadows)) {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    lines.push(`  --ocx-shadow-${cssKey}: ${value};`);
  }

  // Z-index
  for (const [key, value] of Object.entries(ZIndex)) {
    lines.push(`  --ocx-z-${key}: ${value};`);
  }

  // Animations
  for (const [key, value] of Object.entries(Animations)) {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    lines.push(`  --ocx-${cssKey}: ${value};`);
  }

  return lines.join('\n');
}

/** Complete standalone CSS custom properties block. */
export const standaloneCssVariables = `:root {\n${generateStandaloneCssVariables()}\n}`;

// ---------------------------------------------------------------------------
// Exports (from JSON theme files)
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
    mode: defaultTheme.theme.mode as 'dark' | 'light' | 'minimal',
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
    mode: lightTheme.theme.mode as 'dark' | 'light' | 'minimal',
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
    mode: minimalTheme.theme.mode as 'dark' | 'light' | 'minimal',
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
  standaloneCssVariables,
  // Standalone tokens
  ColorPalette,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  ZIndex,
  Animations,
};
