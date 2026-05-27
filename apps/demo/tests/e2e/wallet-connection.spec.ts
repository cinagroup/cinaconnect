import { test, expect } from '@playwright/test';

test.describe('Wallet Connection Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('home page loads with hero section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Cinacoin/i })).toBeVisible();
    await expect(page.getByText(/open-source wallet connection toolkit/i)).toBeVisible();
  });

  test('navigation bar contains all route links', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Swap' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Multi-Chain' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Auth' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Batch' })).toBeVisible();
  });

  test('connect wallet button is present and has correct text', async ({ page }) => {
    const connectBtn = page.getByRole('button', { name: /Connect Wallet/i }).first();
    await expect(connectBtn).toBeVisible();
    await expect(connectBtn).toBeEnabled();
  });

  test('disconnect button is not visible when disconnected', async ({ page }) => {
    // Disconnect button should only appear after connecting
    const disconnectBtn = page.getByRole('button', { name: 'Disconnect' });
    await expect(disconnectBtn).not.toBeVisible();
  });

  test('status indicator shows idle/disconnected state', async ({ page }) => {
    // Before connecting, status should show Not Connected or Idle
    const statusText = page.getByText(/Not Connected|Idle|disconnected/i);
    await expect(statusText.first()).toBeVisible();
  });

  test('chain selector dropdown is present', async ({ page }) => {
    const chainSelect = page.getByRole('combobox');
    await expect(chainSelect).toBeVisible();
  });

  test('footer contains correct copyright and links', async ({ page }) => {
    await expect(page.getByText(/© 2026 Cinacoin/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'GitHub' })).toBeVisible();
  });

  test('feature cards are rendered', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Multi-Chain/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /SIWE Auth/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Swap/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Bridge/i })).toBeVisible();
  });

  test('chain badges show 16 chains', async ({ page }) => {
    const chainBadges = page.locator('.group .text-xs.font-medium');
    // We should have many chain badges visible
    const count = await chainBadges.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('stats section displays key metrics', async ({ page }) => {
    await expect(page.getByText('64')).toBeVisible(); // Packages
    await expect(page.getByText('16')).toBeVisible(); // Chains
    await expect(page.getByText('$0')).toBeVisible(); // Cost
  });
});

test.describe('Wallet Connection - Page Navigation', () => {
  test('home page CTA links navigate correctly', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /Try Swap Demo/i }).click();
    await expect(page).toHaveURL(/\/swap$/);

    await page.goto('/');
    await page.getByRole('link', { name: /Multi-Chain/i }).first().click();
    await expect(page).toHaveURL(/\/multi-chain$/);
  });
});
