/**
 * Nouns theme – bold colors, playful.
 */
import { ThemeConfig } from './types';

export const nounsTheme: ThemeConfig = {
  name: 'nouns',
  colors: {
    primary: '#ff0420',
    primaryHover: '#e0031c',
    secondary: '#a3a3a3',
    background: '#ffffff',
    surface: '#f6f6f6',
    text: '#1a1a1a',
    textSecondary: '#757575',
    border: '#e5e5e5',
    error: '#ff0420',
    success: '#2bd07f',
    warning: '#ffcf00',
  },
  radii: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadows: {
    sm: '0 2px 4px rgba(0,0,0,0.08)',
    md: '0 4px 12px rgba(0,0,0,0.12)',
    lg: '0 8px 24px rgba(0,0,0,0.16)',
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
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};
