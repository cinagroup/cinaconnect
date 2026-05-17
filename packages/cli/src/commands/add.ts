import type { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { spinner, warn } from '../utils/logger.js';

// ============================================================
// ocx add — Add adapters, plugins, or UI components to a project
// ============================================================

/** Registry of available add-on packages. */
const ADDONS: Record<string, { package: string; description: string; setup?: string }> = {
  // Core adapters
  '@onchainux/evm': { package: '@onchainux/core-sdk', description: 'EVM chain adapter' },
  '@onchainux/solana': { package: '@onchainux/core-sdk', description: 'Solana chain adapter' },
  '@onchainux/bitcoin': { package: '@onchainux/core-sdk', description: 'Bitcoin chain adapter' },
  // UI frameworks
  '@onchainux/react': { package: '@onchainux/react', description: 'React UI components' },
  '@onchainux/vue': { package: '@onchainux/vue', description: 'Vue UI components' },
  '@onchainux/react-native': { package: '@onchainux/react-native', description: 'React Native components' },
  // Features
  '@onchainux/swap-sdk': { package: '@onchainux/swap-sdk', description: 'DEX swap aggregator' },
  '@onchainux/siwe': { package: '@onchainux/siwe', description: 'Sign-In With Ethereum' },
  '@onchainux/onramp-sdk': { package: '@onchainux/onramp-sdk', description: 'Fiat on-ramp aggregator' },
  '@onchainux/walletconnect-v2': { package: '@onchainux/walletconnect-v2', description: 'WalletConnect v2 integration' },
  '@onchainux/session-keys': { package: '@onchainux/session-keys', description: 'ERC-4337 session keys' },
  '@onchainux/social-login': { package: '@onchainux/social-login', description: 'Social login providers' },
};

/** List all available addons. */
export function listCommand(cli: Command): void {
  cli
    .command('list')
    .alias('ls')
    .description('List all available OnChainUX addons')
    .action(() => {
      console.log('\n  Available OnChainUX addons:\n');
      for (const [name, info] of Object.entries(ADDONS)) {
        console.log(`    ${name.padEnd(32)} ${info.description}`);
      }
      console.log();
    });
}

export function addCommand(cli: Command): void {
  // Add 'list' subcommand
  listCommand(cli);

  // Add 'add' command
  cli
    .command('add')
    .description('Add an OnChainUX adapter, plugin, or component')
    .argument('<addon>', 'Addon to add (e.g., @onchainux/react)')
    .option('--dev', 'Add as dev dependency')
    .action(async (addon: string, opts: { dev?: boolean }) => {
      const info = ADDONS[addon];

      if (!info) {
        warn(`Unknown addon '${addon}'. Run 'onchainux list' to see available addons.`);
        process.exit(1);
      }

      const s = spinner(`Adding ${addon}...`);

      try {
        // Check if package.json exists
        const pkgPath = join(process.cwd(), 'package.json');
        if (!existsSync(pkgPath)) {
          s.fail('No package.json found. Run "onchainux init" first.');
          process.exit(1);
        }

        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        const depKey = opts.dev ? 'devDependencies' : 'dependencies';
        if (!pkg[depKey]) pkg[depKey] = {};
        pkg[depKey][info.package] = '^0.1.0';

        writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

        s.succeed(`Added ${addon} to ${depKey}`);

        if (info.setup) {
          console.log(`\n  ${info.setup}\n`);
        } else {
          console.log(`\n  Import and use ${addon} in your project.\n`);
        }
      } catch (err) {
        s.fail(`Failed to add ${addon}: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
