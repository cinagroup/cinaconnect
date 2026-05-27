/** CLI version (synced with package.json). */
export declare const VERSION = "0.1.0";
/**
 * Check if a directory exists.
 */
export declare function dirExists(path: string): boolean;
/**
 * Read a JSON file and parse it.
 */
export declare function readJson<T = Record<string, unknown>>(path: string): T;
/**
 * Recursively copy a directory.
 */
export declare function copyDir(src: string, dest: string): void;
/**
 * Copy a single template file, creating directories as needed.
 */
export declare function copyTemplate(templatePath: string, destPath: string): void;
/**
 * Find a file by walking up from current directory.
 */
export declare function findUp(filename: string): string | null;
/**
 * Resolve the Cinacoin monorepo root.
 */
export declare function resolveMonorepoRoot(): string | null;
//# sourceMappingURL=fs.d.ts.map