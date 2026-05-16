/**
 * Tests for WalletCard component.
 * Tests rendering, wallet info display, and install detection.
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('WalletCard component', () => {
  let WalletCard: any;

  beforeAll(async () => {
    const mod = await import('../../src/components/wallet-card.js');
    WalletCard = mod.WalletCard;
  });

  it('should have correct default property values', () => {
    const card = document.createElement('ocx-wallet-card') as any;
    expect(card.wallet).toBeNull();
    expect(card.installed).toBe(false);
    expect(card.recommended).toBe(false);
  });

  it('should render null when wallet is null', () => {
    const card = document.createElement('ocx-wallet-card') as any;
    const result = card.render();
    expect(result).toBeNull();
  });

  it('should render wallet info when wallet is provided', () => {
    const card = document.createElement('ocx-wallet-card') as any;
    card.wallet = {
      id: 'metamask',
      name: 'MetaMask',
      icon: 'data:image/svg+xml;base64,abc',
      description: 'The most popular wallet',
    };
    const result = card.render();
    expect(String(result)).toContain('MetaMask');
    expect(String(result)).toContain('The most popular wallet');
  });

  it('should render icon when wallet has icon URL', () => {
    const card = document.createElement('ocx-wallet-card') as any;
    card.wallet = {
      id: 'mm',
      name: 'MetaMask',
      icon: 'data:image/svg+xml;base64,abc',
    };
    const result = card.render();
    expect(String(result)).toContain('src="data:image/svg+xml;base64,abc"');
  });

  it('should render fallback icon when wallet has no icon', () => {
    const card = document.createElement('ocx-wallet-card') as any;
    card.wallet = {
      id: 'mm',
      name: 'MetaMask',
      icon: '',
    };
    const result = card.render();
    expect(String(result)).toContain('icon-fallback');
    expect(String(result)).toContain('🔗');
  });

  it('should show Recommended badge when recommended is true', () => {
    const card = document.createElement('ocx-wallet-card') as any;
    card.wallet = {
      id: 'mm',
      name: 'MetaMask',
      icon: '',
    };
    card.recommended = true;
    card.installed = false;
    const result = card.render();
    expect(String(result)).toContain('Recommended');
    expect(String(result)).not.toContain('Installed');
  });

  it('should show Installed badge when installed is true and not recommended', () => {
    const card = document.createElement('ocx-wallet-card') as any;
    card.wallet = {
      id: 'mm',
      name: 'MetaMask',
      icon: '',
    };
    card.recommended = false;
    card.installed = true;
    const result = card.render();
    expect(String(result)).toContain('Installed');
    expect(String(result)).not.toContain('Recommended');
  });

  it('should prioritize Recommended badge over Installed', () => {
    const card = document.createElement('ocx-wallet-card') as any;
    card.wallet = {
      id: 'mm',
      name: 'MetaMask',
      icon: '',
    };
    card.recommended = true;
    card.installed = true;
    const result = card.render();
    expect(String(result)).toContain('Recommended');
    // When recommended is true, installed badge should not show
    expect(String(result)).not.toContain('Installed');
  });

  it('should show no badges when neither recommended nor installed', () => {
    const card = document.createElement('ocx-wallet-card') as any;
    card.wallet = {
      id: 'mm',
      name: 'MetaMask',
      icon: '',
    };
    card.recommended = false;
    card.installed = false;
    const result = card.render();
    expect(String(result)).not.toContain('Recommended');
    expect(String(result)).not.toContain('Installed');
  });

  it('should render wallet description when provided', () => {
    const card = document.createElement('ocx-wallet-card') as any;
    card.wallet = {
      id: 'mm',
      name: 'MetaMask',
      icon: '',
      description: 'A popular Ethereum wallet',
    };
    const result = card.render();
    expect(String(result)).toContain('A popular Ethereum wallet');
  });

  it('should not render description when not provided', () => {
    const card = document.createElement('ocx-wallet-card') as any;
    card.wallet = {
      id: 'mm',
      name: 'MetaMask',
      icon: '',
    };
    const result = card.render();
    const str = String(result);
    // Should not have desc class content
    expect(str).not.toContain('class="desc"');
  });

  it('should apply iconBackground style when provided', () => {
    const card = document.createElement('ocx-wallet-card') as any;
    card.wallet = {
      id: 'mm',
      name: 'MetaMask',
      icon: '',
      iconBackground: '#FF9900',
    };
    const result = card.render();
    expect(String(result)).toContain('#FF9900');
  });

  it('should define CSS styles', () => {
    const styles = (WalletCard as any).styles;
    expect(Array.isArray(styles)).toBe(true);
    expect(styles.length).toBeGreaterThanOrEqual(1);
  });
});
