using UnityEngine;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Cinacoin.WalletConnect;
using Cinacoin.Chain;

namespace Cinacoin
{
    /// <summary>
    /// Cinacoin Main Singleton Runtime Class.
    /// 
    /// Unity singleton that manages wallet connections, chain switching,
    /// and signing operations. Matches the core-sdk API surface.
    /// 
    /// Usage:
    ///   CinacoinManager.Instance.Initialize(projectId, metadata);
    ///   var result = await CinacoinManager.Instance.ConnectAsync("metamask");
    /// </summary>
    public class CinacoinManager : MonoBehaviour
    {
        private static CinacoinManager _instance;
        private static readonly object _lock = new object();
        private static bool _applicationIsQuitting;

        [Header("Configuration")]
        [SerializeField] private string _projectId = "";
        [SerializeField] private string _relayUrl = "wss://relay.walletconnect.com";
        [SerializeField] private AppMetadata _appMetadata;

        [Header("Debug")]
        [SerializeField] private bool _enableDebugLogs = true;

        // Internal state
        private ConnectionStatus _status = ConnectionStatus.Disconnected;
        private string _currentSessionId;
        private string _currentConnectorId;
        private string[] _currentAccounts = Array.Empty<string>();
        private int _currentChainId = 1;

        // Sub-managers
        private WalletManager _walletManager;
        private DeepLinkHandler _deepLinkHandler;
        private EvmAdapter _evmAdapter;

        // Event delegates matching core-sdk event patterns
        public delegate void OnStateChange(SessionState state);
        public event OnStateChange OnStateChanged;

        public delegate void OnConnected(ConnectionResult result);
        public event OnConnected OnWalletConnected;

        public delegate void OnDisconnected();
        public event OnDisconnected OnWalletDisconnected;

        public delegate void OnChainChanged(int chainId);
        public event OnChainChanged OnChainChangedEvent;

        public delegate void OnError(string error);
        public event OnError OnErrorEvent;

        public static CinacoinManager Instance
        {
            get
            {
                if (_applicationIsQuitting) return null;

                lock (_lock)
                {
                    if (_instance == null)
                    {
                        _instance = FindObjectOfType<CinacoinManager>();

                        if (_instance == null)
                        {
                            var go = new GameObject("[Cinacoin]");
                            _instance = go.AddComponent<CinacoinManager>();
                            DontDestroyOnLoad(go);
                        }
                    }
                    return _instance;
                }
            }
        }

        /// Current connection status.
        public ConnectionStatus Status => _status;

        /// Connected account addresses.
        public string[] Accounts => _currentAccounts;

        /// Current chain ID.
        public int ChainId => _currentChainId;

        /// Whether a wallet is connected.
        public bool IsConnected => _status == ConnectionStatus.Connected;

        /// The current session ID.
        public string SessionId => _currentSessionId;

        /// Wallet manager instance (advanced usage).
        public WalletManager WalletManager => _walletManager;

        /// EVM adapter for chain interactions.
        public EvmAdapter Evm => _evmAdapter;

        /// Deep link handler.
        public DeepLinkHandler DeepLinks => _deepLinkHandler;

        /// Initialize Cinacoin with project configuration.
        public void Initialize(string projectId, AppMetadata metadata)
        {
            _projectId = projectId;
            _appMetadata = metadata;
            _status = ConnectionStatus.Disconnected;

            _deepLinkHandler = new DeepLinkHandler();
            _walletManager = new WalletManager(projectId, metadata, _relayUrl);
            _evmAdapter = new EvmAdapter();

            // Connect wallet manager events to Cinacoin events
            _walletManager.OnStatusChange += HandleWalletStatusChange;
            _walletManager.OnSessionConnected += HandleSessionConnected;
            _walletManager.OnSessionDisconnected += HandleSessionDisconnected;
            _walletManager.OnError += HandleWalletError;
            _walletManager.OnQRCodeGenerated += HandleQRCodeGenerated;

            Log($"Cinacoin initialized (v{CinacoinVersion.Value})");
        }

        /// Initialize from serialized configuration.
        public void InitializeFromConfig(string configJson)
        {
            var config = JsonConvert.DeserializeObject<CinacoinConfig>(configJson);
            Initialize(config.ProjectId, config.Metadata);
        }

        /// Connect to a wallet by ID.
        public async Task<ConnectionResult> ConnectAsync(string walletId, int[] chains = null)
        {
            if (_status == ConnectionStatus.Connecting)
                throw new InvalidOperationException("Connection already in progress");

            EmitState(SessionState.Connecting(walletId));

            try
            {
                var result = await _walletManager.ConnectAsync(walletId, chains);

                _currentSessionId = result.SessionId;
                _currentConnectorId = result.ConnectorId;
                _currentAccounts = result.Accounts;
                _currentChainId = result.ChainId;
                _status = ConnectionStatus.Connected;

                EmitState(SessionState.Connected(result.Accounts, result.ChainId, result.SessionId, result.ConnectorId));
                OnWalletConnected?.Invoke(result);

                // Initialize EVM adapter with the connected chain
                var chain = GetChainById(result.ChainId);
                if (chain != null)
                {
                    _evmAdapter.Init(chain.RpcUrl, result.ChainId);
                }

                SaveSession();
                return result;
            }
            catch (Exception ex)
            {
                _status = ConnectionStatus.Error;
                EmitState(SessionState.Errored(ex.Message));
                OnErrorEvent?.Invoke(ex.Message);

                // Auto-reset after 5 seconds
                Invoke(nameof(ResetErrorState), 5f);
                throw;
            }
        }

        /// Disconnect the current wallet.
        public async Task DisconnectAsync()
        {
            try
            {
                if (_walletManager != null && _currentSessionId != null)
                {
                    await _walletManager.DisconnectAsync(_currentSessionId);
                }
            }
            catch (Exception ex)
            {
                Log($"Disconnect error: {ex.Message}");
            }

            _currentSessionId = null;
            _currentConnectorId = null;
            _currentAccounts = Array.Empty<string>();
            _currentChainId = 1;
            _status = ConnectionStatus.Disconnected;

            EmitState(SessionState.Disconnected);
            OnWalletDisconnected?.Invoke();

            ClearSession();
        }

        /// Switch to a different chain.
        public async Task SwitchChainAsync(int chainId)
        {
            if (_status != ConnectionStatus.Connected)
                throw new InvalidOperationException("Not connected");

            await _walletManager.SwitchChainAsync(_currentSessionId, chainId);
            _currentChainId = chainId;

            // Update EVM adapter
            var chain = GetChainById(chainId);
            if (chain != null)
            {
                _evmAdapter.Init(chain.RpcUrl, chainId);
            }

            EmitState(SessionState.Connected(_currentAccounts, _currentChainId, _currentSessionId, _currentConnectorId));
            OnChainChangedEvent?.Invoke(_currentChainId);
        }

        /// Sign a message.
        public async Task<string> SignMessageAsync(string message)
        {
            if (_status != ConnectionStatus.Connected)
                throw new InvalidOperationException("Not connected");

            return await _walletManager.SignMessageAsync(_currentSessionId, message);
        }

        /// Send a transaction.
        public async Task<string> SendTransactionAsync(TransactionRequest tx)
        {
            if (_status != ConnectionStatus.Connected)
                throw new InvalidOperationException("Not connected");

            return await _walletManager.SendTransactionAsync(_currentSessionId, tx);
        }

        /// Get the balance of the connected account.
        public async Task<string> GetBalanceAsync()
        {
            if (_status != ConnectionStatus.Connected)
                throw new InvalidOperationException("Not connected");

            var address = _currentAccounts[0];
            return await _evmAdapter.GetBalanceFormattedAsync(address);
        }

        /// Restore a persisted session.
        public async Task<SessionState> RestoreAsync()
        {
            if (PlayerPrefs.HasKey("Cinacoin_Session"))
            {
                var json = PlayerPrefs.GetString("Cinacoin_Session");
                try
                {
                    var data = JsonConvert.DeserializeObject<SessionData>(json);
                    if (data.Status == "connected")
                    {
                        // Try to restore WC session
                        if (_walletManager != null)
                        {
                            await _walletManager.InitializeAsync();

                            var sessions = _walletManager.GetSessionInfo();
                            if (sessions != null && !sessions.IsExpired)
                            {
                                _currentSessionId = data.SessionId;
                                _currentConnectorId = data.ConnectorId;
                                _currentAccounts = data.Accounts;
                                _currentChainId = data.ChainId;
                                _status = ConnectionStatus.Connected;

                                var chain = GetChainById(data.ChainId);
                                if (chain != null)
                                {
                                    _evmAdapter.Init(chain.RpcUrl, data.ChainId);
                                }

                                var state = SessionState.Connected(data.Accounts, data.ChainId, data.SessionId, data.ConnectorId);
                                EmitState(state);
                                return state;
                            }
                        }
                    }
                }
                catch
                {
                    ClearSession();
                }
            }
            return SessionState.Disconnected;
        }

        // ─── Event Handlers ─────────────────────────────────────────────

        private void HandleWalletStatusChange(ConnectionStatus newStatus)
        {
            if (newStatus == ConnectionStatus.Error)
            {
                OnErrorEvent?.Invoke("Wallet connection error");
            }
        }

        private void HandleSessionConnected(SessionInfo session)
        {
            Log($"Session connected: {session.Topic}");
        }

        private void HandleSessionDisconnected(string topic)
        {
            if (_currentSessionId == topic)
            {
                _currentSessionId = null;
                _status = ConnectionStatus.Disconnected;
                OnWalletDisconnected?.Invoke();
            }
        }

        private void HandleWalletError(Exception ex)
        {
            OnErrorEvent?.Invoke($"Wallet error: {ex.Message}");
            Log($"Wallet error: {ex.Message}");
        }

        private void HandleQRCodeGenerated(string uri, string walletName)
        {
            Log($"QR code generated for {walletName}");
            // Find ConnectModal and show QR
            var modal = FindObjectOfType<Cinacoin.UI.ConnectModal>();
            if (modal != null)
            {
                modal.ShowQR(uri, walletName);
            }
        }

        private void EmitState(SessionState state)
        {
            OnStateChanged?.Invoke(state);
        }

        private void ResetErrorState()
        {
            if (_status == ConnectionStatus.Error)
            {
                _status = ConnectionStatus.Disconnected;
                EmitState(SessionState.Disconnected);
            }
        }

        private void SaveSession()
        {
            if (_status == ConnectionStatus.Connected)
            {
                var data = new SessionData
                {
                    Status = "connected",
                    SessionId = _currentSessionId,
                    ConnectorId = _currentConnectorId,
                    Accounts = _currentAccounts,
                    ChainId = _currentChainId
                };
                PlayerPrefs.SetString("Cinacoin_Session", JsonConvert.SerializeObject(data));
                PlayerPrefs.Save();
            }
        }

        private void ClearSession()
        {
            PlayerPrefs.DeleteKey("Cinacoin_Session");
        }

        private void Log(string message)
        {
            if (_enableDebugLogs)
                Debug.Log($"[Cinacoin] {message}");
        }

        private void OnApplicationQuit()
        {
            _applicationIsQuitting = true;
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

    /// Configuration for Cinacoin initialization.
    [System.Serializable]
    public class CinacoinConfig
    {
        [JsonProperty("projectId")]
        public string ProjectId;
        [JsonProperty("metadata")]
        public AppMetadata Metadata;
        [JsonProperty("relayUrl")]
        public string RelayUrl;
    }

    /// Persisted session data for localStorage.
    [System.Serializable]
    public class SessionData
    {
        [JsonProperty("status")]
        public string Status;
        [JsonProperty("sessionId")]
        public string SessionId;
        [JsonProperty("connectorId")]
        public string ConnectorId;
        [JsonProperty("accounts")]
        public string[] Accounts;
        [JsonProperty("chainId")]
        public int ChainId;
    }
}
