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
    /// Solana chain adapter with real JSON-RPC integration.
    /// Provides chain interaction methods matching the core-sdk SolanaChainAdapter interface.
    /// Uses Unity's UnityWebRequest for HTTP JSON-RPC calls.
    /// </summary>
    public class SolanaAdapter
    {
        private string _rpcUrl;
        private string _walletPublicKey;

        // JSON-RPC id counter
        private static int _rpcId = 1;

        /// Create a Solana chain adapter.
        public SolanaAdapter(string rpcUrl = null)
        {
            _rpcUrl = rpcUrl ?? "https://api.mainnet-beta.solana.com";
        }

        /// Set the connected wallet public key.
        public void SetWalletPublicKey(string publicKey)
        {
            _walletPublicKey = publicKey;
        }

        /// Initialize with an RPC URL.
        public void Init(string rpcUrl)
        {
            _rpcUrl = rpcUrl;
        }

        // ─── JSON-RPC Methods ───────────────────────────────────────────

        /// Get the SOL balance (lamports) for an address.
        /// Uses getBalance JSON-RPC method.
        public async Task<BigInteger> GetBalanceAsync(string address)
        {
            if (string.IsNullOrEmpty(address))
                throw new ArgumentException("Address cannot be null or empty");

            var result = await CallRpcAsync<long>("getBalance", new[] { address });
            return new BigInteger(result);
        }

        /// Get the balance in human-readable SOL.
        public async Task<double> GetBalanceSolAsync(string address)
        {
            var lamports = await GetBalanceAsync(address);
            return (double)lamports / 1e9;
        }

        /// Get account info for an address.
        /// Uses getAccountInfo JSON-RPC method.
        public async Task<string> GetAccountInfoAsync(string address)
        {
            var options = new Dictionary<string, string> { { "encoding", "jsonParsed" } };
            return await CallRpcAsync<string>("getAccountInfo", new object[] { address, options });
        }

        /// Get a recent blockhash.
        /// Uses getLatestBlockhash JSON-RPC method.
        public async Task<string> GetRecentBlockhashAsync()
        {
            var result = await CallRpcAsync<BlockhashResult>("getLatestBlockhash", Array.Empty<object>());
            return result?.Value?.Blockhash ?? string.Empty;
        }

        /// Get the minimum balance for rent exemption.
        public async Task<long> GetMinimumBalanceForRentExemptionAsync(int dataLength)
        {
            return await CallRpcAsync<long>("getMinimumBalanceForRentExemption", new object[] { dataLength });
        }

        /// Send a serialized transaction.
        /// Uses sendTransaction JSON-RPC method.
        public async Task<string> SendTransactionAsync(string serializedTransaction)
        {
            var options = new Dictionary<string, string> { { "encoding", "base64" } };
            return await CallRpcAsync<string>("sendTransaction", new object[] { serializedTransaction, options });
        }

        /// Get a transaction by signature.
        /// Uses getTransaction JSON-RPC method.
        public async Task<string> GetTransactionAsync(string signature)
        {
            var options = new Dictionary<string, string> { { "encoding", "jsonParsed" } };
            return await CallRpcAsync<string>("getTransaction", new object[] { signature, options });
        }

        /// Get transaction status (confirmation status).
        /// Uses getSignatureStatuses JSON-RPC method.
        public async Task<SignatureStatus> GetSignatureStatusAsync(string signature)
        {
            var result = await CallRpcAsync<SignatureStatusesResult>("getSignatureStatuses", new object[] { new[] { signature } });
            if (result?.Value != null && result.Value.Length > 0)
                return result.Value[0];
            return null;
        }

        /// Request an airdrop (testnet/devnet only).
        /// Uses requestAirdrop JSON-RPC method.
        public async Task<string> RequestAirdropAsync(string address, long lamports)
        {
            return await CallRpcAsync<string>("requestAirdrop", new object[] { address, lamports });
        }

        /// Get the cluster node version.
        /// Uses getVersion JSON-RPC method.
        public async Task<string> GetVersionAsync()
        {
            var result = await CallRpcAsync<VersionResult>("getVersion", Array.Empty<object>());
            return result?.SolanaCore ?? string.Empty;
        }

        /// Get the current slot.
        /// Uses getSlot JSON-RPC method.
        public async Task<long> GetSlotAsync()
        {
            return await CallRpcAsync<long>("getSlot", Array.Empty<object>());
        }

        /// Get the current epoch.
        /// Uses getEpochInfo JSON-RPC method.
        public async Task<EpochInfo> GetEpochInfoAsync()
        {
            return await CallRpcAsync<EpochInfo>("getEpochInfo", Array.Empty<object>());
        }

        /// Get token account balance.
        /// Uses getTokenAccountBalance JSON-RPC method.
        public async Task<TokenBalance> GetTokenAccountBalanceAsync(string tokenAddress)
        {
            return await CallRpcAsync<TokenBalance>("getTokenAccountBalance", new object[] { tokenAddress });
        }

        /// Get all token accounts by owner.
        /// Uses getTokenAccountsByOwner JSON-RPC method.
        public async Task<string> GetTokenAccountsByOwnerAsync(string ownerAddress, string mintAddress = null)
        {
            object filter;
            if (!string.IsNullOrEmpty(mintAddress))
            {
                filter = new Dictionary<string, string> { { "mint", mintAddress } };
            }
            else
            {
                filter = new Dictionary<string, string> { { "programId", "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" } };
            }

            var options = new Dictionary<string, string> { { "encoding", "jsonParsed" } };
            return await CallRpcAsync<string>("getTokenAccountsByOwner", new object[] { ownerAddress, filter, options });
        }

        // ─── Raw RPC Call ───────────────────────────────────────────────

        /// Make a raw JSON-RPC call to the Solana node.
        private async Task<T> CallRpcAsync<T>(string method, object[] parameters)
        {
            var id = System.Threading.Interlocked.Increment(ref _rpcId);

            var rpcRequest = new SolanaRpcRequest
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
                throw new Exception($"Solana RPC request failed [{method}]: {request.error}");
            }

            var response = request.downloadHandler.text;
            var rpcResponse = JsonConvert.DeserializeObject<SolanaRpcResponse<T>>(response);

            if (rpcResponse.error != null)
            {
                throw new Exception($"Solana RPC error [{rpcResponse.error.code}]: {rpcResponse.error.message}");
            }

            return rpcResponse.result;
        }

        // ─── Utility Methods ────────────────────────────────────────────

        /// Convert lamports to SOL.
        public static double LamportsToSol(long lamports) => lamports / 1e9;

        /// Convert SOL to lamports.
        public static long SolToLamports(double sol) => (long)(sol * 1e9);

        /// Validate a Solana address (base58, 32-44 characters).
        public static bool IsValidAddress(string address)
        {
            if (string.IsNullOrEmpty(address) || address.Length < 32 || address.Length > 44)
                return false;

            // Base58 alphabet (no 0, O, I, l)
            for (int i = 0; i < address.Length; i++)
            {
                char c = address[i];
                bool valid = (c >= '1' && c <= '9') ||
                             (c >= 'A' && c <= 'H') ||
                             (c >= 'J' && c <= 'N') ||
                             (c >= 'P' && c <= 'Z') ||
                             (c >= 'a' && c <= 'k') ||
                             (c >= 'm' && c <= 'z');
                if (!valid) return false;
            }
            return true;
        }

        /// Convert SOL amount to lamport string for transactions.
        public static string SolToLamportsString(double sol)
        {
            long lamports = SolToLamports(sol);
            return lamports.ToString();
        }

        /// Predefined Solana chain IDs.
        public static class Chains
        {
            public const string Mainnet = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
            public const string Devnet = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
            public const string Testnet = "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z";
        }

        /// Common Solana wallet IDs.
        public static class Wallets
        {
            public const string Phantom = "phantom";
            public const string Solflare = "solflare";
            public const string Backpack = "backpack";
            public const string Ledger = "ledger";
        }

        /// Predefined program IDs.
        public static class Programs
        {
            public const string Token = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
            public const string Token2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
            public const string AssociatedToken = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
            public const string System = "11111111111111111111111111111111";
            public const string Memo = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
        }
    }

    // ─── Solana RPC Response Types ──────────────────────────────────────

    internal class SolanaRpcRequest
    {
        [JsonProperty("jsonrpc")]
        public string jsonrpc = "2.0";
        [JsonProperty("method")]
        public string method;
        [JsonProperty("params")]
        public object[] @params;
        [JsonProperty("id")]
        public int id;
    }

    internal class SolanaRpcResponse<T>
    {
        [JsonProperty("jsonrpc")]
        public string JsonRpc { get; set; }
        [JsonProperty("id")]
        public long Id { get; set; }
        [JsonProperty("result")]
        public T Result { get; set; }
        [JsonProperty("error")]
        public SolanaRpcError Error { get; set; }
    }

    internal class SolanaRpcError
    {
        [JsonProperty("code")]
        public int Code { get; set; }
        [JsonProperty("message")]
        public string Message { get; set; }
    }

    internal class BlockhashResult
    {
        [JsonProperty("context")]
        public ContextInfo Context { get; set; }
        [JsonProperty("value")]
        public BlockhashValue Value { get; set; }
    }

    internal class BlockhashValue
    {
        [JsonProperty("blockhash")]
        public string Blockhash { get; set; }
        [JsonProperty("lastValidBlockHeight")]
        public long LastValidBlockHeight { get; set; }
    }

    internal class ContextInfo
    {
        [JsonProperty("slot")]
        public long Slot { get; set; }
    }

    internal class SignatureStatusesResult
    {
        [JsonProperty("context")]
        public ContextInfo Context { get; set; }
        [JsonProperty("value")]
        public SignatureStatus[] Value { get; set; }
    }

    internal class SignatureStatus
    {
        [JsonProperty("slot")]
        public long Slot { get; set; }
        [JsonProperty("confirmations")]
        public long? Confirmations { get; set; }
        [JsonProperty("err")]
        public object Error { get; set; }
        [JsonProperty("confirmationStatus")]
        public string ConfirmationStatus { get; set; }
    }

    internal class VersionResult
    {
        [JsonProperty("solana-core")]
        public string SolanaCore { get; set; }
    }

    internal class EpochInfo
    {
        [JsonProperty("absoluteSlot")]
        public long AbsoluteSlot { get; set; }
        [JsonProperty("blockHeight")]
        public long BlockHeight { get; set; }
        [JsonProperty("epoch")]
        public long Epoch { get; set; }
        [JsonProperty("slotIndex")]
        public long SlotIndex { get; set; }
        [JsonProperty("slotsInEpoch")]
        public long SlotsInEpoch { get; set; }
    }

    internal class TokenBalance
    {
        [JsonProperty("context")]
        public ContextInfo Context { get; set; }
        [JsonProperty("value")]
        public TokenBalanceValue Value { get; set; }
    }

    internal class TokenBalanceValue
    {
        [JsonProperty("amount")]
        public string Amount { get; set; }
        [JsonProperty("decimals")]
        public int Decimals { get; set; }
        [JsonProperty("uiAmount")]
        public double? UiAmount { get; set; }
        [JsonProperty("uiAmountString")]
        public string UiAmountString { get; set; }
    }
}
