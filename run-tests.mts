#!/usr/bin/env tsx
/**
 * run-tests.mts — TypeScript test runner for CinaConnect packages.
 *
 * Iterates through all packages with a tests/ directory, runs each
 * .test.ts file with tsx, and reports pass/fail counts.
 *
 * Usage: npx tsx run-tests.mts
 */

import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const NC = "\x1b[0m";

const PACKAGES_DIR = "packages";

function getTestPackages(): string[] {
  if (!existsSync(PACKAGES_DIR)) {
    console.error(`Error: ${PACKAGES_DIR} directory not found`);
    process.exit(1);
  }

  const entries = readdirSync(PACKAGES_DIR);
  const packages: string[] = [];

  for (const entry of entries) {
    const pkgPath = join(PACKAGES_DIR, entry);
    const testsPath = join(pkgPath, "tests");
    if (statSync(pkgPath).isDirectory() && existsSync(testsPath)) {
      packages.push(entry);
    }
  }

  return packages.sort();
}

function getTestFiles(testsDir: string): string[] {
  const files = readdirSync(testsDir);
  return files.filter((f) => f.endsWith(".test.ts")).sort();
}

async function main() {
  const packages = getTestPackages();

  console.log("========================================");
  console.log("  CinaConnect Package Test Runner");
  console.log("========================================");
  console.log(`  ${packages.length} packages with tests\n`);

  let totalPass = 0;
  let totalFail = 0;
  let totalFiles = 0;

  for (const pkg of packages) {
    const testsDir = join(PACKAGES_DIR, pkg, "tests");
    const testFiles = getTestFiles(testsDir);

    if (testFiles.length === 0) {
      console.log(`${YELLOW}⊘ ${pkg}: no .test.ts files${NC}`);
      continue;
    }

    totalFiles += testFiles.length;
    console.log(`\n${YELLOW}── ${pkg} (${testFiles.length} test file(s)) ──${NC}`);

    for (const file of testFiles) {
      const filePath = join(testsDir, file);
      const testName = file.replace(".test.ts", "");

      try {
        execSync(`npx tsx ${filePath}`, { stdio: "pipe", timeout: 60000 });
        process.stdout.write(`  ${GREEN}✓ ${testName}${NC}\n`);
        totalPass++;
      } catch (err: any) {
        const output = err.stderr?.toString() || err.stdout?.toString() || "";
        const lastLine = output.trim().split("\n").slice(-3).join("\n    ");
        process.stdout.write(`  ${RED}✗ ${testName}${NC}\n`);
        if (lastLine) {
          console.log(`    ${RED}${lastLine}${NC}`);
        }
        totalFail++;
      }
    }
  }

  console.log("\n========================================");
  console.log(
    `  ${GREEN}Passed: ${totalPass}${NC}  ${RED}Failed: ${totalFail}${NC}  Files: ${totalFiles}`
  );
  console.log("========================================");

  if (totalFail > 0) {
    process.exit(1);
  }
}

main();
