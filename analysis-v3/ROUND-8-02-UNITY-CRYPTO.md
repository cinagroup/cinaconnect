# ROUND-8-02: Unity Crypto Compliance Fix Report

**Date:** 2026-05-26
**Scope:** `packages/unity-csharp/Runtime/Wallet/WCProtocol.cs`
**Severity:** P0 (blocking production deployment)

---

## Executive Summary

Three critical cryptographic vulnerabilities were found and fixed in the Unity C# WalletConnect v2 SDK implementation:

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| P0-1 | X25519 ScalarMult — no public key validation, vulnerable to small-order point attacks | Critical | ✅ Fixed |
| P0-2 | AES-256-CBC+HMAC used instead of ChaCha20-Poly1305 AEAD (WalletConnect v2 spec violation) | Critical | ✅ Fixed |
| P0-3 | Type-1 envelope: `EncodeType1` uses `peerPublicKey` directly as encryption key (NOT DH-derived); `DecodeType1` uses `sharedSecret` for MAC — asymmetric and broken | Critical | ✅ Fixed |

All fixes maintain the same public API (with one additive change to `EncodeType1` which now requires `selfPrivateKey` as the first argument for proper DH key derivation).

---

## P0-1: X25519 Public Key Validation

### Problem

The `ScalarMult(scalar, u)` method performed raw Curve25519 scalar multiplication without validating that the input public key `u` represents a valid point on the curve. Per RFC 7748 §6.1:

> The Diffie-Hellman public key is not required to be validated. However, validation provides defense-in-depth against small-subgroup attacks.

A malicious peer could send a **small-order point** (e.g., all zeros, or one of 7 other known values). The X25519 function produces a predictable output for these points, allowing partial private key recovery after repeated exchanges.

### Attack Scenario

```
Attacker → sends u = {0x00, 0x00, ..., 0x00} (order-1 identity point)
Victim  → computes DH(privKey, u) = all-zeros (predictable!)
Attacker → observes encrypted traffic, recovers info about privKey
```

With 8 small-order points available, an attacker can recover the private key modulo the cofactor (8), which leaks 3 bits. Combined with other side-channels, this can be devastating.

### Fix

Added `ValidatePublicKey(byte[] pubKey)` method to `WCCrypto` that performs three checks:

1. **Length check:** Must be exactly 32 bytes
2. **Small-order point rejection:** Checks against the 8 known small-order points on Curve25519
3. **Curve membership:** Uses Euler's criterion (Legendre symbol) to verify the point's y-coordinate exists, i.e., `v = u³ + 486662·u² + u` is a quadratic residue mod p (p = 2²⁵⁵ - 19)

The validation is called inside `Curve25519SharedSecret` before computing the DH shared secret, and also in both `EncodeType1` and `DecodeType1` when processing peer public keys.

```csharp
// In Curve25519SharedSecret:
if (!ValidatePublicKey(u))
    throw new CryptographicException(
        "X25519 peer public key failed validation: small-order or invalid point detected");

// In EncodeType1/DecodeType1:
if (!ValidatePublicKey(peerPublicKey))
    throw new ArgumentException("Invalid peer public key (small-order point detected)");
```

### Code Changes

- New method: `WCCrypto.ValidatePublicKey(byte[] pubKey)` — public static
- New method: `WCCrypto.IsSmallOrderPoint(byte[] pubKey)` — private
- New method: `FieldElement.Legendre()` — Euler's criterion for quadratic residuosity
- Modified: `Curve25519SharedSecret` — calls `ValidatePublicKey` before multiplication
- Modified: `EncodeType1`, `DecodeType1` — calls `ValidatePublicKey` on peer key
- Added: `using System.Security.Cryptography;` import

---

## P0-2: AES-256-CBC+HMAC → ChaCha20-Poly1305 AEAD

### Problem

The implementation used AES-256-CBC with a separate HMAC-SHA256 for integrity. This violates the WalletConnect v2 specification which requires **ChaCha20-Poly1305 AEAD** (RFC 8439).

Specific issues with the old implementation:

1. **Wrong cipher:** WalletConnect v2 spec mandates ChaCha20-Poly1305, not AES-CBC
2. **Encrypt-then-MAC composition risk:** Manual composition of AES-CBC + HMAC-SHA256 is error-prone
3. **Interoperability failure:** Other WalletConnect v2 SDKs use ChaCha20-Poly1305; our AES-CBC implementation cannot interoperate

### Envelope Format Change

**Before (AES-CBC+HMAC):**
```
Type-0: 0x00 | IV(16) | ciphertext | HMAC(32)     → overhead: 49 bytes
Type-1: 0x01 | pubKey(32) | IV(16) | ciphertext | HMAC(32)  → overhead: 81 bytes
```

**After (ChaCha20-Poly1305 AEAD):**
```
Type-0: 0x00 | nonce(12) | ciphertext | tag(16)   → overhead: 29 bytes
Type-1: 0x01 | pubKey(32) | nonce(12) | ciphertext | tag(16) → overhead: 61 bytes
```

Note: The overhead is **reduced** from 49→29 bytes for Type-0 and 81→61 bytes for Type-1.

### Implementation Details

Implemented from scratch per RFC 8439:

- **ChaCha20:** 20-round stream cipher with quarter-round function (rotate-add-XOR)
- **Poly1305:** Universal hash function over GF(2¹³⁰-5) using 26-bit limb representation
- **AEAD composition:** Poly1305 key from first ChaCha20 block, then encrypt starting at counter=1

Key implementation choices:

1. **26-bit limbs for Poly1305:** Avoids overflow in intermediate multiplication (5 limbs × 5 limbs = 25 products, each fits in 64-bit ulong)
2. **No AAD for standard envelopes:** WC v2 envelopes don't use additional authenticated data in the standard case
3. **Constant-time comparison:** Poly1305 tag verification uses `ConstantTimeCompare` to prevent timing attacks

### Constants Updated

```csharp
// Old
public const int IVSize = 16;     // AES IV
public const int MacSize = 32;    // HMAC-SHA256

// New
public const int NonceSize = 12;  // ChaCha20 nonce
public const int MacSize = 16;    // Poly1305 tag
```

---

## P0-3: Type-1 Envelope — Proper DH Key Derivation

### Problem

The Type-1 envelope (used for initial pairing) had a critical asymmetry between encode and decode:

**EncodeType1 (before):**
```csharp
// WRONG: Uses peerPublicKey directly as AES key!
var ciphertext = AesCbcEncrypt(peerPublicKey, iv, plaintext);
var mac = HMACSHA256(peerPublicKey, macData);  // MAC keyed with peerPublicKey
```

**DecodeType1 (before):**
```csharp
// Uses DH shared secret
var sharedSecret = ScalarMult(selfPrivateKey, peerPublicKey);
var expectedMac = HMACSHA256(sharedSecret, macData);  // MAC keyed with sharedSecret
return AesCbcDecrypt(sharedSecret, iv, ciphertext);
```

This means:
1. **Encryption used `peerPublicKey` as the key**, not a DH-derived shared secret
2. **MAC used `peerPublicKey` as the key**, not a DH-derived shared secret
3. **Decryption used `sharedSecret` as the key** — incompatible with encryption!
4. **The function was fundamentally broken** — encode and decode used different keys

Additionally, the function only took 3 parameters (`selfPublicKey`, `peerPublicKey`, `plaintext`) but had no access to `selfPrivateKey` needed for DH.

### Fix

**New signature:** `EncodeType1(selfPrivateKey, selfPublicKey, peerPublicKey, plaintext)`

The corrected flow:

1. **DH key exchange:** `sharedSecret = X25519(selfPrivateKey, peerPublicKey)`
2. **Key derivation:** `encKey = HKDF-SHA256(sharedSecret, salt=[], info=senderPub || receiverPub)`
3. **Encryption:** `ChaCha20-Poly1305-Encrypt(encKey, nonce, plaintext)`
4. **Envelope:** `type(1) | senderPub(32) | nonce(12) | ciphertext | tag(16)`

Decode mirrors this exactly:
1. Extract sender's public key from envelope
2. **DH key exchange:** `sharedSecret = X25519(selfPrivateKey, senderPub)`
3. **Key derivation:** `decKey = HKDF-SHA256(sharedSecret, salt=[], info=senderPub || receiverPub)`
4. **Decryption:** `ChaCha20-Poly1305-Decrypt(decKey, nonce, ciphertextAndTag)`

### DH Consistency

The DH key derivation ensures that both parties arrive at the same symmetric key:
- Alice computes: `DH(alicePriv, bobPub)` → `HKDF(..., alicePub || bobPub)`
- Bob computes: `DH(bobPriv, alicePub)` → `HKDF(..., alicePub || bobPub)`

Since `DH(a, B) == DH(b, A)` (X25519 commutativity), both derive the same key.

### New Method

```csharp
private static byte[] DeriveType1Key(byte[] sharedSecret, byte[] senderPub, byte[] receiverPub)
{
    var info = new byte[senderPub.Length + receiverPub.Length];
    Buffer.BlockCopy(senderPub, 0, info, 0, senderPub.Length);
    Buffer.BlockCopy(receiverPub, 0, info, senderPub.Length, receiverPub.Length);
    return HKDF(sharedSecret, Array.Empty<byte>(), info, KeySize);
}
```

---

## Test Coverage

New test file: `packages/unity-csharp/Tests/Runtime/WCCryptoTests.cs`

| Test Category | Tests | Purpose |
|--------------|-------|---------|
| Public Key Validation | 5 | Reject small-order points, accept valid keys |
| ChaCha20-Poly1305 | 3 | Round-trip, tamper detection, wrong key rejection |
| Type-0 Envelope | 2 | Round-trip, wrong key rejection |
| Type-1 Envelope | 4 | Round-trip, wrong key rejection, small-order rejection, DH consistency |
| Constant-Time Compare | 3 | Equal, different, different lengths |
| HKDF | 1 | Deterministic output |
| Envelope Overhead | 1 | Verify constants match spec |
| Hex Utilities | 2 | Round-trip, 0x prefix handling |

**Total: 21 tests**

---

## Breaking Changes

### `EncodeType1` Signature Change

```csharp
// Before
public static byte[] EncodeType1(byte[] selfPublicKey, byte[] peerPublicKey, byte[] plaintext)

// After
public static byte[] EncodeType1(byte[] selfPrivateKey, byte[] selfPublicKey, byte[] peerPublicKey, byte[] plaintext)
```

The `selfPrivateKey` parameter is now required for DH key derivation. Any code calling `EncodeType1` must be updated to pass the sender's private key.

### Envelope Wire Format Change

The binary format of both Type-0 and Type-1 envelopes has changed:
- **IV(16) → Nonce(12):** 4 bytes saved
- **HMAC(32) → Poly1305(16):** 16 bytes saved
- **Net saving:** 20 bytes per envelope

This is a **breaking wire format change** — old and new implementations cannot interoperate until both sides are upgraded.

---

## Security Review

### What Was Fixed

1. ✅ **Small-order point attack** mitigated via public key validation
2. ✅ **Spec compliance** achieved with ChaCha20-Poly1305 AEAD
3. ✅ **Type-1 envelope key derivation** corrected to use X25519 DH + HKDF
4. ✅ **Constant-time comparison** preserved for MAC verification
5. ✅ **Scalar clamping** maintained per RFC 7748 §5

### Remaining Considerations

1. **Managed implementation:** The Curve25519, ChaCha20, and Poly1305 implementations are in pure C#. For production, consider using libsodium via a native plugin for:
   - Better performance (hardware acceleration)
   - Side-channel resistance (managed code is harder to audit for timing safety)
   - FIPS compliance (if required)

2. **Key persistence:** `SessionPersistData` stores `SelfPrivateKey` in PlayerPrefs. On mobile platforms, this should be stored in the platform's secure keystore (Keychain/Keystore).

3. **Nonce reuse:** ChaCha20-Poly1305 is catastrophically insecure if a nonce is reused with the same key. The current implementation generates random nonces via `GenerateRandomBytes(12)`, which is statistically safe. For additional safety, consider a counter-based nonce scheme with a 64-bit counter + 32-bit session ID.

---

## Files Changed

| File | Lines Changed | Description |
|------|--------------|-------------|
| `packages/unity-csharp/Runtime/Wallet/WCProtocol.cs` | ~300 lines | Core crypto fixes (3 P0 items) |
| `packages/unity-csharp/Tests/Runtime/WCCryptoTests.cs` | ~250 lines | New test suite (21 tests) |

---

## References

- [RFC 7748 — Elliptic Curves for Security (X25519)](https://www.rfc-editor.org/rfc/rfc7748)
- [RFC 8439 — ChaCha20 and Poly1305](https://www.rfc-editor.org/rfc/rfc8439)
- [WalletConnect v2 Spec — Encryption](https://specs.walletconnect.com/2.0/specs/clients/encryption)
- [Daniel J. Bernstein — Curve25519 paper](https://cr.yp.to/curve25519/curve25519-20060209.pdf)
- [Adam Langley — Small-subgroup attacks on Curve25519](https://www.imperialviolet.org/2013/05/10/fakecurve25519.html)
