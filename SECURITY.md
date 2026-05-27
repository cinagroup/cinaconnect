# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Cinacoin seriously. If you discover a security vulnerability, please follow this process:

### 1. Do Not Open a Public Issue

**Do not** report security vulnerabilities through public GitHub issues, discussions, or social media.

### 2. Send a Private Report

Email us at **[security@cinacoin.dev](mailto:security@cinacoin.dev)** (or use the GitHub Security Advisories feature if available) with:

- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any suggested fixes (optional)

### 3. What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within **48 hours**.
- **Assessment**: We will assess the vulnerability and provide an initial response within **7 days**.
- **Resolution**: We aim to release a fix within **30 days** for critical vulnerabilities.
- **Disclosure**: We will coordinate public disclosure with you after the fix is released. We typically disclose within **90 days** of the initial report.

### 4. Scope

Security-relevant components include:

- **X25519 key exchange** (`packages/core-sdk/src/crypto/keypair.ts`)
- **ChaCha20-Poly1305 encryption** (`packages/core-sdk/src/crypto/encrypt.ts`)
- **Relay server crypto** (`packages/relay-server/src/crypto.rs`)
- **Session management** (`packages/core-sdk/src/session.ts`)
- **Transport layer** (WebSocket handling, message validation)

### 5. Safe Harbor

We will not take legal action against researchers who:

- Follow this responsible disclosure process
- Do not access, modify, or destroy data belonging to other users
- Do not disrupt production systems or services
- Do not violate any applicable privacy laws

## Security Best Practices for Contributors

1. **Never commit secrets** — API keys, private keys, or credentials.
2. **Use constant-time comparisons** for cryptographic operations.
3. **Validate all inputs** — never trust client-side data.
4. **Keep dependencies updated** — run `npm audit` and `cargo audit` regularly.
5. **Follow the principle of least privilege** in all code.

## Security Changelog

- **2024-XX-XX**: Initial security policy creation.
- **2024-XX-XX**: Replaced placeholder crypto with real @noble/curves and @noble/ciphers implementations.
