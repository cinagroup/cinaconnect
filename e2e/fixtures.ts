import { test as base, expect, type Page } from '@playwright/test';

// ============================================================
// Shared fixtures for Cinacoin E2E tests
// ============================================================

/**
 * Extended test fixtures with Cinacoin-specific helpers.
 */
export const test = base.extend<{
  /** The page navigated to the demo app. */
  demoPage: Page;
  /** Mock a WalletConnect pairing URI. */
  mockWalletConnectUri: () => Promise<string>;
  /** Connect a mock wallet via the UI. */
  connectMockWallet: (walletName?: string) => Promise<void>;
}>({
  /**
   * Navigate to the demo app before each test.
   */
  demoPage: async ({ page }, use) => {
    await page.goto('/');
    await use(page);
  },

  /**
   * Generate a mock WalletConnect URI (used by tests that simulate WC pairing).
   */
  mockWalletConnectUri: async ({ page }, use) => {
    await use(async () => {
      const uri = `wc:a1b2c3d4@2?relay-protocol=irn&symKey=test-sym-key-${Date.now()}`;
      await page.evaluate((u) => {
        window.__MOCK_WC_URI = u;
      }, uri);
      return uri;
    });
  },

  /**
   * Connect a mock wallet through the connect button UI.
   */
  connectMockWallet: async ({ page }, use) => {
    await use(async (walletName = 'MetaMask') => {
      // Click the connect button
      await page.getByRole('button', { name: /connect/i }).click();

      // Wait for the modal to appear
      await expect(page.getByText(/connect wallet/i)).toBeVisible();

      // Select the wallet
      await page.getByText(walletName, { exact: false }).first().click();

      // Wait for connection state change
      await expect(page.getByRole('button', { name: /disconnect/i })).toBeVisible({
        timeout: 10_000,
      });
    });
  },
});

export { expect };
