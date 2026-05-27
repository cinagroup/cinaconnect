import type { Command } from 'commander';
import { join } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spinner } from '../utils/logger.js';
import { copyTemplate } from '../utils/fs.js';

// ============================================================
// ocx init — Scaffold a new Cinacoin project
// ============================================================

export function initCommand(cli: Command): void {
  cli
    .command('init')
    .description('Initialize a new Cinacoin project')
    .argument('[directory]', 'Project directory name', 'my-cinacoin-app')
    .option('--template <name>', 'Template to use (web | react | vue | next)', 'web')
    .option('--package-manager <pm>', 'Package manager (npm | yarn | pnpm)', 'pnpm')
    .option('--dry-run', 'Show what would be created without writing files')
    .action(async (directory: string, opts: { template: string; packageManager: string; dryRun?: boolean }) => {
      const { template, packageManager, dryRun } = opts;
      const targetDir = join(process.cwd(), directory);

      if (dryRun) {
        console.log(`\n  [dry-run] Would create Cinacoin project in ${targetDir}`);
        console.log(`  Template:   ${template}`);
        console.log(`  Package mgr: ${packageManager}\n`);
        return;
      }

      if (existsSync(targetDir)) {
        console.error(`\n  error: directory '${directory}' already exists\n`);
        process.exit(1);
      }

      const s = spinner('Scaffolding Cinacoin project...');

      try {
        // Create directory structure
        mkdirSync(join(targetDir, 'src'), { recursive: true });
        mkdirSync(join(targetDir, 'public'), { recursive: true });

        // Generate package.json
        const pkg = generatePackageJson(directory, packageManager);
        writeFileSync(join(targetDir, 'package.json'), JSON.stringify(pkg, null, 2));

        // Generate tsconfig.json
        const tsconfig = generateTsConfig();
        writeFileSync(join(targetDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));

        // Generate main entry file
        const mainContent = generateMainFile(template);
        writeFileSync(join(targetDir, 'src', 'main.ts'), mainContent);

        // Generate example component
        const componentContent = generateComponent(template);
        writeFileSync(join(targetDir, 'src', 'App.ts'), componentContent);

        s.succeed(`Project '${directory}' created successfully!`);

        console.log(`\n  Next steps:`);
        console.log(`    cd ${directory}`);
        console.log(`    ${packageManager} install`);
        console.log(`    ${packageManager} dev\n`);
      } catch (err) {
        s.fail(`Failed to scaffold project: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}

// ============================================================
// Template generators
// ============================================================

function generatePackageJson(name: string, pm: string) {
  const runCmd = pm === 'npm' ? 'npm run' : pm;
  return {
    name,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: `${runCmd} vite`,
      build: `${runCmd} vite build`,
      preview: `${runCmd} vite preview`,
      typecheck: 'tsc --noEmit',
    },
    dependencies: {
      '@cinacoin/core-sdk': '^0.1.0',
      '@cinacoin/react': '^0.1.0',
      '@cinacoin/ui': '^0.1.0',
    },
    devDependencies: {
      typescript: '^5.7.0',
      vite: '^6.0.0',
    },
  };
}

function generateTsConfig() {
  return {
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      outDir: 'dist',
      rootDir: 'src',
    },
    include: ['src'],
  };
}

function generateMainFile(template: string): string {
  if (template === 'react' || template === 'next') {
    return `import React from 'react';
import { createRoot } from 'react-dom/client';
import { CinacoinProvider } from '@cinacoin/react';
import App from './App.js';

const config = {
  chains: [
    {
      id: 1,
      name: 'Ethereum',
      rpcUrl: 'https://eth.llamarpc.com',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    },
  ],
  theme: { mode: 'dark' },
  metadata: {
    name: '${template === 'next' ? 'Next.js App' : 'Cinacoin App'}',
    description: 'Built with Cinacoin',
    url: 'https://example.com',
  },
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <CinacoinProvider config={config}>
    <App />
  </CinacoinProvider>
);
`;
  }

  return `import { Cinacoin } from '@cinacoin/core-sdk';

const cinacoin = new Cinacoin({
  chains: [
    {
      id: 1,
      name: 'Ethereum',
      rpcUrl: 'https://eth.llamarpc.com',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    },
  ],
});

console.log('Cinacoin initialized:', cinacoin);
`;
}

function generateComponent(template: string): string {
  if (template === 'react' || template === 'next') {
    return `import React from 'react';
import { ConnectButton } from '@cinacoin/react';

export default function App() {
  return (
    <div>
      <h1>Cinacoin App</h1>
      <ConnectButton />
    </div>
  );
}
`;
  }

  return `// Cinacoin vanilla JS app
// See docs: https://cinacoin.dev/guide/quick-start
`;
}
