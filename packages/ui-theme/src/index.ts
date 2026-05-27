/**
 * @cinacoin/ui-theme
 *
 * Theme tokens, framer-motion animations, and base components.
 */

// ─── Theme Types ────────────────────────────────────────────────────────────
export type { ThemeConfig, ColorPalette, SpacingTokens, ShadowTokens } from './themes/types';

// ─── Theme Definitions ─────────────────────────────────────────────────────
export { defaultTheme } from './themes/default';
export { minimalTheme } from './themes/minimal';
export { roundedTheme } from './themes/rounded';
export { retroTheme } from './themes/retro';
export { nounsTheme } from './themes/nouns';
export { midnightTheme } from './themes/midnight';

// ─── Theme Provider ─────────────────────────────────────────────────────────
export { ThemeProvider, useTheme } from './themes/ThemeProvider';
export type { ThemeProviderProps } from './themes/ThemeProvider';
export { useThemeStore } from './themes/ThemeProvider';

// ─── Framer-Motion Animations ───────────────────────────────────────────────
export {
  MotionDiv,
  AnimatePresenceWrapper,
  FadeIn,
  SlideUp,
  ScaleIn,
  fadeInVariants,
  slideUpVariants,
  scaleInVariants,
} from './animations/motion';
export type { MotionDivProps, AnimatePresenceWrapperProps, FadeInProps, SlideUpProps, ScaleInProps } from './animations/motion';

// ─── Components ─────────────────────────────────────────────────────────────
export { PasswordStrengthIndicator } from './components/PasswordStrength/PasswordStrengthIndicator';
export type { PasswordStrengthIndicatorProps, StrengthLevel } from './components/PasswordStrength/PasswordStrengthIndicator';

export { PageTransition } from './components/Transition/PageTransition';
export type { PageTransitionProps } from './components/Transition/PageTransition';

export { Modal } from './components/Modal/Modal';
export type { ModalProps } from './components/Modal/Modal';
