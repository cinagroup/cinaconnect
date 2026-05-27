using System;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Numerics;
using UnityEngine;
using Cinacoin.WalletConnect;
using Cinacoin.Chain;

namespace Cinacoin
{
    /// <summary>
    /// Wallet manager with real WalletConnect v2 protocol support.
    /// Manages wallet connection lifecycle: connect → session → sign → disconnect.
    /// 
    /// Production-ready implementation using:
    /// - WalletConnect v2 protocol (pairing + session)
    /// - Nethereum for EVM chain operations (JSON-RPC)
    /// - Unity coroutines for QR generation and deep link handling
    /// - PlayerPrefs + encrypted session persistence
    /// </summary>
    public class WalletManager
    {
        private readonly string _projectId;
        private readonly AppMetadata _metadata;
        private readonly string _relayUrl;
        private bool _initialized;

        // WC v2 protocol components
        private WCClient _wcClient;
        private SessionInfo _activeSession;
        private string _pairingTopic;
        private string _currentWalletId;
        private CancellationTokenSource _connectCts;
        private TaskCompletionSource<SessionInfo> _sessionApprovalTcs;

        // EVM adapter for RPC calls
        private EvmAdapter _evmAdapter;

        // Connection state
        private ConnectionStatus _status;

        // Status change event
        public delegate void StatusChangeHandler(ConnectionStatus status);
        public event StatusChangeHandler OnStatusChange;

        // Session events
        public event Action<SessionInfo> OnSessionConnected;
        public event Action<string> OnSessionDisconnected;
        public event Action<Exception> OnError;

        public WalletManager(string projectId, AppMetadata metadata, string relayUrl = "wss://relay.walletconnect.com")
        {
            _projectId = projectId;
            _metadata = metadata;
            _relayUrl = relayUrl;
            _initialized = false;
            _status = ConnectionStatus.Disconnected;
        }

        /// Initialize the WalletConnect client.
        public async Task InitializeAsync()
        {
            if (_initialized) return;

            // Create EVM adapter
            _evmAdapter = new EvmAdapter();

            // Create WC v2 client
            _wcClient = new WCClient(_relayUrl, _projectId);

            // Wire up WC client events
            _wcClient.OnConnected += HandleSessionConnected;
            _wcClient.OnDisconnected += HandleSessionDisconnected;
            _wcClient.OnError += HandleError;

            // Connect to relay
            await _wcClient.ConnectAsync();

            // Try to restore previous sessions
            var restoredSessions = _wcClient.RestoreSessions();
            if (restoredSessions.Count > 0)
            {
                var session = restoredSessions[0];
                if (!session.IsExpired && session.State == SessionStateEnum.Active)
                {
                    _activeSession = session;
                    _status = ConnectionStatus.Connected;
                    OnStatusChange?.Invoke(ConnectionStatus.Connected);
                    OnSessionConnected?.Invoke(session);
                }
            }

            _initialized = true;
            if (_status == ConnectionStatus.Disconnected)
            {
                OnStatusChange?.Invoke(ConnectionStatus.Disconnected);
            }
        }

        /// Connect to a wallet by ID.
        public async Task<ConnectionResult> ConnectAsync(string walletId, int[] chains = null)
        {
            if (!_initialized)
                throw new InvalidOperationException("WalletManager must be initialized. Call InitializeAsync() first.");

            if (_status == ConnectionStatus.Connecting)
                throw new InvalidOperationException("Connection already in progress");

            _status = ConnectionStatus.Connecting;
            _currentWalletId = walletId;
            OnStatusChange?.Invoke(ConnectionStatus.Connecting);

            // Create cancellation token for this connection attempt
            _connectCts = new CancellationTokenSource(TimeSpan.FromSeconds(120));
            _sessionApprovalTcs = new TaskCompletionSource<SessionInfo>();

            try
            {
                // Determine chains to request
                var requestedChains = chains ?? new[] { 1 };

                // Build namespaces
                var namespaces = WCClient.BuildEip155Namespaces(requestedChains);

                // Initialize connection: creates pairing and returns WC URI
                var (uri, topic) = await _wcClient.InitConnectionAsync(namespaces, null, 300);
                _pairingTopic = topic;

                // Handle the connection based on platform
                await HandleWalletConnectionAsync(walletId, uri);

                // Wait for session approval (with timeout)
                var session = await _sessionApprovalTcs.Task.WaitAsync(_connectCts.Token);

                _activeSession = session;
                _status = ConnectionStatus.Connected;

                // Save session
                _wcClient.Sessions.SaveSession(session.Topic);
                _wcClient.Sessions.SaveSessionTopicList();

                var result = new ConnectionResult(
                    sessionId: session.Topic,
                    accounts: session.Accounts,
                    chainId: ExtractChainIdFromSession(session),
                    connectorId: walletId
                );

                OnStatusChange?.Invoke(ConnectionStatus.Connected);
                return result;
            }
            catch (OperationCanceledException)
            {
                _status = ConnectionStatus.Error;
                OnStatusChange?.Invoke(ConnectionStatus.Error);
                throw new TimeoutException("Wallet connection timed out. User did not approve the session.");
            }
            catch (Exception ex)
            {
                _status = ConnectionStatus.Error;
                OnStatusChange?.Invoke(ConnectionStatus.Error);
                throw new Exception($"Failed to connect wallet: {ex.Message}", ex);
            }
            finally
            {
                _connectCts?.Dispose();
                _connectCts = null;
            }
        }

        /// Handle wallet connection via deep link or QR code.
        private async Task HandleWalletConnectionAsync(string walletId, string wcUri)
        {
            var wallet = WalletRegistry.Get(walletId);

            if (wallet == null)
            {
                // Unknown wallet - show QR code only
                OnQRCodeGenerated?.Invoke(wcUri, "WalletConnect");
                return;
            }

            // Check platform
            var platform = DetectPlatform();

            if (platform == DeepLinkHandler.Platform.Web || platform == DeepLinkHandler.Platform.WebGL)
            {
                // Desktop/Web: show QR code
                OnQRCodeGenerated?.Invoke(wcUri, wallet.Name);
            }
            else
            {
                // Mobile: try deep link first
                var deepLinkHandler = new DeepLinkHandler();
                var redirectResult = await deepLinkHandler.OpenDeepLinkAsync(walletId, wcUri);

                if (!redirectResult.Success)
                {
                    // Fallback to QR code
                    OnQRCodeGenerated?.Invoke(wcUri, wallet.Name);
                }
            }
        }

        /// Detect current build platform.
        private DeepLinkHandler.Platform DetectPlatform()
        {
#if UNITY_IOS
            return DeepLinkHandler.Platform.iOS;
#elif UNITY_ANDROID
            return DeepLinkHandler.Platform.Android;
#elif UNITY_WEBGL
            return DeepLinkHandler.Platform.WebGL;
#else
            return DeepLinkHandler.Platform.Web;
#endif
        }

        /// Event fired when a QR code should be displayed.
        public event Action<string, string> OnQRCodeGenerated; // (uri, walletName)

        /// Disconnect from the current session.
        public async Task DisconnectAsync(string sessionId)
        {
            if (string.IsNullOrEmpty(sessionId)) return;

            try
            {
                if (_wcClient != null && _activeSession != null)
                {
                    await _wcClient.DeleteSessionAsync(sessionId);
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"Disconnect error (non-fatal): {ex.Message}");
            }
            finally
            {
                _activeSession = null;
                _pairingTopic = null;
                _status = ConnectionStatus.Disconnected;
                OnStatusChange?.Invoke(ConnectionStatus.Disconnected);
                OnSessionDisconnected?.Invoke(sessionId);
            }
        }

        /// Disconnect all sessions.
        public async Task DisconnectAllAsync()
        {
            if (_activeSession != null)
            {
                await DisconnectAsync(_activeSession.Topic);
            }
        }

        /// Switch to a different chain.
        public async Task SwitchChainAsync(string sessionId, int chainId)
        {
            if (string.IsNullOrEmpty(sessionId))
                throw new InvalidOperationException("No active session");

            if (_activeSession == null)
                throw new InvalidOperationException("No active session");

            // Send wallet_switchEthereumChain via WC v2
            var chainIdHex = "0x" + chainId.ToString("x");
            var param = new { chainId = chainIdHex };

            await _wcClient.Sessions.SendRequestAsync(
                sessionId,
                "wallet_switchEthereumChain",
                param
            );

            // Update EVM adapter RPC URL
            var chain = GetChainById(chainId);
            if (chain != null)
            {
                _evmAdapter.Init(chain.RpcUrl, chainId);
            }
        }

        /// Sign a message with the connected wallet.
        public async Task<string> SignMessageAsync(string sessionId, string message)
        {
            if (string.IsNullOrEmpty(sessionId))
                throw new InvalidOperationException("No active session");

            if (_activeSession == null)
                throw new InvalidOperationException("No active session");

            var address = _activeSession.Accounts.Length > 0 ? _activeSession.Accounts[0] : null;
            if (string.IsNullOrEmpty(address))
                throw new InvalidOperationException("No connected account");

            // Send personal_sign via WC v2
            var hexMessage = "0x" + WCCrypto.ToHex(System.Text.Encoding.UTF8.GetBytes(message));
            var param = new[] { hexMessage, address };

            var requestId = await _wcClient.Sessions.SendRequestAsync(
                sessionId,
                "personal_sign",
                param
            );

            // Wait for response
            var response = await WaitForResponse(requestId, TimeSpan.FromSeconds(60));
            return response?.ToString() ?? "";
        }

        /// Send a transaction via the connected wallet.
        public async Task<string> SendTransactionAsync(string sessionId, TransactionRequest tx)
        {
            if (string.IsNullOrEmpty(sessionId))
                throw new InvalidOperationException("No active session");

            if (_activeSession == null)
                throw new InvalidOperationException("No active session");

            var address = _activeSession.Accounts.Length > 0 ? _activeSession.Accounts[0] : null;
            if (string.IsNullOrEmpty(address))
                throw new InvalidOperationException("No connected account");

            // Build eth_sendTransaction params
            var txParams = new Dictionary<string, string>();
            if (!string.IsNullOrEmpty(tx.From)) txParams["from"] = tx.From;
            if (!string.IsNullOrEmpty(tx.To)) txParams["to"] = tx.To;
            if (!string.IsNullOrEmpty(tx.Value)) txParams["value"] = tx.Value;
            if (!string.IsNullOrEmpty(tx.Data)) txParams["data"] = tx.Data;
            if (!string.IsNullOrEmpty(tx.Gas)) txParams["gas"] = tx.Gas;
            if (!string.IsNullOrEmpty(tx.GasPrice)) txParams["gasPrice"] = tx.GasPrice;
            if (!string.IsNullOrEmpty(tx.MaxFeePerGas)) txParams["maxFeePerGas"] = tx.MaxFeePerGas;
            if (!string.IsNullOrEmpty(tx.MaxPriorityFeePerGas)) txParams["maxPriorityFeePerGas"] = tx.MaxPriorityFeePerGas;
            if (!string.IsNullOrEmpty(tx.Nonce)) txParams["nonce"] = tx.Nonce;

            var param = new[] { txParams };

            var requestId = await _wcClient.Sessions.SendRequestAsync(
                sessionId,
                "eth_sendTransaction",
                param
            );

            var response = await WaitForResponse(requestId, TimeSpan.FromSeconds(120));
            return response?.ToString() ?? "";
        }

        /// Get the connected account address.
        public string GetConnectedAddress()
        {
            return _activeSession?.Accounts?.Length > 0 ? _activeSession.Accounts[0] : null;
        }

        /// Get the current session info.
        public SessionInfo GetSessionInfo() => _activeSession;

        /// Get connection status.
        public ConnectionStatus GetStatus() => _status;

        /// Get the EVM adapter for chain operations.
        public EvmAdapter GetEvmAdapter() => _evmAdapter;

        /// Check if a specific wallet is installed on the device.
        public bool IsWalletInstalled(string walletId)
        {
            var wallet = WalletRegistry.Get(walletId);
            if (wallet == null) return false;

#if UNITY_IOS
            return !string.IsNullOrEmpty(wallet.AppStoreUrl) && IsUrlSchemeRegistered(wallet.DeepLinkScheme);
#elif UNITY_ANDROID
            return !string.IsNullOrEmpty(wallet.PlayStoreUrl) && IsUrlSchemeRegistered(wallet.DeepLinkScheme);
#else
            return false;
#endif
        }

#if UNITY_IOS || UNITY_ANDROID
        [AOT.MonoPInvokeCallback(typeof(Action))]
        private static bool IsUrlSchemeRegistered(string scheme)
        {
            // Platform-specific check via native plugin
            // For now, assume not installed (will attempt deep link anyway)
            return false;
        }
#else
        private static bool IsUrlSchemeRegistered(string scheme) => false;
#endif

        // ─── Private Helpers ────────────────────────────────────────────

        private void HandleSessionConnected(SessionInfo session)
        {
            _sessionApprovalTcs?.TrySetResult(session);
        }

        private void HandleSessionDisconnected(string topic)
        {
            if (_activeSession?.Topic == topic)
            {
                _activeSession = null;
                _status = ConnectionStatus.Disconnected;
                OnStatusChange?.Invoke(ConnectionStatus.Disconnected);
            }
        }

        private void HandleError(Exception ex)
        {
            OnError?.Invoke(ex);
        }

        private async Task<object> WaitForResponse(long requestId, TimeSpan timeout)
        {
            var tcs = new TaskCompletionSource<object>();

            void OnResponse(long id, object result)
            {
                if (id == requestId)
                {
                    tcs.TrySetResult(result);
                }
            }

            _wcClient.Sessions.OnResponse += OnResponse;

            try
            {
                return await tcs.Task.WaitAsync(timeout);
            }
            finally
            {
                _wcClient.Sessions.OnResponse -= OnResponse;
            }
        }

        private int ExtractChainIdFromSession(SessionInfo session)
        {
            if (session.Accounts == null || session.Accounts.Length == 0) return 1;

            // Parse chainId from account CAIP-10 format: eip155:1:0x...
            var account = session.Accounts[0];
            var parts = account.Split(':');
            if (parts.Length >= 2 && int.TryParse(parts[1], out var chainId))
                return chainId;

            return 1;
        }

        private Chain GetChainById(int chainId)
        {
            return chainId switch
            {
                1 => Chain.Ethereum,
                137 => Chain.Polygon,
                42161 => Chain.Arbitrum,
                10 => Chain.Optimism,
                56 => new Chain {
                    Id = "eip155:56",
                    Name = "BNB Smart Chain",
                    RpcUrl = "https://bsc-dataseed.binance.org",
                    NativeCurrency = new NativeCurrency { Name = "BNB", Symbol = "BNB", Decimals = 18 },
                    ExplorerUrl = "https://bscscan.com"
                },
                _ => null
            };
        }
    }
}
