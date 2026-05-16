using System;
using System.Numerics;
using System.Threading.Tasks;

namespace OnChainUX.Chain
{
    /// <summary>
    /// EVM chain adapter using Nethereum.
    /// Provides chain interaction methods matching the core-sdk EvmAdapter interface.
    /// </summary>
    public class EvmAdapter
    {
        private string _rpcUrl;
        private int? _chainId;
        private string _privateKey;

        /// Create an EVM chain adapter.
        public EvmAdapter(string rpcUrl = null, int? chainId = null)
        {
            _rpcUrl = rpcUrl ?? "https://eth.llamarpc.com";
            _chainId = chainId;
        }

        /// Initialize with an RPC URL.
        public void Init(string rpcUrl, int? chainId = null)
        {
            _rpcUrl = rpcUrl;
            _chainId = chainId;
        }

        /// Set the private key for signing (use with caution).
        public void SetPrivateKey(string privateKey)
        {
            _privateKey = privateKey;
        }

        /// Get the native balance of an address (in wei).
        public async Task<BigInteger> GetBalanceAsync(string address)
        {
            // TODO: Implement using Nethereum
            // var web3 = new Web3(_rpcUrl);
            // var balance = await web3.Eth.GetBalance.SendRequestAsync(address);
            // return balance.Value;

            await Task.CompletedTask;
            return BigInteger.Zero;
        }

        /// Get the balance in human-readable format.
        public async Task<string> GetBalanceFormattedAsync(string address, int decimals = 18)
        {
            var balanceWei = await GetBalanceAsync(address);
            return FormatWeiToEther(balanceWei, decimals);
        }

        /// Send a transaction.
        public async Task<string> SendTransactionAsync(TransactionRequest tx)
        {
            if (string.IsNullOrEmpty(_privateKey))
                throw new InvalidOperationException("Private key not set");

            // TODO: Implement using Nethereum
            // var web3 = new Web3(_rpcUrl);
            // var txInput = new TransactionInput { ... };
            // var hash = await web3.Eth.TransactionManager.SendTransactionAsync(txInput);
            // return hash;

            await Task.CompletedTask;
            return "0x" + Guid.NewGuid().ToString().Replace("-", "");
        }

        /// Call a contract method (read-only).
        public async Task<string> CallAsync(string from, string to, string data)
        {
            // TODO: Implement using Nethereum
            // var web3 = new Web3(_rpcUrl);
            // var callInput = new CallInput { From = from, To = to, Data = data };
            // var result = await web3.Eth.Transactions.Call.SendRequestAsync(callInput);
            // return result;

            await Task.CompletedTask;
            return "0x";
        }

        /// Get the current block number.
        public async Task<long> GetBlockNumberAsync()
        {
            // TODO: Implement using Nethereum
            await Task.CompletedTask;
            return 0;
        }

        /// Estimate gas for a transaction.
        public async Task<BigInteger> EstimateGasAsync(string from, string to, string data = null)
        {
            // TODO: Implement using Nethereum
            await Task.CompletedTask;
            return BigInteger.Zero;
        }

        /// Get the chain ID from the RPC endpoint.
        public async Task<int> GetChainIdAsync()
        {
            if (_chainId.HasValue) return _chainId.Value;
            // TODO: Query chainId from RPC
            await Task.CompletedTask;
            return 1;
        }

        /// Format wei to ether string.
        public static string FormatWeiToEther(BigInteger wei, int decimals = 18)
        {
            var divisor = BigInteger.Pow(10, decimals);
            var integerPart = wei / divisor;
            var fractionalPart = wei % divisor;

            var fracStr = fractionalPart.ToString().PadLeft(decimals, '0').Substring(0, Math.Min(4, decimals));
            fracStr = fracStr.TrimEnd('0');

            return fracStr.Length > 0 ? $"{integerPart}.{fracStr}" : integerPart.ToString();
        }

        /// Parse an ether string to wei.
        public static BigInteger ParseEtherToWei(string ether, int decimals = 18)
        {
            if (string.IsNullOrEmpty(ether)) return BigInteger.Zero;

            var parts = ether.Split('.');
            var integerPart = BigInteger.Parse(parts[0]);
            var result = integerPart * BigInteger.Pow(10, decimals);

            if (parts.Length > 1)
            {
                var fracStr = parts[1].PadRight(decimals, '0').Substring(0, decimals);
                result += BigInteger.Parse(fracStr);
            }

            return result;
        }

        /// Format an address for display.
        public static string FormatAddress(string address, int prefixLength = 6, int suffixLength = 4)
        {
            if (string.IsNullOrEmpty(address) || address.Length <= prefixLength + suffixLength)
                return address;
            return $"{address.Substring(0, prefixLength)}\u2026{address.Substring(address.Length - suffixLength)}";
        }
    }
}
