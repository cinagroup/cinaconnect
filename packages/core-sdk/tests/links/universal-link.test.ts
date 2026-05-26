/**
 * Universal Link tests.
 *
 * Tests cover generateUniversalLink and generateWalletConnectUniversalLink.
 */

import { describe, it, expect } from 'vitest';
import {
  generateUniversalLink,
  generateWalletConnectUniversalLink,
} from '../../src/links/universal-link.js';

/* ------------------------------------------------------------------ */
/*  generateUniversalLink                                              */
/* ------------------------------------------------------------------ */

describe('generateUniversalLink', () => {
  it('generates a basic universal link URL', () => {
    const url = generateUniversalLink({
      domain: 'metamask.app.link',
      path: '/wc',
    });
    expect(url).toBe('https://metamask.app.link/wc');
  });

  it('appends query parameters', () => {
    const url = generateUniversalLink({
      domain: 'example.com',
      path: '/app',
      params: { uri: 'wc:abc123', v: '2' },
    });
    expect(url).toContain('https://example.com/app?');
    expect(url).toContain('uri=wc%3Aabc123');
    expect(url).toContain('v=2');
  });

  it('appends fallback URL as query param', () => {
    const url = generateUniversalLink({
      domain: 'example.com',
      path: '/app',
      fallbackUrl: 'https://apps.apple.com/app',
    });
    expect(url).toContain('fallback=https%3A%2F%2Fapps.apple.com%2Fapp');
  });

  it('combines params and fallback with correct separator', () => {
    const url = generateUniversalLink({
      domain: 'example.com',
      path: '/app',
      params: { key: 'value' },
      fallbackUrl: 'https://fallback.example.com',
    });
    expect(url).toContain('?key=value');
    expect(url).toContain('&fallback=');
  });

  it('encodes special characters in params', () => {
    const url = generateUniversalLink({
      domain: 'example.com',
      path: '/wc',
      params: { uri: 'wc:hello world&foo=bar' },
    });
    expect(url).toContain('uri=wc%3Ahello');
  });

  it('handles empty params object', () => {
    const url = generateUniversalLink({
      domain: 'example.com',
      path: '/app',
      params: {},
    });
    expect(url).toBe('https://example.com/app');
  });
});

/* ------------------------------------------------------------------ */
/*  generateWalletConnectUniversalLink                                 */
/* ------------------------------------------------------------------ */

describe('generateWalletConnectUniversalLink', () => {
  it('generates a link for MetaMask', () => {
    const url = generateWalletConnectUniversalLink(
      'metamask',
      'wc:abc@2?relay-protocol=irn&symKey=xyz',
    );
    expect(url).toContain('metamask.app.link');
    expect(url).toContain('/wc');
  });

  it('generates a link for Rainbow', () => {
    const url = generateWalletConnectUniversalLink(
      'rainbow',
      'wc:abc@2',
    );
    expect(url).toContain('rnbwapp.com');
  });

  it('generates a link for Coinbase', () => {
    const url = generateWalletConnectUniversalLink(
      'coinbase',
      'wc:abc@2',
    );
    expect(url).toContain('go.cb-w.com');
  });

  it('generates a link for Phantom', () => {
    const url = generateWalletConnectUniversalLink(
      'phantom',
      'wc:abc@2',
    );
    expect(url).toContain('phantom.app');
  });

  it('generates a link for Trust Wallet', () => {
    const url = generateWalletConnectUniversalLink(
      'trust',
      'wc:abc@2',
    );
    expect(url).toContain('link.trustwallet.com');
  });

  it('generates a link for Zerion', () => {
    const url = generateWalletConnectUniversalLink(
      'zerion',
      'wc:abc@2',
    );
    expect(url).toContain('links.zerion.io');
  });

  it('defaults to walletconnect.com for unknown wallets', () => {
    const url = generateWalletConnectUniversalLink(
      'unknown-wallet',
      'wc:abc@2',
    );
    expect(url).toContain('walletconnect.com');
  });

  it('includes fallback URL when provided', () => {
    const url = generateWalletConnectUniversalLink(
      'metamask',
      'wc:abc@2',
      'https://metamask.io/download/',
    );
    expect(url).toContain('fallback=https%3A%2F%2Fmetamask.io%2Fdownload%2F');
  });

  it('includes the wc URI in the params', () => {
    const wcUri = 'wc:my-session-id@2?relay-protocol=irn&symKey=my-key';
    const url = generateWalletConnectUniversalLink('metamask', wcUri);
    expect(url).toContain(encodeURIComponent(wcUri));
  });
});
