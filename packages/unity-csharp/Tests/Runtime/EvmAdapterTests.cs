using System.Threading.Tasks;
using System.Numerics;
using NUnit.Framework;
using Cinacoin.Chain;

namespace Cinacoin.Tests.Runtime
{
    /// <summary>
    /// Tests for EVM adapter: balance queries, transaction formatting, chain switching.
    /// </summary>
    public class EvmAdapterTests
    {
        private EvmAdapter _adapter;

        [SetUp]
        public void Setup()
        {
            _adapter = new EvmAdapter("https://eth.llamarpc.com", 1);
        }

        // ─── Balance ─────────────────────────────────────────────────────

        [Test]
        public async Task GetBalanceAsync_WithDefaultAdapter_ReturnsZero()
        {
            var balance = await _adapter.GetBalanceAsync("0x1234567890abcdef1234567890abcdef12345678");
            Assert.AreEqual(BigInteger.Zero, balance);
        }

        [Test]
        public async Task GetBalanceFormattedAsync_ReturnsZeroFormatted()
        {
            var formatted = await _adapter.GetBalanceFormattedAsync("0x1234");
            Assert.AreEqual("0", formatted);
        }

        // ─── Transaction Signing ─────────────────────────────────────────

        [Test]
        public async Task SendTransactionAsync_WithoutPrivateKey_Throws()
        {
            var adapter = new EvmAdapter();
            Assert.ThrowsAsync<System.InvalidOperationException>(
                async () => await adapter.SendTransactionAsync(new TransactionRequest
                {
                    From = "0xSender",
                    To = "0xReceiver",
                    Value = "0x1"
                })
            );
        }

        [Test]
        public async Task SendTransactionAsync_WithPrivateKey_ReturnsHash()
        {
            var adapter = new EvmAdapter();
            adapter.SetPrivateKey("0x" + new byte[32].ToString());
            var hash = await adapter.SendTransactionAsync(new TransactionRequest
            {
                From = "0xSender",
                To = "0xReceiver",
                Value = "0x1"
            });
            Assert.That(hash, Does.StartWith("0x"));
        }

        // ─── Chain Switch ────────────────────────────────────────────────

        [Test]
        public async Task GetChainIdAsync_ReturnsDefaultChainId()
        {
            var chainId = await _adapter.GetChainIdAsync();
            Assert.AreEqual(1, chainId);
        }

        [Test]
        public async Task Init_ChangesChainId()
        {
            var adapter = new EvmAdapter();
            adapter.Init("https://polygon-rpc.com", 137);
            var chainId = await adapter.GetChainIdAsync();
            Assert.AreEqual(137, chainId);
        }

        // ─── Formatting ──────────────────────────────────────────────────

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
    }
}
