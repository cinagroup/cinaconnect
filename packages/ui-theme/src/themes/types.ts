/**
 * Theme token types for @cinacoin/ui-theme.
 *
 * Defines the `ThemeConfig` interface used across all themes and components.
 */

export interface ColorPalette {
  /** Primary brand color */
  primary: string;
  /** Primary color on hover / active */
  primaryHover: string;
  /** Secondary / muted brand color */
  secondary: string;
  /** Page background */
  background: string;
  /** Surface / card background */
  surface: string;
  /** Primary text color */
  text: string;
  /** Secondary / muted text color */
  textSecondary: string;
  /** Border color */
  border: string;
  /** Error / danger color */
  error: string;
  /** Success color */
  success: string;
  /** Warning color */
  warning: string;
}

export interface SpacingTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface ShadowTokens {
  sm: string;
  md: string;
  lg: string;
}

/**
 * Complete theme configuration consumed by ThemeProvider.
 */
export interface ThemeConfig {
  /** Theme name / identifier */
  name: string;
  /** Colour palette */
  colors: ColorPalette;
  /** Border-radius scale */
  radii: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  /** Box-shadow tokens */
  shadows: ShadowTokens;
  /** Spacing scale */
  spacing: SpacingTokens;
  /** Font family stack */
  fontFamily: string;
  /** Monospace font stack (for code blocks, etc.) */
  monoFontFamily?: string;
}
