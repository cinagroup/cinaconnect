import { test, expect } from '@playwright/test';

test.describe('Swap Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/swap');
  });

  test('swap page loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Token Swap/i })).toBeVisible();
  });

  test('connect wallet button visible when disconnected', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Connect Wallet' })).toBeVisible();
  });

  test('FROM and TO labels present', async ({ page }) => {
    await expect(page.getByText('From').first()).toBeVisible();
    await expect(page.getByText('To').first()).toBeVisible();
  });

  test('amount input field present', async ({ page }) => {
    await expect(page.getByPlaceholder('0.0')).toBeVisible();
  });

  test('swap direction button exists', async ({ page }) => {
    await expect(page.locator('button[title="Swap tokens"]')).toBeVisible();
  });

  test('slippage tolerance options displayed', async ({ page }) => {
    await expect(page.getByText('Slippage').first()).toBeVisible();
    await expect(page.getByText('0.1%')).toBeVisible();
    await expect(page.getByText('0.5%')).toBeVisible();
    await expect(page.getByText('1.0%')).toBeVisible();
  });

  test('recent swaps table renders with swap records', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Recent Swaps' })).toBeVisible();
    await expect(page.getByText('0x1a2b')).toBeVisible();
    await expect(page.getByText('0x3c4d')).toBeVisible();
    await expect(page.getByText('0x5e6f')).toBeVisible();
  });

  test('swap statuses include completed, pending, failed', async ({ page }) => {
    await expect(page.getByText('completed').first()).toBeVisible();
    await expect(page.getByText('pending').first()).toBeVisible();
    await expect(page.getByText('failed').first()).toBeVisible();
  });

  test('swap details hidden when no amount entered', async ({ page }) => {
    await expect(page.locator('text=Rate').first()).not.toBeVisible();
    await expect(page.locator('text=Price Impact').first()).not.toBeVisible();
  });

  test('MAX button available', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'MAX' })).toBeVisible();
  });

  test('DEX aggregator notice displayed', async ({ page }) => {
    await expect(page.locator('text=Swap requires DEX aggregator API key').first()).toBeVisible();
  });

  test('Cinacoin Swap SDK branding present', async ({ page }) => {
    await expect(page.locator('text=Powered by').first()).toBeVisible();
    await expect(page.locator('text=Cinacoin Swap SDK').first()).toBeVisible();
  });
});
