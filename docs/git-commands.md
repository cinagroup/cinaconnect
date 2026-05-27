# Git Commands Reference

Quick reference for common Git operations in the Cinacoin project.

---

## Table of Contents

- [Initial Setup](#initial-setup)
- [Daily Workflow](#daily-workflow)
- [Branching](#branching)
- [Commits](#commits)
- [Pull Requests](#pull-requests)
- [Changesets & Versioning](#changesets--versioning)
- [Releases & Tags](#releases--tags)
- [Undo & Recovery](#undo--recovery)
- [Useful Aliases](#useful-aliases)

---

## Initial Setup

```bash
# Clone the repository
git clone https://github.com/cinacoin/cinacoin.git
cd cinacoin

# Add upstream remote (if you forked)
git remote add upstream https://github.com/cinacoin/cinacoin.git
git fetch upstream

# Install dependencies
pnpm install

# Install Git hooks (if project provides them)
# ls .husky/ 2>/dev/null && echo "Husky hooks installed"
```

---

## Daily Workflow

```bash
# Start your day — sync with upstream
git fetch upstream
git checkout main
git rebase upstream/main

# Create a feature branch
git checkout -b feat/your-feature-name

# After making changes, stage and commit
git add -A
git commit -m "feat(scope): description of change"

# Push branch to your fork
git push origin feat/your-feature-name

# Keep branch up-to-date with main
git fetch upstream
git rebase upstream/main
```

---

## Branching

```bash
# List branches (local)
git branch

# List branches (remote)
git branch -r

# List all branches
git branch -a

# Create a feature branch
git checkout -b feat/wallet-adapter

# Create a fix branch
git checkout -b fix/relay-race-condition

# Create a release branch
git checkout -b release/v1.1.0 main

# Delete a merged branch (local)
git branch -d feat/old-feature

# Delete a merged branch (remote)
git push origin --delete feat/old-feature

# Rename a branch
git branch -m old-name new-name
```

---

## Commits

```bash
# Stage all changes
git add -A

# Stage specific files
git add packages/core-sdk/src/index.ts

# Commit with Conventional Commits format
git commit -m "feat(core-sdk): add session management API"

# Commit with body
git commit -m "feat(adapter-solana): add Phantom wallet support

Implements EIP-6963 wallet discovery for Phantom browser extension.
Supports both injected and deep-link connection methods."

# Amend last commit (fix typo, add forgotten file)
git add forgotten-file.ts
git commit --amend --no-edit

# Change last commit message
git commit --amend -m "fix(core-sdk): correct topic derivation logic"

# Squash last N commits interactively
git rebase -i HEAD~3
# Change "pick" to "squash" or "s" for commits to combine

# View commit history
git log --oneline -20

# View commit history with graph
git log --oneline --graph --all -20

# View changes in last commit
git show HEAD

# View changes in a specific commit
git show <commit-hash>
```

### Conventional Commits Quick Reference

```bash
# New feature
git commit -m "feat(scope): description"

# Bug fix
git commit -m "fix(scope): description"

# Documentation
git commit -m "docs(scope): description"

# Breaking change
git commit -m "feat(scope)!: description

BREAKING CHANGE: explain the breaking change"

# Multiple scopes (rare, only when tightly coupled)
git commit -m "fix(core-sdk,react): synchronize session state"
```

---

## Pull Requests

```bash
# Push branch and set upstream tracking
git push -u origin feat/your-feature

# Rebase on latest main before opening PR
git fetch upstream
git rebase upstream/main

# Force push after rebase (your branch only)
git push --force-with-lease origin feat/your-feature

# Check what will be in the PR (diff from main)
git diff upstream/main...HEAD

# List commits that will be in the PR
git log upstream/main..HEAD --oneline
```

---

## Changesets & Versioning

```bash
# Create a changeset (interactive)
pnpm changeset

# Version bump (consumes changesets, updates versions + CHANGELOG)
pnpm changeset version

# Publish to npm
pnpm changeset publish

# Check status of changesets
pnpm changeset status

# Add a changeset without prompting (CI/non-interactive)
pnpm changeset --empty    # Create empty changeset
```

---

## Releases & Tags

```bash
# List existing tags
git tag -l "v*"

# List tags sorted by version
git tag -l "v*" | sort -V

# Create an annotated tag
git tag -a v1.1.0 -m "Release v1.1.0"

# Create a lightweight tag
git tag v1.1.0

# Push a tag to remote
git push origin v1.1.0

# Push all tags
git push origin --tags

# Delete a tag (local)
git tag -d v1.1.0

# Delete a tag (remote)
git push origin --delete v1.1.0

# Show tag details
git show v1.1.0

# Checkout a specific release
git checkout v1.0.0

# Create and push tag in one step (using the release script)
./scripts/release-tag.sh v1.1.0
```

### Full Release Workflow

```bash
# 1. Ensure main is up-to-date
git checkout main
git pull upstream main

# 2. Create release branch
git checkout -b release/v1.1.0

# 3. Consume changesets
pnpm changeset version

# 4. Review changes
git diff HEAD

# 5. Commit version bump
git add -A
git commit -m "chore(release): prepare v1.1.0"

# 6. Merge to main
git checkout main
git merge release/v1.1.0

# 7. Push main
git push origin main

# 8. Create and push tag
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0

# 9. Clean up release branch
git branch -d release/v1.1.0
```

---

## Undo & Recovery

```bash
# Undo last commit, keep changes staged
git reset --soft HEAD~1

# Undo last commit, unstage changes
git reset --mixed HEAD~1

# Undo last commit, discard changes (DANGEROUS)
git reset --hard HEAD~1

# Discard changes in a file
git checkout -- path/to/file.ts

# Discard all unstaged changes
git checkout -- .

# Stash current changes
git stash

# Stash with a message
git stash save "WIP: half-done feature"

# List stashes
git stash list

# Apply last stash
git stash pop

# Apply specific stash
git stash pop stash@{2}

# Find a lost commit
git reflog

# Cherry-pick a commit from another branch
git cherry-pick <commit-hash>
```

---

## Useful Aliases

Add these to your `~/.gitconfig` for faster workflow:

```ini
[alias]
  # Shortcuts
  st = status
  co = checkout
  br = branch
  ci = commit

  # Enhanced log
  lg = log --oneline --graph --all -20
  hist = log --pretty=format:'%h %ad | %s%d [%an]' --graph --date=short

  # Diff shortcuts
  last = diff HEAD~1..HEAD
  staged = diff --cached

  # Branch management
  unstage = reset HEAD --
  undo = reset --soft HEAD~1

  # Show recent tags
  recent-tags = tag -l --sort=-version:refname | head -10
```

---

## Troubleshooting

### "Your branch is behind main"

```bash
git fetch upstream
git rebase upstream/main
```

### "There is no tracking information"

```bash
git branch --set-upstream-to=upstream/main main
```

### Merge conflicts during rebase

```bash
# After resolving conflicts
git add -A
git rebase --continue

# Or abort the rebase
git rebase --abort
```

### Accidentally committed to main

```bash
# Create a branch from current state
git checkout -b feat/recovery-branch

# Reset main back
git checkout main
git reset --hard upstream/main
```
