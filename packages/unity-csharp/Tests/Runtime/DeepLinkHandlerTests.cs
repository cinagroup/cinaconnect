using System.Threading.Tasks;
using NUnit.Framework;
using Cinacoin;

namespace Cinacoin.Tests.Runtime
{
    /// <summary>
    /// Tests for DeepLinkHandler: URI parsing, wallet routing.
    /// </summary>
    public class DeepLinkHandlerTests
    {
        private DeepLinkHandler _handler;

        [SetUp]
        public void Setup()
        {
            _handler = new DeepLinkHandler();
        }

        // ─── URI Parsing ─────────────────────────────────────────────────

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
        public void GenerateDeepLink_ForWalletConnect()
        {
            var link = _handler.GenerateDeepLink("walletconnect", "wc:relay123");
            Assert.That(link, Does.StartWith("wc://"));
        }

        // ─── Wallet Detection ────────────────────────────────────────────

        [Test]
        public void GenerateUniversalLink_ForMetaMask()
        {
            var link = _handler.GenerateUniversalLink("metamask", "wc:abc123");
            Assert.That(link, Does.Contain("metamask.app.link"));
        }

        [Test]
        public void GenerateUniversalLink_ForUnknownWallet_Throws()
        {
            Assert.Throws<System.ArgumentException>(
                () => _handler.GenerateUniversalLink("unknown_wallet", "wc:test")
            );
        }

        [Test]
        public void WalletRegistry_HasExpectedWallets()
        {
            Assert.IsTrue(WalletRegistry.Has("metamask"));
            Assert.IsTrue(WalletRegistry.Has("walletconnect"));
            Assert.IsTrue(WalletRegistry.Has("rainbow"));
            Assert.IsTrue(WalletRegistry.Has("phantom"));
        }

        [Test]
        public void WalletRegistry_GetAll_ReturnsNonEmpty()
        {
            var all = WalletRegistry.GetAll();
            Assert.IsNotEmpty(all);
        }
    }
}
