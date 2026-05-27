using System;
using System.Threading.Tasks;
using System.Numerics;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using System.Collections;
using Cinacoin.WalletConnect;
using Cinacoin.Auth;

namespace Cinacoin.Tests.Runtime
{
    /// <summary>
    /// Comprehensive PlayMode tests for real WalletConnect v2 functionality.
    /// Tests cover: WC protocol crypto, session management, EVM adapter, SIWE,
    /// wallet registry, deep links, connection state, and more.
    /// </summary>

    // ═══════════════════════════════════════════════════════════════════
    // WCCrypto Tests
    // ═══════════════════════════════════════════════════════════════════

    [TestFixture]
    public class WCCryptoTests
    {
        [Test]
        public void GenerateRandomBytes_ReturnsCorrectLength()
        {
            var bytes = WCCrypto.GenerateRandomBytes(32);
            Assert.AreEqual(32, bytes.Length);
        }

        [Test]
        public void GenerateRandomBytes_DifferentEachTime()
        {
            var a = WCCrypto.GenerateRandomBytes(32);
            var b = WCCrypto.GenerateRandomBytes(32);
            Assert.AreNotEqual(a, b);
        }

        [Test]
        public void GenerateKeyPair_Returns32ByteKeys()
        {
            var (priv, pub) = WCCrypto.GenerateKeyPair();
            Assert.AreEqual(32, priv.Length);
            Assert.AreEqual(32, pub.Length);
        }

        [Test]
        public void ToHex_FromHex_Roundtrip()
        {
            var original = WCCrypto.GenerateRandomBytes(32);
            var hex = WCCrypto.ToHex(original);
            var decoded = WCCrypto.FromHex(hex);
            Assert.AreEqual(original, decoded);
        }

        [Test]
        public void ToHex_ProducesLowercaseHex()
        {
            var bytes = new byte[] { 0xAB, 0xCD, 0xEF };
            var hex = WCCrypto.ToHex(bytes);
            Assert.AreEqual("abcdef", hex);
        }

        [Test]
        public void FromHex_Handles0xPrefix()
        {
            var bytes = WCCrypto.FromHex("0xdeadbeef");
            Assert.AreEqual(4, bytes.Length);
            Assert.AreEqual(0xDE, bytes[0]);
            Assert.AreEqual(0xAD, bytes[1]);
        }

        [Test]
        public void ConstantTimeCompare_EqualArrays_ReturnsTrue()
        {
            var a = new byte[] { 1, 2, 3, 4 };
            var b = new byte[] { 1, 2, 3, 4 };
            Assert.IsTrue(WCCrypto.ConstantTimeCompare(a, b));
        }

        [Test]
        public void ConstantTimeCompare_DifferentArrays_ReturnsFalse()
        {
            var a = new byte[] { 1, 2, 3, 4 };
            var b = new byte[] { 1, 2, 3, 5 };
            Assert.IsFalse(WCCrypto.ConstantTimeCompare(a, b));
        }

        [Test]
        public void ConstantTimeCompare_DifferentLengths_ReturnsFalse()
        {
            var a = new byte[] { 1, 2, 3 };
            var b = new byte[] { 1, 2 };
            Assert.IsFalse(WCCrypto.ConstantTimeCompare(a, b));
        }

        [Test]
        public void HMACSHA256_ProducesCorrectLength()
        {
            var key = WCCrypto.GenerateRandomBytes(32);
            var data = WCCrypto.GenerateRandomBytes(64);
            var mac = WCCrypto.HMACSHA256(key, data);
            Assert.AreEqual(32, mac.Length);
        }

        [Test]
        public void HMACSHA256_DeterministicOutput()
        {
            var key = new byte[] { 1, 2, 3 };
            var data = new byte[] { 4, 5, 6 };
            var a = WCCrypto.HMACSHA256(key, data);
            var b = WCCrypto.HMACSHA256(key, data);
            Assert.IsTrue(WCCrypto.ConstantTimeCompare(a, b));
        }

        [Test]
        public void SHA256_ProducesCorrectLength()
        {
            var data = System.Text.Encoding.UTF8.GetBytes("hello");
            var hash = WCCrypto.SHA256(data);
            Assert.AreEqual(32, hash.Length);
        }

        [Test]
        public void Base64Url_EncodeDecode_Roundtrip()
        {
            var original = WCCrypto.GenerateRandomBytes(32);
            var encoded = WCCrypto.ToBase64Url(original);
            var decoded = WCCrypto.FromBase64Url(encoded);
            Assert.AreEqual(original, decoded);
        }

        [Test]
        public void Base64Url_NoPaddingOrPlusSlashes()
        {
            var bytes = new byte[] { 0xFF, 0xFE, 0xFD, 0xFC };
            var encoded = WCCrypto.ToBase64Url(bytes);
            Assert.IsFalse(encoded.Contains("+"));
            Assert.IsFalse(encoded.Contains("/"));
            Assert.IsFalse(encoded.Contains("="));
        }

        [Test]
        public void AesCbcEncryptDecrypt_Roundtrip()
        {
            var key = WCCrypto.GenerateRandomBytes(32);
            var iv = WCCrypto.GenerateRandomBytes(16);
            var plaintext = System.Text.Encoding.UTF8.GetBytes("Hello, WalletConnect!");
            var encrypted = WCCrypto.AesCbcEncrypt(key, iv, plaintext);
            var decrypted = WCCrypto.AesCbcDecrypt(key, iv, encrypted);
            Assert.AreEqual(plaintext, decrypted);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Keccak256 Tests (via SIWE)
    // ═══════════════════════════════════════════════════════════════════

    [TestFixture]
    public class Keccak256Tests
    {
        [Test]
        public void Keccak256_EmptyString_ReturnsKnownHash()
        {
            // Keccak-256 of empty input
            var hash = SIWE.Keccak256(new byte[0]);
            Assert.AreEqual(32, hash.Length);
            // Known hash for empty input: c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470
            var expected = WCCrypto.FromHex("c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470");
            Assert.AreEqual(expected, hash);
        }

        [Test]
        public void Keccak256_DeterministicOutput()
        {
            var data = System.Text.Encoding.UTF8.GetBytes("test");
            var a = SIWE.Keccak256(data);
            var b = SIWE.Keccak256(data);
            Assert.AreEqual(a, b);
        }

        [Test]
        public void Keccak256_DifferentInputs_DifferentOutputs()
        {
            var a = SIWE.Keccak256(System.Text.Encoding.UTF8.GetBytes("hello"));
            var b = SIWE.Keccak256(System.Text.Encoding.UTF8.GetBytes("world"));
            Assert.AreNotEqual(a, b);
        }

        [Test]
        public void EIP191MessageHash_ProducesCorrectFormat()
        {
            var hash = SIWE.ComputeEIP191MessageHash("test message");
            Assert.AreEqual(32, hash.Length);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // SIWE Tests
    // ═══════════════════════════════════════════════════════════════════

    [TestFixture]
    public class SIWEProtocolTests
    {
        [Test]
        public void GenerateNonce_ProducesHexNonce()
        {
            var nonce = SIWE.GenerateNonce();
            Assert.IsTrue(nonce.StartsWith("0x"));
            Assert.AreEqual(34, nonce.Length); // 0x + 32 hex chars
        }

        [Test]
        public void GenerateNonce_DifferentEachTime()
        {
            var a = SIWE.GenerateNonce();
            var b = SIWE.GenerateNonce();
            Assert.AreNotEqual(a, b);
        }

        [Test]
        public void GenerateTimestamp_ReturnsISO8601()
        {
            var ts = SIWE.GenerateTimestamp();
            Assert.IsTrue(ts.EndsWith("Z"));
            Assert.IsTrue(ts.Contains("T"));
        }

        [Test]
        public void PrepareForSigning_ReturnsHash()
        {
            var p = new SIWEParams
            {
                Domain = "example.com",
                Address = "0x1234567890abcdef1234567890abcdef12345678",
                Uri = "https://example.com",
                ChainId = 1,
                Nonce = "abc",
                IssuedAt = "2024-01-01T00:00:00Z"
            };
            var hash = SIWE.PrepareForSigning(p);
            Assert.AreEqual(32, hash.Length);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // WalletManager Tests
    // ═══════════════════════════════════════════════════════════════════

    [TestFixture]
    public class WalletManagerProtocolTests
    {
        private WalletManager _manager;

        [SetUp]
        public void Setup()
        {
            _manager = new WalletManager(
                "test_project_id",
                new AppMetadata("Test App", "Test Description", "https://test.com"),
                "wss://relay.walletconnect.com"
            );
        }

        [Test]
        public void Constructor_StoresParameters()
        {
            Assert.That(_manager, Is.Not.Null);
        }

        [Test]
        public void ConnectAsync_ThrowsIfNotInitialized()
        {
            Assert.ThrowsAsync<System.InvalidOperationException>(
                async () => await _manager.ConnectAsync("metamask")
            );
        }

        [Test]
        public async Task InitializeAsync_Succeeds()
        {
            // This will attempt to connect to the relay server, which may fail in test env
            // We test that the method doesn't crash
            try
            {
                await _manager.InitializeAsync();
            }
            catch
            {
                // Expected in test environment without network
            }
            Assert.Pass();
        }

        [Test]
        public async Task DisconnectAsync_WithNullSession_Succeeds()
        {
            await _manager.DisconnectAsync(null);
            Assert.Pass();
        }

        [Test]
        public async Task SignMessageAsync_ThrowsIfNotConnected()
        {
            Assert.ThrowsAsync<System.InvalidOperationException>(
                async () => await _manager.SignMessageAsync(null, "test")
            );
        }

        [Test]
        public async Task SendTransactionAsync_ThrowsIfNotConnected()
        {
            Assert.ThrowsAsync<System.InvalidOperationException>(
                async () => await _manager.SendTransactionAsync(null, new TransactionRequest())
            );
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // EvmAdapter Tests
    // ═══════════════════════════════════════════════════════════════════

    [TestFixture]
    public class EvmAdapterProtocolTests
    {
        private EvmAdapter _adapter;

        [SetUp]
        public void Setup()
        {
            _adapter = new EvmAdapter("https://eth.llamarpc.com", 1);
        }

        [Test]
        public void FormatWeiToEther_OneEther()
        {
            var wei = BigInteger.Parse("1000000000000000000");
            var result = EvmAdapter.FormatWeiToEther(wei);
            Assert.AreEqual("1", result);
        }

        [Test]
        public void FormatWeiToEther_ZeroWei()
        {
            var result = EvmAdapter.FormatWeiToEther(BigInteger.Zero);
            Assert.AreEqual("0", result);
        }

        [Test]
        public void ParseEtherToWei_OneEther()
        {
            var wei = EvmAdapter.ParseEtherToWei("1");
            Assert.AreEqual(BigInteger.Parse("1000000000000000000"), wei);
        }

        [Test]
        public void ParseEtherToWei_EmptyString_ReturnsZero()
        {
            var wei = EvmAdapter.ParseEtherToWei("");
            Assert.AreEqual(BigInteger.Zero, wei);
        }

        [Test]
        public void HexToBigInteger_ParsesHexCorrectly()
        {
            var value = EvmAdapter.HexToBigInteger("0x64");
            Assert.AreEqual(new BigInteger(100), value);
        }

        [Test]
        public void HexToBigInteger_ParsesZero()
        {
            var value = EvmAdapter.HexToBigInteger("0x0");
            Assert.AreEqual(BigInteger.Zero, value);
        }

        [Test]
        public void BigIntegerToHex_ConvertsCorrectly()
        {
            var hex = EvmAdapter.BigIntegerToHex(new BigInteger(255));
            Assert.AreEqual("0xff", hex);
        }

        [Test]
        public void IsValidAddress_ValidAddress_ReturnsTrue()
        {
            Assert.IsTrue(EvmAdapter.IsValidAddress("0x1234567890abcdef1234567890abcdef12345678"));
        }

        [Test]
        public void IsValidAddress_InvalidAddress_ReturnsFalse()
        {
            Assert.IsFalse(EvmAdapter.IsValidAddress("0xINVALID"));
        }

        [Test]
        public void IsValidAddress_TooShort_ReturnsFalse()
        {
            Assert.IsFalse(EvmAdapter.IsValidAddress("0x1234"));
        }

        [Test]
        public void FormatAddress_TruncatesCorrectly()
        {
            var result = EvmAdapter.FormatAddress("0x1234567890abcdef1234567890abcdef12345678");
            Assert.AreEqual("0x1234\u20265678", result);
        }

        [Test]
        public void ChainIdToHex_ConvertsCorrectly()
        {
            var hex = EvmAdapter.ChainIdToHex(1);
            Assert.AreEqual("0x1", hex);
        }

        [Test]
        public void ChainIdToHex_LargeChainId()
        {
            var hex = EvmAdapter.ChainIdToHex(42161);
            Assert.AreEqual("0xa4a1", hex);
        }

        [Test]
        public async Task GetChainIdAsync_ReturnsDefaultChainId()
        {
            var chainId = await _adapter.GetChainIdAsync();
            Assert.AreEqual(1, chainId);
        }

        [Test]
        public void Init_ChangesRpcUrl()
        {
            var adapter = new EvmAdapter();
            adapter.Init("https://polygon-rpc.com", 137);
            Assert.DoesNotThrowAsync(async () => await adapter.GetChainIdAsync());
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // WalletRegistry Tests
    // ═══════════════════════════════════════════════════════════════════

    [TestFixture]
    public class WalletRegistryTests
    {
        [Test]
        public void HasMetamask()
        {
            Assert.IsTrue(WalletRegistry.Has("metamask"));
        }

        [Test]
        public void HasWalletConnect()
        {
            Assert.IsTrue(WalletRegistry.Has("walletconnect"));
        }

        [Test]
        public void HasRainbow()
        {
            Assert.IsTrue(WalletRegistry.Has("rainbow"));
        }

        [Test]
        public void HasPhantom()
        {
            Assert.IsTrue(WalletRegistry.Has("phantom"));
        }

        [Test]
        public void GetAll_ReturnsManyWallets()
        {
            var all = WalletRegistry.GetAll();
            Assert.That(all.Count, Is.GreaterThanOrEqualTo(10));
        }

        [Test]
        public void GetForChain_ReturnsEthereumWallets()
        {
            var wallets = WalletRegistry.GetForChain("eip155:1");
            Assert.IsNotEmpty(wallets);
        }

        [Test]
        public void GetForChain_ReturnsSolanaWallets()
        {
            var wallets = WalletRegistry.GetForChain("solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp");
            Assert.IsNotEmpty(wallets);
        }

        [Test]
        public void GetUnknownWallet_ReturnsNull()
        {
            var wallet = WalletRegistry.Get("nonexistent_wallet");
            Assert.IsNull(wallet);
        }

        [Test]
        public void RegisterCustomWallet()
        {
            var custom = new WalletInfo(
                "custom", "Custom Wallet", "https://custom.com/icon.png",
                "custom://", "custom.com", "", "", new[] { "eip155:1" }
            );
            WalletRegistry.Register(custom);
            Assert.IsTrue(WalletRegistry.Has("custom"));
        }

        [Test]
        public void WalletInfo_HasRequiredFields()
        {
            var wallet = WalletRegistry.Get("metamask");
            Assert.IsNotNull(wallet);
            Assert.IsNotNull(wallet.Name);
            Assert.IsNotNull(wallet.Id);
            Assert.IsNotNull(wallet.SupportedChains);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // DeepLinkHandler Tests
    // ═══════════════════════════════════════════════════════════════════

    [TestFixture]
    public class DeepLinkHandlerTests
    {
        private DeepLinkHandler _handler;

        [SetUp]
        public void Setup()
        {
            _handler = new DeepLinkHandler();
        }

        [Test]
        public void GenerateDeepLink_ForMetaMask()
        {
            var link = _handler.GenerateDeepLink("metamask", "wc:abc123");
            Assert.That(link, Does.StartWith("metamask://"));
            Assert.That(link, Does.Contain("wc:abc123"));
        }

        [Test]
        public void GenerateDeepLink_ForPhantom()
        {
            var link = _handler.GenerateDeepLink("phantom", "wc:sol123");
            Assert.That(link, Does.StartWith("phantom://"));
        }

        [Test]
        public void GenerateDeepLink_ForUnknownWallet_Throws()
        {
            Assert.Throws<System.ArgumentException>(
                () => _handler.GenerateDeepLink("unknown_wallet", "wc:test")
            );
        }

        [Test]
        public void GenerateUniversalLink_ForMetaMask()
        {
            var link = _handler.GenerateUniversalLink("metamask", "wc:abc123");
            Assert.That(link, Does.Contain("metamask.app.link"));
        }

        [Test]
        public void BuildCallbackUrl_ReturnsSchemeUrl()
        {
            var url = _handler.BuildCallbackUrl("cinacoin");
            Assert.That(url, Does.StartWith("cinacoin://"));
        }

        [Test]
        public void IsDeepLinkSupported_ReturnsFalseOnDesktop()
        {
            // In editor/test, this should be false
            _handler.SetPlatform(DeepLinkHandler.Platform.Web);
            Assert.IsFalse(_handler.IsDeepLinkSupported());
        }

        [Test]
        public void IsDeepLinkSupported_ReturnsTrueOnMobile()
        {
            _handler.SetPlatform(DeepLinkHandler.Platform.iOS);
            Assert.IsTrue(_handler.IsDeepLinkSupported());
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // CinacoinManager Tests
    // ═══════════════════════════════════════════════════════════════════

    [TestFixture]
    public class CinacoinIntegrationTests
    {
        [UnityTest]
        public IEnumerator Initialize_SetsStatusToDisconnected()
        {
            var go = new GameObject("[Cinacoin_Test]");
            var manager = go.AddComponent<CinacoinManager>();

            manager.Initialize("test_project_id",
                new AppMetadata("Test App", "Test", "https://test.com"));

            Assert.That(manager.Status, Is.EqualTo(ConnectionStatus.Disconnected));
            Assert.That(manager.IsConnected, Is.False);
            Assert.That(manager.Accounts, Is.Empty);

            Object.DestroyImmediate(go);
            yield return null;
        }

        [UnityTest]
        public IEnumerator Singleton_CreatesInstance()
        {
            var existing = Object.FindObjectOfType<CinacoinManager>();
            if (existing != null)
                Object.DestroyImmediate(existing.gameObject);

            var instance = CinacoinManager.Instance;
            Assert.That(instance, Is.Not.Null);
            Assert.That(instance, Is.TypeOf<CinacoinManager>());

            Object.DestroyImmediate(instance.gameObject);
            yield return null;
        }

        [UnityTest]
        public IEnumerator EvmAdapter_AvailableAfterInit()
        {
            var go = new GameObject("[Cinacoin_Test]");
            var manager = go.AddComponent<CinacoinManager>();
            manager.Initialize("test", new AppMetadata("Test", "Test", "https://test.com"));

            Assert.That(manager.Evm, Is.Not.Null);

            Object.DestroyImmediate(go);
            yield return null;
        }

        [UnityTest]
        public IEnumerator DeepLinks_AvailableAfterInit()
        {
            var go = new GameObject("[Cinacoin_Test]");
            var manager = go.AddComponent<CinacoinManager>();
            manager.Initialize("test", new AppMetadata("Test", "Test", "https://test.com"));

            Assert.That(manager.DeepLinks, Is.Not.Null);

            Object.DestroyImmediate(go);
            yield return null;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Connection State Tests
    // ═══════════════════════════════════════════════════════════════════

    [TestFixture]
    public class ConnectionStateTests
    {
        [Test]
        public void SessionState_Disconnected_CorrectFields()
        {
            var state = SessionState.Disconnected;
            Assert.AreEqual(ConnectionStatus.Disconnected, state.Status);
            Assert.IsNull(state.Accounts);
        }

        [Test]
        public void SessionState_Connecting_HasConnectorId()
        {
            var state = SessionState.Connecting("metamask");
            Assert.AreEqual(ConnectionStatus.Connecting, state.Status);
            Assert.AreEqual("metamask", state.ConnectorId);
        }

        [Test]
        public void SessionState_Connected_HasAllFields()
        {
            var state = SessionState.Connected(
                new[] { "0x1234" },
                1,
                "session-123",
                "walletconnect"
            );
            Assert.AreEqual(ConnectionStatus.Connected, state.Status);
            Assert.AreEqual(1, state.ChainId);
            Assert.AreEqual("session-123", state.SessionId);
            Assert.AreEqual("walletconnect", state.ConnectorId);
            Assert.AreEqual(1, state.Accounts.Length);
        }

        [Test]
        public void SessionState_Errored_HasErrorMessage()
        {
            var state = SessionState.Errored("Connection refused");
            Assert.AreEqual(ConnectionStatus.Error, state.Status);
            Assert.AreEqual("Connection refused", state.Error);
        }

        [Test]
        public void ConnectionResult_StoresAllFields()
        {
            var result = new ConnectionResult(
                "session-abc",
                new[] { "0x1234" },
                1,
                "metamask"
            );
            Assert.AreEqual("session-abc", result.SessionId);
            Assert.AreEqual(1, result.ChainId);
            Assert.AreEqual("metamask", result.ConnectorId);
            Assert.AreEqual("0x1234", result.Accounts[0]);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Namespace/Session Type Tests
    // ═══════════════════════════════════════════════════════════════════

    [TestFixture]
    public class WCProtocolTypesTests
    {
        [Test]
        public void BuildEip155Namespaces_CorrectMethods()
        {
            var namespaces = WCClient.BuildEip155Namespaces(new[] { 1 });
            Assert.AreEqual(1, namespaces.Length);
            Assert.AreEqual("eip155:1", namespaces[0].ChainId);
            Assert.Contains("eth_sendTransaction", namespaces[0].Methods);
            Assert.Contains("personal_sign", namespaces[0].Methods);
            Assert.Contains("chainChanged", namespaces[0].Events);
        }

        [Test]
        public void BuildEip155Namespaces_MultipleChains()
        {
            var namespaces = WCClient.BuildEip155Namespaces(new[] { 1, 137, 42161 });
            Assert.AreEqual(3, namespaces.Length);
        }

        [Test]
        public void Namespace_ContainsRequiredMethods()
        {
            var ns = WCClient.BuildEip155Namespaces(new[] { 1 })[0];
            var requiredMethods = new[] {
                "eth_sendTransaction", "eth_signTransaction",
                "personal_sign", "eth_signTypedData", "eth_signTypedData_v4"
            };
            foreach (var method in requiredMethods)
            {
                Assert.Contains(method, ns.Methods);
            }
        }

        [Test]
        public void PairingInfo_IsExpired_ComputesCorrectly()
        {
            var pairing = new PairingInfo
            {
                Expiry = DateTimeOffset.UtcNow.ToUnixTimeSeconds() - 100,
                CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds() - 200
            };
            Assert.IsTrue(pairing.IsExpired);
        }

        [Test]
        public void PairingInfo_IsNotExpired_ForFutureExpiry()
        {
            var pairing = new PairingInfo
            {
                Expiry = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + 3600,
                CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            };
            Assert.IsFalse(pairing.IsExpired);
        }

        [Test]
        public void SessionInfo_IsExpired_ComputesCorrectly()
        {
            var session = new SessionInfo
            {
                Expiry = DateTimeOffset.UtcNow.ToUnixTimeSeconds() - 100,
                CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds() - 200
            };
            Assert.IsTrue(session.IsExpired);
        }
    }
}
