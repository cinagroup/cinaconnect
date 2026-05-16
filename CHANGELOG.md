# Changelog

All notable changes to OnChainUX will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Real X25519 key exchange using `@noble/curves` in core-sdk (replacing placeholder XOR implementation)
- Real ChaCha20-Poly1305 AEAD encryption using `@noble/ciphers` in core-sdk (replacing AES-GCM fallback)
- `generateNonce()` utility for generating 12-byte random nonces
- `LICENSE` and `LICENSE.md` — MIT License
- `CONTRIBUTING.md` — contribution guidelines
- `SECURITY.md` — security policy with responsible disclosure process
- `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1
- `CHANGELOG.md` — this file
- `AGENTS.md` — AI agent instructions for the project
- `CLAUDE.md` — Claude Code specific configuration

### Changed
- `encrypt()` and `decrypt()` in core-sdk are now synchronous (no longer `async`) since `@noble/ciphers` does not require async operations

### Fixed
- **CRITICAL**: X25519 keypair generation now uses real `@noble/curves` instead of generating random placeholder public keys
- **CRITICAL**: `sharedSecret()` now performs real X25519 Diffie-Hellman instead of XOR simulation
- **CRITICAL**: Encryption now uses real ChaCha20-Poly1305 instead of AES-GCM fallback

### Security
- Replaced non-functional cryptographic placeholders with production-ready `@noble` implementations
- Relay server crypto (`crypto.rs`) verified — already using real `x25519-dalek` and `chacha20poly1305` crates

## [0.1.0] - 2024-XX-XX

### Added
- Initial release of OnChainUX Core SDK
- WebSocket relay server in Rust
- X25519 key exchange (placeholder implementation)
- ChaCha20-Poly1305 encryption (AES-GCM fallback)
- EIP-6963 wallet discovery
- Session management
- State management with Zustand
- EVM chain adapter
- Transport layer (Relay, Injected, QR)

[Unreleased]: https://github.com/onchainux/onchainux/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/onchainux/onchainux/releases/tag/v0.1.0
