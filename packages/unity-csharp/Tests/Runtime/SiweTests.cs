using System;
using NUnit.Framework;
using Cinacoin.Auth;

namespace Cinacoin.Tests.Runtime
{
    /// <summary>
    /// Tests for SIWE: message generation, validation.
    /// </summary>
    public class SiweTests
    {
        // ─── Message Generation ──────────────────────────────────────────

        [Test]
        public void GenerateMessage_ContainsDomainAndAddress()
        {
            var p = new SIWEParams
            {
                Domain = "example.com",
                Address = "0x1234567890abcdef1234567890abcdef12345678",
                Uri = "https://example.com",
                ChainId = 1,
                Nonce = "abc123",
                IssuedAt = "2024-01-01T00:00:00Z"
            };
            var msg = SIWE.GenerateMessage(p);

            StringAssert.Contains("example.com wants you to sign in", msg);
            StringAssert.Contains("0x1234567890abcdef1234567890abcdef12345678", msg);
        }

        [Test]
        public void GenerateMessage_WithStatement_IncludesStatement()
        {
            var p = new SIWEParams
            {
                Domain = "example.com",
                Address = "0x1234",
                Statement = "Sign in to Example",
                Uri = "https://example.com",
                ChainId = 1,
                Nonce = "abc",
                IssuedAt = "2024-01-01T00:00:00Z"
            };
            var msg = SIWE.GenerateMessage(p);
            StringAssert.Contains("Sign in to Example", msg);
        }

        [Test]
        public void GenerateMessage_WithResources_IncludesResources()
        {
            var p = new SIWEParams
            {
                Domain = "example.com",
                Address = "0x1234",
                Uri = "https://example.com",
                ChainId = 1,
                Nonce = "abc",
                IssuedAt = "2024-01-01T00:00:00Z",
                Resources = new[] { "https://example.com/terms" }
            };
            var msg = SIWE.GenerateMessage(p);
            StringAssert.Contains("Resources:", msg);
            StringAssert.Contains("https://example.com/terms", msg);
        }

        [Test]
        public void GenerateMessage_WithoutOptionalFields_OmitsThem()
        {
            var p = new SIWEParams
            {
                Domain = "example.com",
                Address = "0x1234",
                Uri = "https://example.com",
                ChainId = 1,
                Nonce = "abc",
                IssuedAt = "2024-01-01T00:00:00Z"
            };
            var msg = SIWE.GenerateMessage(p);
            StringAssert.Contains("Version: 1", msg);
            StringAssert.Contains("Chain ID: 1", msg);
            StringAssert.DoesNotContain("Expiration Time:", msg);
        }

        // ─── Validation ─────────────────────────────────────────────────

        [Test]
        public void ParseMessage_ExtractsDomain()
        {
            var msg = "example.com wants you to sign in with your Ethereum account:\n0x1234\n\nURI: https://example.com\nVersion: 1\nChain ID: 1\nNonce: abc\nIssued At: 2024-01-01T00:00:00Z\n";
            var parsed = SIWE.ParseMessage(msg);
            Assert.AreEqual("example.com", parsed.Domain);
        }

        [Test]
        public void ParseMessage_ExtractsNonce()
        {
            var msg = "example.com wants you to sign in with your Ethereum account:\n0x1234\n\nURI: https://example.com\nVersion: 1\nChain ID: 1\nNonce: test123\nIssued At: 2024-01-01T00:00:00Z\n";
            var parsed = SIWE.ParseMessage(msg);
            Assert.AreEqual("test123", parsed.Nonce);
        }

        [Test]
        public void Verify_ValidMessage_ReturnsValid()
        {
            var msg = "example.com wants you to sign in with your Ethereum account:\n0x1234\n\nURI: https://example.com\nVersion: 1\nChain ID: 1\nNonce: abc\nIssued At: 2024-01-01T00:00:00Z\n";
            var sig = "0x" + new string('a', 130);
            var result = SIWE.Verify(msg, sig);
            Assert.IsTrue(result.Valid);
        }

        [Test]
        public void Verify_InvalidSignatureFormat_ReturnsInvalid()
        {
            var msg = "example.com wants you to sign in with your Ethereum account:\n0x1234\n\nURI: https://example.com\nVersion: 1\nChain ID: 1\nNonce: abc\nIssued At: 2024-01-01T00:00:00Z\n";
            var result = SIWE.Verify(msg, "bad_signature");
            Assert.IsFalse(result.Valid);
        }
    }
}
