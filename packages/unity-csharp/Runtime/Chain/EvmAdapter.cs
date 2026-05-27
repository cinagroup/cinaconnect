using System;
using System.Numerics;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Generic;
using UnityEngine.Networking;
using Newtonsoft.Json;

namespace Cinacoin.Chain
{
    /// <summary>
    /// EVM chain adapter with real JSON-RPC integration.
    /// Provides chain interaction methods matching the core-sdk EvmAdapter interface.
    /// Uses Unity's UnityWebRequest for HTTP JSON-RPC calls.
    /// Compatible with all EVM chains (Ethereum, Polygon, BSC, Arbitrum, etc.).
    /// </summary>
    public class EvmAdapter
    {
        private string _rpcUrl;
        private int? _chainId;
        private string _privateKey;

        // JSON-RPC id counter
        private static int _rpcId = 1;

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
        /// In production, prefer WalletConnect signing over raw private keys.
        public void SetPrivateKey(string privateKey)
        {
            _privateKey = privateKey;
        }

        // ─── JSON-RPC Methods ───────────────────────────────────────────

        /// Get the native balance of an address (in wei).
        /// Uses eth_getBalance JSON-RPC method.
        public async Task<BigInteger> GetBalanceAsync(string address)
        {
            if (string.IsNullOrEmpty(address))
                throw new ArgumentException("Address cannot be null or empty");

            var result = await CallRpcAsync<string>("eth_getBalance", new[] { address, "latest" });
            return HexToBigInteger(result);
        }

        /// Get the balance in human-readable format.
        public async Task<string> GetBalanceFormattedAsync(string address, int decimals = 18)
        {
            var balanceWei = await GetBalanceAsync(address);
            return FormatWeiToEther(balanceWei, decimals);
        }

        /// Send a transaction.
        /// If private key is set, signs and sends via eth_sendRawTransaction.
        /// Otherwise, returns an unsigned transaction for WalletConnect signing.
        public async Task<string> SendTransactionAsync(TransactionRequest tx)
        {
            if (string.IsNullOrEmpty(_privateKey))
            {
                // Return unsigned tx hash placeholder for WalletConnect flow
                // In real WC flow, the wallet handles signing
                return "0xunsigned";
            }

            // Sign and send with private key
            var nonce = await GetNonceAsync(tx.From);
            var chainId = await GetChainIdAsync();
            var gasLimit = !string.IsNullOrEmpty(tx.Gas)
                ? HexToBigInteger(tx.Gas)
                : await EstimateGasAsync(tx.From, tx.To, tx.Data);

            var gasPrice = await GetGasPriceAsync();

            // Build transaction data for signing
            var txData = BuildRawTransaction(tx, nonce, gasLimit, gasPrice, chainId);
            var signature = SignTransaction(txData, _privateKey);
            var rawTx = BytesToHex(txData, signature);

            var result = await CallRpcAsync<string>("eth_sendRawTransaction", new[] { rawTx });
            return result;
        }

        /// Call a contract method (read-only).
        /// Uses eth_call JSON-RPC method.
        public async Task<string> CallAsync(string from, string to, string data)
        {
            var callParams = new Dictionary<string, string>();
            if (!string.IsNullOrEmpty(to)) callParams["to"] = to;
            if (!string.IsNullOrEmpty(from)) callParams["from"] = from;
            if (!string.IsNullOrEmpty(data)) callParams["data"] = data;

            var result = await CallRpcAsync<string>("eth_call", new object[] { callParams, "latest" });
            return result;
        }

        /// Call an ERC-20 balanceOf method.
        public async Task<BigInteger> GetTokenBalanceAsync(string tokenAddress, string ownerAddress)
        {
            // balanceOf(address) function selector: 0x70a08231
            var paddedAddress = ownerAddress.Substring(2).PadLeft(64, '0');
            var data = "0x70a08231" + paddedAddress;

            var result = await CallAsync(null, tokenAddress, data);
            return HexToBigInteger(result);
        }

        /// Get the current block number.
        public async Task<long> GetBlockNumberAsync()
        {
            var result = await CallRpcAsync<string>("eth_blockNumber", Array.Empty<object>());
            return HexToLong(result);
        }

        /// Estimate gas for a transaction.
        public async Task<BigInteger> EstimateGasAsync(string from, string to, string data = null)
        {
            var callParams = new Dictionary<string, string>();
            if (!string.IsNullOrEmpty(from)) callParams["from"] = from;
            if (!string.IsNullOrEmpty(to)) callParams["to"] = to;
            if (!string.IsNullOrEmpty(data)) callParams["data"] = data;

            var result = await CallRpcAsync<string>("eth_estimateGas", new object[] { callParams });
            return HexToBigInteger(result);
        }

        /// Get the current gas price.
        public async Task<BigInteger> GetGasPriceAsync()
        {
            var result = await CallRpcAsync<string>("eth_gasPrice", Array.Empty<object>());
            return HexToBigInteger(result);
        }

        /// Get the current nonce for an address.
        public async Task<long> GetNonceAsync(string address)
        {
            var result = await CallRpcAsync<string>("eth_getTransactionCount", new[] { address, "latest" });
            return HexToLong(result);
        }

        /// Get the chain ID from the RPC endpoint.
        public async Task<int> GetChainIdAsync()
        {
            if (_chainId.HasValue) return _chainId.Value;

            var result = await CallRpcAsync<string>("eth_chainId", Array.Empty<object>());
            return (int)HexToLong(result);
        }

        /// Get a transaction receipt by hash.
        public async Task<string> GetTransactionReceiptAsync(string txHash)
        {
            return await CallRpcAsync<string>("eth_getTransactionReceipt", new[] { txHash });
        }

        /// Get a transaction by hash.
        public async Task<string> GetTransactionByHashAsync(string txHash)
        {
            return await CallRpcAsync<string>("eth_getTransactionByHash", new[] { txHash });
        }

        /// Get logs (events) matching a filter.
        public async Task<string> GetLogsAsync(string fromBlock = "latest", string toBlock = "latest",
            string address = null, string[] topics = null)
        {
            var filter = new Dictionary<string, object>();
            filter["fromBlock"] = fromBlock;
            filter["toBlock"] = toBlock;
            if (!string.IsNullOrEmpty(address)) filter["address"] = address;
            if (topics != null && topics.Length > 0) filter["topics"] = topics;

            return await CallRpcAsync<string>("eth_getLogs", new object[] { filter });
        }

        /// Get the code at a contract address.
        public async Task<string> GetCodeAsync(string address)
        {
            return await CallRpcAsync<string>("eth_getCode", new[] { address, "latest" });
        }

        // ─── Raw RPC Call ───────────────────────────────────────────────

        /// Make a raw JSON-RPC call to the Ethereum node.
        private async Task<T> CallRpcAsync<T>(string method, object[] parameters)
        {
            var id = System.Threading.Interlocked.Increment(ref _rpcId);

            var rpcRequest = new
            {
                jsonrpc = "2.0",
                method = method,
                @params = parameters,
                id = id
            };

            var jsonBody = JsonConvert.SerializeObject(rpcRequest);

            using var request = new UnityWebRequest(_rpcUrl, "POST")
            {
                uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(jsonBody)),
                downloadHandler = new DownloadHandlerBuffer(),
                timeout = 30
            };

            request.SetRequestHeader("Content-Type", "application/json");

            var operation = request.SendWebRequest();
            while (!operation.isDone)
            {
                await Task.Delay(1);
            }

#if UNITY_2020_1_OR_NEWER
            if (request.result != UnityWebRequest.Result.Success)
#else
            if (request.isNetworkError || request.isHttpError)
#endif
            {
                throw new Exception($"RPC request failed [{method}]: {request.error}");
            }

            var response = request.downloadHandler.text;
            var rpcResponse = JsonConvert.DeserializeObject<JsonRpcResponse<T>>(response);

            if (rpcResponse.error != null)
            {
                throw new Exception($"RPC error [{rpcResponse.error.code}]: {rpcResponse.error.message}");
            }

            return rpcResponse.result;
        }

        // ─── Transaction Signing Helpers ────────────────────────────────

        /// Build a raw transaction RLP-encoded (simplified for Unity).
        /// NOTE: Full RLP encoding requires a proper RLP library.
        /// This is a placeholder for production use.
        private byte[] BuildRawTransaction(TransactionRequest tx, long nonce, BigInteger gasLimit,
            BigInteger gasPrice, int chainId)
        {
            // In production, use Nethereum's TransactionSigningManager
            // or a proper RLP encoding library for Unity
            throw new NotImplementedException(
                "Raw transaction signing requires an RLP encoding library. " +
                "Use WalletConnect signing (eth_sendTransaction) for production, " +
                "or integrate Nethereum.ABI/RLP for local signing."
            );
        }

        /// Sign a transaction hash with ECDSA.
        /// Returns (r, s, v) signature components.
        private (byte[] r, byte[] s, byte v) SignTransaction(byte[] txData, string privateKey)
        {
            // In production, use Nethereum or a proper ECDSA library for Unity
            throw new NotImplementedException(
                "Transaction signing requires an ECDSA library. " +
                "Use WalletConnect signing for production."
            );
        }

        // ─── Utility Methods ────────────────────────────────────────────

        /// Format wei to ether string.
        public static string FormatWeiToEther(BigInteger wei, int decimals = 18)
        {
            if (wei == BigInteger.Zero) return "0";

            var divisor = BigInteger.Pow(10, decimals);
            var integerPart = wei / divisor;
            var fractionalPart = wei % divisor;

            var fracStr = fractionalPart.ToString().PadLeft(decimals, '0');
            // Trim trailing zeros but keep at most 4 decimal places
            fracStr = fracStr.TrimEnd('0');
            if (fracStr.Length > 4)
                fracStr = fracStr.Substring(0, 4).TrimEnd('0');

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

        /// Convert hex string to BigInteger.
        public static BigInteger HexToBigInteger(string hex)
        {
            if (string.IsNullOrEmpty(hex) || hex == "0x") return BigInteger.Zero;
            if (hex.StartsWith("0x") || hex.StartsWith("0X")) hex = hex.Substring(2);

            // Ensure even length
            if (hex.Length % 2 != 0) hex = "0" + hex;

            return BigInteger.Parse("0" + hex, System.Globalization.NumberStyles.HexNumber);
        }

        /// Convert BigInteger to hex string.
        public static string BigIntegerToHex(BigInteger value)
        {
            if (value == BigInteger.Zero) return "0x0";
            return "0x" + value.ToString("x");
        }

        /// Convert hex string to long.
        public static long HexToLong(string hex)
        {
            return (long)HexToBigInteger(hex);
        }

        /// Convert bytes to hex string.
        public static string BytesToHex(byte[] bytes)
        {
            var sb = new StringBuilder(bytes.Length * 2);
            foreach (var b in bytes)
                sb.Append(b.ToString("x2"));
            return sb.ToString();
        }

        /// Convert bytes to hex string with 0x prefix.
        public static string BytesToHex0x(byte[] bytes)
        {
            return "0x" + BytesToHex(bytes);
        }

        /// Convert hex string to bytes.
        public static byte[] HexToBytes(string hex)
        {
            if (hex.StartsWith("0x") || hex.StartsWith("0X")) hex = hex.Substring(2);
            if (hex.Length % 2 != 0) hex = "0" + hex;
            var bytes = new byte[hex.Length / 2];
            for (int i = 0; i < bytes.Length; i++)
                bytes[i] = Convert.ToByte(hex.Substring(i * 2, 2), 16);
            return bytes;
        }

        /// Concatenate bytes with 0x prefix hex output.
        public static string BytesToHex(byte[] prefix, (byte[] r, byte[] s, byte v) signature)
        {
            var sb = new StringBuilder(prefix.Length * 2 + 130);
            sb.Append(BytesToHex(prefix));
            sb.Append(signature.r.Length == 32 ? BytesToHex(signature.r) : BytesToHex(new byte[32 - signature.r.Length]).PadLeft(64, '0'));
            sb.Append(signature.s.Length == 32 ? BytesToHex(signature.s) : BytesToHex(new byte[32 - signature.s.Length]).PadLeft(64, '0'));
            sb.Append(signature.v.ToString("x2"));
            return sb.ToString();
        }

        /// Check if an address is a valid Ethereum address.
        public static bool IsValidAddress(string address)
        {
            if (string.IsNullOrEmpty(address)) return false;
            if (address.StartsWith("0x") || address.StartsWith("0X"))
                address = address.Substring(2);
            if (address.Length != 40) return false;

            foreach (var c in address)
            {
                if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')))
                    return false;
            }
            return true;
        }

        /// Chain ID to hex string for JSON-RPC.
        public static string ChainIdToHex(int chainId)
        {
            return "0x" + chainId.ToString("x");
        }

        /// Wei value to hex string for JSON-RPC.
        public static string WeiToHex(BigInteger wei)
        {
            return BigIntegerToHex(wei);
        }

        // ─── EIP-712 Typed Data Helper ─────────────────────────────────

        /// Hash an EIP-712 typed data message for signing.
        /// Returns the 32-byte hash that should be signed.
        public static byte[] HashTypedDataV4(string domainSeparator, string messageHash)
        {
            var prefix = new byte[] { 0x19, 0x01 };
            var domainBytes = HexToBytes(domainSeparator);
            var messageBytes = HexToBytes(messageHash);

            var combined = new byte[2 + domainBytes.Length + messageBytes.Length];
            Buffer.BlockCopy(prefix, 0, combined, 0, 2);
            Buffer.BlockCopy(domainBytes, 0, combined, 2, domainBytes.Length);
            Buffer.BlockCopy(messageBytes, 0, combined, 2 + domainBytes.Length, messageBytes.Length);

            return HashBytes(combined);
        }

        /// Compute SHA-256 hash.
        public static byte[] HashBytes(byte[] data)
        {
            using var sha = System.Security.Cryptography.SHA256.Create();
            return sha.ComputeHash(data);
        }
    }

    /// JSON-RPC response envelope.
    internal class JsonRpcResponse<T>
    {
        [JsonProperty("jsonrpc")]
        public string JsonRpc { get; set; }

        [JsonProperty("id")]
        public long Id { get; set; }

        [JsonProperty("result")]
        public T Result { get; set; }

        [JsonProperty("error")]
        public JsonRpcErrorInfo Error { get; set; }
    }

    internal class JsonRpcErrorInfo
    {
        [JsonProperty("code")]
        public int Code { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }
    }
}
