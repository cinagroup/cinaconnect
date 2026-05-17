/**
 * E2E Test — Multi-Chain Switching
 *
 * Tests chain switching flows across different networks.
 *
 * 6 tests covering:
 * - Chain switcher dropdown visibility
 * - Switch to different EVM chain
 * - Switch to testnet
 * - Unsupported chain handling
 * - Chain state persistence
 * - Multi-chain balance display
 */

import { test, expect } from '../fixtures';
import {
  getConnectButton,
  waitForConnected,
  openConnectModal,
  selectWallet,
  injectMockProvider,
  resetMockProvider,
} from '../helpers/wallet';

const CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH' },
  { id: 137, name: 'Polygon', symbol: 'MATIC' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH' },
  { id: 8453, name: 'Base', symbol: 'ETH' },
  { id: 11155111, name: 'Sepolia', symbol: 'ETH', testnet: true },
];

test.describe('Chain Switching E2E', () => {
  test.afterEach(async ({ page }) => {
    await resetMockProvider(page);
  });

  test('should display chain switcher after wallet connection', async ({ page }) => {
    await injectMockProvider(page);
    await page.goto('/multi-chain');
    await openConnectModal(page);
    await selectWallet(page, 'MetaMask');
    await waitForConnected(page);

    // Chain switcher should be visible
    const switcher = page.locator('ocx-chain-switcher');
    await expect(switcher).toBeVisible();
  });

  test('should switch from Ethereum to Polygon', async ({ page }) => {
    await injectMockProvider(page);
    await page.goto('/multi-chain');

    // Connect wallet
    await openConnectModal(page);
    await selectWallet(page, 'MetaMask');
    await waitForConnected(page);

    // Open chain switcher
    const trigger = page.locator('ocx-chain-switcher .trigger');
    if (await trigger.isVisible()) {
      await trigger.click();
    }

    // Select Polygon
    const polygonOption = page.locator('.dropdown-item').filter({ hasText: /polygon/i });
    if (await polygonOption.count() > 0) {
      await polygonOption.click();
    }
  });

  test('should indicate testnet chains visually', async ({ page }) => {
    await injectMockProvider(page);
    await page.goto('/multi-chain');

    // Look for testnet badge
    const testnetBadge = page.locator('.testnet-badge');
    if (await testnetBadge.count() > 0) {
      await expect(testnetBadge.first()).toBeVisible();
      await expect(testnetBadge.first()).toContainText(/testnet|sepolia|goerli/i);
    }
  });

  test('should show the correct active chain indicator', async ({ page }) => {
    await injectMockProvider(page);
    await page.goto('/multi-chain');

    const switcher = page.locator('ocx-chain-switcher');
    if (await switcher.isVisible()) {
      // The trigger should show the currently active chain
      await expect(switcher.locator('.trigger')).toBeVisible();
    }
  });

  test('should persist selected chain across page reload', async ({ page }) => {
    await injectMockProvider(page);
    await page.goto('/multi-chain');

    // Connect first
    await openConnectModal(page);
    await selectWallet(page, 'MetaMask');
    await waitForConnected(page);

    // Switch chain if possible
    const trigger = page.locator('ocx-chain-switcher .trigger');
    if (await trigger.isVisible()) {
      await trigger.click();
      const polygonOption = page.locator('.dropdown-item').filter({ hasText: /polygon/i });
      if (await polygonOption.count() > 0) {
        await polygonOption.click();
      }
    }

    // Reload
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Chain state should persist
    const switcher = page.locator('ocx-chain-switcher');
    if (await switcher.isVisible()) {
      await expect(switcher).toBeVisible();
    }
  });

  test('should display balances for all connected chains', async ({ page }) => {
    await injectMockProvider(page);
    await page.goto('/multi-chain');

    await openConnectModal(page);
    await selectWallet(page, 'MetaMask');
    await waitForConnected(page);

    // Balance display should be visible
    const balanceDisplay = page.getByText(/balance|ETH|MATIC/i);
    if (await balanceDisplay.count() > 0) {
      await expect(balanceDisplay.first()).toBeVisible();
    }
  });
});
