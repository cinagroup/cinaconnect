using System.Threading.Tasks;
using System.Numerics;
using NUnit.Framework;
using Cinacoin.Chain;

namespace Cinacoin.Tests.Runtime
{
    /// <summary>
    /// Tests for Solana adapter: SOL balance, transaction, address validation.
    /// </summary>
    public class SolanaAdapterTests
    {
        private SolanaAdapter _adapter;

        [SetUp]
        public void Setup()
        {
            _adapter = new SolanaAdapter("https://api.mainnet-beta.solana.com");
        }

        // ─── SOL Balance ─────────────────────────────────────────────────

        [Test]
        public async Task GetBalanceAsync_DefaultAdapter_ReturnsZero()
        {
            var balance = await _adapter.GetBalanceAsync("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
            Assert.AreEqual(BigInteger.Zero, balance);
        }

        [Test]
        public async Task GetBalanceSolAsync_ReturnsZero()
        {
            var sol = await _adapter.GetBalanceSolAsync("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
            Assert.AreEqual(0.0, sol);
        }

        [Test]
        public void LamportsToSol_ConvertsCorrectly()
        {
            Assert.AreEqual(1.0, SolanaAdapter.LamportsToSol(1_000_000_000), 0.000001);
        }

        [Test]
        public void SolToLamports_ConvertsCorrectly()
        {
            Assert.AreEqual(1_000_000_000L, SolanaAdapter.SolToLamports(1.0));
        }

        [Test]
        public void LamportsToSol_Zero()
        {
            Assert.AreEqual(0.0, SolanaAdapter.LamportsToSol(0), 0.000001);
        }

        // ─── Transaction ─────────────────────────────────────────────────

        [Test]
        public async Task SendTransactionAsync_DefaultAdapter_ReturnsEmpty()
        {
            var result = await _adapter.SendTransactionAsync("base64encodedtx");
            Assert.AreEqual(string.Empty, result);
        }

        [Test]
        public async Task GetTransactionAsync_DefaultAdapter_ReturnsEmpty()
        {
            var result = await _adapter.GetTransactionAsync("signature123");
            Assert.AreEqual(string.Empty, result);
        }

        // ─── Address Validation ──────────────────────────────────────────

        [Test]
        public void IsValidAddress_ValidBase58_ReturnsTrue()
        {
            Assert.IsTrue(SolanaAdapter.IsValidAddress("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"));
        }

        [Test]
        public void IsValidAddress_EmptyString_ReturnsFalse()
        {
            Assert.IsFalse(SolanaAdapter.IsValidAddress(""));
        }

        [Test]
        public void IsValidAddress_ContainsInvalidChars_ReturnsFalse()
        {
            Assert.IsFalse(SolanaAdapter.IsValidAddress("0x1234567890abcdef"));
        }

        [Test]
        public void IsValidAddress_TooShort_ReturnsFalse()
        {
            Assert.IsFalse(SolanaAdapter.IsValidAddress("short"));
        }

        [Test]
        public void IsValidAddress_TooLong_ReturnsFalse()
        {
            var longAddr = new string('A', 45);
            Assert.IsFalse(SolanaAdapter.IsValidAddress(longAddr));
        }
    }
}
