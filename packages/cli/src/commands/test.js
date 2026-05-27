import { execSync } from 'node:child_process';
import { spinner } from '../utils/logger.js';
// ============================================================
// ocx test — Run unit and E2E tests
// ============================================================
export function testCommand(cli) {
    cli
        .command('test')
        .description('Run Cinacoin tests')
        .option('--unit', 'Run unit tests only (vitest)')
        .option('--e2e', 'Run E2E tests only (playwright)')
        .option('--coverage', 'Generate coverage report')
        .option('--watch', 'Run in watch mode (unit tests only)')
        .option('--project <name>', 'Playwright project to test (chromium, firefox, webkit)')
        .option('--ui', 'Run Playwright in UI mode')
        .action(async (opts) => {
        // Default to all tests if no flag specified
        const runUnit = !opts.e2e; // run unit unless only e2e requested
        const runE2e = !opts.unit; // run e2e unless only unit requested
        if (runUnit) {
            const s = spinner('Running unit tests...');
            try {
                let cmd = 'npx vitest run';
                if (opts.watch) {
                    cmd = 'npx vitest';
                }
                if (opts.coverage) {
                    cmd += ' --coverage';
                }
                execSync(cmd, { stdio: 'inherit' });
                s.succeed('Unit tests passed');
            }
            catch (err) {
                s.fail(`Unit tests failed`);
                if (!opts.unit) {
                    process.exit(1);
                }
            }
        }
        if (runE2e) {
            const s = spinner('Running E2E tests...');
            try {
                let cmd = 'npx playwright test';
                if (opts.project) {
                    cmd += ` --project=${opts.project}`;
                }
                if (opts.ui) {
                    cmd += ' --ui';
                }
                if (opts.coverage) {
                    cmd += ' --reporter=html';
                }
                execSync(cmd, { stdio: 'inherit' });
                s.succeed('E2E tests passed');
            }
            catch (err) {
                s.fail(`E2E tests failed`);
                process.exit(1);
            }
        }
    });
}
//# sourceMappingURL=test.js.map