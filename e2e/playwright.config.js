import { defineConfig, devices } from '@playwright/test';
/**
 * Playwright E2E configuration for Cinacoin.
 *
 * Usage:
 *   npx playwright test              — run all tests
 *   npx playwright test --ui         — UI mode
 *   npx playwright test --headed     — headed browser
 *   npx playwright test --project=chromium  — chromium only
 */
export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [['html', { outputFolder: 'playwright-report' }]],
    use: {
        baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
        // Mobile
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] },
        },
    ],
    webServer: process.env.CI
        ? undefined
        : {
            command: 'cd apps/demo && npx next dev --port 3000',
            url: 'http://localhost:3000',
            reuseExistingServer: true,
        },
});
//# sourceMappingURL=playwright.config.js.map