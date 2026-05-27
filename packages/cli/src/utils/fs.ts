import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ============================================================
// File utilities for @cinacoin/cli
// ============================================================

/** CLI version (synced with package.json). */
export const VERSION = '0.1.0';

/**
 * Check if a directory exists.
 */
export function dirExists(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

/**
 * Read a JSON file and parse it.
 */
export function readJson<T = Record<string, unknown>>(path: string): T {
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Recursively copy a directory.
 */
export function copyDir(src: string, dest: string): void {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Copy a single template file, creating directories as needed.
 */
export function copyTemplate(templatePath: string, destPath: string): void {
  const destDir = resolve(destPath, '..');
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  copyFileSync(templatePath, destPath);
}

/**
 * Find a file by walking up from current directory.
 */
export function findUp(filename: string): string | null {
  let dir = process.cwd();
  while (dir !== '/') {
    const path = join(dir, filename);
    if (existsSync(path)) {
      return path;
    }
    dir = join(dir, '..');
  }
  return null;
}

/**
 * Resolve the Cinacoin monorepo root.
 */
export function resolveMonorepoRoot(): string | null {
  return findUp('pnpm-workspace.yaml');
}
