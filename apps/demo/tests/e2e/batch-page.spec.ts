import { test, expect } from '@playwright/test';

test.describe('Batch Page (EIP-5792)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/batch');
  });

  test('batch page loads with correct heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /EIP-5792 Atomic Batch/i })).toBeVisible();
  });

  test('connect wallet button is visible when disconnected', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Connect Wallet' })).toBeVisible();
  });

  test('wallet capabilities section is present', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Wallet Capabilities' })).toBeVisible();
  });

  test('wallet capabilities shows connect prompt when disconnected', async ({ page }) => {
    await expect(page.getByText('Connect a wallet to discover capabilities')).toBeVisible();
  });

  test('capability badges are displayed', async ({ page }) => {
    await expect(page.locator('text="atomicBatch"').first()).toBeVisible();
    await expect(page.locator('text="paymasterService"').first()).toBeVisible();
    await expect(page.locator('text="sessionKeys"').first()).toBeVisible();
    await expect(page.locator('text="permissions"').first()).toBeVisible();
  });

  test('batch transaction builder is present', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Batch Transaction Builder' })).toBeVisible();
  });

  test('batch transaction builder shows first call with input fields', async ({ page }) => {
    await expect(page.getByText('Call #1')).toBeVisible();
    await expect(page.getByText('To (address)')).toBeVisible();
    await expect(page.getByText('Value (hex wei)')).toBeVisible();
    await expect(page.getByText('Data (hex)')).toBeVisible();
  });

  test('input fields for batch call are present', async ({ page }) => {
    const inputs = page.locator('input[placeholder="0x…"]');
    await expect(inputs.first()).toBeVisible();
  });

  test('add call button is available', async ({ page }) => {
    await expect(page.getByRole('button', { name: '+ Add Call' })).toBeVisible();
  });

  test('preview batch button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Preview Batch' })).toBeVisible();
  });

  test('wallet_sendCalls button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'wallet_sendCalls' })).toBeVisible();
  });

  test('execute atomic batch button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Execute Atomic Batch' })).toBeVisible();
  });

  test('buttons are disabled when wallet not connected', async ({ page }) => {
    const previewBtn = page.getByRole('button', { name: 'Preview Batch' });
    const sendCallsBtn = page.getByRole('button', { name: 'wallet_sendCalls' });
    const atomicBtn = page.getByRole('button', { name: 'Execute Atomic Batch' });

    await expect(previewBtn).toBeDisabled();
    await expect(sendCallsBtn).toBeDisabled();
    await expect(atomicBtn).toBeDisabled();
  });

  test('EIP-5792 info notice is displayed', async ({ page }) => {
    await expect(page.getByText('EIP-5792 Wallet Call API')).toBeVisible();
    await expect(page.getByText('wallet_sendCalls').nth(1)).toBeVisible();
  });

  test('remove button hidden when only one call', async ({ page }) => {
    // With only one call, there should be no Remove buttons
    await expect(page.getByRole('button', { name: 'Remove' })).not.toBeVisible();
  });
});
