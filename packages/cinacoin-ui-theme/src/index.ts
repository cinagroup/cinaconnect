/**
 * @cinacoin/ui-theme — Theming, animations, and UI components.
 *
 * Re-exports themes, animations, and components for convenient top-level access.
 */

// Themes
export { themes, minimal, rounded, retro, nouns, midnight, defaultTheme } from './themes/index';
export type { ThemeConfig } from './themes/types';
export { ThemeProvider, useTheme, useThemeStore } from './themes/ThemeProvider';

// Animations
export {
  fadeInOut,
  slideUp,
  slideDown,
  scaleIn,
  slideFromLeft,
  slideFromRight,
  pageTransition,
  modalBackdrop,
  modalContent,
  staggerContainer,
  staggerItem,
  fastTransition,
  standardTransition,
  smoothTransition,
  hoverSpring,
  FadeIn,
  SlideUp,
  ScaleIn,
  Hoverable,
  StaggerList,
  StaggerItem,
  AnimatePresence,
  motion,
} from './animations/motion';

// Components
export {
  PasswordStrengthIndicator,
  calculatePasswordStrength,
  type PasswordStrengthIndicatorProps,
  type PasswordStrength,
} from './components/PasswordStrength/PasswordStrengthIndicator';
export {
  PageTransition,
  type PageTransitionProps,
} from './components/Transition/PageTransition';
export { Modal, type ModalProps } from './components/Modal/Modal';
