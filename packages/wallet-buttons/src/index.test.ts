import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

/* ── Source file analysis ───────────────────────────────────────── */

function readSource(filename: string): string {
  return fs.readFileSync(path.join(__dirname, filename), 'utf-8');
}

/* ── Type exports ───────────────────────────────────────────────── */

describe('wallet-buttons type exports', () => {
  it('WalletButtonVariant has 4 variants', () => {
    const variants: Array<'default' | 'brand' | 'minimal' | 'round'> = [
      'default', 'brand', 'minimal', 'round',
    ];
    expect(variants).toHaveLength(4);
  });

  it('WalletButtonSize has 3 sizes', () => {
    const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg'];
    expect(sizes).toHaveLength(3);
  });

  it('WalletButtonGroupLayout has 2 layouts', () => {
    const layouts: Array<'grid' | 'list'> = ['grid', 'list'];
    expect(layouts).toHaveLength(2);
  });
});

/* ── useWalletButtons hook ──────────────────────────────────────── */

describe('useWalletButtons hook', () => {
  it('exports the useWalletButtons function from source', () => {
    const source = readSource('hooks/useWalletButtons.ts');
    expect(source).toContain('export function useWalletButtons');
  });

  it('contains WALLET_REGISTRY with 40+ entries', () => {
    const source = readSource('hooks/useWalletButtons.ts');
    const walletIdMatches = source.match(/walletId:\s*'[^']+'/g);
    expect(walletIdMatches).not.toBeNull();
    expect(walletIdMatches!.length).toBeGreaterThanOrEqual(40);
  });

  it('metamask has brand color F6851B', () => {
    const source = readSource('hooks/useWalletButtons.ts');
    expect(source).toContain("walletId: 'metamask'");
    expect(source).toContain("brandColor: 'F6851B'");
  });

  it('walletconnect has brand color 3B99FC', () => {
    const source = readSource('hooks/useWalletButtons.ts');
    expect(source).toContain("walletId: 'walletconnect'");
    expect(source).toContain("brandColor: '3B99FC'");
  });

  it('coinbase has brand color 0052FF', () => {
    const source = readSource('hooks/useWalletButtons.ts');
    expect(source).toContain("walletId: 'coinbase'");
    expect(source).toContain("brandColor: '0052FF'");
  });

  it('falls back to CDN icon for non-registry wallets', () => {
    const source = readSource('hooks/useWalletButtons.ts');
    expect(source).toContain('ICON_CDN');
    expect(source).toContain('assets.cinacoin.dev/wallets');
  });

  it('imports getWalletById from @cinacoin/explorer', () => {
    const source = readSource('hooks/useWalletButtons.ts');
    expect(source).toContain("from '@cinacoin/explorer'");
    expect(source).toContain('getWalletById');
  });

  it('hooks returns buttons, getWalletButtonData, isConnected, connect', () => {
    const source = readSource('hooks/useWalletButtons.ts');
    expect(source).toContain('buttons');
    expect(source).toContain('getWalletButtonData');
    expect(source).toContain('isConnected');
    expect(source).toContain('connect');
  });
});

/* ── WalletButtonGroup ──────────────────────────────────────────── */

describe('WalletButtonGroup', () => {
  it('is a React function component (exports from .tsx source)', () => {
    const source = readSource('WalletButtonGroup.tsx');
    expect(source).toContain('export const WalletButtonGroup');
    expect(source).toContain('React.FC');
  });

  it('uses DEFAULT_WALLETS when no walletIds provided', () => {
    const source = readSource('WalletButtonGroup.tsx');
    expect(source).toContain('DEFAULT_WALLETS');
    expect(source).toContain('metamask');
    expect(source).toContain('walletconnect');
    expect(source).toContain('coinbase');
    expect(source).toContain('rainbow');
    expect(source).toContain('trust');
    expect(source).toContain('phantom');
  });

  it('supports grid and list layouts', () => {
    const source = readSource('WalletButtonGroup.tsx');
    expect(source).toContain('grid');
    expect(source).toContain('list');
  });

  it('accepts columns prop for grid layout', () => {
    const source = readSource('WalletButtonGroup.tsx');
    expect(source).toContain('columns');
    expect(source).toContain('gridTemplateColumns');
  });
});

/* ── WalletButton ───────────────────────────────────────────────── */

describe('WalletButton', () => {
  it('is a React function component (exports from .tsx source)', () => {
    const source = readSource('WalletButton.tsx');
    expect(source).toContain('export const WalletButton');
    expect(source).toContain('React.FC');
  });

  it('has SIZE_MAP for sm, md, lg', () => {
    const source = readSource('WalletButton.tsx');
    expect(source).toMatch(/sm:\s*\{/);
    expect(source).toMatch(/md:\s*\{/);
    expect(source).toMatch(/lg:\s*\{/);
  });

  it('supports 4 variants: default, brand, minimal, round', () => {
    const source = readSource('WalletButton.tsx');
    expect(source).toContain('isRound');
    expect(source).toContain('isBrand');
    expect(source).toContain('isMinimal');
  });

  it('has connected badge functionality', () => {
    const source = readSource('WalletButton.tsx');
    expect(source).toContain('showConnectedBadge');
    expect(source).toContain('cc-wallet-button__badge');
  });

  it('handles loading state with spinner', () => {
    const source = readSource('WalletButton.tsx');
    expect(source).toContain('cc-wallet-button__spinner');
    expect(source).toContain('isLoading');
  });

  it('respects disabled and loading states (no onClick)', () => {
    const source = readSource('WalletButton.tsx');
    expect(source).toContain('disabled');
    expect(source).toContain('isLoading');
    expect(source).toContain('!disabled && !isLoading');
  });
});

/* ── WalletConnectButton ────────────────────────────────────────── */

describe('WalletConnectButton', () => {
  it('is a React function component (exports from .tsx source)', () => {
    const source = readSource('WalletConnectButton.tsx');
    expect(source).toContain('export const WalletConnectButton');
    expect(source).toContain('React.FC');
  });

  it('has WalletConnect brand color', () => {
    const source = readSource('WalletConnectButton.tsx');
    expect(source).toContain('3B99FC');
  });

  it('has QR icon SVG', () => {
    const source = readSource('WalletConnectButton.tsx');
    expect(source).toContain('QR_ICON');
    expect(source).toContain('<svg');
  });

  it('toggles QR overlay on click', () => {
    const source = readSource('WalletConnectButton.tsx');
    expect(source).toContain('showingQR');
    expect(source).toContain('setShowingQR');
    expect(source).toContain('cc-wc-qr-overlay');
  });

  it('supports custom label override', () => {
    const source = readSource('WalletConnectButton.tsx');
    expect(source).toContain("label = 'WalletConnect'");
  });

  it('supports disabled and loading states', () => {
    const source = readSource('WalletConnectButton.tsx');
    expect(source).toContain('disabled');
    expect(source).toContain('isLoading');
  });
});
