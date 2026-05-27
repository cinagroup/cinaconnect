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
  '@cinacoin/evm': { package: '@cinacoin/core-sdk', description: 'EVM chain adapter' },
  '@cinacoin/solana': { package: '@cinacoin/core-sdk', description: 'Solana chain adapter' },
  '@cinacoin/bitcoin': { package: '@cinacoin/core-sdk', description: 'Bitcoin chain adapter' },
  // UI frameworks
  '@cinacoin/react': { package: '@cinacoin/react', description: 'React UI components' },
  '@cinacoin/vue': { package: '@cinacoin/vue', description: 'Vue UI components' },
  '@cinacoin/react-native': { package: '@cinacoin/react-native', description: 'React Native components' },
  // Features
  '@cinacoin/swap-sdk': { package: '@cinacoin/swap-sdk', description: 'DEX swap aggregator' },
  '@cinacoin/siwe': { package: '@cinacoin/siwe', description: 'Sign-In With Ethereum' },
  '@cinacoin/onramp-sdk': { package: '@cinacoin/onramp-sdk', description: 'Fiat on-ramp aggregator' },
  '@cinacoin/walletconnect-v2': { package: '@cinacoin/walletconnect-v2', description: 'WalletConnect v2 integration' },
  '@cinacoin/session-keys': { package: '@cinacoin/session-keys', description: 'ERC-4337 session keys' },
  '@cinacoin/social-login': { package: '@cinacoin/social-login', description: 'Social login providers' },
};

/** List all available addons. */
export function listCommand(cli: Command): void {
  cli
    .command('list')
    .alias('ls')
    .description('List all available Cinacoin addons')
    .action(() => {
      console.log('\n  Available Cinacoin addons:\n');
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
    .description('Add an Cinacoin adapter, plugin, or component')
    .argument('<addon>', 'Addon to add (e.g., @cinacoin/react)')
    .option('--dev', 'Add as dev dependency')
    .action(async (addon: string, opts: { dev?: boolean }) => {
      const info = ADDONS[addon];

      if (!info) {
        warn(`Unknown addon '${addon}'. Run 'cinacoin list' to see available addons.`);
        process.exit(1);
      }

      const s = spinner(`Adding ${addon}...`);

      try {
        // Check if package.json exists
        const pkgPath = join(process.cwd(), 'package.json');
        if (!existsSync(pkgPath)) {
          s.fail('No package.json found. Run "cinacoin init" first.');
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
