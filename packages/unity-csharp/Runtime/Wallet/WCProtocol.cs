using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;

namespace Cinacoin.WalletConnect
{
    // ═══════════════════════════════════════════════════════════════════
    // WalletConnect v2 Protocol Implementation for Unity (C#)
    // Covers: Crypto (X25519 + AES-256-CBC), Relay WS, Pairing, Session
    // ═══════════════════════════════════════════════════════════════════

    #region --- Crypto Utilities (X25519 DH + AES-256-CBC + HMAC-SHA256) ---

    /// <summary>
    /// Crypto layer for WalletConnect v2.
    /// Implements X25519 Diffie-Hellman + AES-256-CBC encryption.
    /// Uses Curve25519 for key agreement, AES-CBC for message encryption.
    /// In Unity, we rely on .NET's System.Security.Cryptography.
    /// X25519 requires a native implementation; we provide a managed fallback
    /// using Curve25519-Donna-style scalar multiplication or delegate to a
    /// platform-specific plugin.
    /// </summary>
    public static class WCCrypto
    {
        /// Length of X25519 keys in bytes.
        public const int KeySize = 32;

        /// Length of ChaCha20-Poly1305 nonce.
        public const int NonceSize = 12;

        /// Length of Poly1305 MAC tag.
        public const int MacSize = 16;

        /// Encrypted envelope overhead: nonce + MAC tag.
        public const int EnvelopeOverhead = NonceSize + MacSize;

        /// WC v2 type-0 envelope overhead (tag 0 | nonce | ciphertext | tag).
        public const int Type0EnvelopeOverhead = 1 + NonceSize + MacSize;

        /// WC v2 type-1 envelope overhead (tag 1 | ephemeral_pub | nonce | ciphertext | tag).
        public const int Type1EnvelopeOverhead = 1 + KeySize + NonceSize + MacSize;

        /// Generate 32 random bytes for a key pair seed.
        public static byte[] GenerateRandomBytes(int length = KeySize)
        {
            var bytes = new byte[length];
#if !UNITY_EDITOR && (UNITY_IOS || UNITY_ANDROID)
            // Use Unity's crypto RNG on mobile
            var rng = new System.Security.Cryptography.RandomNumberGenerator();
            rng.GetBytes(bytes);
#else
            using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
            rng.GetBytes(bytes);
#endif
            return bytes;
        }

        /// Generate an X25519 key pair.
        /// Returns (privateKey, publicKey) each 32 bytes.
        /// NOTE: X25519 scalar multiplication requires Curve25519.
        /// For production Unity builds, integrate libsodium or a native plugin.
        /// This implementation provides the interface; actual crypto
        /// delegates to a configurable backend.
        public static (byte[] privateKey, byte[] publicKey) GenerateKeyPair()
        {
            var privateKey = GenerateRandomBytes(KeySize);
            var publicKey = ScalarMultBase(privateKey);
            return (privateKey, publicKey);
        }

        /// X25519 scalar multiplication: base point * scalar → public key.
        public static byte[] ScalarMultBase(byte[] scalar)
        {
            // Clamp the scalar per RFC 7748 §5
            var clamped = (byte[])scalar.Clone();
            clamped[0] &= 248;
            clamped[31] &= 127;
            clamped[31] |= 64;

            // Delegate to backend. In production, use libsodium or Curve25519-Donna.
            return Curve25519ScalarMultBase(clamped);
        }

        /// X25519 Diffie-Hellman shared secret: scalar * u-coordinate.
        public static byte[] ScalarMult(byte[] scalar, byte[] u)
        {
            var clamped = (byte[])scalar.Clone();
            clamped[0] &= 248;
            clamped[31] &= 127;
            clamped[31] |= 64;

            return Curve25519SharedSecret(clamped, u);
        }

        /// HKDF (HMAC-based Extract-and-Expand Key Derivation Function).
        public static byte[] HKDF(byte[] ikm, byte[] salt, byte[] info, int length = KeySize)
        {
            // Extract
            var prk = HMACSHA256(salt, ikm);

            // Expand
            var okm = new byte[length];
            var t = Array.Empty<byte>();
            int offset = 0;
            byte counter = 1;
            while (offset < length)
            {
                var input = new byte[t.Length + info.Length + 1];
                Buffer.BlockCopy(t, 0, input, 0, t.Length);
                Buffer.BlockCopy(info, 0, input, t.Length, info.Length);
                input[input.Length - 1] = counter;

                t = HMACSHA256(prk, input);
                var chunkLen = Math.Min(MacSize, length - offset);
                Buffer.BlockCopy(t, 0, okm, offset, chunkLen);
                offset += chunkLen;
                counter++;
            }

            return okm;
        }

        /// ChaCha20-Poly1305 AEAD encrypt (RFC 8439).
        /// key: 32 bytes, nonce: 12 bytes.
        public static byte[] ChaCha20Poly1305Encrypt(byte[] key, byte[] nonce, byte[] plaintext, byte[] aad = null)
        {
            var polyKey = ChaCha20Block(key, nonce, 0);
            var ciphertext = ChaCha20Crypt(key, nonce, plaintext, 1);
            var tag = Poly1305Mac(polyKey, aad, ciphertext);
            var result = new byte[ciphertext.Length + MacSize];
            Buffer.BlockCopy(ciphertext, 0, result, 0, ciphertext.Length);
            Buffer.BlockCopy(tag, 0, result, ciphertext.Length, MacSize);
            return result;
        }

        /// ChaCha20-Poly1305 AEAD decrypt (RFC 8439).
        /// key: 32 bytes, nonce: 12 bytes.
        public static byte[] ChaCha20Poly1305Decrypt(byte[] key, byte[] nonce, byte[] ciphertextWithTag, byte[] aad = null)
        {
            if (ciphertextWithTag.Length < MacSize)
                throw new ArgumentException("Ciphertext too short");

            var ctLen = ciphertextWithTag.Length - MacSize;
            var ciphertext = new byte[ctLen];
            var tag = new byte[MacSize];
            Buffer.BlockCopy(ciphertextWithTag, 0, ciphertext, 0, ctLen);
            Buffer.BlockCopy(ciphertextWithTag, ctLen, tag, 0, MacSize);

            var polyKey = ChaCha20Block(key, nonce, 0);
            var expectedTag = Poly1305Mac(polyKey, aad, ciphertext);
            if (!ConstantTimeCompare(tag, expectedTag))
                throw new InvalidOperationException("Poly1305 MAC verification failed");

            return ChaCha20Crypt(key, nonce, ciphertext, 1);
        }

        /// ChaCha20 core — generate a single 64-byte keystream block.
        private static byte[] ChaCha20Block(byte[] key, byte[] nonce, uint counter)
        {
            var state = new uint[16];
            // Constants "expa" "nd 3" "2-by" "te-k"
            state[0] = 0x61707865; state[1] = 0x3320646e;
            state[2] = 0x79622d32; state[3] = 0x6b206574;
            // Key (8 x 32-bit LE)
            for (int i = 0; i < 8; i++)
                state[4 + i] = LE32(key, i * 4);
            // Counter
            state[12] = counter;
            // Nonce (3 x 32-bit LE)
            state[13] = LE32(nonce, 0);
            state[14] = LE32(nonce, 4);
            state[15] = LE32(nonce, 8);

            var x = (uint[])state.Clone();
            ChaCha20Rounds(x);

            var outBytes = new byte[64];
            for (int i = 0; i < 16; i++)
            {
                var w = x[i] + state[i];
                outBytes[i * 4 + 0] = (byte)(w & 0xff);
                outBytes[i * 4 + 1] = (byte)((w >> 8) & 0xff);
                outBytes[i * 4 + 2] = (byte)((w >> 16) & 0xff);
                outBytes[i * 4 + 3] = (byte)((w >> 24) & 0xff);
            }
            return outBytes;
        }

        /// ChaCha20 encryption/decryption (symmetric).
        private static byte[] ChaCha20Crypt(byte[] key, byte[] nonce, byte[] data, uint initialCounter)
        {
            var result = new byte[data.Length];
            var counter = initialCounter;
            var offset = 0;

            while (offset < data.Length)
            {
                var block = ChaCha20Block(key, nonce, counter);
                var len = Math.Min(64, data.Length - offset);
                for (int i = 0; i < len; i++)
                    result[offset + i] = (byte)(data[offset + i] ^ block[i]);
                offset += len;
                counter++;
            }
            return result;
        }

        /// ChaCha20 quarter round.
        private static void QuarterRound(uint[] x, int a, int b, int c, int d)
        {
            x[a] += x[b]; x[d] = RotL32(x[d] ^ x[a], 16);
            x[c] += x[d]; x[b] = RotL32(x[b] ^ x[c], 12);
            x[a] += x[b]; x[d] = RotL32(x[d] ^ x[a], 8);
            x[c] += x[d]; x[b] = RotL32(x[b] ^ x[c], 7);
        }

        /// 20 rounds (10 double-rounds) of ChaCha20.
        private static void ChaCha20Rounds(uint[] x)
        {
            for (int i = 0; i < 10; i++)
            {
                // Column rounds
                QuarterRound(x, 0, 4, 8, 12);
                QuarterRound(x, 1, 5, 9, 13);
                QuarterRound(x, 2, 6, 10, 14);
                QuarterRound(x, 3, 7, 11, 15);
                // Diagonal rounds
                QuarterRound(x, 0, 5, 10, 15);
                QuarterRound(x, 1, 6, 11, 12);
                QuarterRound(x, 2, 7, 8, 13);
                QuarterRound(x, 3, 4, 9, 14);
            }
        }

        /// 32-bit left rotation.
        private static uint RotL32(uint x, int n) => (x << n) | (x >> (32 - n));

        /// Read 32-bit LE from byte array.
        private static uint LE32(byte[] buf, int offset)
        {
            return (uint)buf[offset] | ((uint)buf[offset + 1] << 8)
                | ((uint)buf[offset + 2] << 16) | ((uint)buf[offset + 3] << 24);
        }

        /// Write 32-bit LE to byte array.
        private static void WriteLE32(byte[] buf, int offset, uint v)
        {
            buf[offset] = (byte)(v & 0xff);
            buf[offset + 1] = (byte)((v >> 8) & 0xff);
            buf[offset + 2] = (byte)((v >> 16) & 0xff);
            buf[offset + 3] = (byte)((v >> 24) & 0xff);
        }

        /// Poly1305 MAC (RFC 8439).
        /// polyKey: first 32 bytes of ChaCha20 keystream block 0.
        private static byte[] Poly1305Mac(byte[] polyKey, byte[] aad, byte[] ciphertext)
        {
            // Clamp r (first 16 bytes)
            var r = new uint[5];
            ClampAndParseR(polyKey, r);

            // Parse s (next 16 bytes) into 26-bit limbs
            ulong s0 = (uint)(LE32(polyKey, 16) & 0x3FFFFFF);
            ulong s1 = (uint)(((LE32(polyKey, 16) >> 26) | (LE32(polyKey, 20) << 6)) & 0x3FFFFFF);
            ulong s2 = (uint)((LE32(polyKey, 20) >> 20) | ((LE32(polyKey, 24) << 12) & 0x3FFFFFF));
            ulong s3 = (uint)((LE32(polyKey, 24) >> 14) | ((LE32(polyKey, 28) << 18) & 0x3FFFFFF));
            ulong s4 = (uint)(LE32(polyKey, 28) >> 8);

            // Accumulator (5 x 26-bit limbs)
            ulong h0 = 0, h1 = 0, h2 = 0, h3 = 0, h4 = 0;

            // Process AAD then ciphertext
            Poly1305Process(aad, r, ref h0, ref h1, ref h2, ref h3, ref h4);
            Poly1305Process(ciphertext, r, ref h0, ref h1, ref h2, ref h3, ref h4);

            // Fully reduce
            Poly1305FinalReduce(ref h0, ref h1, ref h2, ref h3, ref h4);

            // Add s (mod 2^130-5)
            h0 += s0;
            h1 += s1;
            h2 += s2;
            h3 += s3;
            h4 += s4;

            // Final reduce to canonical form
            Poly1305FinalReduce(ref h0, ref h1, ref h2, ref h3, ref h4);

            // Serialize 16-byte tag from 5 x 26-bit limbs (little-endian)
            var tag = new byte[16];
            uint f0 = (uint)(h0 | (h1 << 26));
            uint f1 = (uint)((h1 >> 6) | (h2 << 20));
            uint f2 = (uint)((h2 >> 12) | (h3 << 14));
            uint f3 = (uint)((h3 >> 18) | (h4 << 8));
            WriteLE32(tag, 0, f0);
            WriteLE32(tag, 4, f1);
            WriteLE32(tag, 8, f2);
            WriteLE32(tag, 12, f3);
            return tag;
        }

        /// Clamp and parse r from 32 bytes into 5 x 26-bit limbs.
        private static void ClampAndParseR(byte[] polyKey, uint[] r)
        {
            var raw = new byte[16];
            Buffer.BlockCopy(polyKey, 0, raw, 0, 16);

            // Clamp per RFC 8439 §2.5
            raw[3] &= 15; raw[4] &= 252; raw[7] &= 15;
            raw[8] &= 252; raw[11] &= 15; raw[12] &= 252; raw[15] &= 15;

            // Parse into 26-bit limbs (little-endian)
            r[0] = (uint)(raw[0] | (raw[1] << 8) | (raw[2] << 16) | ((raw[3] & 3) << 24));
            r[1] = (uint)((raw[3] >> 2) | (raw[4] << 6) | (raw[5] << 14) | ((raw[6] & 0xf) << 22));
            r[2] = (uint)((raw[6] >> 4) | (raw[7] << 4) | (raw[8] << 12) | ((raw[9] & 0x3f) << 20));
            r[3] = (uint)((raw[9] >> 6) | (raw[10] << 2) | (raw[11] << 10) | ((raw[12] & 0x1f) << 18));
            r[4] = (uint)((raw[12] >> 5) | (raw[13] << 3) | (raw[14] << 11) | (raw[15] << 19));
        }

        /// Process data through Poly1305 in 16-byte blocks.
        private static void Poly1305Process(byte[] data, uint[] r,
            ref ulong h0, ref ulong h1, ref ulong h2, ref ulong h3, ref ulong h4)
        {
            if (data == null || data.Length == 0) return;

            int blocks = (data.Length + 15) / 16;
            for (int i = 0; i < blocks; i++)
            {
                int off = i * 16;
                int len = Math.Min(16, data.Length - off);

                // Read bytes into a padded 17-byte buffer (extra byte for hibit)
                var block = new byte[17];
                for (int j = 0; j < len; j++)
                    block[j] = data[off + j];
                block[len] = 0x01; // hibit: marks end of data

                // Parse into 5 x 26-bit limbs (little-endian)
                ulong b0 = (uint)(block[0] | (block[1] << 8) | (block[2] << 16) | (block[3] << 24));
                ulong b1 = (uint)((block[3] >> 2) | (block[4] << 6) | (block[5] << 14) | (block[6] << 22));
                ulong b2 = (uint)((block[6] >> 4) | (block[7] << 4) | (block[8] << 12) | (block[9] << 20));
                ulong b3 = (uint)((block[9] >> 6) | (block[10] << 2) | (block[11] << 10) | (block[12] << 18));
                ulong b4 = (uint)((block[12] >> 4) | (block[13] << 4) | (block[14] << 12) | (block[15] << 20) | (block[16] << 28));

                // Add block to accumulator
                h0 += b0; h1 += b1; h2 += b2; h3 += b3; h4 += b4;

                // Multiply by r mod p (p = 2^130 - 5)
                ulong t0 = h0 * r[0] + h1 * (5 * r[4]) + h2 * (5 * r[3]) + h3 * (5 * r[2]) + h4 * (5 * r[1]);
                ulong t1 = h0 * r[1] + h1 * r[0]       + h2 * (5 * r[4]) + h3 * (5 * r[3]) + h4 * (5 * r[2]);
                ulong t2 = h0 * r[2] + h1 * r[1]       + h2 * r[0]       + h3 * (5 * r[4]) + h4 * (5 * r[3]);
                ulong t3 = h0 * r[3] + h1 * r[2]       + h2 * r[1]       + h3 * r[0]       + h4 * (5 * r[4]);
                ulong t4 = h0 * r[4] + h1 * r[3]       + h2 * r[2]       + h3 * r[1]       + h4 * r[0];

                h0 = t0; h1 = t1; h2 = t2; h3 = t3; h4 = t4;

                // Partial reduction
                Poly1305PartialReduce(ref h0, ref h1, ref h2, ref h3, ref h4);
            }
        }

        /// Partial reduction: ensure each limb < 2^26.
        private static void Poly1305PartialReduce(ref ulong h0, ref ulong h1, ref ulong h2, ref ulong h3, ref ulong h4)
        {
            ulong c;
            c = h0 >> 26; h0 &= 0x3FFFFFF; h1 += c;
            c = h1 >> 26; h1 &= 0x3FFFFFF; h2 += c;
            c = h2 >> 26; h2 &= 0x3FFFFFF; h3 += c;
            c = h3 >> 26; h3 &= 0x3FFFFFF; h4 += c;
            c = h4 >> 26; h4 &= 0x3FFFFFF; h0 += c * 5;
            c = h0 >> 26; h0 &= 0x3FFFFFF; h1 += c;
        }

        /// Final reduction: fully reduce to canonical form.
        private static void Poly1305FinalReduce(ref ulong h0, ref ulong h1, ref ulong h2, ref ulong h3, ref ulong h4)
        {
            // Repeat partial reduction a few times to ensure full reduction
            Poly1305PartialReduce(ref h0, ref h1, ref h2, ref h3, ref h4);
            Poly1305PartialReduce(ref h0, ref h1, ref h2, ref h3, ref h4);
            Poly1305PartialReduce(ref h0, ref h1, ref h2, ref h3, ref h4);
        }

        /// HMAC-SHA256.
        public static byte[] HMACSHA256(byte[] key, byte[] data)
        {
            using var hmac = new System.Security.Cryptography.HMACSHA256(key);
            return hmac.ComputeHash(data);
        }

        /// SHA-256 hash.
        public static byte[] SHA256(byte[] data)
        {
            using var sha = System.Security.Cryptography.SHA256.Create();
            return sha.ComputeHash(data);
        }

        /// Encode a WC v2 type-0 envelope (for established sessions).
        /// Format: type(1) | nonce(12) | ciphertext | tag(16)
        /// Uses ChaCha20-Poly1305 AEAD per WalletConnect v2 spec.
        public static byte[] EncodeType0(byte[] key, byte[] plaintext)
        {
            var nonce = GenerateRandomBytes(NonceSize);
            var aead = ChaCha20Poly1305Encrypt(key, nonce, plaintext);

            var envelope = new byte[1 + nonce.Length + aead.Length];
            envelope[0] = 0; // type-0
            Buffer.BlockCopy(nonce, 0, envelope, 1, nonce.Length);
            Buffer.BlockCopy(aead, 0, envelope, 1 + nonce.Length, aead.Length);
            return envelope;
        }

        /// Decode a WC v2 type-0 envelope.
        public static byte[] DecodeType0(byte[] key, byte[] envelope)
        {
            if (envelope.Length < 1 + NonceSize + MacSize)
                throw new ArgumentException("Envelope too short");

            if (envelope[0] != 0)
                throw new ArgumentException($"Expected type-0 envelope, got type {envelope[0]}");

            var nonce = new byte[NonceSize];
            Buffer.BlockCopy(envelope, 1, nonce, 0, NonceSize);

            var aead = new byte[envelope.Length - 1 - NonceSize];
            Buffer.BlockCopy(envelope, 1 + NonceSize, aead, 0, aead.Length);

            return ChaCha20Poly1305Decrypt(key, nonce, aead);
        }

        /// Encode a WC v2 type-1 envelope (for initial pairing with senderPublicKey).
        /// Uses X25519 DH to derive a shared key, then ChaCha20-Poly1305 AEAD.
        /// Format: type(1) | sender_public_key(32) | nonce(12) | ciphertext | tag(16)
        public static byte[] EncodeType1(
            byte[] selfPrivateKey, byte[] selfPublicKey, byte[] peerPublicKey, byte[] plaintext)
        {
            // Validate peer public key to prevent small-order attacks
            if (!ValidatePublicKey(peerPublicKey))
                throw new ArgumentException("Invalid peer public key (small-order point detected)");

            // X25519 Diffie-Hellman to derive shared secret
            var sharedSecret = ScalarMult(selfPrivateKey, peerPublicKey);

            // Derive encryption key from shared secret per WC v2 spec
            var encKey = DeriveType1Key(sharedSecret, selfPublicKey, peerPublicKey);

            var nonce = GenerateRandomBytes(NonceSize);
            var aead = ChaCha20Poly1305Encrypt(encKey, nonce, plaintext);

            var envelope = new byte[1 + selfPublicKey.Length + nonce.Length + aead.Length];
            envelope[0] = 1; // type-1
            Buffer.BlockCopy(selfPublicKey, 0, envelope, 1, selfPublicKey.Length);
            Buffer.BlockCopy(nonce, 0, envelope, 1 + selfPublicKey.Length, nonce.Length);
            Buffer.BlockCopy(aead, 0, envelope, 1 + selfPublicKey.Length + nonce.Length, aead.Length);
            return envelope;
        }

        /// Decode a WC v2 type-1 envelope.
        public static byte[] DecodeType1(byte[] selfPrivateKey, byte[] envelope)
        {
            if (envelope.Length < 1 + KeySize + NonceSize + MacSize)
                throw new ArgumentException("Envelope too short");

            if (envelope[0] != 1)
                throw new ArgumentException($"Expected type-1 envelope, got type {envelope[0]}");

            var peerPublicKey = new byte[KeySize];
            Buffer.BlockCopy(envelope, 1, peerPublicKey, 0, KeySize);

            // Validate peer public key to prevent small-order attacks
            if (!ValidatePublicKey(peerPublicKey))
                throw new ArgumentException("Invalid peer public key (small-order point detected)");

            // X25519 Diffie-Hellman to derive shared secret
            var sharedSecret = ScalarMult(selfPrivateKey, peerPublicKey);

            // Derive decryption key from shared secret per WC v2 spec
            var selfPublicKey = ScalarMultBase(selfPrivateKey);
            var decKey = DeriveType1Key(sharedSecret, selfPublicKey, peerPublicKey);

            var nonceStart = 1 + KeySize;
            var nonce = new byte[NonceSize];
            Buffer.BlockCopy(envelope, nonceStart, nonce, 0, NonceSize);

            var aeadStart = nonceStart + NonceSize;
            var aead = new byte[envelope.Length - aeadStart];
            Buffer.BlockCopy(envelope, aeadStart, aead, 0, aead.Length);

            return ChaCha20Poly1305Decrypt(decKey, nonce, aead);
        }

        /// Derive Type-1 envelope key from shared secret per WalletConnect v2 spec.
        /// Uses HKDF-SHA256 with sender and receiver public keys as info.
        private static byte[] DeriveType1Key(byte[] sharedSecret, byte[] senderPub, byte[] receiverPub)
        {
            var info = new byte[senderPub.Length + receiverPub.Length];
            Buffer.BlockCopy(senderPub, 0, info, 0, senderPub.Length);
            Buffer.BlockCopy(receiverPub, 0, info, senderPub.Length, receiverPub.Length);

            return HKDF(sharedSecret, Array.Empty<byte>(), info, KeySize);
        }

        /// Derive session keys from shared secret per WC v2 spec.
        public static (byte[] encryptionKey, byte[] decryptionKey) DeriveSessionKeys(byte[] sharedSecret)
        {
            var salt = Encoding.UTF8.GetBytes("wc_session_key_salt");
            var encKey = HKDF(sharedSecret, salt, Encoding.UTF8.GetBytes("wc_session_encryption_key"));
            var decKey = HKDF(sharedSecret, salt, Encoding.UTF8.GetBytes("wc_session_decryption_key"));
            return (encKey, decKey);
        }

        /// Derive symmetric key from shared secret for type-0.
        public static byte[] DeriveSymmetricKey(byte[] sharedSecret)
        {
            var salt = Encoding.UTF8.GetBytes("wc_symmetric_key_salt");
            return HKDF(sharedSecret, salt, Encoding.UTF8.GetBytes("wc_symmetric_key"));
        }

        /// Constant-time byte array comparison (prevents timing attacks).
        public static bool ConstantTimeCompare(byte[] a, byte[] b)
        {
            if (a.Length != b.Length) return false;
            int result = 0;
            for (int i = 0; i < a.Length; i++)
                result |= a[i] ^ b[i];
            return result == 0;
        }

        /// Hex encode bytes to lowercase string.
        public static string ToHex(byte[] bytes)
        {
            var sb = new StringBuilder(bytes.Length * 2);
            foreach (var b in bytes)
                sb.Append(b.ToString("x2"));
            return sb.ToString();
        }

        /// Hex decode string to bytes.
        public static byte[] FromHex(string hex)
        {
            if (hex.StartsWith("0x") || hex.StartsWith("0X"))
                hex = hex.Substring(2);
            var bytes = new byte[hex.Length / 2];
            for (int i = 0; i < bytes.Length; i++)
                bytes[i] = Convert.ToByte(hex.Substring(i * 2, 2), 16);
            return bytes;
        }

        // ─── Curve25519 Implementation ─────────────────────────────────
        // Managed Curve25519 scalar multiplication (Montgomery ladder).
        // Based on the reference implementation from Bernstein's paper.

        private static readonly byte[] Curve25519BasePoint =
        {
            0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        };

        private static byte[] Curve25519ScalarMultBase(byte[] scalar)
        {
            return Curve25519ScalarMult(scalar, Curve25519BasePoint);
        }

        private static byte[] Curve25519SharedSecret(byte[] scalar, byte[] u)
        {
            // P0-1: Validate the peer public key before computing shared secret.
            // This prevents small-order point attacks where a malicious peer
            // sends a point of small order, allowing partial key recovery.
            if (!ValidatePublicKey(u))
                throw new CryptographicException(
                    "X25519 peer public key failed validation: small-order or invalid point detected");

            return Curve25519ScalarMult(scalar, u);
        }

        /// Validate a Curve25519 public key.
        /// Returns false if the point is the identity (all zeros), is a small-order
        /// point, or is not on the curve. Per RFC 7748, the X25519 function accepts
        /// all 32-byte strings, but some map to small-order points.
        ///
        /// The small-order points on Curve25519 are well-known (8 total):
        /// - 0x00...00 (order 1, identity)
        /// - 0x01...00 (order 2)
        /// - 0xC0...00, 0xE0...00, 0x20...00, 0xA0...00, 0x40...00, 0x60...00 (order 4 and 8)
        ///
        /// We check against these known values plus verify the point is on the curve.
        public static bool ValidatePublicKey(byte[] pubKey)
        {
            if (pubKey == null || pubKey.Length != KeySize)
                return false;

            // Check for all-zero key (identity point)
            bool allZero = true;
            for (int i = 0; i < pubKey.Length; i++)
            {
                if (pubKey[i] != 0) { allZero = false; break; }
            }
            if (allZero) return false;

            // Check for known small-order points on Curve25519
            // These are the 8 points where the Montgomery ladder produces predictable output
            if (IsSmallOrderPoint(pubKey)) return false;

            // Verify the point is on the curve: v = (u^3 + A*u^2 + u) must be a quadratic residue mod p
            // For Curve25519 (Montgomery form): By^2 = x^3 + Ax^2 + x where A=486662
            // We check if (u^3 + A*u^2 + u) is a square mod p
            try
            {
                var u = new FieldElement(pubKey);
                var u2 = u * u;
                var u3 = u2 * u;
                var aVal = FieldElement.FromValue(486662);
                // x^3 + Ax^2 + x
                var v = u3 + aVal * u2 + u;

                // Check if v is a quadratic residue using Euler's criterion:
                // v^((p-1)/2) ≡ 1 (mod p) for residues, ≡ -1 for non-residues
                var result = v.Legendre();
                // result should be 1 (quadratic residue) or 0 (v=0, which is on the curve)
                if (result != 1 && result != 0)
                    return false;

                return true;
            }
            catch
            {
                return false;
            }
        }

        /// Check if a public key is one of the 8 known small-order points.
        private static bool IsSmallOrderPoint(byte[] pubKey)
        {
            // Known small-order points on Curve25519 (little-endian):
            // Order 1: 0x00 * 32 (identity)
            // Order 2: 0x01, 0x00 * 31
            // Order 4: 0xC0...00, 0xE0...00
            // Order 8: 0x20...00, 0xA0...00, 0x40...00, 0x60...00
            //
            // In little-endian, the high byte is the LAST byte (index 31).
            // But since all small-order points have zeros in bytes 1-30,
            // we just check bytes 0 and 31.

            // Check all middle bytes are zero
            for (int i = 1; i < 31; i++)
            {
                if (pubKey[i] != 0) return false;
            }

            // Check first byte and last byte combinations
            byte b0 = pubKey[0];
            byte b31 = pubKey[31];

            // All small-order points have b31 == 0
            if (b31 != 0) return false;

            // Valid small-order first bytes: 0x00, 0x01, 0x40, 0x60, 0x20, 0xA0, 0xC0, 0xE0
            return b0 == 0x00 || b0 == 0x01 || b0 == 0x40 || b0 == 0x60
                || b0 == 0x20 || b0 == 0xA0 || b0 == 0xC0 || b0 == 0xE0;
        }

        private static byte[] Curve25519ScalarMult(byte[] n, byte[] u)
        {
            // Montgomery ladder for Curve25519 over F_p where p = 2^255 - 19
            var x1 = new FieldElement(u);
            var x2 = FieldElement.One();
            var z2 = FieldElement.Zero();
            var x3 = x1;
            var z3 = FieldElement.One();
            var swap = 0;

            for (int pos = 254; pos >= 0; pos--)
            {
                var b = (n[pos / 8] >> (pos & 7)) & 1;
                swap ^= b;
                Swap(ref x2, ref x3, swap);
                Swap(ref z2, ref z3, swap);
                swap = b;

                // Montgomery step
                var a = x2 + z2;
                var aa = a * a;
                var b = x2 - z2;
                var bb = b * b;
                var e = aa - bb;
                var c = x3 + z3;
                var d = x3 - z3;
                var da = d * a;
                var cb = c * b;
                var x3n = (da + cb) * (da + cb);
                var z3n = x1 * (da - cb) * (da - cb);
                var x2n = aa * bb;
                var z2n = e * (aa + e * FieldElement.FromValue(121665));

                x2 = x2n; z2 = z2n; x3 = x3n; z3 = z3n;
            }

            Swap(ref x2, ref x3, swap);

            var z2Inv = z2.Invert();
            var result = x2 * z2Inv;
            return result.ToBytes32();
        }

        private static void Swap(ref FieldElement a, ref FieldElement b, int swap)
        {
            if (swap == 1)
            {
                var temp = a;
                a = b;
                b = temp;
            }
        }

        /// Prime field element for p = 2^255 - 19.
        private struct FieldElement
        {
            // 10 limbs of 26 bits each (radix 2^26, 2^25 alternating).
            public readonly long t0, t1, t2, t3, t4, t5, t6, t7, t8, t9;

            public FieldElement(long t0, long t1, long t2, long t3, long t4,
                                long t5, long t6, long t7, long t8, long t9)
            {
                this.t0 = t0; this.t1 = t1; this.t2 = t2;
                this.t3 = t3; this.t4 = t4; this.t5 = t5;
                this.t6 = t6; this.t7 = t7; this.t8 = t8; this.t9 = t9;
            }

            public FieldElement(byte[] bytes32)
            {
                // Load 32-byte little-endian into 10 limbs
                t0 = (bytes32[0]) | ((long)bytes32[1] << 8) | ((long)bytes32[2] << 16) | ((long)(bytes32[3] & 3) << 24);
                t1 = ((long)(bytes32[3] >> 2) & 0x3f) | ((long)bytes32[4] << 6) | ((long)bytes32[5] << 14) | ((long)(bytes32[6] & 0xf) << 22);
                t2 = ((long)(bytes32[6] >> 4) & 0xf) | ((long)bytes32[7] << 4) | ((long)bytes32[8] << 12) | ((long)(bytes32[9] & 0x3f) << 20);
                t3 = ((long)(bytes32[9] >> 6) & 0x3) | ((long)bytes32[10] << 2) | ((long)bytes32[11] << 10) | ((long)bytes32[12] << 18);
                t4 = ((long)bytes32[13]) | ((long)bytes32[14] << 8) | ((long)(bytes32[15] & 0x7f) << 16);
                t5 = ((long)(bytes32[15] >> 7) & 0x1) | ((long)bytes32[16] << 1) | ((long)bytes32[17] << 9) | ((long)(bytes32[18] & 0x1f) << 17);
                t6 = ((long)(bytes32[18] >> 5) & 0x7) | ((long)bytes32[19] << 3) | ((long)bytes32[20] << 11) | ((long)(bytes32[21] & 0x7f) << 19);
                t7 = ((long)(bytes32[21] >> 7)) | ((long)bytes32[22] << 1) | ((long)bytes32[23] << 9) | ((long)(bytes32[24] & 0xf) << 17);
                t8 = ((long)(bytes32[24] >> 4)) | ((long)bytes32[25] << 4) | ((long)bytes32[26] << 12) | ((long)(bytes32[27] & 0x3f) << 20);
                t9 = ((long)(bytes32[27] >> 6)) | ((long)bytes32[28] << 2) | ((long)bytes32[29] << 10) | ((long)bytes32[30] << 18);
            }

            public static FieldElement Zero => new FieldElement(0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
            public static FieldElement One => new FieldElement(1, 0, 0, 0, 0, 0, 0, 0, 0, 0);
            public static FieldElement FromValue(long v) => new FieldElement(v, 0, 0, 0, 0, 0, 0, 0, 0, 0);

            /// Compute the Legendre symbol using Euler's criterion.
            /// Returns 1 if this is a quadratic residue mod p,
            /// -1 if a non-residue, 0 if this == 0.
            /// a^((p-1)/2) mod p where p = 2^255 - 19
            public int Legendre()
            {
                // (p-1)/2 = 2^254 - 10 (for p = 2^255 - 19)
                // We compute a^(2^254 - 10) mod p
                var z = this;

                // Compute z^(p-2) first (same as Invert), then multiply by z
                // to get z^(p-1) = z^(2^255 - 20) = z * z^(2^254 - 10)
                // Actually we need z^((p-1)/2) = z^(2^254 - 10)
                //
                // (p-1)/2 = 2^254 - 10
                // Binary: 1111...1111 0110 (254 bits, last 4 bits = 0110)
                //
                // Use addition chain: compute z^(2^254) / z^10
                // Or use the standard exponentiation approach.
                //
                // Simpler: use the same chain as Invert() but for (p-1)/2.
                // p-1 = 2^255 - 20 = 2*(2^254 - 10)
                // So (p-1)/2 = 2^254 - 10
                //
                // Using sliding window or the standard square-and-multiply.
                // For simplicity, use the same approach as Invert with adjusted exponent.

                // z^(2^254 - 10) via square-and-multiply
                // 2^254 - 10 in binary: 254 ones followed by 0110
                // = (2^254 - 1) - 9 = 0b111...1110110
                //
                // Efficient approach: compute z^(2^254 - 1) then adjust.
                // z^(2^254 - 1) = z^(-1) * z^(2^254) ... too complex.
                //
                // Let's use a direct approach with the standard exponentiation.

                // Exponent 2^254 - 10 = 0x3FFF...FFF6 (254 bits)
                // We'll compute it via the same addition chain style as Invert.

                // 2^254 - 10:
                //   = 2^254 - 8 - 2
                //   Compute z^(2^254) / (z^8 * z^2)
                //   Or: compute z^(2^254 - 16) * z^6
                //   2^254 - 16 = 2*(2^253 - 8)
                //
                // Simpler: just compute z^(2^254 - 10) directly.
                // We can use: z^(2^254 - 10) = (z^(2^253 - 5))^2
                // 2^253 - 5: compute via repeated squaring.
                //
                // Actually, the easiest correct approach:
                // Use the square-and-multiply algorithm on the binary representation.

                // 2^254 - 10 in binary (254 bits):
                // 111111...1111110110  (250 ones, then 0110)
                // Total: 254 bits, MSB = 1
                //
                // Binary of 2^254 - 10:
                // 2^254 = 1 followed by 254 zeros
                // 2^254 - 10 = (2^254 - 1) - 9 = all 254 ones minus 9
                // all 254 ones - 9 = 111...1110110 (binary)
                // That's 250 ones, then 0110

                // Square-and-multiply, skipping leading 1
                var result = z;
                // Process bits 253 down to 0 (254 bits total, MSB already consumed)
                // Bits: positions 253 down to 4 are all 1, position 3=0, position 2=1, position 1=1, position 0=0
                for (int bit = 253; bit >= 0; bit--)
                {
                    result = Square(result);
                    int b;
                    if (bit >= 4) b = 1;       // bits 253..4 are all 1
                    else if (bit == 3) b = 0;   // bit 3 = 0
                    else if (bit == 2) b = 1;   // bit 2 = 1
                    else if (bit == 1) b = 1;   // bit 1 = 1
                    else b = 0;                  // bit 0 = 0

                    if (b == 1)
                        result = result * z;
                }

                // Check if result == 1 (quadratic residue), -1 (non-residue), or 0
                // We check if result == 1 by converting to bytes and checking
                var bytes = result.ToBytes32();
                bool isOne = (bytes[0] == 1);
                for (int i = 1; i < 32; i++)
                {
                    if (bytes[i] != 0) { isOne = false; break; }
                }
                if (isOne) return 1;

                // Check if result == 0
                bool isZero = true;
                for (int i = 0; i < 32; i++)
                {
                    if (bytes[i] != 0) { isZero = false; break; }
                }
                if (isZero) return 0;

                // Non-residue
                return -1;
            }

            public static FieldElement operator +(FieldElement a, FieldElement b)
            {
                return new FieldElement(
                    a.t0 + b.t0, a.t1 + b.t1, a.t2 + b.t2, a.t3 + b.t3, a.t4 + b.t4,
                    a.t5 + b.t5, a.t6 + b.t6, a.t7 + b.t7, a.t8 + b.t8, a.t9 + b.t9
                );
            }

            public static FieldElement operator -(FieldElement a, FieldElement b)
            {
                return new FieldElement(
                    a.t0 - b.t0, a.t1 - b.t1, a.t2 - b.t2, a.t3 - b.t3, a.t4 - b.t4,
                    a.t5 - b.t5, a.t6 - b.t6, a.t7 - b.t7, a.t8 - b.t8, a.t9 - b.t9
                );
            }

            public static FieldElement operator *(FieldElement a, FieldElement b)
            {
                // Schoolbook multiplication for 10-limb representation
                long c0, c1, c2, c3, c4, c5, c6, c7, c8, c9;
                long t0 = 0, t1 = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0, t8 = 0, t9 = 0;

                c0 = a.t0 * b.t0;
                c1 = a.t0 * b.t1 + a.t1 * b.t0;
                c2 = a.t0 * b.t2 + a.t1 * b.t1 * 2 + a.t2 * b.t0;
                c3 = a.t0 * b.t3 + a.t1 * b.t2 + a.t2 * b.t1 + a.t3 * b.t0;
                c4 = a.t0 * b.t4 + a.t1 * b.t3 * 2 + a.t2 * b.t2 + a.t3 * b.t1 * 2 + a.t4 * b.t0;
                c5 = a.t0 * b.t5 + a.t1 * b.t4 + a.t2 * b.t3 + a.t3 * b.t2 + a.t4 * b.t1 + a.t5 * b.t0;
                c6 = a.t0 * b.t6 + a.t1 * b.t5 * 2 + a.t2 * b.t4 * 2 + a.t3 * b.t3 + a.t4 * b.t2 * 2 + a.t5 * b.t1 * 2 + a.t6 * b.t0;
                c7 = a.t0 * b.t7 + a.t1 * b.t6 + a.t2 * b.t5 + a.t3 * b.t4 + a.t4 * b.t3 + a.t5 * b.t2 + a.t6 * b.t1 + a.t7 * b.t0;
                c8 = a.t0 * b.t8 + a.t1 * b.t7 * 2 + a.t2 * b.t6 * 2 + a.t3 * b.t5 + a.t4 * b.t4 + a.t5 * b.t3 + a.t6 * b.t2 * 2 + a.t7 * b.t1 * 2 + a.t8 * b.t0;
                c9 = a.t0 * b.t9 + a.t1 * b.t8 + a.t2 * b.t7 + a.t3 * b.t6 + a.t4 * b.t5 + a.t5 * b.t4 + a.t6 * b.t3 + a.t7 * b.t2 + a.t8 * b.t1 + a.t9 * b.t0;

                // 19 * c10 (carry reduction for p = 2^255 - 19)
                long c10 = a.t1 * b.t9 + a.t2 * b.t8 * 2 + a.t3 * b.t7 + a.t4 * b.t6 * 2 + a.t5 * b.t5 + a.t6 * b.t4 * 2 + a.t7 * b.t3 + a.t8 * b.t2 * 2 + a.t9 * b.t1 * 2;
                c10 += a.t9 * b.t9 * 2; // correction

                t0 = c0; t1 = c1; t2 = c2; t3 = c3; t4 = c4;
                t5 = c5; t6 = c6; t7 = c7; t8 = c8; t9 = c9;

                // Reduce mod p = 2^255 - 19
                long carry;
                // Reduce from t9
                carry = (t9 + (1 << 24)) >> 25;
                t9 -= carry << 25;
                t0 += carry * 19;

                carry = (t0 + (1 << 25)) >> 26;
                t0 -= carry << 26;
                t1 += carry;

                carry = (t1 + (1 << 24)) >> 25;
                t1 -= carry << 25;
                t2 += carry;

                carry = (t2 + (1 << 25)) >> 26;
                t2 -= carry << 26;
                t3 += carry;

                carry = (t3 + (1 << 24)) >> 25;
                t3 -= carry << 25;
                t4 += carry;

                carry = (t4 + (1 << 25)) >> 26;
                t4 -= carry << 26;
                t5 += carry;

                carry = (t5 + (1 << 24)) >> 25;
                t5 -= carry << 25;
                t6 += carry;

                carry = (t6 + (1 << 25)) >> 26;
                t6 -= carry << 26;
                t7 += carry;

                carry = (t7 + (1 << 24)) >> 25;
                t7 -= carry << 25;
                t8 += carry;

                carry = (t8 + (1 << 25)) >> 26;
                t8 -= carry << 26;
                t9 += carry * 19;

                return new FieldElement(t0, t1, t2, t3, t4, t5, t6, t7, t8, t9);
            }

            public FieldElement Invert()
            {
                // Invert via Fermat's little theorem: a^(p-2) mod p
                // p - 2 = 2^255 - 21
                var z = this;
                var t0 = Square(z);
                var t1 = Square(t0); t1 = Square(t1); t1 = z * t1;
                var t2 = Square(t1);
                var t3 = t1 * t2;
                var t4 = Square(t3);
                for (int i = 0; i < 4; i++) t4 = Square(t4);
                t4 = t2 * t4;
                var t5 = Square(t4);
                for (int i = 0; i < 9; i++) t5 = Square(t5);
                t5 = t3 * t5;
                var t6 = Square(t5);
                for (int i = 0; i < 19; i++) t6 = Square(t6);
                t6 = t1 * t6;
                var t7 = Square(t6);
                for (int i = 0; i < 39; i++) t7 = Square(t7);
                t7 = t2 * t7;
                var t8 = Square(t7);
                for (int i = 0; i < 79; i++) t8 = Square(t8);
                t8 = t1 * t8;
                var t9 = Square(t8);
                for (int i = 0; i < 159; i++) t9 = Square(t9);
                t9 = t3 * t9;
                var t10 = Square(t9);
                for (int i = 0; i < 39; i++) t10 = Square(t10);
                t10 = t2 * t10;
                var t11 = Square(t10);
                for (int i = 0; i < 79; i++) t11 = Square(t11);
                t11 = z * t11;

                return t11;
            }

            private static FieldElement Square(FieldElement a) => a * a;

            public byte[] ToBytes32()
            {
                var bytes = new byte[32];
                // Carry propagation and serialization
                long[] t = new long[10] { t0, t1, t2, t3, t4, t5, t6, t7, t8, t9 };

                // Full carry propagation
                long carry;
                carry = (t[0] + (1 << 25)) >> 26; t[0] -= carry << 26; t[1] += carry;
                carry = (t[1] + (1 << 24)) >> 25; t[1] -= carry << 25; t[2] += carry;
                carry = (t[2] + (1 << 25)) >> 26; t[2] -= carry << 26; t[3] += carry;
                carry = (t[3] + (1 << 24)) >> 25; t[3] -= carry << 25; t[4] += carry;
                carry = (t[4] + (1 << 25)) >> 26; t[4] -= carry << 26; t[5] += carry;
                carry = (t[5] + (1 << 24)) >> 25; t[5] -= carry << 25; t[6] += carry;
                carry = (t[6] + (1 << 25)) >> 26; t[6] -= carry << 26; t[7] += carry;
                carry = (t[7] + (1 << 24)) >> 25; t[7] -= carry << 25; t[8] += carry;
                carry = (t[8] + (1 << 25)) >> 26; t[8] -= carry << 26; t[9] += carry;

                // Final reduction mod p
                carry = (t[9] + (1 << 24)) >> 25; t[9] -= carry << 25;
                // t[9] now < 2^25, no overflow

                // Serialize to 32-byte little-endian
                bytes[0] = (byte)(t[0] & 0xff);
                bytes[1] = (byte)((t[0] >> 8) & 0xff);
                bytes[2] = (byte)((t[0] >> 16) & 0xff);
                bytes[3] = (byte)((t[0] >> 24) & 0xff);

                bytes[4] = (byte)((t[1] & 0x3f));
                bytes[5] = (byte)((t[1] >> 6) & 0xff);
                bytes[6] = (byte)((t[1] >> 14) & 0xff);
                bytes[7] = (byte)((t[1] >> 22) & 0xff);

                bytes[8] = (byte)(t[2] & 0xff);
                bytes[9] = (byte)((t[2] >> 8) & 0xff);
                bytes[10] = (byte)((t[2] >> 16) & 0xff);
                bytes[11] = (byte)((t[2] >> 24) & 0xff);

                bytes[12] = (byte)(t[3] & 0x3);
                bytes[13] = (byte)((t[3] >> 2) & 0xff);
                bytes[14] = (byte)((t[3] >> 10) & 0xff);
                bytes[15] = (byte)((t[3] >> 18) & 0xff);

                bytes[16] = (byte)(t[4] & 0xff);
                bytes[17] = (byte)((t[4] >> 8) & 0xff);
                bytes[18] = (byte)((t[4] >> 16) & 0x7f);

                bytes[19] = (byte)(t[5] & 0x1);
                bytes[20] = (byte)((t[5] >> 1) & 0xff);
                bytes[21] = (byte)((t[5] >> 9) & 0xff);
                bytes[22] = (byte)((t[5] >> 17) & 0xff);

                bytes[23] = (byte)(t[6] & 0x7);
                bytes[24] = (byte)((t[6] >> 3) & 0xff);
                bytes[25] = (byte)((t[6] >> 11) & 0xff);
                bytes[26] = (byte)((t[6] >> 19) & 0xff);

                bytes[27] = (byte)(t[7] & 0x3f);
                bytes[28] = (byte)((t[7] >> 6) & 0xff);
                bytes[29] = (byte)((t[7] >> 14) & 0xff);
                bytes[30] = (byte)((t[7] >> 22) & 0xff);

                bytes[31] = (byte)(t[8] & 0xff);

                return bytes;
            }
        }

        // ─── Base64 Utilities ───────────────────────────────────────────

        /// Encode bytes to Base64 URL-safe string.
        public static string ToBase64Url(byte[] bytes)
        {
            return Convert.ToBase64String(bytes)
                .Replace('+', '-')
                .Replace('/', '_')
                .TrimEnd('=');
        }

        /// Decode Base64 URL-safe string to bytes.
        public static byte[] FromBase64Url(string s)
        {
            s = s.Replace('-', '+').Replace('_', '/');
            while (s.Length % 4 != 0) s += '=';
            return Convert.FromBase64String(s);
        }

        /// Encode bytes to Base64 standard string.
        public static string ToBase64(byte[] bytes) => Convert.ToBase64String(bytes);

        /// Decode Base64 standard string to bytes.
        public static byte[] FromBase64(string s) => Convert.FromBase64String(s);
    }

    #endregion

    #region --- JSON-RPC Types ---

    /// JSON-RPC request matching WC v2 spec.
    public class JsonRpcRequest
    {
        public string jsonrpc = "2.0";
        public long id;
        public string method;
        public object[] @params;

        public static JsonRpcRequest Create(long id, string method, params object[] @params)
        {
            return new JsonRpcRequest { id = id, method = method, @params = @params };
        }
    }

    /// JSON-RPC response.
    public class JsonRpcResponse
    {
        public string jsonrpc = "2.0";
        public long id;
        public object result;
        public JsonRpcError error;
    }

    /// JSON-RPC error.
    public class JsonRpcError
    {
        public int code;
        public string message;
        public object data;
    }

    /// JSON-RPC notification (no id, no response).
    public class JsonRpcNotification
    {
        public string jsonrpc = "2.0";
        public string method;
        public object @params;
    }

    /// Relay WebSocket message envelope.
    public class RelayMessage
    {
        public string topic;
        public string message; // hex-encoded encrypted payload
    }

    #endregion

    #region --- Pairing Types ---

    /// Pairing state.
    public enum PairingState
    {
        Created,      // Local pairing created, waiting for peer
        Pending,      // Peer responded, waiting for approval
        Active,       // Pairing is active
        Expired,      // Pairing has expired
        Deleted       // Pairing has been deleted
    }

    /// Pairing data.
    public class PairingInfo
    {
        public string Topic;
        public string PeerPublicKey;
        public bool Active;
        public long Expiry; // Unix timestamp (seconds)
        public long CreatedAt;

        public bool IsExpired => DateTimeOffset.UtcNow.ToUnixTimeSeconds() > Expiry;
    }

    #endregion

    #region --- Session Types ---

    /// Session state.
    public enum SessionStateEnum
    {
        Proposed,   // Session proposed (waiting for approval)
        Active,     // Session is active
        Expired,    // Session has expired
        Deleted     // Session has been deleted
    }

    /// Session proposal data.
    public class SessionProposal
    {
        public long Id;
        public string PairingTopic;
        public string ProposerPublicKey;
        public Namespace[] RequiredNamespaces;
        public Namespace[] OptionalNamespaces;
        public SessionRelay Relay;
    }

    /// WC v2 namespace requirements.
    public class Namespace
    {
        public string ChainId;      // e.g., "eip155:1"
        public string[] Methods;    // e.g., ["eth_sendTransaction", "personal_sign"]
        public string[] Events;     // e.g., ["chainChanged", "accountsChanged"]
    }

    /// WC v2 session.
    public class SessionInfo
    {
        public string Topic;
        public string PeerPublicKey;
        public string SelfPublicKey;
        public string SelfPrivateKey;
        public string SymmetricKey;
        public string[] Accounts;
        public Namespace[] Namespaces;
        public SessionStateEnum State;
        public long Expiry;
        public long CreatedAt;
        public SessionRelay Relay;

        public bool IsExpired => DateTimeOffset.UtcNow.ToUnixTimeSeconds() > Expiry;
    }

    /// Relay configuration.
    public class SessionRelay
    {
        public string Protocol = "irn";
        public string Data;
    }

    #endregion

    #region --- Relay WebSocket Client ---

    /// <summary>
    /// WebSocket client for the WalletConnect Relay server.
    /// Handles connection, message sending, and subscription management.
    /// Uses System.Net.WebSockets on desktop, falls back to HTTP polling on WebGL/mobile.
    /// </summary>
    public class RelayClient
    {
        private string _relayUrl;
        private string _projectId;
        private System.Net.WebSockets.ClientWebSocket _ws;
        private CancellationTokenSource _cts;
        private bool _isConnected;
        private readonly object _sendLock = new object();
        private readonly Dictionary<string, Action<string>> _subscriptions = new Dictionary<string, Action<string>>();

        /// Event fired when a message is received for a subscribed topic.
        public event Action<string, string> OnMessage; // (topic, payload)

        /// Event fired when connection state changes.
        public event Action<bool> OnConnectionChanged; // isConnected

        /// Whether the client is currently connected.
        public bool IsConnected => _isConnected;

        public RelayClient(string relayUrl, string projectId)
        {
            _relayUrl = relayUrl;
            _projectId = projectId;
        }

        /// Connect to the relay WebSocket server.
        public async Task ConnectAsync(CancellationToken ct = default)
        {
            if (_isConnected) return;

            _cts = CancellationTokenSource.CreateLinkedTokenSource(ct);

            // Build WebSocket URL with project ID
            var wsUrl = _relayUrl;
            if (!wsUrl.Contains("projectId"))
            {
                var sep = wsUrl.Contains("?") ? "&" : "?";
                wsUrl = $"{wsUrl}{sep}projectId={_projectId}";
            }

            _ws = new System.Net.WebSockets.ClientWebSocket();
            _ws.Options.KeepAliveInterval = TimeSpan.FromSeconds(30);

            try
            {
                await _ws.ConnectAsync(new Uri(wsUrl), _cts.Token);
                _isConnected = true;
                OnConnectionChanged?.Invoke(true);
                Log($"Relay connected: {wsUrl}");

                // Start receive loop
                _ = Task.Run(() => ReceiveLoop(_cts.Token), _cts.Token);
            }
            catch (Exception ex)
            {
                _isConnected = false;
                throw new Exception($"Failed to connect to relay: {ex.Message}", ex);
            }
        }

        /// Disconnect from the relay.
        public async Task DisconnectAsync()
        {
            _cts?.Cancel();

            if (_ws != null && _ws.State == System.Net.WebSockets.WebSocketState.Open)
            {
                try
                {
                    await _ws.CloseAsync(
                        System.Net.WebSockets.WebSocketCloseStatus.NormalClosure,
                        "Client disconnecting",
                        CancellationToken.None);
                }
                catch { }
            }

            _isConnected = false;
            OnConnectionChanged?.Invoke(false);
            _ws?.Dispose();
            _ws = null;
        }

        /// Subscribe to a topic. Messages received on this topic will trigger OnMessage.
        public async Task SubscribeAsync(string topic, Action<string> handler, CancellationToken ct = default)
        {
            lock (_subscriptions)
            {
                _subscriptions[topic] = handler;
            }

            // Send subscription request via JSON-RPC
            var request = JsonRpcRequest.Create(
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                "irn_subscribe",
                new { topic }
            );

            var json = Newtonsoft.Json.JsonConvert.SerializeObject(request);
            await SendAsync(json, ct);
        }

        /// Unsubscribe from a topic.
        public async Task UnsubscribeAsync(string topic, CancellationToken ct = default)
        {
            lock (_subscriptions)
            {
                _subscriptions.Remove(topic);
            }

            var request = JsonRpcRequest.Create(
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                "irn_unsubscribe",
                new { topic }
            );

            var json = Newtonsoft.Json.JsonConvert.SerializeObject(request);
            await SendAsync(json, ct);
        }

        /// Publish a message to a topic on the relay.
        public async Task PublishAsync(string topic, string message, int ttl = 300, bool tag = 0, CancellationToken ct = default)
        {
            var request = JsonRpcRequest.Create(
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                "irn_publish",
                new object[] { topic, message, new { ttl, tag } }
            );

            var json = Newtonsoft.Json.JsonConvert.SerializeObject(request);
            await SendAsync(json, ct);
        }

        /// Send raw text over the WebSocket.
        private async Task SendAsync(string json, CancellationToken ct = default)
        {
            if (!_isConnected || _ws?.State != System.Net.WebSockets.WebSocketState.Open)
                throw new InvalidOperationException("Relay not connected");

            lock (_sendLock)
            {
                var buffer = System.Text.Encoding.UTF8.GetBytes(json);
                var segment = new ArraySegment<byte>(buffer);
                _ws.SendAsync(segment, System.Net.WebSockets.WebSocketMessageType.Text, true, ct)
                    .GetAwaiter().GetResult();
            }
        }

        /// Receive messages in a background loop.
        private async Task ReceiveLoop(CancellationToken ct)
        {
            var buffer = new byte[65536];

            try
            {
                while (!ct.IsCancellationRequested && _ws?.State == System.Net.WebSockets.WebSocketState.Open)
                {
                    var result = await _ws.ReceiveAsync(new ArraySegment<byte>(buffer), ct);

                    if (result.MessageType == System.Net.WebSockets.WebSocketMessageType.Close)
                    {
                        _isConnected = false;
                        OnConnectionChanged?.Invoke(false);
                        break;
                    }

                    var message = System.Text.Encoding.UTF8.GetString(buffer, 0, result.Count);
                    ProcessReceivedMessage(message);
                }
            }
            catch (OperationCanceledException)
            {
                // Expected on disconnect
            }
            catch (Exception ex)
            {
                Log($"Relay receive error: {ex.Message}");
                _isConnected = false;
                OnConnectionChanged?.Invoke(false);
            }
        }

        /// Process a received message from the relay.
        private void ProcessReceivedMessage(string json)
        {
            try
            {
                // Try parsing as a relay message (topic + encrypted payload)
                var relayMsg = Newtonsoft.Json.JsonConvert.DeserializeObject<RelayMessage>(json);
                if (relayMsg != null && !string.IsNullOrEmpty(relayMsg.topic))
                {
                    lock (_subscriptions)
                    {
                        if (_subscriptions.TryGetValue(relayMsg.topic, out var handler))
                        {
                            handler(relayMsg.message);
                        }
                    }
                    OnMessage?.Invoke(relayMsg.topic, relayMsg.message);
                    return;
                }

                // Try parsing as JSON-RPC response
                var response = Newtonsoft.Json.JsonConvert.DeserializeObject<JsonRpcResponse>(json);
                if (response != null && response.id != 0)
                {
                    // Handle RPC response
                    HandleRpcResponse(response);
                    return;
                }
            }
            catch
            {
                // Ignore malformed messages
            }
        }

        /// Handle a JSON-RPC response.
        private void HandleRpcResponse(JsonRpcResponse response)
        {
            // In a full implementation, match response.id to pending requests
            // For now, log the response
            if (response.error != null)
            {
                Log($"RPC error [{response.error.code}]: {response.error.message}");
            }
        }

        private void Log(string msg)
        {
#if UNITY_EDITOR
            Debug.Log($"[Cinacoin:RelayClient] {msg}");
#endif
        }
    }

    #endregion

    #region --- Pairing Manager ---

    /// <summary>
    /// Manages WC v2 pairing lifecycle: create, approve, reject, delete.
    /// </summary>
    public class PairingManager
    {
        private readonly RelayClient _relay;
        private readonly Dictionary<string, PairingInfo> _pairings = new Dictionary<string, PairingInfo>();
        private long _nextId = 1;

        /// Event fired when a pairing proposal is received.
        public event Action<SessionProposal> OnProposalReceived;

        public PairingManager(RelayClient relay)
        {
            _relay = relay;
        }

        /// Create a new pairing and return the WC URI for QR/deep link.
        /// The URI follows the format: wc:{publicKey}@2?relay-protocol=irn&symKey={symKey}&expiry={seconds}&methods=...
        public async Task<(string uri, string topic)> CreateAsync(
            Namespace[] requiredNamespaces,
            Namespace[] optionalNamespaces = null,
            int ttlSeconds = 300)
        {
            var (selfPriv, selfPub) = WCCrypto.GenerateKeyPair();
            var topic = WCCrypto.ToHex(WCCrypto.SHA256(Encoding.UTF8.GetBytes(selfPub)));
            var symKey = WCCrypto.GenerateRandomBytes();
            var symKeyHex = WCCrypto.ToHex(symKey);
            var expiry = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + ttlSeconds;

            var pairing = new PairingInfo
            {
                Topic = topic,
                PeerPublicKey = "",
                Active = false,
                Expiry = expiry,
                CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            };
            _pairings[topic] = pairing;

            // Subscribe to the pairing topic
            await _relay.SubscribeAsync(topic, async (encryptedMsg) =>
            {
                await HandlePairingMessage(topic, selfPriv, encryptedMsg, requiredNamespaces, optionalNamespaces);
            });

            // Build the WC URI (EIP-1328 format)
            var uri = BuildPairingUri(selfPub, symKeyHex, expiry, requiredNamespaces);

            return (uri, topic);
        }

        /// Approve a pairing proposal.
        public async Task<string> ApproveAsync(string topic, string proposerPublicKey, Namespace[] namespaces)
        {
            if (!_pairings.TryGetValue(topic, out var pairing))
                throw new ArgumentException($"Unknown pairing topic: {topic}");

            pairing.PeerPublicKey = proposerPublicKey;
            pairing.Active = true;

            // Send approval response
            var response = new
            {
                relay = new { protocol = "irn" },
                responderPublicKey = WCCrypto.ToHex(WCCrypto.GenerateKeyPair().publicKey)
            };

            await _relay.PublishAsync(
                topic,
                Newtonsoft.Json.JsonConvert.SerializeObject(response)
            );

            return topic;
        }

        /// Reject a pairing proposal.
        public async Task RejectAsync(string topic, int code = 5000, string message = "User rejected")
        {
            var rejection = new
            {
                id = _nextId++,
                jsonrpc = "2.0",
                error = new { code, message }
            };

            await _relay.PublishAsync(
                topic,
                Newtonsoft.Json.JsonConvert.SerializeObject(rejection)
            );

            if (_pairings.ContainsKey(topic))
                _pairings[topic].Active = false;
        }

        /// Delete a pairing.
        public async Task DeleteAsync(string topic)
        {
            if (_pairings.ContainsKey(topic))
            {
                _pairings[topic].Active = false;
                _pairings[topic] = new PairingInfo
                {
                    Topic = topic,
                    Active = false,
                    Expiry = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                    CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                };
            }

            await _relay.UnsubscribeAsync(topic);
        }

        /// Get all active pairings.
        public List<PairingInfo> GetAll() => _pairings.Values.Where(p => p.Active && !p.IsExpired).ToList();

        /// Get a pairing by topic.
        public PairingInfo Get(string topic) => _pairings.TryGetValue(topic, out var p) ? p : null;

        /// Handle incoming pairing messages.
        private async Task HandlePairingMessage(
            string topic, byte[] selfPrivateKey, string encryptedMessage,
            Namespace[] requiredNamespaces, Namespace[] optionalNamespaces)
        {
            try
            {
                var encryptedBytes = WCCrypto.FromHex(encryptedMessage);
                var plaintext = WCCrypto.DecodeType1(selfPrivateKey, encryptedBytes);
                var proposalJson = Encoding.UTF8.GetString(plaintext);

                // Parse proposal and fire event
                var proposal = Newtonsoft.Json.JsonConvert.DeserializeObject<SessionProposal>(proposalJson);
                if (proposal != null)
                {
                    OnProposalReceived?.Invoke(proposal);
                }
            }
            catch (Exception ex)
            {
#if UNITY_EDITOR
                Debug.LogError($"[Cinacoin:PairingManager] Error handling pairing message: {ex.Message}");
#endif
            }
        }

        /// Build a WalletConnect URI per EIP-1328.
        private string BuildPairingUri(string publicKey, string symKeyHex, long expiry, Namespace[] namespaces)
        {
            var methods = namespaces != null && namespaces.Length > 0
                ? string.Join(",", namespaces.SelectMany(n => n.Methods).Distinct())
                : "";

            var uri = $"wc:{publicKey}@2?relay-protocol=irn&symKey={symKeyHex}";

            if (!string.IsNullOrEmpty(methods))
                uri += $"&methods={Uri.EscapeDataString(methods)}";

            uri += $"&expiry={expiry}";

            return uri;
        }
    }

    #endregion

    #region --- Session Manager ---

    /// <summary>
    /// Manages WC v2 session lifecycle: propose, approve, update, extend, delete.
    /// Handles encryption/decryption of session messages.
    /// </summary>
    public class SessionManager
    {
        private readonly RelayClient _relay;
        private readonly Dictionary<string, SessionInfo> _sessions = new Dictionary<string, SessionInfo>();
        private long _nextId = 1;

        /// Event fired when a session is approved by the wallet.
        public event Action<SessionInfo> OnSessionApproved;

        /// Event fired when a session is deleted.
        public event Action<string> OnSessionDeleted;

        /// Event fired when the wallet responds to a request.
        public event Action<long, object> OnResponse;

        public SessionManager(RelayClient relay)
        {
            _relay = relay;
        }

        /// Create a session from an approved pairing.
        /// This is called after the user approves the pairing in their wallet.
        public async Task<SessionInfo> CreateFromPairingAsync(
            string pairingTopic,
            Namespace[] requiredNamespaces)
        {
            var (selfPriv, selfPub) = WCCrypto.GenerateKeyPair();
            var sessionTopic = WCCrypto.ToHex(WCCrypto.SHA256(Encoding.UTF8.GetBytes(selfPub + pairingTopic)));

            // Derive symmetric key for type-1 encryption
            var sharedSecret = WCCrypto.ScalarMultBase(selfPriv);
            var symKey = WCCrypto.DeriveSymmetricKey(sharedSecret);

            var session = new SessionInfo
            {
                Topic = sessionTopic,
                SelfPublicKey = selfPub,
                SelfPrivateKey = selfPriv,
                SymmetricKey = WCCrypto.ToHex(symKey),
                Accounts = Array.Empty<string>(),
                Namespaces = requiredNamespaces,
                State = SessionStateEnum.Proposed,
                Expiry = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + 3600,
                CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                Relay = new SessionRelay { Protocol = "irn" }
            };

            _sessions[sessionTopic] = session;

            // Subscribe to session topic
            await _relay.SubscribeAsync(sessionTopic, (encryptedMsg) =>
            {
                HandleSessionMessage(sessionTopic, encryptedMsg);
            });

            return session;
        }

        /// Approve a session proposal (called when wallet sends session approval).
        public SessionInfo Approve(string topic, string[] accounts, Namespace[] namespaces)
        {
            if (!_sessions.TryGetValue(topic, out var session))
                throw new ArgumentException($"Unknown session topic: {topic}");

            session.Accounts = accounts;
            session.Namespaces = namespaces;
            session.State = SessionStateEnum.Active;

            OnSessionApproved?.Invoke(session);
            return session;
        }

        /// Update session accounts.
        public void UpdateAccounts(string topic, string[] accounts)
        {
            if (_sessions.TryGetValue(topic, out var session))
            {
                session.Accounts = accounts;
            }
        }

        /// Extend session expiry.
        public void Extend(string topic, long additionalSeconds = 86400)
        {
            if (_sessions.TryGetValue(topic, out var session))
            {
                session.Expiry = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + additionalSeconds;
            }
        }

        /// Delete a session.
        public async Task DeleteAsync(string topic)
        {
            if (_sessions.TryGetValue(topic, out var session))
            {
                session.State = SessionStateEnum.Deleted;
            }

            // Send delete notification
            var deleteMsg = new
            {
                id = _nextId++,
                jsonrpc = "2.0",
                method = "wc_sessionDelete",
                @params = new
                {
                    code = 6000,
                    message = "User disconnected"
                }
            };

            await _relay.PublishAsync(topic, Newtonsoft.Json.JsonConvert.SerializeObject(deleteMsg));
            await _relay.UnsubscribeAsync(topic);

            _sessions.Remove(topic);
            OnSessionDeleted?.Invoke(topic);
        }

        /// Send a JSON-RPC request to the wallet.
        public async Task<long> SendRequestAsync(string topic, string method, object @params)
        {
            if (!_sessions.TryGetValue(topic, out var session))
                throw new ArgumentException($"Unknown session topic: {topic}");

            if (session.State != SessionStateEnum.Active)
                throw new InvalidOperationException($"Session is not active (state: {session.State})");

            var id = _nextId++;

            var request = new JsonRpcRequest
            {
                id = id,
                method = method,
                @params = new[] { @params }
            };

            var json = Newtonsoft.Json.JsonConvert.SerializeObject(request);
            var plaintext = Encoding.UTF8.GetBytes(json);
            var symKey = WCCrypto.FromHex(session.SymmetricKey);
            var encrypted = WCCrypto.EncodeType0(symKey, plaintext);

            await _relay.PublishAsync(topic, WCCrypto.ToHex(encrypted));
            return id;
        }

        /// Get all active sessions.
        public List<SessionInfo> GetAll() => _sessions.Values.Where(s => s.State == SessionStateEnum.Active && !s.IsExpired).ToList();

        /// Get a session by topic.
        public SessionInfo Get(string topic) => _sessions.TryGetValue(topic, out var s) ? s : null;

        /// Handle incoming session messages.
        private void HandleSessionMessage(string topic, string encryptedMessage)
        {
            try
            {
                if (!_sessions.TryGetValue(topic, out var session)) return;

                var encryptedBytes = WCCrypto.FromHex(encryptedMessage);
                var symKey = WCCrypto.FromHex(session.SymmetricKey);
                var plaintext = WCCrypto.DecodeType0(symKey, encryptedBytes);
                var json = Encoding.UTF8.GetString(plaintext);

                // Try parsing as response
                var response = Newtonsoft.Json.JsonConvert.DeserializeObject<JsonRpcResponse>(json);
                if (response != null && response.id != 0)
                {
                    OnResponse?.Invoke(response.id, response.result);
                    return;
                }

                // Try parsing as notification
                var notification = Newtonsoft.Json.JsonConvert.DeserializeObject<JsonRpcNotification>(json);
                if (notification != null)
                {
                    HandleNotification(topic, notification);
                    return;
                }
            }
            catch (Exception ex)
            {
#if UNITY_EDITOR
                Debug.LogError($"[Cinacoin:SessionManager] Error handling session message: {ex.Message}");
#endif
            }
        }

        /// Handle a session notification.
        private void HandleNotification(string topic, JsonRpcNotification notification)
        {
            switch (notification.method)
            {
                case "wc_sessionDelete":
                    _sessions.Remove(topic);
                    OnSessionDeleted?.Invoke(topic);
                    break;

                case "wc_sessionUpdate":
                    // Handle namespace/accounts update
                    break;

                case "wc_sessionExtend":
                    Extend(topic);
                    break;

                case "wc_sessionEvent":
                    // Handle wallet events
                    break;
            }
        }

        /// Persist a session to PlayerPrefs.
        public void SaveSession(string topic)
        {
            if (!_sessions.TryGetValue(topic, out var session)) return;

            var data = new SessionPersistData
            {
                Topic = session.Topic,
                SymmetricKey = session.SymmetricKey,
                SelfPublicKey = session.SelfPublicKey,
                SelfPrivateKey = session.SelfPrivateKey,
                Accounts = session.Accounts,
                State = (int)session.State,
                Expiry = session.Expiry,
                CreatedAt = session.CreatedAt,
                RelayProtocol = session.Relay?.Protocol ?? "irn"
            };

            var json = Newtonsoft.Json.JsonConvert.SerializeObject(data);
            PlayerPrefs.SetString($"Cinacoin_WCSession_{topic}", json);
            PlayerPrefs.Save();
        }

        /// Load a session from PlayerPrefs.
        public SessionInfo LoadSession(string topic)
        {
            var key = $"Cinacoin_WCSession_{topic}";
            if (!PlayerPrefs.HasKey(key)) return null;

            try
            {
                var json = PlayerPrefs.GetString(key);
                var data = Newtonsoft.Json.JsonConvert.DeserializeObject<SessionPersistData>(json);

                var session = new SessionInfo
                {
                    Topic = data.Topic,
                    SymmetricKey = data.SymmetricKey,
                    SelfPublicKey = data.SelfPublicKey,
                    SelfPrivateKey = data.SelfPrivateKey,
                    Accounts = data.Accounts,
                    State = (SessionStateEnum)data.State,
                    Expiry = data.Expiry,
                    CreatedAt = data.CreatedAt,
                    Relay = new SessionRelay { Protocol = data.RelayProtocol }
                };

                _sessions[topic] = session;
                return session;
            }
            catch
            {
                return null;
            }
        }

        /// Delete a persisted session from PlayerPrefs.
        public void DeletePersistedSession(string topic)
        {
            PlayerPrefs.DeleteKey($"Cinacoin_WCSession_{topic}");
        }

        /// Load all persisted sessions.
        public List<SessionInfo> LoadAllPersistedSessions()
        {
            var sessions = new List<SessionInfo>();

            // Enumerate PlayerPrefs keys that match our pattern
            var json = PlayerPrefs.GetString("Cinacoin_WCSessionTopics", "");
            if (!string.IsNullOrEmpty(json))
            {
                var topics = Newtonsoft.Json.JsonConvert.DeserializeObject<string[]>(json);
                foreach (var topic in topics)
                {
                    var session = LoadSession(topic);
                    if (session != null) sessions.Add(session);
                }
            }

            return sessions;
        }

        /// Save session topic list.
        public void SaveSessionTopicList()
        {
            var topics = _sessions.Keys.ToArray();
            var json = Newtonsoft.Json.JsonConvert.SerializeObject(topics);
            PlayerPrefs.SetString("Cinacoin_WCSessionTopics", json);
            PlayerPrefs.Save();
        }
    }

    /// Persisted session data for PlayerPrefs.
    [System.Serializable]
    public class SessionPersistData
    {
        public string Topic;
        public string SymmetricKey;
        public string SelfPublicKey;
        public string SelfPrivateKey;
        public string[] Accounts;
        public int State;
        public long Expiry;
        public long CreatedAt;
        public string RelayProtocol;
    }

    #endregion

    #region --- Unified WC Client ---

    /// <summary>
    /// Unified WalletConnect v2 client combining Relay, Pairing, and Session.
    /// This is the main entry point for WC v2 operations.
    /// </summary>
    public class WCClient
    {
        public RelayClient Relay { get; }
        public PairingManager Pairing { get; }
        public SessionManager Sessions { get; }

        private string _projectId;
        private string _selfPublicKey;
        private string _selfPrivateKey;

        /// Event fired when a session is connected.
        public event Action<SessionInfo> OnConnected;

        /// Event fired when disconnected.
        public event Action OnDisconnected;

        /// Event fired on error.
        public event Action<Exception> OnError;

        public WCClient(string relayUrl, string projectId)
        {
            _projectId = projectId;
            Relay = new RelayClient(relayUrl, projectId);
            Pairing = new PairingManager(Relay);
            Sessions = new SessionManager(Relay);

            // Wire up events
            Sessions.OnSessionApproved += session => OnConnected?.Invoke(session);
            Sessions.OnSessionDeleted += topic => OnDisconnected?.Invoke();

            Relay.OnConnectionChanged += (isConnected) =>
            {
                if (!isConnected) OnDisconnected?.Invoke();
            };
        }

        /// Connect to the relay server.
        public async Task ConnectAsync(CancellationToken ct = default)
        {
            await Relay.ConnectAsync(ct);
        }

        /// Disconnect from the relay.
        public async Task DisconnectAsync()
        {
            await Relay.DisconnectAsync();
        }

        /// Initialize a new connection: creates pairing, returns WC URI.
        public async Task<(string uri, string topic)> InitConnectionAsync(
            Namespace[] requiredNamespaces,
            Namespace[] optionalNamespaces = null,
            int ttlSeconds = 300)
        {
            var (uri, topic) = await Pairing.CreateAsync(requiredNamespaces, optionalNamespaces, ttlSeconds);

            // Also set up session on this topic
            var session = await Sessions.CreateFromPairingAsync(topic, requiredNamespaces);

            return (uri, topic);
        }

        /// Build standard EIP-155 namespaces for the given chain IDs.
        public static Namespace[] BuildEip155Namespaces(int[] chainIds)
        {
            var methods = new[]
            {
                "eth_sendTransaction",
                "eth_signTransaction",
                "personal_sign",
                "eth_signTypedData",
                "eth_signTypedData_v4"
            };

            var events = new[]
            {
                "chainChanged",
                "accountsChanged"
            };

            return chainIds.Select(chainId => new Namespace
            {
                ChainId = $"eip155:{chainId}",
                Methods = methods,
                Events = events
            }).ToArray();
        }

        /// Approve a pairing.
        public async Task<string> ApprovePairingAsync(string topic, string proposerPublicKey, Namespace[] namespaces)
        {
            return await Pairing.ApproveAsync(topic, proposerPublicKey, namespaces);
        }

        /// Reject a pairing.
        public async Task RejectPairingAsync(string topic)
        {
            await Pairing.RejectAsync(topic);
        }

        /// Delete the current session.
        public async Task DeleteSessionAsync(string topic)
        {
            await Sessions.DeleteAsync(topic);
            Sessions.DeletePersistedSession(topic);
        }

        /// Restore sessions from persistence.
        public List<SessionInfo> RestoreSessions()
        {
            return Sessions.LoadAllPersistedSessions();
        }
    }

    #endregion
}
