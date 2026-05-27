import type { ThemeConfig } from './types';

/** Minimal theme — ultra-clean, flat, no shadows */
export const minimal: ThemeConfig = {
  id: 'minimal',
  name: 'Minimal',
  primary: '#000000',
  secondary: '#555555',
  background: '#ffffff',
  surface: '#ffffff',
  text: '#000000',
  textInverse: '#ffffff',
  textMuted: '#999999',
  border: '#e5e5e5',
  focusRing: '#000000',
  borderRadius: 0,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  roundedCards: false,
  shadow: 'none',
  buttonCasing: 'uppercase',
};

/** Rounded theme — soft curves, gentle shadows */
export const rounded: ThemeConfig = {
  id: 'rounded',
  name: 'Rounded',
  primary: '#6366f1',
  secondary: '#a78bfa',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
  textInverse: '#ffffff',
  textMuted: '#64748b',
  border: '#e2e8f0',
  focusRing: '#6366f1',
  borderRadius: 16,
  fontFamily: 'Inter, system-ui, sans-serif',
  roundedCards: true,
  shadow: 'soft',
  buttonCasing: 'none',
};

/** Retro theme — warm palette, monospace, chunky borders */
export const retro: ThemeConfig = {
  id: 'retro',
  name: 'Retro',
  primary: '#e67e22',
  secondary: '#d35400',
  background: '#fdf6e3',
  surface: '#fef9ef',
  text: '#2c3e50',
  textInverse: '#fdf6e3',
  textMuted: '#95a5a6',
  border: '#2c3e50',
  focusRing: '#e67e22',
  borderRadius: 4,
  fontFamily: '"Courier New", Courier, monospace',
  roundedCards: false,
  shadow: 'hard',
  buttonCasing: 'uppercase',
};

/** Nouns theme — playful, colorful, noun-based design tokens */
export const nouns: ThemeConfig = {
  id: 'nouns',
  name: 'Nouns',
  primary: '#ff0420',
  secondary: '#a200ff',
  background: '#fff',
  surface: '#f4f4f4',
  text: '#1a1a1a',
  textInverse: '#ffffff',
  textMuted: '#888888',
  border: '#d4d4d4',
  focusRing: '#ff0420',
  borderRadius: 12,
  fontFamily: '"Noun Project", system-ui, sans-serif',
  roundedCards: true,
  shadow: 'soft',
  buttonCasing: 'capitalize',
};

/** Midnight theme — dark mode, cool tones */
export const midnight: ThemeConfig = {
  id: 'midnight',
  name: 'Midnight',
  primary: '#3b82f6',
  secondary: '#1d4ed8',
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f1f5f9',
  textInverse: '#0f172a',
  textMuted: '#94a3b8',
  border: '#334155',
  focusRing: '#3b82f6',
  borderRadius: 8,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  roundedCards: true,
  shadow: 'medium',
  buttonCasing: 'none',
};

/** Default theme — balanced, professional */
export const defaultTheme: ThemeConfig = {
  id: 'default',
  name: 'Default',
  primary: '#2563eb',
  secondary: '#1e40af',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1e293b',
  textInverse: '#ffffff',
  textMuted: '#64748b',
  border: '#e2e8f0',
  focusRing: '#2563eb',
  borderRadius: 8,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  roundedCards: true,
  shadow: 'soft',
  buttonCasing: 'none',
};

/** All available themes keyed by id */
export const themes: Record<string, ThemeConfig> = {
  minimal,
  rounded,
  retro,
  nouns,
  midnight,
  default: defaultTheme,
};

export { type ThemeConfig } from './types';
