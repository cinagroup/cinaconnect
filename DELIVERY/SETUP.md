# Cinacoin — Setup Guide

> **Version:** 1.0.0  
> **Last Updated:** 2026-05-18

---

## 1. Environment Requirements

### System

| Requirement | Minimum | Recommended |
|---|---|---|
| **Node.js** | 18.0.0 | 22.x LTS |
| **pnpm** | 9.15.0 | Latest |
| **RAM** | 4 GB | 8 GB+ |
| **Disk** | 2 GB | 5 GB+ |
| **OS** | Linux / macOS / Windows | Linux / macOS |

### Supported Platforms

- **Web:** React, Next.js, Angular, Vanilla JS
- **Mobile:** React Native, Flutter (Dart), Android (Kotlin), iOS (Swift)
- **Desktop:** .NET (via package)
- **Edge:** Cloudflare Workers

---

## 2. Installation

### Step 1: Clone the Repository

```bash
git clone <repository-url> onux
cd onux
```

### Step 2: Install Dependencies

```bash
# Uses pnpm as package manager
pnpm install
```

This will install all dependencies across the monorepo (72 packages + workspace root).

### Step 3: Verify Installation

```bash
# Check pnpm version
pnpm --version  # Should be ≥ 9.15.0

# Check Node version
node --version  # Should be ≥ 18.0.0

# Verify workspace structure
ls packages/ | wc -l  # Should show 72 packages
```

---

## 3. First-Time Setup

### Environment Variables

```bash
# Copy the example environment file
cp .env.example .env
```

### Configure `.env`

Edit `.env` with your values. Key variables:

```bash
# Core Configuration
NODE_ENV=development
PORT=3000

# API Keys (as needed for your integrations)
# WALLETCONNECT_PROJECT_ID=your-project-id
# ALCHEMY_API_KEY=your-api-key
# INFURA_API_KEY=your-api-key

# Cloudflare (if deploying to Workers)
# CLOUDFLARE_ACCOUNT_ID=your-account-id
# CLOUDFLARE_API_TOKEN=your-api-token

# Keys Server
# KEYS_SERVER_SECRET=your-secret
```

### Initialize Git Hooks (Optional)

```bash
# Set up pre-commit hooks if configured
npx husky install  # If husky is set up
```

---

## 4. Building the Project

### Full Build

```bash
# Build all 72 packages
pnpm run build
```

### Selective Build

```bash
# Build a specific package
pnpm --filter @cinacoin/core-sdk run build

# Build with specific turbo filters
pnpm run build --filter=@cinacoin/react...
```

### Verify Build

```bash
# Check that dist/ directories were created
find packages -name "dist" -type d | wc -l

# Run type checking
pnpm run typecheck

# Run linting
pnpm run lint
```

---

## 5. Configuration Guide

### TypeScript

Root `tsconfig.json` provides base configuration. Each package extends it:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist"
  }
}
```

### Turbo (Build Orchestration)

`turbo.json` defines the build pipeline:

- **build** → depends on `^build` (upstream packages)
- **test** → depends on `build`
- **lint** → no dependencies
- **typecheck** → depends on `build`

### Vitest (Testing)

`vitest.workspace.ts` defines the test workspace. Packages inherit workspace config.

### Prettier & ESLint

- Code formatting: `pnpm run format`
- Linting: `pnpm run lint`
- Fix auto-fixable issues: `pnpm run lint:fix`

---

## 6. Running the Project

### Development Mode

```bash
# Start all packages in watch mode
pnpm run dev

# Start with higher concurrency
pnpm run dev --concurrency 20
```

### Demo Application

```bash
cd apps/demo-react
pnpm run dev
# Open http://localhost:5173
```

### Testing

```bash
# Run all tests
pnpm run test

# Run tests for specific package
pnpm --filter @cinacoin/core-sdk run test

# Run with coverage
pnpm run test -- --coverage

# Run E2E tests
npx playwright test
```

### Documentation

```bash
# Start VitePress dev server
pnpm run docs:dev

# Build documentation site
pnpm run docs:build

# Generate TypeDoc API reference
pnpm run typedoc
```

---

## 7. Deployment

### Docker

```bash
# Build Docker image
docker build -t cinacoin .

# Run with docker-compose
docker-compose up -d
```

### Cloudflare Workers

```bash
# Deploy to Cloudflare
bash deploy-cloudflare.sh
# Or follow CLOUDFLARE_DEPLOY.md
```

### Production Checklist

See `DELIVERY/README.md` → Deployment Checklist section.

---

## 8. Troubleshooting

### Common Issues

| Problem | Solution |
|---|---|
| `pnpm install` fails | Ensure Node.js ≥ 18; try `pnpm install --no-frozen-lockfile` |
| Build errors | Run `pnpm run clean` then `pnpm install && pnpm run build` |
| Type errors | Run `pnpm run typecheck` to isolate issues |
| Port conflicts | Set `PORT` in `.env` to a different value |
| Missing dist/ | Run `pnpm run build` for the specific package |

### Getting Help

- Check `deploy/runbooks/` for operational troubleshooting
- Review `HONEST_AUDIT_V3.md` for known limitations
- See `CONTRIBUTING.md` for development guidelines

---

*Setup guide for Cinacoin v1.0.0. For detailed architecture, see `Master-Architecture.md`.*
