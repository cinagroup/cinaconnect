#!/usr/bin/env node

/**
 * CLI entry point for @cinacoin/codemod
 *
 * Usage:
 *   npx cinacoin-codemod --src-dir ./src --transform appkit-to-cinacoin
 *   npx cinacoin-codemod --src-dir ./src --transform appkit-to-cinacoin --dry-run
 *   npx cinacoin-codemod --list
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { readFileSync, writeFileSync } from "fs";
import { join, relative } from "path";
import { sync as globSync } from "glob";
import { TRANSFORMS, listTransforms } from "./index.js";

interface CliOptions {
  srcDir: string;
  transform: string[];
  dryRun: boolean;
  verbose: boolean;
  list: boolean;
  pattern: string;
}

function main(): void {
  const argv = yargs(hideBin(process.argv))
    .option("src-dir", {
      type: "string",
      default: "src",
      describe: "Source directory to process",
    })
    .option("transform", {
      type: "array",
      default: [],
      describe: "Transform(s) to apply (e.g. appkit-to-cinacoin, wc-v1-to-v2)",
    })
    .option("dry-run", {
      type: "boolean",
      default: false,
      describe: "Show changes without writing files",
    })
    .option("verbose", {
      type: "boolean",
      default: false,
      describe: "Show detailed output",
    })
    .option("list", {
      type: "boolean",
      default: false,
      describe: "List available transforms and exit",
    })
    .option("pattern", {
      type: "string",
      default: "**/*.{ts,tsx,js,jsx}",
      describe: "Glob pattern for files to process",
    })
    .help()
    .alias("h", "help")
    .alias("v", "verbose")
    .strict()
    .parseSync() as unknown as CliOptions;

  // --list
  if (argv.list) {
    console.log("Available transforms:\n");
    for (const name of listTransforms()) {
      console.log(`  - ${name}`);
    }
    console.log();
    return;
  }

  // Validate transforms
  const available = listTransforms();
  if (argv.transform.length === 0) {
    console.error("Error: At least one --transform is required. Use --list to see available transforms.");
    process.exit(1);
  }

  for (const t of argv.transform) {
    if (!available.includes(t)) {
      console.error(`Error: Unknown transform "${t}". Available: ${available.join(", ")}`);
      process.exit(1);
    }
  }

  // Discover files
  const srcDir = join(process.cwd(), argv.srcDir);
  const pattern = join(srcDir, argv.pattern);
  const files = globSync(pattern, { nodir: true });

  if (files.length === 0) {
    console.log(`No files matching "${pattern}" found in ${srcDir}`);
    return;
  }

  console.log(`Found ${files.length} file(s) in ${srcDir}\n`);

  let totalChanges = 0;
  let modifiedFiles = 0;

  for (const filePath of files) {
    let source: string;
    try {
      source = readFileSync(filePath, "utf-8");
    } catch {
      console.warn(`⚠ Skipping unreadable: ${filePath}`);
      continue;
    }

    let current = source;
    const allChanges: string[] = [];

    for (const t of argv.transform) {
      const fn = TRANSFORMS[t];
      const result = fn(current);
      if (result.transformed) {
        current = result.output;
        allChanges.push(...result.changes.map((c) => `[${t}] ${c}`));
      }
    }

    if (allChanges.length > 0) {
      modifiedFiles++;
      totalChanges += allChanges.length;

      const relPath = relative(process.cwd(), filePath);

      if (argv.dryRun) {
        console.log(`🔍 ${relPath} (${allChanges.length} change(s))`);
      } else {
        writeFileSync(filePath, current, "utf-8");
        console.log(`✅ ${relPath} (${allChanges.length} change(s))`);
      }

      if (argv.verbose) {
        for (const change of allChanges) {
          console.log(`   ${change}`);
        }
        console.log();
      }
    } else {
      if (argv.verbose) {
        console.log(`   ${relative(process.cwd(), filePath)} — no changes`);
      }
    }
  }

  // Summary
  console.log();
  if (argv.dryRun) {
    console.log(`📋 Dry run complete: ${totalChanges} change(s) in ${modifiedFiles} file(s)`);
  } else {
    console.log(`✅ Done: ${totalChanges} change(s) in ${modifiedFiles} file(s)`);
  }
}

main();
