/**
 * Bundle Analyzer Utilities
 *
 * Functions for analyzing bundle sizes, dependency trees, and
 * generating reports. Works in both Node.js and browser environments.
 *
 * Usage:
 *   import { analyzeBundle, generateSizeReport } from '@cinacoin/performance-utils/bundle-analyzer';
 */

export interface FileInfo {
  path: string;
  size: number;
  gzipSize?: number;
  brotliSize?: number;
}

export interface BundleReport {
  files: FileInfo[];
  totalSize: number;
  totalGzipSize?: number;
  totalBrotliSize?: number;
  fileCount: number;
  largestFiles: FileInfo[];
  topDependencies: { name: string; size: number }[];
}

/**
 * Estimate gzip size from raw bytes.
 * Uses a heuristic ratio (~0.3-0.4 for typical JS bundles).
 */
function estimateGzipSize(rawSize: number): number {
  // Typical JS bundle gzips to ~30-40% of original size
  const ratio = rawSize > 100_000 ? 0.32 : rawSize > 10_000 ? 0.35 : 0.4;
  return Math.round(rawSize * ratio);
}

/**
 * Estimate brotli size from raw bytes.
 * Brotli typically achieves 10-20% better compression than gzip.
 */
function estimateBrotliSize(rawSize: number): number {
  const gzipEstimate = estimateGzipSize(rawSize);
  return Math.round(gzipEstimate * 0.85);
}

/**
 * Analyze a set of files and generate a bundle report.
 */
export function analyzeBundle(files: FileInfo[], options?: { topN?: number }): BundleReport {
  const topN = options?.topN ?? 10;

  const sorted = [...files].sort((a, b) => b.size - a.size);
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const totalGzipSize = files.reduce(
    (sum, f) => sum + (f.gzipSize ?? estimateGzipSize(f.size)),
    0
  );

  const totalBrotliSize = files.reduce(
    (sum, f) => sum + (f.brotliSize ?? estimateBrotliSize(f.size)),
    0
  );

  return {
    files: sorted,
    totalSize,
    totalGzipSize,
    totalBrotliSize,
    fileCount: files.length,
    largestFiles: sorted.slice(0, topN),
    topDependencies: [],
  };
}

/**
 * Generate a human-readable size report.
 */
export function generateSizeReport(report: BundleReport): string {
  const lines: string[] = [];
  lines.push('📦 Bundle Size Report');
  lines.push('═'.repeat(50));
  lines.push(`Files: ${report.fileCount}`);
  lines.push(`Total: ${formatBytes(report.totalSize)}`);
  lines.push(`Gzip (est): ${formatBytes(report.totalGzipSize ?? 0)}`);
  lines.push(`Brotli (est): ${formatBytes(report.totalBrotliSize ?? 0)}`);
  lines.push('');
  lines.push('Top files by size:');

  for (let i = 0; i < Math.min(report.largestFiles.length, 10); i++) {
    const f = report.largestFiles[i];
    const pct = ((f.size / report.totalSize) * 100).toFixed(1);
    lines.push(
      `  ${String(i + 1).padStart(2)}. ${formatBytes(f.size).padStart(10)} (${pct}%)  ${f.path}`
    );
  }

  return lines.join('\n');
}

/**
 * Check if bundle size exceeds a budget threshold.
 */
export function checkBudget(
  report: BundleReport,
  budgetBytes: number,
  useGzip: boolean = true
): { pass: boolean; used: number; budget: number; overBy: number } {
  const used = useGzip ? (report.totalGzipSize ?? report.totalSize) : report.totalSize;
  return {
    pass: used <= budgetBytes,
    used,
    budget: budgetBytes,
    overBy: Math.max(0, used - budgetBytes),
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
