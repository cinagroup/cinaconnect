import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { create } from 'zustand';
import { ThemeConfig } from './types';
import { defaultTheme } from './default';

// ─── Zustand Store ──────────────────────────────────────────────────────────

interface ThemeStore {
  theme: ThemeConfig;
  mode: 'light' | 'dark';
  setTheme: (theme: ThemeConfig) => void;
  setMode: (mode: 'light' | 'dark') => void;
  toggle: () => void;
}

const STORAGE_KEY = 'cinacoin-ui-theme';

/**
 * Load persisted theme state from localStorage.
 */
function loadPersistedState(): Partial<ThemeStore> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<ThemeStore>;
  } catch {
    return null;
  }
}

/**
 * Persist theme state to localStorage.
 */
function persistState(state: Pick<ThemeStore, 'theme' | 'mode'>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: state.theme.name, mode: state.mode }));
  } catch {
    // silently ignore quota errors
  }
}

const persisted = loadPersistedState();

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: defaultTheme,
  mode: 'light',
  ...persisted,
  setTheme: (theme) => set({ theme }),
  setMode: (mode) => set({ mode }),
  toggle: () => {
    const { mode } = get();
    const next = mode === 'light' ? 'dark' : 'light';
    set({ mode: next });
  },
}));

// Subscribe to changes and persist
useThemeStore.subscribe((state) => {
  persistState({ theme: state.theme, mode: state.mode });
});

// ─── React Context ──────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: ThemeConfig;
  mode: 'light' | 'dark';
  toggle: () => void;
  setTheme: (theme: ThemeConfig) => void;
  setMode: (mode: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Initial theme override (ignored if persisted state exists) */
  initialTheme?: ThemeConfig;
  /** Initial mode override (ignored if persisted state exists) */
  initialMode?: 'light' | 'dark';
}

/**
 * React context provider for theme state.
 * Wraps a zustand store and exposes values via context.
 */
export function ThemeProvider({ children, initialTheme, initialMode }: ThemeProviderProps) {
  const store = useThemeStore();

  // Apply initial values on first mount (only if not already persisted)
  useEffect(() => {
    if (initialTheme && store.theme.name === defaultTheme.name && !persisted?.theme) {
      store.setTheme(initialTheme);
    }
    if (initialMode && store.mode === 'light' && !persisted?.mode) {
      store.setMode(initialMode);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value: ThemeContextValue = {
    theme: store.theme,
    mode: store.mode,
    toggle: store.toggle,
    setTheme: store.setTheme,
    setMode: store.setMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access the current theme context.
 * Must be used inside a <ThemeProvider>.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
