/**
 * Retro theme – warm colors, pixel-inspired.
 */
import { ThemeConfig } from './types';

export const retroTheme: ThemeConfig = {
  name: 'retro',
  colors: {
    primary: '#e07a2f',
    primaryHover: '#c76a22',
    secondary: '#b58d3f',
    background: '#fdf6e3',
    surface: '#f5e6c8',
    text: '#3d2c1e',
    textSecondary: '#8b7355',
    border: '#d4b896',
    error: '#c0392b',
    success: '#27ae60',
    warning: '#f39c12',
  },
  radii: {
    sm: '0px',
    md: '0px',
    lg: '0px',
    xl: '0px',
    full: '9999px',
  },
  shadows: {
    sm: '2px 2px 0 rgba(0,0,0,0.15)',
    md: '4px 4px 0 rgba(0,0,0,0.15)',
    lg: '6px 6px 0 rgba(0,0,0,0.2)',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  fontFamily: '"Courier New", Courier, "Lucida Sans Typewriter", monospace',
  monoFontFamily: '"Courier New", Courier, monospace',
};
