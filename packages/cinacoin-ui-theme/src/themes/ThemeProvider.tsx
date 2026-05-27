import React, { createContext, useContext, useMemo, useCallback, useEffect } from 'react';
import { create } from 'zustand';
import type { ThemeConfig } from './types';
import { minimal, rounded, retro, nouns, midnight, defaultTheme } from './themes';

// All themes keyed by id (same as index.ts barrel)
const themes: Record<string, ThemeConfig> = {
  minimal,
  rounded,
  retro,
  nouns,
  midnight,
  default: defaultTheme,
};

// ─── Zustand Store ───────────────────────────────────────────────────────────

interface ThemeState {
  /** Currently active theme config */
  theme: ThemeConfig;
  /** Switch to a theme by id */
  setTheme: (themeId: string) => void;
  /** Cycle to next theme in the list */
  cycleTheme: () => void;
  /** Get theme by id without switching */
  getTheme: (themeId: string) => ThemeConfig | undefined;
  /** List of all available theme ids */
  themeIds: string[];
}

const themeOrder = Object.keys(themes);

/** Global theme store powered by Zustand for cross-component sync */
export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: defaultTheme,
  setTheme: (themeId: string) => {
    const next = themes[themeId] ?? defaultTheme;
    set({ theme: next });
  },
  cycleTheme: () => {
    const { theme, themeIds } = get();
    const idx = themeIds.indexOf(theme.id);
    const nextId = themeIds[(idx + 1) % themeIds.length];
    set({ theme: themes[nextId] ?? defaultTheme });
  },
  getTheme: (themeId: string) => themes[themeId],
  themeIds: themeOrder,
}));

// ─── React Context ───────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (themeId: string) => void;
  cycleTheme: () => void;
  getTheme: (themeId: string) => ThemeConfig | undefined;
  themeIds: string[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Apply CSS custom properties from the current theme to the document root */
function applyThemeToDocument(theme: ThemeConfig): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--cc-primary', theme.primary);
  root.style.setProperty('--cc-secondary', theme.secondary);
  root.style.setProperty('--cc-background', theme.background);
  root.style.setProperty('--cc-surface', theme.surface);
  root.style.setProperty('--cc-text', theme.text);
  root.style.setProperty('--cc-text-inverse', theme.textInverse);
  root.style.setProperty('--cc-text-muted', theme.textMuted);
  root.style.setProperty('--cc-border', theme.border);
  root.style.setProperty('--cc-focus-ring', theme.focusRing);
  root.style.setProperty('--cc-border-radius', `${theme.borderRadius}px`);
  root.style.setProperty('--cc-font-family', theme.fontFamily);
}

/**
 * ThemeProvider — wraps your app with theme context.
 * Automatically applies CSS custom properties to <html>.
 */
export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  /** Optional initial theme id (defaults to "default") */
  initialThemeId?: string;
}> = ({ children, initialThemeId }) => {
  const { theme, setTheme, cycleTheme, getTheme, themeIds } = useThemeStore();

  // Apply initial theme on mount
  useEffect(() => {
    if (initialThemeId && initialThemeId !== theme.id) {
      setTheme(initialThemeId);
    }
  }, [initialThemeId, setTheme, theme.id]);

  // Sync CSS vars on every theme change
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, cycleTheme, getTheme, themeIds }),
    [theme, setTheme, cycleTheme, getTheme, themeIds]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/** Consume the current theme from context */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

export { type ThemeConfig } from './types';
