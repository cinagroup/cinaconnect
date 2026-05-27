import { test, expect } from '@playwright/test';

test.describe('Multi-Chain Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/multi-chain');
  });

  test('multi-chain page loads with correct heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Multi-Chain Connectivity/i })).toBeVisible();
  });

  test('connect wallet button is visible when disconnected', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Connect Wallet' })).toBeVisible();
  });

  test('stats bar displays key metrics', async ({ page }) => {
    await expect(page.getByText('Chains Supported')).toBeVisible();
    await expect(page.getByText('Wallet Integrations')).toBeVisible();
    await expect(page.getByText('Cross-Chain Txns')).toBeVisible();
    await expect(page.getByText('Total TVL')).toBeVisible();
  });

  test('network status overview is present', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Network Status' })).toBeVisible();
  });

  test('chain cards for major chains are visible', async ({ page }) => {
    // Check key chain cards exist
    await expect(page.getByRole('heading', { name: 'Ethereum' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Polygon' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Arbitrum' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Optimism' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'BNB Chain' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Solana' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bitcoin' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'TON' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'TRON' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cosmos' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sui' })).toBeVisible();
  });

  test('chain cards show wallet support information', async ({ page }) => {
    await expect(page.getByText('Wallets').first()).toBeVisible();
    await expect(page.locator('text="MetaMask"').first()).toBeVisible();
    await expect(page.locator('text="WalletConnect"').first()).toBeVisible();
  });

  test('chain cards show status indicators', async ({ page }) => {
    await expect(page.locator('text="Operational"').first()).toBeVisible();
  });

  test('cross-chain flow section is present', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Cross-Chain Flow' })).toBeVisible();
    await expect(page.locator('text="Initiate"').first()).toBeVisible();
    await expect(page.locator('text="Lock"').first()).toBeVisible();
    await expect(page.locator('text="Relay"').first()).toBeVisible();
    await expect(page.locator('text="Complete"').first()).toBeVisible();
  });

  test('cross-chain flow shows Ethereum to Solana bridge', async ({ page }) => {
    await expect(page.getByText('Ethereum').first()).toBeVisible();
    await expect(page.getByText('Solana').first()).toBeVisible();
    await expect(page.locator('text="Bridge"').first()).toBeVisible();
  });

  test('unified API code example is present', async ({ page }) => {
    await expect(page.locator('text="unified-api.ts"').first()).toBeVisible();
    await expect(page.locator('text="import { Cinacoin }"').first()).toBeVisible();
    await expect(page.locator('text="Copy"').first()).toBeVisible();
  });

  test('chain cards have connect buttons', async ({ page }) => {
    const chainConnectBtns = page.getByRole('button', { name: /Connect/ });
    await expect(chainConnectBtns.first()).toBeVisible();
  });

  test('chain cards show TVL information', async ({ page }) => {
    await expect(page.locator('text="$32.1B"').first()).toBeVisible(); // Ethereum TVL
    await expect(page.locator('text="$142B"').first()).toBeVisible(); // Bitcoin TVL
    await expect(page.locator('text="$8.9B"').first()).toBeVisible(); // Solana TVL
  });

  test('chain cards show latency', async ({ page }) => {
    await expect(page.locator('text="12ms"').first()).toBeVisible(); // Ethereum latency
    await expect(page.locator('text="1ms"').first()).toBeVisible(); // Arbitrum/Solana latency
  });
});
