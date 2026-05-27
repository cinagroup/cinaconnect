# 03 — Mobile & Multi-Platform SDK Gap Analysis

> **CinaAuth/Cinacoin vs Reown (ex-WalletConnect)**
> Generated: 2026-05-16 | Part of the competitive analysis series

---

## Executive Summary

Reown has invested years into building **six distinct native/mobile SDKs** covering the full spectrum of mobile and game development platforms. CinaAuth/Cinacoin currently has **one mobile adapter** — a React Native wrapper built with stub/mock connection logic.

The gap is **structural, not cosmetic**. Cinacoin's RN package (v0.1.0, 5 source files) provides UI component scaffolding only — the actual wallet connection layer (`connect()`, `disconnect()`, `switchChain()`) is mocked with `setTimeout`. There is no WalletConnect protocol integration, no injected wallet detection, no deep linking, and no push notification support.

**Verdict**: Cinacoin's mobile story is "UI skin without a wallet engine." Building production mobile support requires 3–6 months of foundational protocol work across multiple platforms.

---

## 1. Platform Coverage Matrix

| Platform | Reown SDK | CinaAuth/Cinacoin | Gap |
|---|---|---|---|
| **iOS (Swift)** | reown-swift (108★, 105 forks) | ❌ None | **Critical** |
| **Android (Kotlin)** | reown-kotlin (56★, 29 forks) | ❌ None | **Critical** |
| **React Native** | appkit-react-native (123★, 40 forks) | ✅ @cinacoin/react-native v0.1.0 | **Major** (stub logic) |
| **Flutter** | reown_flutter (59★, 65 forks) | ❌ None | **Critical** |
| **Unity / .NET** | reown-dotnet (36★, 13 forks) | ❌ None | **Major** |
| **Rust (native lib)** | reown-rust (41★, 17 forks) | ❌ None | **Major** |
| **Web (JS)** | appkit (appkit.js) | ✅ @cinacoin/react, @cinacoin/vue | Moderate |
| **Web (WC)** | appkit-web | ⚠️ @cinacoin/core-ui (planned) | Moderate |

**Score**: Reown covers 8 platform targets. Cinacoin covers 3 (RN, React, Vue), with only web targets being functional.

---

## 2. SDK Depth Comparison

### 2.1 React Native — The Only Overlap

| Feature | Reown appkit-react-native | Cinacoin react-native | Gap |
|---|---|---|---|
| Package version | Published, stable | v0.1.0 (dev) | Major |
| ConnectButton | Full state management | ✅ UI only, mock state | Major |
| ConnectModal | Full wallet list, QR, social | ✅ UI only, hardcoded wallets | Major |
| WalletConnect v2 | Full protocol (pair, connect, approve) | ❌ Mocked with setTimeout | **Critical** |
| EIP-6963 detection | Detects MetaMask, Rainbow, etc. | ❌ Hardcoded list | **Critical** |
| Deep linking | Wallet deep links + universal links | ❌ None | **Critical** |
| Wallet Connect URI parsing | Full `wc:` URI + proposal handling | ❌ Simulated mock string | **Critical** |
| Push notifications | FCM + APNS via Relay | ❌ None | **Critical** |
| Native QR scanner | camera integration | ⚠️ Placeholder (simulated scan) | Major |
| Chain switching | Full WalletConnect `wallet_switchEthereumChain` | ⚠️ Mock setTimeout | Major |
| Transaction signing | Full sign + send pipeline | ❌ None | **Critical** |
| Social login | Embedded via third-party | ⚠️ UI stub only | Major |
| Email wallet | Embedded wallet flow | ⚠️ UI stub only | Major |
| EVM chains | 300+ chains configured | ⚠️ Configurable but unused | Moderate |
| Solana support | ✅ | ❌ | Major |
| Bitcoin support | ✅ | ❌ | Major |
| Multichain | Simultaneous multi-chain sessions | ❌ | Critical |
| Session persistence | Secure storage | ❌ In-memory only | Major |

**Bottom line**: Cinacoin's RN package has the **shape** of a mobile SDK (components, props, types, themes) but none of the **substance** (protocol, networking, cryptography).

### 2.2 Source File Comparison

| Metric | Reown appkit-react-native | Cinacoin react-native |
|---|---|---|
| Total source files | ~50+ (estimated from repo size 17MB) | **5 files** |
| Lines of code | ~5,000+ | **~500** |
| Test files | Jest + Detox | ❌ Zero tests |
| Example/demo app | Yes | ❌ None |
| Documentation | Reown docs site | ❌ None beyond JSDoc |
| CI/CD | Full pipeline | Basic tsc build |

### 2.3 Cinacoin RN Package Structure

```
packages/react-native/
├── package.json          # v0.1.0, MIT, deps: react + react-native only
├── tsconfig.json
└── src/
    ├── index.ts           # 4 exports
    ├── CinacoinProvider.tsx  # Context + mock connect/disconnect/switchChain
    ├── ConnectButton.tsx       # TouchableOpacity-based button
    ├── ConnectModal.tsx        # Modal with wallet/social/email/scan tabs
    └── QRScanner.tsx           # Placeholder with simulated scan button
```

No dependencies on WalletConnect libraries, no crypto, no networking, no native modules.

---

## 3. Native iOS/Android SDK Gap

### 3.1 What Reown Offers (reown-swift + reown-kotlin)

- Full WalletConnect v2 protocol implementation in native Swift/Kotlin
- `AppKit` component: native modal with wallet list, QR code generation, connection state
- Push notification support via FCM (Android) and APNS (iOS) for session proposals
- Deep linking with custom URL schemes and universal links
- Native crypto (SecKeychain/KeyStore for key management)
- Session management with secure persistent storage
- Support for WalletConnect v2 Relay network (WebSocket connections)
- Signing requests (personal_sign, eth_signTypedData, eth_sendTransaction)
- Native QR code generation for WalletConnect URI display
- Multi-chain support (EVM, Solana, Bitcoin, Polkadot, etc.)

### 3.2 What Cinacoin Would Need to Build

Building native iOS and Android SDKs requires:

1. **WalletConnect v2 Protocol Client** (~2-3 months per platform)
   - Relay WebSocket connection with authentication
   - Pairing, session management, proposal handling
   - Cryptographic key management (native Keychain/Keystore)
   - Message encryption/decryption (ChaCha20-Poly1305, x25519)

2. **UI Component Library** (~1-2 months per platform)
   - SwiftUI/Compose-based modal and button components
   - Wallet list, QR display, connection states
   - Theme system matching design tokens

3. **Platform Integration** (~1 month per platform)
   - Deep linking setup (Info.plist / AndroidManifest)
   - Push notification registration and handling
   - Background task handling

4. **Chain Adapter Layer** (~1 month per platform)
   - EVM: web3 provider via injected WebView or direct RPC
   - Solana: Solana SDK integration
   - Multi-chain session management

**Estimated effort**: 6-9 months with 2 engineers per platform.

### 3.3 Strategic Question: Build Native vs. Use Reown's SDK?

Since Cinacoin's core connects *through* WalletConnect v2 (the protocol is open), the choice is:

| Approach | Pros | Cons |
|---|---|---|
| **Build from scratch** | Full IP ownership, no Reown dependency | 12-18 months for 4 platforms |
| **Fork Reown SDKs** | Faster start (weeks, not months) | License compliance, upstream drift |
| **Use Reown SDK under the hood** | Fastest path (days), reliable | Brand dependency, API lock-in |

**Recommendation**: For Phase 2-3, build a thin abstraction layer that can wrap either a self-built implementation or a Reown SDK underneath. This preserves the white-label goal while providing a realistic timeline.

---

## 4. Flutter / Unity / Rust Gap

### 4.1 Flutter (reown_flutter: 59★, 65 forks)

Reown's Flutter SDK provides:
- Full WalletConnect v2 via platform channels to native Kotlin/Swift
- Flutter widgets for ConnectButton and ConnectModal
- Integration with popular Flutter web3 libraries
- Push notification support via flutter_local_notifications

**Cinacoin gap**: No Flutter SDK exists. The Phase 2 design doc mentions Web Components (Lit) as the core rendering layer — these **do not work in Flutter** without a WebView wrapper, which is inadequate for wallet connection UX.

### 4.2 Unity / .NET (reown-dotnet: 36★, 13 forks)

Reown's .NET SDK targets:
- Unity game engine (mobile games, web3 games)
- .NET MAUI for cross-platform mobile apps
- Full WalletConnect v2 protocol in C#
- QR code generation and scanning via ZXing

**Cinacoin gap**: No game engine support whatsoever. This is a massive addressable market — web3 gaming is one of the fastest-growing sectors.

### 4.3 Rust (reown-rust: 41★, 17 forks)

Reown's Rust SDK provides:
- Native WalletConnect v2 implementation in Rust
- Used as a base layer by other SDKs (Kotlin/Swift may compile via FFI)
- High-performance cryptographic operations

**Cinacoin gap**: No Rust layer. Building Rust SDKs for crypto is complex (FFI bindings, platform-specific crypto), but it would serve as a foundation for Swift/Kotlin via FFI.

---

## 5. Chain Adapter Availability Per Platform

| Chain | Reown (all platforms) | Cinacoin RN |
|---|---|---|
| Ethereum Mainnet | ✅ All SDKs | ⚠️ Configurable, unused |
| Polygon | ✅ All SDKs | ⚠️ Configurable, unused |
| Arbitrum | ✅ All SDKs | ⚠️ Configurable, unused |
| Optimism | ✅ All SDKs | ⚠️ Configurable, unused |
| BSC | ✅ All SDKs | ⚠️ Configurable, unused |
| Base | ✅ All SDKs | ⚠️ Configurable, unused |
| Solana | ✅ Select SDKs | ❌ |
| Bitcoin | ✅ Select SDKs | ❌ |
| Polkadot | ✅ Select SDKs | ❌ |
| Cosmos | ✅ Select SDKs | ❌ |

Cinacoin's `ChainConfig` interface is well-designed but only exists as TypeScript types. No actual RPC communication or chain-specific adapters exist.

---

## 6. Push Notification Support

| Feature | Reown | Cinacoin |
|---|---|---|
| FCM (Android) | ✅ Via Relay push | ❌ None |
| APNS (iOS) | ✅ Via Relay push | ❌ None |
| Background session approval | ✅ | ❌ None |
| Transaction notification push | ✅ | ❌ None |
| Push notification SDK config | Dashboard-configured | N/A |

Reown's push notification infrastructure is a core advantage — it allows wallets to receive connection requests and signing requests even when the app is backgrounded, via the Reown Relay service.

**For Cinacoin**: Building push notification support requires either:
- Running your own Relay-compatible WebSocket server (see `relay-server` package), OR
- Implementing FCM/APNS directly with your own pairing endpoint

---

## 7. Wallet Integration Per Platform

| Feature | Reown | Cinacoin RN |
|---|---|---|
| WalletConnect v2 pairing | ✅ Full protocol | ❌ Mock |
| WalletConnect v2 session management | ✅ Full lifecycle | ❌ Mock |
| Injected wallet detection (EIP-6963) | ✅ Web + RN | ❌ Hardcoded list |
| Deep linking to installed wallets | ✅ iOS/Android | ❌ None |
| Universal links | ✅ | ❌ None |
| Wallet icon/metadata fetching | ✅ CDN | ❌ Hardcoded |
| Wallet recommendation engine | ✅ Backend-driven | ⚠️ Local config only |
| Multi-wallet simultaneous connections | ✅ | ❌ |

---

## 8. Developer Experience Comparison

| Aspect | Reown | Cinacoin |
|---|---|---|
| Package manager | npm/cocoapods/maven/nuget/pub.dev/crates.io | npm only |
| Getting started docs | Full docs site with guides | JSDoc comments only |
| API reference | Complete | Inline types only |
| Code examples | 20+ examples across platforms | None |
| Demo applications | Multiple (React, Next.js, Vue, Flutter, iOS, Android) | None |
| TypeScript support | Full | Full (best area) |
| Error handling | Structured errors with codes | Generic catch-all |
| Logging/Debugging | Built-in debug mode | None |
| Migration guides | WalletConnect→Reown migration | N/A |

---

## 9. Gap Summary & Recommendations

### Priority Matrix

| Priority | Gap | Effort | Impact | Recommendation |
|---|---|---|---|---|
| **P0** | RN: Real WalletConnect v2 integration | 4-6 weeks | Critical | Integrate `@walletconnect/react-native-compat` + `@walletconnect/ethereum-provider` into RN package. Replace all mock connect/disconnect with real protocol calls. |
| **P0** | RN: Deep linking for iOS/Android | 2-3 weeks | Critical | Add URL scheme handling, universal links (iOS), app links (Android). Required for returning from wallet apps after signing. |
| **P0** | RN: EIP-6963 wallet detection | 1-2 weeks | Critical | Implement wallet discovery via RN WebView injection or native module. Replace hardcoded wallet list. |
| **P1** | RN: Native QR scanner | 2-3 weeks | High | Integrate `react-native-vision-camera` + `vision-camera-code-scanner`. Replace simulated scan placeholder. |
| **P1** | RN: Session persistence | 1-2 weeks | High | Use `react-native-mmkv` or `@react-native-async-storage` for secure session storage. |
| **P1** | RN: Multi-chain support | 2-3 weeks | High | Implement `wallet_switchEthereumChain` via WalletConnect. Add Solana chain adapter. |
| **P1** | RN: Social login integration | 3-4 weeks | High | Integrate Web3Auth RN SDK or implement OAuth flows. Phase 2 doc recommends Web3Auth. |
| **P2** | Native Swift iOS SDK | 3-4 months | High | Build or fork reown-swift. Start with ConnectButton + ConnectModal + WCv2 protocol. |
| **P2** | Native Kotlin Android SDK | 3-4 months | High | Build or fork reown-kotlin. Same scope as iOS. |
| **P2** | RN: Push notifications | 2-3 weeks | Medium | Integrate FCM/APNS for background session proposals. Requires relay-server enhancements. |
| **P2** | Flutter SDK | 2-3 months | Medium | Platform channels to Kotlin/Swift, or WebView-based approach (less ideal). |
| **P2** | .NET/Unity SDK | 2-3 months | Medium | C# implementation targeting Unity. Web3 gaming is a growth market. |
| **P3** | Rust SDK | 3-4 months | Medium | Foundation for FFI-based native SDKs. Long-term infrastructure investment. |

---

## 10. Strategic Recommendations

### 10.1 Short-Term (Next 4-8 Weeks) — Fix React Native

The RN package should be the **first priority** because:
- It's the only mobile package that exists
- The UI scaffolding is already in place
- The Phase 2 design doc explicitly targets RN in M2.6 (Week 11-12)
- React Native is the most practical cross-platform mobile target for a web3 startup

**Action plan**:
1. Add `@walletconnect/react-native-compat` and `@walletconnect/ethereum-provider` as dependencies
2. Rewrite `CinacoinProvider.connect()` to establish real WalletConnect v2 sessions
3. Implement deep linking in `ConnectModal` wallet selection
4. Replace QRScanner's simulated scan with real camera integration
5. Add session persistence layer
6. Write unit + integration tests
7. Create a demo RN app

### 10.2 Medium-Term (Months 3-6) — Native Mobile

After RN is production-ready:
1. **Choose build vs. fork**: Evaluate Reown SDK licenses (Apache 2.0) for forking feasibility
2. **Start with Kotlin** (Android has larger market share, easier to test)
3. **Parallel Swift** development
4. **Consider Rust as shared foundation**: If building from scratch, a Rust core with FFI bindings could serve both iOS and Android

### 10.3 Long-Term (Months 6-12) — Full Platform Coverage

1. Flutter SDK (if market demand justifies)
2. Unity/.NET SDK (if gaming partnerships exist)
3. Full push notification infrastructure
4. Multi-chain expansion (Solana, Bitcoin, Cosmos)

---

## 11. Architecture Suggestion: Protocol Abstraction Layer

Instead of scattering protocol code across each platform SDK, build a **protocol abstraction layer**:

```
@cinacoin/protocol-core     # TypeScript/WCv2 protocol (shared logic)
├── @cinacoin/react-native   # Uses protocol-core + RN UI
├── @cinacoin/ios            # Swift bindings to protocol-core (via RN bridge or FFI)
├── @cinacoin/android        # Kotlin bindings to protocol-core
└── @cinacoin/flutter        # Platform channels to protocol-core
```

Or, if choosing Rust:

```
cinacoin-rust-core          # Rust WalletConnect v2 implementation
├── cinacoin-swift          # Swift SDK (FFI to rust-core)
├── cinacoin-kotlin         # Kotlin SDK (JNI to rust-core)
├── cinacoin-react-native   # JS SDK (NAPI to rust-core)
└── cinacoin-flutter        # Flutter SDK (FFI to rust-core)
```

This mirrors Reown's approach (reown-rust as the foundation) and dramatically reduces per-platform development effort.

---

*Analysis complete. 03-mobile-platforms.md — 2026-05-16*
