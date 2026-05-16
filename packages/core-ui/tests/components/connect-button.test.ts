/**
 * Tests for ConnectButton component.
 * Tests rendering logic, click handling, and state changes.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

describe('ConnectButton component', () => {
  let ConnectButton: any;

  beforeAll(async () => {
    // Import dynamically to register custom element
    const mod = await import('../../src/components/connect-button.js');
    ConnectButton = mod.ConnectButton;
  });

  it('should have correct default property values', () => {
    const btn = document.createElement('ocx-connect-button');
    expect(btn.variant).toBe('primary');
    expect(btn.size).toBe('md');
    expect(btn.label).toBe('Connect Wallet');
    expect(btn.state).toBe('disconnected');
    expect(btn.showBalance).toBe(false);
    expect(btn.showAvatar).toBe(false);
    expect(btn.showNetwork).toBe(false);
  });

  it('should accept property changes', () => {
    const btn = document.createElement('ocx-connect-button') as any;
    btn.variant = 'secondary';
    btn.size = 'lg';
    btn.label = 'Sign In';
    btn.state = 'connecting';
    btn.address = '0xabcdef1234567890abcdef1234567890abcdef12';
    btn.balance = '1.5';
    btn.chainSymbol = 'ETH';

    expect(btn.variant).toBe('secondary');
    expect(btn.size).toBe('lg');
    expect(btn.label).toBe('Sign In');
    expect(btn.state).toBe('connecting');
    expect(btn.address).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
    expect(btn.balance).toBe('1.5');
    expect(btn.chainSymbol).toBe('ETH');
  });

  it('should dispatch ocx-click event when clicked in disconnected state', () => {
    const btn = document.createElement('ocx-connect-button');
    const handler = vi.fn();
    btn.addEventListener('ocx-click', handler);

    // connectedCallback sets up click listener
    btn.connectedCallback();
    btn.click();

    expect(handler).toHaveBeenCalledTimes(1);
    btn.disconnectedCallback();
  });

  it('should NOT dispatch ocx-click when in connecting state', () => {
    const btn = document.createElement('ocx-connect-button') as any;
    btn.state = 'connecting';
    const handler = vi.fn();
    btn.addEventListener('ocx-click', handler);

    btn.connectedCallback();
    btn.click();

    expect(handler).not.toHaveBeenCalled();
    btn.disconnectedCallback();
  });

  it('should toggle internal menu when in connected state', () => {
    const btn = document.createElement('ocx-connect-button') as any;
    btn.state = 'connected';
    btn.address = '0xabcdef1234567890abcdef1234567890abcdef12';

    btn.connectedCallback();
    // First click should open menu
    btn.click();
    expect(btn._menuOpen).toBe(true);

    // Second click should close menu
    btn.click();
    expect(btn._menuOpen).toBe(false);

    btn.disconnectedCallback();
  });

  it('should dispatch ocx-disconnect event on disconnect action', () => {
    const btn = document.createElement('ocx-connect-button') as any;
    const handler = vi.fn();
    btn.addEventListener('ocx-disconnect', handler);

    const fakeEvent = new Event('click');
    btn._handleDisconnect(fakeEvent);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should close menu and stop propagation on disconnect', () => {
    const btn = document.createElement('ocx-connect-button') as any;
    btn._menuOpen = true;

    const fakeEvent = new Event('click');
    fakeEvent.stopPropagation = vi.fn();
    btn._handleDisconnect(fakeEvent);

    expect(btn._menuOpen).toBe(false);
    expect(fakeEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should handle Escape key to close menu', () => {
    const btn = document.createElement('ocx-connect-button') as any;
    btn._menuOpen = true;

    btn.connectedCallback();
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    btn.dispatchEvent(event);

    expect(btn._menuOpen).toBe(false);
    btn.disconnectedCallback();
  });

  it('should render spinner content in connecting state', () => {
    const btn = document.createElement('ocx-connect-button') as any;
    btn.state = 'connecting';
    const content = btn._renderContent();
    expect(String(content)).toContain('Connecting');
  });

  it('should render warning content in wrong_network state', () => {
    const btn = document.createElement('ocx-connect-button') as any;
    btn.state = 'wrong_network';
    const content = btn._renderContent();
    expect(String(content)).toContain('Switch Network');
  });

  it('should render error content in error state', () => {
    const btn = document.createElement('ocx-connect-button') as any;
    btn.state = 'error';
    const content = btn._renderContent();
    expect(String(content)).toContain('Error');
  });

  it('should render label in disconnected state', () => {
    const btn = document.createElement('ocx-connect-button') as any;
    btn.state = 'disconnected';
    btn.label = 'Connect Wallet';
    const content = btn._renderContent();
    expect(String(content)).toContain('Connect Wallet');
  });

  it('should format address using inherited formatAddress', () => {
    const btn = document.createElement('ocx-connect-button') as any;
    const formatted = btn.formatAddress('0x1234567890abcdef1234567890abcdef12345678');
    expect(formatted).toBe('0x12...5678');
  });

  it('should return correct aria labels for all states', () => {
    const btn = document.createElement('ocx-connect-button') as any;
    btn.label = 'Connect';

    btn.state = 'disconnected';
    expect(btn._getAriaLabel()).toBe('Connect');

    btn.state = 'connecting';
    expect(btn._getAriaLabel()).toBe('Connecting to wallet');

    btn.state = 'connected';
    btn.address = '0xabcdef1234567890abcdef1234567890abcdef12';
    expect(btn._getAriaLabel()).toContain('Connected as');

    btn.state = 'wrong_network';
    expect(btn._getAriaLabel()).toContain('Wrong network');

    btn.state = 'error';
    expect(btn._getAriaLabel()).toBe('Connection error');
  });

  it('should define CSS styles', () => {
    const styles = (ConnectButton as any).styles;
    expect(Array.isArray(styles)).toBe(true);
    expect(styles.length).toBeGreaterThanOrEqual(1);
  });
});
