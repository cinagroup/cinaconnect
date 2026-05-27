/** Theme configuration interface for @cinacoin/ui-theme. */
export interface ThemeConfig {
  /** Unique theme identifier */
  id: string;
  /** Human-readable theme name */
  name: string;
  /** Primary brand color (hex) */
  primary: string;
  /** Secondary/accent color (hex) */
  secondary: string;
  /** Background surface color (hex) */
  background: string;
  /** Card/panel surface color (hex) */
  surface: string;
  /** Text on light surfaces (hex) */
  text: string;
  /** Text on dark surfaces (hex) */
  textInverse: string;
  /** Subtle text / labels (hex) */
  textMuted: string;
  /** Border color (hex) */
  border: string;
  /** Input focus ring color (hex) */
  focusRing: string;
  /** Border radius in px */
  borderRadius: number;
  /** Font family name */
  fontFamily: string;
  /** Enable rounded card style */
  roundedCards: boolean;
  /** Shadow preset name */
  shadow: 'none' | 'soft' | 'medium' | 'hard';
  /** Button text casing */
  buttonCasing: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
}
