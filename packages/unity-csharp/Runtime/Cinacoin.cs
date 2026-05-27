using UnityEngine;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Cinacoin
{
    /// <summary>
    /// CinacoinClient — Core client facade for Unity C# SDK.
    ///
    /// Provides the primary API for Unity game projects to:
    /// - Connect / disconnect wallets (MetaMask, WalletConnect, Coinbase, etc.)
    /// - Sign messages and EIP-712 typed data
    /// - Send transactions via connected wallets
    /// - Switch chains and fetch balances
    /// - Generate SIWE (Sign-In With Ethereum) messages
    /// - Subscribe to a typed event system for real-time state changes
    ///
    /// This class coordinates:
    /// - <see cref="WalletManager"/> for connection lifecycle
    /// - <see cref="WCProtocol"/> for WalletConnect v2 protocol
    /// - <see cref="SessionManager"/> for in-memory session tracking
    /// - <see cref="EvmAdapter"/> for EVM chain RPC calls
    ///
    /// Usage:
    /// <code>
    /// var client = CinacoinClient.Create("YOUR_PROJECT_ID", metadata);
    /// await client.Initialize();
    /// var result = await client.ConnectAsync("metamask");
    /// Debug.Log($"Connected: {string.Join(", ", result.Accounts)}");
    /// await client.DisconnectAsync();
    /// </code>
    /// </summary>
    public class CinacoinClient
    {
        // ── Configuration ──────────────────────────────────────────────

        /// <summary>Cinacoin / WalletConnect project ID.</summary>
        public string ProjectId { get; }

        /// <summary>App metadata for WalletConnect pairing proposals.</summary>
        public AppMetadata Metadata { get; }

        /// <summary>Optional relay URL override.</summary>
        public string RelayUrl { get; }

        /// <summary>Default chain namespace (default: "eip155").</summary>
        public string Namespace { get; }

        // ── Internal State ─────────────────────────────────────────────

        private WalletManager _walletManager;
        private SessionManager _sessionManager;
        private EventEmitter<CinacoinEvent> _events;
        private bool _initialized;
        private bool _disposed;

        // ── Public State ───────────────────────────────────────────────

        /// <summary>Current connection status.</summary>
        public ConnectionStatus Status => _sessionManager.Status;

        /// <summary>Connected account addresses.</summary>
        public IReadOnlyList<string> Accounts => _sessionManager.Accounts;

        /// <summary>Active chain ID (default 1).</summary>
        public int ChainId => _sessionManager.ChainId;

        /// <summary>Whether a wallet is currently connected.</summary>
        public bool IsConnected => Status == ConnectionStatus.Connected;

        /// <summary>Active WalletConnect session topic.</summary>
        public string SessionTopic => _sessionManager.SessionTopic;

        // ── Event Stream ───────────────────────────────────────────────

        /// <summary>Typed event stream. Subscribe after Initialize().</summary>
        public EventEmitter<CinacoinEvent> Events => _events;

        // ── Factory / Constructor ──────────────────────────────────────

        /// <summary>
        /// Create a new CinacoinClient instance.
        /// </summary>
        /// <param name="projectId">Cinacoin project ID.</param>
        /// <param name="metadata">App metadata for wallet pairing.</param>
        /// <param name="relayUrl">Optional relay WebSocket override.</param>
        /// <param name="namespace">Chain namespace (default "eip155").</param>
        public static CinacoinClient Create(
            string projectId,
            AppMetadata metadata,
            string relayUrl = null,
            string @namespace = "eip155")
        {
            if (string.IsNullOrEmpty(projectId))
                throw new ArgumentException("projectId is required", nameof(projectId));
            if (metadata == null)
                throw new ArgumentNullException(nameof(metadata));

            return new CinacoinClient(projectId, metadata, relayUrl, @namespace);
        }

        private CinacoinClient(
            string projectId,
            AppMetadata metadata,
            string relayUrl,
            string @namespace)
        {
            ProjectId = projectId;
            Metadata = metadata;
            RelayUrl = relayUrl;
            Namespace = @namespace;
            _sessionManager = new SessionManager();
            _events = new EventEmitter<CinacoinEvent>();
        }

        // ── Initialization ─────────────────────────────────────────────

        /// <summary>
        /// Initialize the SDK. Must be called once before any other method.
        /// Sets up WalletConnect v2, registers adapters, and attempts
        /// session restoration from PlayerPrefs.
        /// </summary>
        public async Task Initialize()
        {
            ThrowIfDisposed();
            if (_initialized) return;

            _walletManager = new WalletManager(
                projectId: ProjectId,
                metadata: Metadata,
                relayUrl: RelayUrl ?? "wss://relay.walletconnect.com"
            );

            // Forward events.
            _walletManager.OnStatusChange += HandleStatusChange;
            _walletManager.OnSessionConnected += (session) =>
            {
                _sessionManager.SetConnected(
                    accounts: session.Accounts,
                    chainId: session.ChainId,
                    sessionId: session.SessionId,
                    connectorId: session.ConnectorId
                );
                _events.Emit(new CinacoinEvent.Connected(
                    accounts: session.Accounts,
                    chainId: session.ChainId
                ));
            };
            _walletManager.OnSessionDisconnected += (topic) =>
            {
                _sessionManager.SetDisconnected();
                _events.Emit(new CinacoinEvent.Disconnected());
            };
            _walletManager.OnError += (ex) =>
            {
                _events.Emit(new CinacoinEvent.ErrorEvent(message: ex.Message));
            };

            // Attempt session restoration.
            var restored = await _walletManager.TryRestoreSession();
            if (restored != null)
            {
                _sessionManager.SetConnected(
                    accounts: restored.Accounts,
                    chainId: restored.ChainId,
                    sessionId: restored.SessionId,
                    connectorId: restored.ConnectorId
                );
                _events.Emit(new CinacoinEvent.SessionRestored(
                    accounts: restored.Accounts,
                    chainId: restored.ChainId
                ));
            }

            _initialized = true;
        }

        // ── Connection ─────────────────────────────────────────────────

        /// <summary>
        /// Connect to a wallet by ID.
        /// </summary>
        /// <param name="walletId">Connector ID (e.g. "metamask", "walletconnect").</param>
        /// <param name="chains">Optional chain ID filter.</param>
        /// <returns>ConnectionResult with session info.</returns>
        public async Task<ConnectionResult> ConnectAsync(
            string walletId,
            int[] chains = null)
        {
            ThrowIfInitialized();

            var result = await _walletManager.ConnectAsync(walletId, chains);

            _sessionManager.SetConnected(
                accounts: result.Accounts,
                chainId: result.ChainId,
                sessionId: result.SessionId,
                connectorId: result.ConnectorId
            );

            _events.Emit(new CinacoinEvent.Connected(
                accounts: result.Accounts,
                chainId: result.ChainId
            ));

            return result;
        }

        /// <summary>Disconnect the active wallet session.</summary>
        public async Task DisconnectAsync()
        {
            ThrowIfInitialized();

            try { await _walletManager.DisconnectAsync(_sessionManager.SessionId); }
            catch { /* best-effort cleanup */ }

            _sessionManager.SetDisconnected();
            _events.Emit(new CinacoinEvent.Disconnected());
        }

        // ── Chain Switching ────────────────────────────────────────────

        /// <summary>Switch to a different chain.</summary>
        /// <param name="chainId">Target chain ID.</param>
        public async Task SwitchChainAsync(int chainId)
        {
            ThrowIfInitialized();
            ThrowIfNotConnected();

            await _walletManager.SwitchChainAsync(_sessionManager.SessionId, chainId);
            _sessionManager.SetChainId(chainId);
            _events.Emit(new CinacoinEvent.ChainChanged(chainId: chainId));
        }

        // ── Signing ────────────────────────────────────────────────────

        /// <summary>Sign a raw message (EIP-191 personal_sign).</summary>
        public async Task<string> SignMessageAsync(string message)
        {
            ThrowIfInitialized();
            ThrowIfNotConnected();
            return await _walletManager.SignMessageAsync(_sessionManager.SessionId, message);
        }

        /// <summary>Sign typed structured data (EIP-712).</summary>
        public async Task<string> SignTypedDataAsync(string typedData)
        {
            ThrowIfInitialized();
            ThrowIfNotConnected();
            return await _walletManager.SignTypedDataAsync(_sessionManager.SessionId, typedData);
        }

        // ── Transactions ───────────────────────────────────────────────

        /// <summary>Send a transaction for signing and broadcasting.</summary>
        public async Task<string> SendTransactionAsync(TransactionRequest tx)
        {
            ThrowIfInitialized();
            ThrowIfNotConnected();
            return await _walletManager.SendTransactionAsync(_sessionManager.SessionId, tx);
        }

        // ── Balance ────────────────────────────────────────────────────

        /// <summary>Fetch native token balance for the primary account.</summary>
        public async Task<string> GetBalanceAsync()
        {
            ThrowIfInitialized();
            ThrowIfNotConnected();

            var address = _sessionManager.Accounts.Count > 0
                ? _sessionManager.Accounts[0]
                : throw new InvalidOperationException("No connected accounts.");

            var chain = GetChainById(ChainId);
            if (chain == null) throw new InvalidOperationException("Unknown chain.");

            var adapter = new EvmAdapter();
            adapter.Init(chain.RpcUrl, ChainId);
            return await adapter.GetBalanceFormattedAsync(address);
        }

        // ── SIWE ───────────────────────────────────────────────────────

        /// <summary>Generate a Sign-In With Ethereum message.</summary>
        /// <param name="domain">dApp domain.</param>
        /// <param name="nonce">Server nonce for replay protection.</param>
        /// <param name="uri">Optional URI override.</param>
        /// <param name="statement">Optional human-readable statement.</param>
        /// <returns>SIWE message string.</returns>
        public string GenerateSiweMessage(
            string domain,
            string nonce,
            string uri = null,
            string statement = null)
        {
            ThrowIfNotConnected();

            var address = _sessionManager.Accounts[0];
            var now = DateTime.UtcNow.ToString("o").TrimEnd('Z') + "Z";
            var actualUri = uri ?? $"https://{domain}";

            var lines = new List<string>
            {
                $"{domain} wants you to sign in with your Ethereum account:",
                address,
                ""
            };
            if (!string.IsNullOrEmpty(statement))
            {
                lines.Add(statement);
                lines.Add("");
            }
            lines.Add($"URI: {actualUri}");
            lines.Add("Version: 1");
            lines.Add($"Chain ID: {ChainId}");
            lines.Add($"Nonce: {nonce}");
            lines.Add($"Issued At: {now}");

            return string.Join("\n", lines);
        }

        // ── Utilities ──────────────────────────────────────────────────

        /// <summary>Get the WalletConnect pairing URI for QR display.</summary>
        public async Task<string> GetPairingUriAsync()
        {
            ThrowIfInitialized();
            return await _walletManager.GetPairingUriAsync();
        }

        /// <summary>Check if a specific wallet is installed.</summary>
        public async Task<bool> IsWalletInstalledAsync(string walletId)
        {
            if (!_initialized) return false;
            return await _walletManager.IsWalletInstalledAsync(walletId);
        }

        /// <summary>Get recommended wallets for the current namespace.</summary>
        public List<WalletInfo> GetRecommendedWallets()
        {
            return WalletRegistry.GetRecommended(Namespace);
        }

        // ── Disposal ───────────────────────────────────────────────────

        /// <summary>Dispose and release resources.</summary>
        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;

            if (_walletManager != null)
            {
                _walletManager.Dispose();
            }
            _events?.Clear();
            _initialized = false;
        }

        // ── Internal ───────────────────────────────────────────────────

        private void HandleStatusChange(ConnectionStatus newStatus)
        {
            if (newStatus == ConnectionStatus.Connecting)
            {
                var connectorId = _walletManager.CurrentConnectorId ?? "unknown";
                _events.Emit(new CinacoinEvent.Connecting(connectorId: connectorId));
            }
        }

        private static Chain GetChainById(int chainId) => chainId switch
        {
            1 => Chain.Ethereum,
            137 => Chain.Polygon,
            42161 => Chain.Arbitrum,
            10 => Chain.Optimism,
            56 => Chain.Bsc,
            _ => null,
        };

        private void ThrowIfInitialized()
        {
            if (!_initialized) throw new InvalidOperationException(
                "CinacoinClient has not been initialized. Call Initialize() first.");
            if (_disposed) throw new ObjectDisposedException(
                nameof(CinacoinClient));
        }

        private void ThrowIfNotConnected()
        {
            if (!IsConnected) throw new InvalidOperationException(
                "No wallet is currently connected.");
        }

        private void ThrowIfDisposed()
        {
            if (_disposed) throw new ObjectDisposedException(
                nameof(CinacoinClient));
        }
    }

    // ────────────────────────────────────────────────────────────────────
    // Supporting types (kept inline for a single-file SDK distribution)
    // ────────────────────────────────────────────────────────────────────

    /// <summary>Connection status enum.</summary>
    public enum ConnectionStatus
    {
        Disconnected,
        Connecting,
        Connected,
        Error
    }

    /// <summary>App metadata for WalletConnect.</summary>
    [System.Serializable]
    public class AppMetadata
    {
        public string Name;
        public string Description;
        public string Url;
        public string[] Icons;

        public AppMetadata(string name, string description, string url, string[] icons = null)
        {
            Name = name;
            Description = description;
            Url = url;
            Icons = icons ?? Array.Empty<string>();
        }
    }

    /// <summary>Connection result from a successful wallet connection.</summary>
    [System.Serializable]
    public class ConnectionResult
    {
        public string SessionId;
        public string[] Accounts;
        public int ChainId;
        public string ConnectorId;
    }

    /// <summary>Transaction request parameters.</summary>
    [System.Serializable]
    public class TransactionRequest
    {
        public string From;
        public string To;
        public string Value;
        public string Data;
        public string Gas;
        public string GasPrice;
        public string MaxFeePerGas;
        public string MaxPriorityFeePerGas;
        public string Nonce;
        public int? ChainId;
    }

    /// <summary>Wallet info from the registry.</summary>
    [System.Serializable]
    public class WalletInfo
    {
        public string Id;
        public string Name;
        public string IconUrl;
        public string DeepLink;
        public string[] SupportedChains;
    }

    /// <summary>Session info for a connected wallet.</summary>
    [System.Serializable]
    public class SessionInfo
    {
        public string SessionId;
        public string Topic;
        public string ConnectorId;
        public string[] Accounts;
        public int ChainId;
        public long Expiry;
        public bool IsExpired => DateTimeOffset.UtcNow.ToUnixTimeSeconds() >= Expiry;
    }

    /// <summary>Chain definition.</summary>
    [System.Serializable]
    public class Chain
    {
        public string Id;
        public string Name;
        public string RpcUrl;
        public NativeCurrency NativeCurrency;
        public string ExplorerUrl;

        public static Chain Ethereum => new Chain
        {
            Id = "eip155:1",
            Name = "Ethereum",
            RpcUrl = "https://eth.llamarpc.com",
            NativeCurrency = new NativeCurrency { Name = "Ether", Symbol = "ETH", Decimals = 18 },
            ExplorerUrl = "https://etherscan.io"
        };

        public static Chain Polygon => new Chain
        {
            Id = "eip155:137",
            Name = "Polygon",
            RpcUrl = "https://polygon-rpc.com",
            NativeCurrency = new NativeCurrency { Name = "MATIC", Symbol = "MATIC", Decimals = 18 },
            ExplorerUrl = "https://polygonscan.com"
        };

        public static Chain Arbitrum => new Chain
        {
            Id = "eip155:42161",
            Name = "Arbitrum One",
            RpcUrl = "https://arb1.arbitrum.io/rpc",
            NativeCurrency = new NativeCurrency { Name = "Ether", Symbol = "ETH", Decimals = 18 },
            ExplorerUrl = "https://arbiscan.io"
        };

        public static Chain Optimism => new Chain
        {
            Id = "eip155:10",
            Name = "Optimism",
            RpcUrl = "https://mainnet.optimism.io",
            NativeCurrency = new NativeCurrency { Name = "Ether", Symbol = "ETH", Decimals = 18 },
            ExplorerUrl = "https://optimistic.etherscan.io"
        };

        public static Chain Bsc => new Chain
        {
            Id = "eip155:56",
            Name = "BNB Smart Chain",
            RpcUrl = "https://bsc-dataseed.binance.org",
            NativeCurrency = new NativeCurrency { Name = "BNB", Symbol = "BNB", Decimals = 18 },
            ExplorerUrl = "https://bscscan.com"
        };
    }

    /// <summary>Native currency info.</summary>
    [System.Serializable]
    public class NativeCurrency
    {
        public string Name;
        public string Symbol;
        public int Decimals;
    }

    /// <summary>Session state for event emission.</summary>
    public class SessionState
    {
        public ConnectionStatus Status;
        public string ConnectorId;
        public string[] Accounts;
        public int ChainId;
        public string SessionId;
        public string Error;

        public static SessionState Disconnected => new SessionState { Status = ConnectionStatus.Disconnected };

        public static SessionState Connecting(string connectorId) => new SessionState
        {
            Status = ConnectionStatus.Connecting,
            ConnectorId = connectorId
        };

        public static SessionState Connected(string[] accounts, int chainId, string sessionId, string connectorId) =>
            new SessionState
            {
                Status = ConnectionStatus.Connected,
                Accounts = accounts,
                ChainId = chainId,
                SessionId = sessionId,
                ConnectorId = connectorId
            };

        public static SessionState Errored(string error) => new SessionState
        {
            Status = ConnectionStatus.Error,
            Error = error
        };
    }

    // ────────────────────────────────────────────────────────────────────
    // Minimal stub classes — full implementations are in sibling files.
    // These stubs allow Cinacoin.cs to compile as a standalone SDK drop-in.
    // ────────────────────────────────────────────────────────────────────

    /// <summary>Wallet connection manager (stub — see WalletManager.cs).</summary>
    public class WalletManager
    {
        public event Action<ConnectionStatus> OnStatusChange;
        public event Action<SessionInfo> OnSessionConnected;
        public event Action<string> OnSessionDisconnected;
        public event Action<Exception> OnError;
        public event Action<string, string> OnQRCodeGenerated;

        public string CurrentConnectorId { get; private set; }

        public WalletManager(string projectId = null, AppMetadata metadata = null, string relayUrl = null) { }

        public Task InitializeAsync() => Task.CompletedTask;
        public Task<ConnectionResult> ConnectAsync(string walletId, int[] chains = null) =>
            Task.FromResult(new ConnectionResult { SessionId = "", Accounts = Array.Empty<string>(), ChainId = 1, ConnectorId = walletId });
        public Task DisconnectAsync(string sessionId) => Task.CompletedTask;
        public Task SwitchChainAsync(string sessionId, int chainId) => Task.CompletedTask;
        public Task<string> SignMessageAsync(string sessionId, string message) => Task.FromResult("0x");
        public Task<string> SignTypedDataAsync(string sessionId, string typedData) => Task.FromResult("0x");
        public Task<string> SendTransactionAsync(string sessionId, TransactionRequest tx) => Task.FromResult("0x");
        public Task TryRestoreSession() => Task.FromResult<ConnectionResult>(null);
        public Task<string> GetPairingUriAsync() => Task.FromResult<string>(null);
        public Task<bool> IsWalletInstalledAsync(string walletId) => Task.FromResult(false);
        public void Dispose() { }
    }

    /// <summary>EVM chain adapter (stub — see EvmAdapter.cs).</summary>
    public class EvmAdapter
    {
        public void Init(string rpcUrl, int chainId) { }
        public Task<string> GetBalanceFormattedAsync(string address) => Task.FromResult("0.0");
    }

    /// <summary>Wallet registry (stub — see WalletRegistry.cs).</summary>
    public static class WalletRegistry
    {
        public static List<WalletInfo> GetRecommended(string @namespace) => new List<WalletInfo>();
    }

    // ────────────────────────────────────────────────────────────────────
    // SessionManager & EventEmitter (inline for standalone SDK)
    // ────────────────────────────────────────────────────────────────────

    /// <summary>In-memory session state tracker.</summary>
    public class SessionManager
    {
        private ConnectionStatus _status = ConnectionStatus.Disconnected;
        private List<string> _accounts = new List<string>();
        private int _chainId = 1;

        public ConnectionStatus Status => _status;
        public IReadOnlyList<string> Accounts => _accounts.AsReadOnly();
        public int ChainId => _chainId;
        public string SessionId { get; private set; }
        public string SessionTopic { get; private set; }
        public string ConnectorId { get; private set; }

        public void SetConnected(List<string> accounts, int chainId, string sessionId, string connectorId)
        {
            _status = ConnectionStatus.Connected;
            _accounts = new List<string>(accounts);
            _chainId = chainId;
            SessionId = sessionId;
            ConnectorId = connectorId;
        }

        public void SetDisconnected()
        {
            _status = ConnectionStatus.Disconnected;
            _accounts.Clear();
            _chainId = 1;
            SessionId = null;
            SessionTopic = null;
            ConnectorId = null;
        }

        public void SetChainId(int chainId) => _chainId = chainId;
    }

    /// <summary>Typed event emitter for Unity.</summary>
    public class EventEmitter<T>
    {
        private readonly List<Action<T>> _listeners = new List<Action<T>>();

        public void Emit(T evt)
        {
            foreach (var listener in new List<Action<T>>(_listeners))
            {
                listener(evt);
            }
        }

        public void On(Action<T> handler) { _listeners.Add(handler); }
        public void Off(Action<T> handler) { _listeners.Remove(handler); }
        public void Clear() { _listeners.Clear(); }
    }

    /// <summary>Union type for Cinacoin events.</summary>
    public abstract class CinacoinEvent
    {
        private CinacoinEvent() { }

        public class Connected : CinacoinEvent
        {
            public string[] Accounts { get; }
            public int ChainId { get; }
            public Connected(string[] accounts, int chainId) { Accounts = accounts; ChainId = chainId; }
        }

        public class Connecting : CinacoinEvent
        {
            public string ConnectorId { get; }
            public Connecting(string connectorId) { ConnectorId = connectorId; }
        }

        public class Disconnected : CinacoinEvent { }

        public class ChainChanged : CinacoinEvent
        {
            public int ChainId { get; }
            public ChainChanged(int chainId) { ChainId = chainId; }
        }

        public class AccountsChanged : CinacoinEvent
        {
            public string[] Accounts { get; }
            public AccountsChanged(string[] accounts) { Accounts = accounts; }
        }

        public class ErrorEvent : CinacoinEvent
        {
            public string Message { get; }
            public ErrorEvent(string message) { Message = message; }
        }

        public class SessionRestored : CinacoinEvent
        {
            public string[] Accounts { get; }
            public int ChainId { get; }
            public SessionRestored(string[] accounts, int chainId) { Accounts = accounts; ChainId = chainId; }
        }
    }

    /// <summary>SDK version constant.</summary>
    public static class CinacoinVersion
    {
        public const string Value = "0.1.0";
    }
}
