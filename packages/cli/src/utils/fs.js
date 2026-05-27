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
export function dirExists(path) {
    return existsSync(path) && statSync(path).isDirectory();
}
/**
 * Read a JSON file and parse it.
 */
export function readJson(path) {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
}
/**
 * Recursively copy a directory.
 */
export function copyDir(src, dest) {
    if (!existsSync(dest)) {
        mkdirSync(dest, { recursive: true });
    }
    const entries = readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        }
        else {
            copyFileSync(srcPath, destPath);
        }
    }
}
/**
 * Copy a single template file, creating directories as needed.
 */
export function copyTemplate(templatePath, destPath) {
    const destDir = resolve(destPath, '..');
    if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
    }
    copyFileSync(templatePath, destPath);
}
/**
 * Find a file by walking up from current directory.
 */
export function findUp(filename) {
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
export function resolveMonorepoRoot() {
    return findUp('pnpm-workspace.yaml');
}
//# sourceMappingURL=fs.js.map