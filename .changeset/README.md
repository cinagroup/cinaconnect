# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

## How to add a changeset

When making a change that should be versioned, run:

```bash
pnpm changeset
```

This will prompt you to select which packages were affected and what kind of change:

- **major** — Breaking changes
- **minor** — New features (backward-compatible)
- **patch** — Bug fixes (backward-compatible)

The generated `.md` file should be committed along with your changes.

## How to version

Before releasing, bump versions based on accumulated changesets:

```bash
pnpm changeset version
```

This will:
1. Read all pending changesets
2. Bump versions according to the change types
3. Update `CHANGELOG.md` files
4. Remove the changeset files

## How to publish

After versioning, publish to npm:

```bash
pnpm changeset publish
```

This will:
1. Build all packages
2. Publish to npm registry
3. Create git tags

## Changeset files

Changeset files are located in `.changeset/*.md`. Each file describes a change to one or more packages. They follow this format:

```markdown
---
"@cinacoin/core-sdk": patch
"@cinacoin/core-ui": minor
---

Add Solana chain adapter support
```
