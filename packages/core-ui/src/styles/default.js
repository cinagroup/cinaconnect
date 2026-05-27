/**
 * Default CSS styles for Cinacoin components.
 *
 * Provides CSS custom property defaults and global resets that are applied
 * when the @cinacoin/design-tokens package is loaded.
 */
import { css } from 'lit';
/** Global CSS that should be injected at the application root. */
export const defaultStyles = css `
  /* ── Reset ─────────────────────────────────────────── */
  .ocx-root,
  .ocx-root *,
  .ocx-root *::before,
  .ocx-root *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* ── Font smoothing ────────────────────────────────── */
  .ocx-root {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  /* ── Focus visible ─────────────────────────────────── */
  .ocx-root :focus-visible {
    outline: 2px solid var(--ocx-color-border-focus, #3B82F6);
    outline-offset: 2px;
  }

  /* ── Scrollbar styling ─────────────────────────────── */
  .ocx-root ::-webkit-scrollbar {
    width: 6px;
  }
  .ocx-root ::-webkit-scrollbar-track {
    background: transparent;
  }
  .ocx-root ::-webkit-scrollbar-thumb {
    background: var(--ocx-color-border, #334155);
    border-radius: var(--ocx-radius-full, 9999px);
  }

  /* ── Selection ─────────────────────────────────────── */
  .ocx-root ::selection {
    background: var(--ocx-color-accent-500, #3B82F6);
    color: var(--ocx-color-text-inverse, #fff);
  }

  /* ── Motion preference ─────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .ocx-root *,
    .ocx-root *::before,
    .ocx-root *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* ── RTL support ───────────────────────────────────── */
  [dir='rtl'] .ocx-root {
    direction: rtl;
  }
`;
/** Utility: truncate an Ethereum address. */
export function truncateAddress(address, prefix = 4, suffix = 4) {
    if (address.length <= prefix + suffix + 2)
        return address;
    return `${address.slice(0, prefix + 2)}...${address.slice(-suffix)}`;
}
/** Utility: format a number with locale-aware separators. */
export function formatNumber(value, decimals = 2) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num))
        return '0.00';
    return num.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}
/**
 * Generate a deterministic avatar gradient from an address.
 * Returns a CSS linear-gradient string.
 */
export function addressAvatarGradient(address) {
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
        hash = address.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs(hash) % 360;
    const h2 = (h1 + 40) % 360;
    return `linear-gradient(135deg, hsl(${h1}, 70%, 50%), hsl(${h2}, 70%, 60%))`;
}
//# sourceMappingURL=default.js.map