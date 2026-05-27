import type { Command } from 'commander';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spinner, warn } from '../utils/logger.js';

// ============================================================
// ocx build — Build Cinacoin SDK packages
// ============================================================

export function buildCommand(cli: Command): void {
  cli
    .command('build')
    .description('Build Cinacoin SDK packages')
    .option('--scope <package>', 'Build a specific package only')
    .option('--force', 'Force rebuild (clean dist first)')
    .option('--turbo', 'Use turbo for parallel builds (default)', true)
    .action(async (opts: { scope?: string; force?: boolean; turbo?: boolean }) => {
      const rootDir = findWorkspaceRoot();
      if (!rootDir) {
        warn('Not in an Cinacoin workspace. Run this from the monorepo root.');
        process.exit(1);
      }

      if (opts.force) {
        const s = spinner('Cleaning dist directories...');
        try {
          execSync('npx turbo run clean', { cwd: rootDir, stdio: 'pipe' });
          s.succeed('Dist directories cleaned');
        } catch {
          s.warn('Clean failed, continuing with build...');
        }
      }

      const s = spinner('Building packages...');
      try {
        if (opts.scope) {
          execSync(`npx turbo run build --filter=${opts.scope}`, {
            cwd: rootDir,
            stdio: 'pipe',
          });
          s.succeed(`Built ${opts.scope}`);
        } else {
          execSync('npx turbo run build', {
            cwd: rootDir,
            stdio: 'pipe',
          });
          s.succeed('All packages built');
        }
      } catch (err) {
        s.fail(`Build failed: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}

/**
 * Find the workspace root by looking for pnpm-workspace.yaml.
 */
function findWorkspaceRoot(): string | null {
  let dir = process.cwd();
  while (dir !== '/') {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = join(dir, '..');
  }
  return null;
}
