/**
 * Midnight theme – dark, high contrast.
 */
import { ThemeConfig } from './types';

export const midnightTheme: ThemeConfig = {
  name: 'midnight',
  colors: {
    primary: '#38bdf8',
    primaryHover: '#0ea5e9',
    secondary: '#64748b',
    background: '#0b0f19',
    surface: '#111827',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    border: '#1e293b',
    error: '#f87171',
    success: '#34d399',
    warning: '#fbbf24',
  },
  radii: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.4)',
    md: '0 4px 12px rgba(0,0,0,0.5)',
    lg: '0 8px 24px rgba(0,0,0,0.6)',
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
