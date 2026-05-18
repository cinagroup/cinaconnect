/**
 * Minimal theme – clean, light, subtle borders.
 */
import { ThemeConfig } from './types';

export const minimalTheme: ThemeConfig = {
  name: 'minimal',
  colors: {
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    secondary: '#94a3b8',
    background: '#ffffff',
    surface: '#fafafa',
    text: '#18181b',
    textSecondary: '#71717a',
    border: '#e4e4e7',
    error: '#dc2626',
    success: '#16a34a',
    warning: '#d97706',
  },
  radii: {
    sm: '2px',
    md: '4px',
    lg: '6px',
    xl: '8px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.04)',
    md: '0 2px 4px rgba(0,0,0,0.06)',
    lg: '0 4px 8px rgba(0,0,0,0.08)',
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
