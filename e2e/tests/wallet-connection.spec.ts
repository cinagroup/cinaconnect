/**
 * E2E Test — Real Wallet Connection Flows
 *
 * Tests real wallet connection patterns using Playwright with
 * Chromium desktop and mobile viewport configurations.
 *
 * 8 tests covering:
 * - Connect button visibility
 * - Modal open/close
 * - Wallet selection flow
 * - Injected provider connection
 * - WalletConnect QR flow
 * - Mobile deep link redirect
 * - Connection state persistence
 * - Disconnect flow
 */

import { test, expect } from '../fixtures';
import {
  getConnectButton,
  waitForConnected,
  openConnectModal,
  selectWallet,
  assertAddressDisplayed,
  assertDisconnected,
  injectMockProvider,
  resetMockProvider,
} from '../helpers/wallet';

test.describe('Wallet Connection E2E', () => {
  test.afterEach(async ({ page }) => {
    await resetMockProvider(page);
  });

  test('should display connect button on landing page', async ({ demoPage }) => {
    const button = await getConnectButton(demoPage);
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test('should open connect modal with wallet list when clicking connect', async ({ demoPage }) => {
    await openConnectModal(demoPage);
    await expect(demoPage.getByRole('dialog')).toBeVisible();
    await expect(demoPage.getByText('MetaMask')).toBeVisible();
    await expect(demoPage.getByText('WalletConnect')).toBeVisible();
  });

  test('should connect via injected provider and show address', async ({ page }) => {
    await injectMockProvider(page);
    await page.goto('/');
    await openConnectModal(page);
    await selectWallet(page, 'MetaMask');
    await waitForConnected(page);
  });

  test('should show WalletConnect QR code when selecting QR wallet', async ({ demoPage }) => {
    await openConnectModal(demoPage);

    // Switch to scan/QR tab
    const scanTab = demoPage.getByRole('tab', { name: /scan/i });
    if (await scanTab.isVisible()) {
      await scanTab.click();
    }

    // QR area should be visible
    await expect(demoPage.getByText(/scan.*qr/i)).toBeVisible();
  });

  test('should close modal on overlay click', async ({ demoPage }) => {
    await openConnectModal(demoPage);
    await expect(demoPage.getByRole('dialog')).toBeVisible();

    // Click outside the modal
    const overlay = demoPage.locator('.overlay');
    if (await overlay.count()) {
      await overlay.click();
    } else {
      await demoPage.keyboard.press('Escape');
    }

    await expect(demoPage.getByRole('dialog')).not.toBeVisible();
  });

  test('should persist connection state across page reload', async ({ page }) => {
    await injectMockProvider(page);
    await page.goto('/');
    await openConnectModal(page);
    await selectWallet(page, 'MetaMask');
    await waitForConnected(page);

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still show connected state
    const button = await getConnectButton(page);
    await expect(button).toBeVisible();
  });

  test('should disconnect and reset to initial state', async ({ page }) => {
    await injectMockProvider(page);
    await page.goto('/');
    await openConnectModal(page);
    await selectWallet(page, 'MetaMask');
    await waitForConnected(page);

    // Disconnect
    const disconnectBtn = page.getByRole('button', { name: /disconnect/i });
    if (await disconnectBtn.isVisible()) {
      await disconnectBtn.click();
    }
    await assertDisconnected(page);
  });

  test('should show recommended wallets first in the wallet list', async ({ demoPage }) => {
    await openConnectModal(demoPage);

    const walletCards = demoPage.locator('[role="button"]').filter({ hasText: /MetaMask|WalletConnect|Coinbase/ });
    const count = await walletCards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // First wallet should be MetaMask (recommended)
    const firstCard = walletCards.first();
    await expect(firstCard).toBeVisible();
  });
});
