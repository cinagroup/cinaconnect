# Git Workflow Guide

This document defines the Git workflow standards for Cinacoin. All contributors should follow these conventions to maintain a clean, traceable history.

---

## Table of Contents

- [Branch Model](#branch-model)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Release Tagging Strategy](#release-tagging-strategy)
- [Changelog & Changesets Integration](#changelog--changesets-integration)
- [Hotfix Procedure](#hotfix-procedure)
- [CI/CD Integration](#cicd-integration)

---

## Branch Model

Cinacoin uses a **trunk-based development** model with short-lived feature branches:

```
main ────────────────────────────────────────▶  (stable, always deployable)
  ├── feat/wallet-connect-v2 ──┐
  ├── fix/race-condition ──────┼── merged back to main via PR
  ├── docs/api-reference ──────┘
  └── release/v1.1.0 ──────────▶  version bump + changesets applied
```

### Branch Types

| Branch Pattern | Purpose | Lifetime | Merge Target |
|---------------|---------|----------|--------------|
| `main` | Stable, production-ready code | Permanent | N/A |
| `feat/<description>` | New features | Short (1-7 days) | `main` |
| `fix/<description>` | Bug fixes | Short (1-3 days) | `main` |
| `docs/<description>` | Documentation changes | Short | `main` |
| `chore/<description>` | Tooling, CI, maintenance | Short | `main` |
| `refactor/<description>` | Code restructuring, no behavior change | Short | `main` |
| `perf/<description>` | Performance improvements | Short | `main` |
| `release/v<semver>` | Release preparation | Short (1-2 days) | `main` (then tag) |
| `hotfix/<description>` | Emergency fixes on production | Very short | `main` (then tag) |

---

## Branch Naming Conventions

### Rules

1. **Use kebab-case**: `feat/solana-wallet-adapter`
2. **Keep it concise**: Max ~50 characters for the description
3. **Be specific**: `fix/relay-transport-race-condition` > `fix/bug`
4. **Prefix with type**: Always start with `feat/`, `fix/`, `docs/`, etc.

### Good Examples

```
feat/adapter-solana-phantom-eip6963
fix/core-sdk-relay-topic-derivation
docs/api-session-manager
chore/update-viem-2-21
refactor/extract-wallet-capabilities-hook
perf/lazy-load-chain-definitions
release/v1.1.0
hotfix/npm-publish-failure
```

### Bad Examples

```
new-feature          # Missing type prefix
fix/BUG              # Too vague, not kebab-case
WIP                  # Not descriptive
my-branch            # Missing type prefix
```

---

## Commit Message Format

Cinacoin follows **[Conventional Commits](https://www.conventionalcommits.org/)** for structured, machine-readable commit messages. This enables automated changelog generation and semantic versioning.

### Format

```
<type>(<scope>): <description>

[optional body — explain motivation, context, or approach]

[optional footer(s) — BREAKING CHANGE:, Fixes #123, etc.]
```

### Types

| Type | Description | Version Impact |
|------|-------------|----------------|
| `feat` | New feature | Minor bump |
| `fix` | Bug fix | Patch bump |
| `docs` | Documentation only | None |
| `style` | Code style, formatting | None |
| `refactor` | Code restructuring | None |
| `perf` | Performance improvement | Patch bump |
| `test` | Test additions/fixes | None |
| `chore` | Tooling, deps, maintenance | None |
| `build` | Build system changes | None |
| `ci` | CI/CD configuration | None |

### Scopes

Use the affected package or area. Common scopes:

- **Packages**: `core-sdk`, `react`, `chains`, `adapter-ethereum`, `adapter-solana`, `relay-server`, `bundler`, `paymaster`
- **Areas**: `ui`, `demo`, `docs`, `ci`, `deps`, `release`

### Examples

```bash
# Feature
feat(adapter-solana): add Phantom wallet EIP-6963 discovery

# Bug fix
fix(core-sdk): resolve race condition in relay transport

# Breaking change
feat(core-sdk)!: change SignClient constructor signature

BREAKING CHANGE: SignClient now requires projectId as the first argument.
Migrate by passing projectId in the constructor options.

# Chore
chore(deps): update viem to 2.21.0

# Multi-scope
fix(core-sdk,react): synchronize session state across providers
```

### Rules

1. **Imperative mood**: "add" not "added" or "adds"
2. **No period** at the end of the subject line
3. **Max 72 characters** for the subject
4. **Body wraps at 80 characters**
5. **One scope per commit** unless the change genuinely spans multiple tightly-coupled packages
6. **Squash merge PRs** — the PR title becomes the squash commit message (use Conventional Commits format for PR titles too)

---

## Pull Request Process

### Before Opening a PR

1. **Rebase on latest `main`**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run the full CI suite**:
   ```bash
   pnpm run ci
   ```

3. **Create a changeset** (for user-facing changes):
   ```bash
   pnpm changeset
   ```

4. **Test in the demo app** if UI is affected.

### Opening a PR

1. Push your branch: `git push origin <branch-name>`
2. Open a PR against `main` on the upstream repository
3. The [PR template](../.github/PULL_REQUEST_TEMPLATE.md) is auto-loaded
4. Fill in all sections — be honest and thorough

### PR Title Format

Use the same Conventional Commits format:

```
feat(adapter-solana): add Phantom wallet EIP-6963 discovery
```

### Review & Merge

- PRs require **at least one maintainer approval**
- PRs are **squash-merged** — the PR title becomes the single commit on `main`
- Address review feedback with follow-up commits; the PR will be squashed on merge
- Stale PRs (> 14 days without activity) may be closed

---

## Release Tagging Strategy

### Semantic Versioning

Cinacoin follows **[SemVer 2.0.0](https://semver.org/)**:

```
MAJOR.MINOR.PATCH
  │     │     │
  │     │     └── Patch: Bug fixes (backward-compatible)
  │     └──────── Minor: New features (backward-compatible)
  └────────────── Major: Breaking changes
```

### Tag Format

Tags must use the `v` prefix followed by the full semver:

```
v0.1.0    # Initial release
v0.2.0    # Minor feature additions
v0.2.1    # Patch fix
v1.0.0    # First stable release
v1.1.0    # Minor additions post-stable
v2.0.0    # Breaking changes
```

### Release Process

1. **Create a release branch**:
   ```bash
   git checkout -b release/v1.1.0 main
   ```

2. **Run changeset version** (consumes changesets, bumps versions, updates CHANGELOG.md):
   ```bash
   pnpm changeset version
   ```

3. **Review and commit**:
   ```bash
   git add -A
   git commit -m "chore(release): prepare v1.1.0"
   ```

4. **Merge to `main`**:
   ```bash
   git checkout main
   git merge release/v1.1.0
   git push origin main
   ```

5. **Create and push the tag**:
   ```bash
   git tag -a v1.1.0 -m "Release v1.1.0"
   git push origin v1.1.0
   ```

6. **CI/CD triggers automatically** on tag push:
   - Build and test
   - Publish packages to npm
   - Create GitHub Release with changelog
   - Deploy documentation

### Automating Tag Creation

Use the provided release script:

```bash
# Interactive tag creation
./scripts/release-tag.sh

# Non-interactive
./scripts/release-tag.sh v1.1.0
```

See [git-commands.md](./git-commands.md) for more details.

### Release Checklist

- [ ] All PRs for this release are merged
- [ ] `pnpm run ci` passes on `main`
- [ ] Changesets have been consumed (`pnpm changeset version`)
- [ ] CHANGELOG.md is updated and reviewed
- [ ] Tag is created and pushed
- [ ] GitHub Release is created (auto or manual)
- [ ] npm packages are published (via CI)
- [ ] Documentation is deployed (via CI)

---

## Changelog & Changesets Integration

### How It Works

Cinacoin uses **[Changesets](https://github.com/changesets/changesets)** for version management and changelog generation:

1. **Contributors create changesets** when opening PRs with user-facing changes:
   ```bash
   pnpm changeset
   ```

2. **Changesets are committed** to the PR branch and merged with the code

3. **On release**, `changeset version`:
   - Reads all pending changesets
   - Bumps package versions according to semver rules
   - Updates CHANGELOG.md with categorized entries
   - Removes consumed changeset files

4. **On publish**, `changeset publish`:
   - Publishes updated packages to npm

### Changeset Types

| Bump Type | When to Use |
|-----------|-------------|
| `patch` | Bug fixes, no API changes |
| `minor` | New backward-compatible features |
| `major` | Breaking changes |

### CHANGELOG.md Format

The changelog is organized by version, with changes grouped by package:

```markdown
## 1.1.0

### @cinacoin/core-sdk

#### Minor Changes

- Added new SessionManager API for multi-session support

#### Patch Changes

- Fixed race condition in relay transport

### @cinacoin/react

#### Minor Changes

- Added useWalletCapabilities hook
```

### Docs/CI-Only Changes

Documentation-only or CI-only changes **do not require changesets**. The changelog tracks only user-facing package changes.

---

## Hotfix Procedure

For urgent production issues:

1. **Create a hotfix branch from `main`**:
   ```bash
   git checkout main
   git checkout -b hotfix/critical-bug-fix
   ```

2. **Fix the issue and commit** with appropriate Conventional Commits format:
   ```bash
   git add -A
   git commit -m "fix(core-sdk): fix critical authentication bypass"
   ```

3. **Fast-track the PR** — mark as urgent, request immediate review

4. **Merge and tag as a patch release**:
   ```bash
   git checkout main
   git merge hotfix/critical-bug-fix
   git tag -a v1.0.1 -m "Hotfix v1.0.1 — critical authentication bypass fix"
   git push origin main v1.0.1
   ```

---

## CI/CD Integration

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR to `main` | Lint, typecheck, test |
| `build.yaml` | PR to `main` | Full build verification |
| `test.yml` | PR to `main` | Test suite |
| `e2e.yml` | PR to `main` | End-to-end tests |
| `quality.yaml` | PR to `main` | Code quality checks |
| `security.yaml` | PR to `main` | Security scanning |
| `docs.yaml` | Push to `main` | Deploy documentation |
| `release.yml` | Tag push (`v*`) | Publish packages + GitHub Release |
| `deploy-cloudflare.yml` | Tag push / dispatch | Deploy to Cloudflare |

### Release Pipeline (Triggered by Tag)

When a tag like `v1.1.0` is pushed:

1. **`release.yml`** runs:
   - Checks out the tag
   - Installs dependencies
   - Builds all packages
   - Publishes to npm via changesets
   - Creates a GitHub Release with auto-generated notes

2. **`deploy-cloudflare.yml`** runs:
   - Deploys the demo app and documentation to Cloudflare Pages

### Verification

Before pushing a tag, verify locally:

```bash
# Full CI pipeline
pnpm run ci

# Build check
pnpm run build

# Check for uncommitted changes
git status

# Verify tag format
git tag -l "v*" | tail -5
```
