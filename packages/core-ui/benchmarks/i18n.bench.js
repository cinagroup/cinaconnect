/**
 * Benchmark — i18n Translation Lookup Performance
 *
 * Measures translation lookup performance for the Cinacoin i18n system.
 *
 * 3 scenarios:
 * - Single translation lookup
 * - Batch translation lookup (50 keys)
 * - Language switch re-lookup
 */
import { describe, it, expect } from 'vitest';
import { t, setLocale, getAvailableLocales } from '../src/i18n/index.js';
async function measure(fn) {
    const start = performance.now();
    fn();
    return performance.now() - start;
}
async function measureAsync(fn) {
    const start = performance.now();
    await fn();
    return performance.now() - start;
}
describe('i18n Benchmarks', () => {
    it('should lookup a single translation within 1ms', async () => {
        const duration = await measure(() => {
            const result = t('connect_wallet');
            expect(result).toBeTruthy();
        });
        expect(duration).toBeLessThan(1);
    });
    it('should lookup 50 translations within 5ms', async () => {
        const keys = [
            'connect_wallet', 'connecting', 'disconnect', 'copy_address',
            'view_explorer', 'switch_network', 'select_network', 'account',
            'wallet', 'social', 'email', 'scan', 'or', 'recommended',
            'installed', 'testnet', 'close', 'wrong_network', 'error',
            'connect_your_wallet', 'scan_with_wallet', 'login_with_email',
            'social_login', 'scan_qr', 'continue_with_google', 'continue_with_apple',
            'continue_with_x', 'continue_with_email', 'enter_email',
            'powered_by', 'switch_account', 'connected_apps', 'copy',
            'copied', 'balance', 'network', 'address', 'transaction',
            'pending', 'confirmed', 'failed', 'retry', 'cancel',
            'approve', 'confirm', 'success', 'loading', 'save',
            'settings', 'help',
        ];
        const duration = await measure(() => {
            for (const key of keys) {
                const result = t(key);
                expect(typeof result).toBe('string');
            }
        });
        expect(duration).toBeLessThan(5);
    });
    it('should handle language switch and re-lookup within 10ms', async () => {
        // Get current locale
        const available = getAvailableLocales();
        if (available.length < 2) {
            // Skip if only one locale available
            expect(available.length).toBeGreaterThanOrEqual(1);
            return;
        }
        const en = available.find(l => l !== 'en') || available[1];
        const duration = await measureAsync(async () => {
            // Switch to different locale
            await setLocale(en);
            // Lookup translations in new locale
            const r1 = t('connect_wallet');
            const r2 = t('disconnect');
            const r3 = t('copy_address');
            expect(r1).toBeTruthy();
            expect(r2).toBeTruthy();
            expect(r3).toBeTruthy();
        });
        expect(duration).toBeLessThan(10);
    });
});
//# sourceMappingURL=i18n.bench.js.map