using System;
using System.Text;
using Cinacoin.WalletConnect;
using NUnit.Framework;

namespace Cinacoin.Tests
{
    /// <summary>
    /// Tests for the Unity crypto layer after Round 8 compliance fixes:
    /// - X25519 public key validation (small-order point rejection)
    /// - ChaCha20-Poly1305 AEAD replacing AES-CBC+HMAC
    /// - Type-1 envelope using proper X25519 DH + HKDF key derivation
    /// </summary>
    public class WCCryptoTests
    {
        // ─── X25519 Key Validation ────────────────────────────────────────

        [Test]
        public void ValidatePublicKey_RejectsAllZero()
        {
            var zeroKey = new byte[32];
            Assert.IsFalse(WCCrypto.ValidatePublicKey(zeroKey),
                "All-zero public key should be rejected (identity point)");
        }

        [Test]
        public void ValidatePublicKey_RejectsKnownSmallOrderPoints()
        {
            // Known small-order points on Curve25519 (all have zero bytes 1..30)
            byte[][] smallOrderPoints = new byte[][]
            {
                new byte[] { 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                             0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                             0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                             0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // order 2
                new byte[] { 0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                             0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                             0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                             0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // order 4
                new byte[] { 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                             0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                             0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                             0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // order 8
            };

            foreach (var pk in smallOrderPoints)
            {
                Assert.IsFalse(WCCrypto.ValidatePublicKey(pk),
                    $"Small-order point {WCCrypto.ToHex(pk)} should be rejected");
            }
        }

        [Test]
        public void ValidatePublicKey_AcceptsGeneratedPublicKey()
        {
            var (_, pubKey) = WCCrypto.GenerateKeyPair();
            Assert.IsTrue(WCCrypto.ValidatePublicKey(pubKey),
                "Generated public key should pass validation");
        }

        [Test]
        public void ScalarMult_RejectsSmallOrderPeerKey()
        {
            var (privKey, _) = WCCrypto.GenerateKeyPair();
            var zeroPeer = new byte[32]; // all-zero = small-order point

            Assert.Throws<Exception>(() => WCCrypto.ScalarMult(privKey, zeroPeer),
                "ScalarMult should reject all-zero peer public key");
        }

        [Test]
        public void ScalarMultBase_ProducesValidPublicKey()
        {
            var (_, pubKey) = WCCrypto.GenerateKeyPair();
            Assert.IsTrue(WCCrypto.ValidatePublicKey(pubKey),
                "ScalarMultBase output should be a valid Curve25519 public key");
        }

        // ─── ChaCha20-Poly1305 AEAD ───────────────────────────────────────

        [Test]
        public void ChaCha20Poly1305_RoundTrip()
        {
            var key = WCCrypto.GenerateRandomBytes(32);
            var nonce = WCCrypto.GenerateRandomBytes(12);
            var plaintext = Encoding.UTF8.GetBytes("Hello, WalletConnect!");

            var ciphertextWithTag = WCCrypto.ChaCha20Poly1305Encrypt(key, nonce, plaintext);
            Assert.AreEqual(plaintext.Length + 16, ciphertextWithTag.Length,
                "Ciphertext should be plaintext length + 16-byte Poly1305 tag");

            var decrypted = WCCrypto.ChaCha20Poly1305Decrypt(key, nonce, ciphertextWithTag);
            CollectionAssert.AreEqual(plaintext, decrypted,
                "Decrypted plaintext should match original");
        }

        [Test]
        public void ChaCha20Poly1305_DetectsTampering()
        {
            var key = WCCrypto.GenerateRandomBytes(32);
            var nonce = WCCrypto.GenerateRandomBytes(12);
            var plaintext = Encoding.UTF8.GetBytes("Tamper test");

            var ciphertextWithTag = WCCrypto.ChaCha20Poly1305Encrypt(key, nonce, plaintext);

            // Flip a bit in the ciphertext
            ciphertextWithTag[0] ^= 0x01;

            Assert.Throws<Exception>(() =>
                WCCrypto.ChaCha20Poly1305Decrypt(key, nonce, ciphertextWithTag),
                "Tampered ciphertext should fail decryption");
        }

        [Test]
        public void ChaCha20Poly1305_WrongKeyFails()
        {
            var key = WCCrypto.GenerateRandomBytes(32);
            var wrongKey = WCCrypto.GenerateRandomBytes(32);
            var nonce = WCCrypto.GenerateRandomBytes(12);
            var plaintext = Encoding.UTF8.GetBytes("Wrong key test");

            var ciphertextWithTag = WCCrypto.ChaCha20Poly1305Encrypt(key, nonce, plaintext);

            Assert.Throws<Exception>(() =>
                WCCrypto.ChaCha20Poly1305Decrypt(wrongKey, nonce, ciphertextWithTag),
                "Wrong key should fail decryption");
        }

        // ─── Type-0 Envelope (ChaCha20-Poly1305) ──────────────────────────

        [Test]
        public void EncodeType0_RoundTrip()
        {
            var key = WCCrypto.GenerateRandomBytes(32);
            var plaintext = Encoding.UTF8.GetBytes("{\"method\":\"wc_sessionProposal\"}");

            var envelope = WCCrypto.EncodeType0(key, plaintext);
            Assert.AreEqual(0, envelope[0], "Type-0 envelope should start with type byte 0");
            Assert.AreEqual(plaintext.Length + 1 + 12 + 16, envelope.Length,
                "Type-0 envelope should be 1 + 12 + plaintext + 16 bytes");

            var decrypted = WCCrypto.DecodeType0(key, envelope);
            CollectionAssert.AreEqual(plaintext, decrypted);
        }

        [Test]
        public void EncodeType0_WrongKeyFails()
        {
            var key = WCCrypto.GenerateRandomBytes(32);
            var wrongKey = WCCrypto.GenerateRandomBytes(32);
            var plaintext = Encoding.UTF8.GetBytes("Secret data");

            var envelope = WCCrypto.EncodeType0(key, plaintext);

            Assert.Throws<Exception>(() => WCCrypto.DecodeType0(wrongKey, envelope),
                "Wrong key should fail Type-0 decryption");
        }

        // ─── Type-1 Envelope (X25519 DH + ChaCha20-Poly1305) ──────────────

        [Test]
        public void EncodeType1_RoundTrip()
        {
            var (alicePriv, alicePub) = WCCrypto.GenerateKeyPair();
            var (bobPriv, bobPub) = WCCrypto.GenerateKeyPair();

            var plaintext = Encoding.UTF8.GetBytes("Pairing proposal data");

            // Alice encrypts for Bob
            var envelope = WCCrypto.EncodeType1(alicePriv, alicePub, bobPub, plaintext);

            Assert.AreEqual(1, envelope[0], "Type-1 envelope should start with type byte 1");

            // Bob decrypts with his private key
            var decrypted = WCCrypto.DecodeType1(bobPriv, envelope);
            CollectionAssert.AreEqual(plaintext, decrypted,
                "Bob should successfully decrypt Alice's Type-1 envelope");
        }

        [Test]
        public void EncodeType1_WrongPrivateKeyFails()
        {
            var (alicePriv, alicePub) = WCCrypto.GenerateKeyPair();
            var (bobPriv, bobPub) = WCCrypto.GenerateKeyPair();
            var (evePriv, _) = WCCrypto.GenerateKeyPair();

            var plaintext = Encoding.UTF8.GetBytes("Secret pairing data");
            var envelope = WCCrypto.EncodeType1(alicePriv, alicePub, bobPub, plaintext);

            // Eve tries to decrypt with wrong key
            Assert.Throws<Exception>(() => WCCrypto.DecodeType1(evePriv, envelope),
                "Eve with wrong private key should fail to decrypt Type-1 envelope");
        }

        [Test]
        public void EncodeType1_RejectsSmallOrderPeerKey()
        {
            var (alicePriv, alicePub) = WCCrypto.GenerateKeyPair();
            var zeroKey = new byte[32];

            Assert.Throws<Exception>(() =>
                WCCrypto.EncodeType1(alicePriv, alicePub, zeroKey, new byte[] { 0x01 }),
                "Type-1 encode should reject small-order peer public key");
        }

        [Test]
        public void EncodeType1_DHConsistency()
        {
            // Verify DH consistency: Alice→Bob and Bob→Alice produce same shared secret
            var (alicePriv, alicePub) = WCCrypto.GenerateKeyPair();
            var (bobPriv, bobPub) = WCCrypto.GenerateKeyPair();

            var sharedAB = WCCrypto.ScalarMult(alicePriv, bobPub);
            var sharedBA = WCCrypto.ScalarMult(bobPriv, alicePub);

            CollectionAssert.AreEqual(sharedAB, sharedBA,
                "X25519 DH should produce consistent shared secrets: DH(a,B) == DH(b,A)");
        }

        // ─── Constant-Time Compare ─────────────────────────────────────────

        [Test]
        public void ConstantTimeCompare_EqualArrays()
        {
            var a = new byte[] { 1, 2, 3, 4 };
            var b = new byte[] { 1, 2, 3, 4 };
            Assert.IsTrue(WCCrypto.ConstantTimeCompare(a, b));
        }

        [Test]
        public void ConstantTimeCompare_DifferentArrays()
        {
            var a = new byte[] { 1, 2, 3, 4 };
            var b = new byte[] { 1, 2, 3, 5 };
            Assert.IsFalse(WCCrypto.ConstantTimeCompare(a, b));
        }

        [Test]
        public void ConstantTimeCompare_DifferentLengths()
        {
            var a = new byte[] { 1, 2, 3 };
            var b = new byte[] { 1, 2, 3, 4 };
            Assert.IsFalse(WCCrypto.ConstantTimeCompare(a, b));
        }

        // ─── HKDF ─────────────────────────────────────────────────────────

        [Test]
        public void HKDF_Deterministic()
        {
            var ikm = new byte[] { 0x0b, 0x0b, 0x0b, 0x0b };
            var salt = new byte[] { 0x00, 0x01, 0x02 };
            var info = new byte[] { 0xf0, 0xf1 };

            var result1 = WCCrypto.HKDF(ikm, salt, info, 32);
            var result2 = WCCrypto.HKDF(ikm, salt, info, 32);

            CollectionAssert.AreEqual(result1, result2,
                "HKDF should be deterministic for same inputs");
        }

        // ─── Overhead Constants ────────────────────────────────────────────

        [Test]
        public void EnvelopeOverhead_ConsistentWithSpec()
        {
            // Type-0: 1 (type) + 12 (nonce) + 16 (tag)
            Assert.AreEqual(1 + 12 + 16, WCCrypto.Type0EnvelopeOverhead,
                "Type-0 overhead should be 29 bytes");

            // Type-1: 1 (type) + 32 (ephemeral pub) + 12 (nonce) + 16 (tag)
            Assert.AreEqual(1 + 32 + 12 + 16, WCCrypto.Type1EnvelopeOverhead,
                "Type-1 overhead should be 61 bytes");
        }

        // ─── Hex Utilities ─────────────────────────────────────────────────

        [Test]
        public void Hex_RoundTrip()
        {
            var original = new byte[] { 0x00, 0x01, 0xFF, 0xAB, 0xCD };
            var hex = WCCrypto.ToHex(original);
            var decoded = WCCrypto.FromHex(hex);
            CollectionAssert.AreEqual(original, decoded);
        }

        [Test]
        public void Hex_Handles0xPrefix()
        {
            var hex = "0xdeadbeef";
            var decoded = WCCrypto.FromHex(hex);
            CollectionAssert.AreEqual(new byte[] { 0xDE, 0xAD, 0xBE, 0xEF }, decoded);
        }
    }
}
