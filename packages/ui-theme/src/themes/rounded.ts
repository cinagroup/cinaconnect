/**
 * Rounded theme – large border radius, soft shadows.
 */
import { ThemeConfig } from './types';

export const roundedTheme: ThemeConfig = {
  name: 'rounded',
  colors: {
    primary: '#8b5cf6',
    primaryHover: '#7c3aed',
    secondary: '#a78bfa',
    background: '#faf5ff',
    surface: '#f3e8ff',
    text: '#1e1b4b',
    textSecondary: '#6b7280',
    border: '#ddd6fe',
    error: '#f87171',
    success: '#34d399',
    warning: '#fbbf24',
  },
  radii: {
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    full: '9999px',
  },
  shadows: {
    sm: '0 2px 8px rgba(139,92,246,0.08)',
    md: '0 4px 16px rgba(139,92,246,0.12)',
    lg: '0 8px 32px rgba(139,92,246,0.16)',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};
