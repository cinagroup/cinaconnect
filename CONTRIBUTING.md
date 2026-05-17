# Contributing to CinaConnect

Thank you for your interest in contributing to CinaConnect! We welcome contributions from everyone.

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before participating.

## How to Contribute

### Reporting Bugs

1. Check the [issue tracker](https://github.com/cinaconnect/cinaconnect/issues) to see if the bug has already been reported.
2. Open a new issue with:
   - A clear, descriptive title
   - Steps to reproduce the issue
   - Expected vs. actual behavior
   - Environment details (OS, Node.js version, package version)
   - Relevant code snippets or logs

### Suggesting Features

1. Open an issue with the label `enhancement`.
2. Describe the problem your feature solves.
3. Explain your proposed solution.
4. Discuss alternatives you've considered.

### Pull Requests

1. **Fork** the repository and create your branch from `main`.
2. **Install dependencies**: `npm install` (or `cargo build` for Rust packages).
3. **Make your changes** — follow existing code style and conventions.
4. **Add tests** for new functionality.
5. **Run the test suite**: `npm test` (or `cargo test` for Rust packages).
6. **Lint your code**: `npm run lint` (or `cargo clippy` for Rust).
7. **Update documentation** if your changes affect the API or usage.
8. **Commit** with clear, descriptive messages (see [Conventional Commits](https://www.conventionalcommits.org/)).
9. **Open a Pull Request** with a description of your changes.

### Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add Solana wallet adapter
fix: resolve race condition in relay transport
docs: update API reference for SessionManager
test: add roundtrip tests for ChaCha20-Poly1305
chore: update dependencies
```

## Development Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- Rust 1.70+ (for relay-server)
- pnpm or npm

### Workspace Structure

```
cinaconnect/
├── packages/
│   ├── core-sdk/          # Core TypeScript SDK
│   ├── relay-server/      # Rust relay server
│   ├── rpc-proxy/         # RPC proxy service
│   └── ...                # Additional packages
├── LICENSE
├── README.md
└── CONTRIBUTING.md         # This file
```

### Running Tests

```bash
# Core SDK
cd packages/core-sdk
npm test

# Relay server
cd packages/relay-server
cargo test
```

## Code Style

- **TypeScript**: Follow ESLint config and Prettier formatting.
- **Rust**: Run `cargo fmt` and `cargo clippy` before committing.
- **Comments**: Document public APIs. Explain *why*, not *what*.

## Security

If you discover a security vulnerability, please follow our [Security Policy](SECURITY.md) and report it responsibly. **Do not open a public issue.**

## License

By contributing, you agree that your contributions will be licensed under the MIT License. See [LICENSE](LICENSE) for details.
