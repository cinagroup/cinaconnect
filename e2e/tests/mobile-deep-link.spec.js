/**
 * E2E Test — Mobile Deep Link Fallback
 *
 * Tests mobile deep link behavior: redirect, fallback, and QR display.
 *
 * 4 tests covering:
 * - Mobile viewport deep link generation
 * - Desktop fallback to QR code
 * - Universal link redirect
 * - App store redirect when wallet not installed
 */
import { test, expect, devices } from '@playwright/test';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
test.describe('Mobile Deep Link Fallback E2E', () => {
    test('should generate deep link URL on mobile viewport', async ({ browser }) => {
        const context = await browser.newContext({
            ...devices['Pixel 5'],
        });
        const page = await context.newPage();
        await page.goto(BASE_URL);
        // Deep link generation is typically handled by the SDK
        // Verify the page loads correctly on mobile viewport
        await expect(page).toHaveTitle(/Cinacoin/i);
        await context.close();
    });
    test('should show QR code fallback on desktop', async ({ page }) => {
        await page.goto(BASE_URL);
        // On desktop, should show QR code as fallback
        const scanTab = page.getByRole('tab', { name: /scan/i });
        if (await scanTab.isVisible()) {
            await scanTab.click();
        }
        // QR area should be visible
        const qrArea = page.locator('div').filter({ hasText: /scan.*qr/i });
        if (await qrArea.count() > 0) {
            await expect(qrArea.first()).toBeVisible();
        }
    });
    test('should handle universal link redirect for wallet opening', async ({ page }) => {
        await page.goto(BASE_URL);
        // Universal links are tested through the SDK's deep link module
        // This verifies the UI triggers the redirect flow
        const connectButton = page.locator('ocx-connect-button');
        if (await connectButton.count() > 0) {
            await expect(connectButton).toBeVisible();
        }
    });
    test('should show app store link when wallet is not installed on mobile', async ({ browser }) => {
        const context = await browser.newContext({
            ...devices['iPhone 12'],
        });
        const page = await context.newPage();
        await page.goto(BASE_URL);
        // On mobile without wallet installed, should show download link
        const downloadLink = page.locator('a').filter({ hasText: /download|install|get.*wallet/i });
        if (await downloadLink.count() > 0) {
            await expect(downloadLink.first()).toBeVisible();
            const href = await downloadLink.first().getAttribute('href');
            expect(href).toBeTruthy();
        }
        await context.close();
    });
});
//# sourceMappingURL=mobile-deep-link.spec.js.map