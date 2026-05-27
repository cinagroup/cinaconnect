#!/usr/bin/env node
/**
 * @cinacoin/cli
 *
 * Command-line interface for Cinacoin SDK.
 *
 * Commands:
 *   ocx init    — Scaffold a new Cinacoin project
 *   ocx add     — Add adapters, plugins, or UI components
 *   ocx build   — Build the SDK packages
 *   ocx test    — Run unit + E2E tests
 *
 * Usage:
 *   npx @cinacoin/cli init my-app
 *   npx @cinacoin/cli add @cinacoin/swap-sdk
 *   npx @cinacoin/cli build
 *   npx @cinacoin/cli test --e2e
 */
import { program } from 'commander';
import { initCommand } from './commands/init.js';
import { addCommand } from './commands/add.js';
import { buildCommand } from './commands/build.js';
import { testCommand } from './commands/test.js';
import { VERSION } from './utils/fs.js';
program
    .name('cinacoin')
    .description('Cinacoin SDK CLI — self-hosted wallet connection toolkit')
    .version(VERSION, '-v, --version');
// Register subcommands
initCommand(program);
addCommand(program);
buildCommand(program);
testCommand(program);
// Handle unknown commands
program.on('command:*', (operands) => {
    const [cmd] = operands;
    console.error(`\n  error: unknown command '${cmd}'\n`);
    program.outputHelp();
    process.exit(1);
});
program.parse(process.argv);
//# sourceMappingURL=index.js.map