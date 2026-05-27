using System.Threading.Tasks;
using NUnit.Framework;

namespace Cinacoin.Tests.Runtime
{
    /// <summary>
    /// PlayMode tests for the WalletManager class.
    /// </summary>
    public class WalletManagerTests
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
        public async Task ConnectAsync_ThrowsIfNotInitialized()
        {
            Assert.ThrowsAsync<System.InvalidOperationException>(
                async () => await _manager.ConnectAsync("metamask")
            );
        }

        [Test]
        public async Task InitializeAsync_Succeeds()
        {
            await _manager.InitializeAsync();
            // Should not throw
            Assert.Pass();
        }

        [Test]
        public async Task DisconnectAsync_WithNullSession_Succeeds()
        {
            await _manager.DisconnectAsync(null);
            // Should not throw
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
}
