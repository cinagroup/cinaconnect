using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Cinacoin;

/// <summary>
/// CinacoinClient — .NET SDK client for wallet connectivity, transaction
/// signing, session management, and multi-chain network operations.
///
/// This client wraps HTTP calls to the Cinacoin API and manages the
/// full lifecycle of wallet connections. It implements
/// <see cref="IAsyncDisposable"/> for proper resource cleanup.
///
/// ## Usage
/// <code>
/// using var client = new CinacoinClient("YOUR_PROJECT_ID");
///
/// // Connect a wallet
/// var connection = await client.ConnectAsync(new ConnectParams
/// {
///     WalletId = "metamask",
///     Chains = new[] { 1, 137, 42161 }
/// });
///
/// Console.WriteLine($"Connected: {connection.SessionId}");
///
/// // Get account info
/// var account = await client.GetAccountAsync(connection.ConnectorId);
/// Console.WriteLine($"Address: {account.Address}");
///
/// // Sign a message
/// var signature = await client.SignMessageAsync(account.Address, "Hello!");
/// Console.WriteLine($"Signature: {signature}");
///
/// // Disconnect
/// await client.DisconnectAsync(connection.SessionId);
/// </code>
/// </summary>
public sealed class CinacoinClient : IAsyncDisposable
{
    private readonly HttpClient _httpClient;
    private readonly string _projectId;
    private readonly ILogger<CinacoinClient>? _logger;
    private readonly JsonSerializerOptions _jsonOptions;
    private bool _disposed;

    // ── Configuration ──────────────────────────────────────────────────

    /// <summary>SDK version.</summary>
    public const string Version = "0.1.0";

    /// <summary>The project ID used for all API calls.</summary>
    public string ProjectId => _projectId;

    /// <summary>The base URL of the Cinacoin API.</summary>
    public string BaseUrl => _httpClient.BaseAddress?.ToString() ?? string.Empty;

    // ── Constructor ────────────────────────────────────────────────────

    /// <summary>
    /// Create a new CinacoinClient.
    /// </summary>
    /// <param name="projectId">
    /// Your Cinacoin project ID (required).
    /// </param>
    /// <param name="baseUrl">
    /// API base URL. Defaults to <c>https://api.cinacoin.com</c>.
    /// </param>
    /// <param name="logger">Optional logger instance.</param>
    /// <param name="httpClient">
    /// Optional HttpClient to inject. If null, a new one is created.
    /// When provided, <see cref="DisposeAsync"/> will NOT dispose it.
    /// </param>
    public CinacoinClient(
        string projectId,
        string baseUrl = "https://api.cinacoin.com",
        ILogger<CinacoinClient>? logger = null,
        HttpClient? httpClient = null)
    {
        _projectId = projectId ?? throw new ArgumentNullException(nameof(projectId));
        _logger = logger;
        _httpClient = httpClient ?? new HttpClient { BaseAddress = new Uri(baseUrl) };

        _httpClient.DefaultRequestHeaders.Add("X-Project-Id", _projectId);
        _httpClient.DefaultRequestHeaders.Add("X-SDK-Version", Version);
        _httpClient.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        };

        _logger?.LogDebug(
            "CinacoinClient initialized (v{Version}, baseUrl={BaseUrl})",
            Version, baseUrl);
    }

    // ────────────────────────────────────────────────────────────────────
    // Account
    // ────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Get account information for a connected wallet.
    /// </summary>
    /// <param name="walletId">Wallet connector identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Account info including address, chain ID, and balance.</returns>
    public async Task<AccountInfo> GetAccountAsync(
        string walletId,
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        _logger?.LogDebug("Fetching account for wallet {WalletId}", walletId);

        var response = await _httpClient.GetAsync(
            $"/v1/wallets/{Uri.EscapeDataString(walletId)}/account",
            cancellationToken).ConfigureAwait(false);

        await EnsureSuccessAsync(response, cancellationToken).ConfigureAwait(false);

        var account = await response.Content.ReadFromJsonAsync<AccountInfo>(
            _jsonOptions, cancellationToken).ConfigureAwait(false);

        return account ?? throw new InvalidOperationException(
            "API returned null account response.");
    }

    // ────────────────────────────────────────────────────────────────────
    // Balance
    // ────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Get the native token balance for a given address.
    /// </summary>
    /// <param name="address">Wallet address (e.g. <c>0x...</c>).</param>
    /// <param name="chainId">Chain ID (default: <c>"1"</c> for Ethereum mainnet).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Balance as a decimal value.</returns>
    public async Task<decimal> GetBalanceAsync(
        string address,
        string chainId = "1",
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        _logger?.LogDebug(
            "Fetching balance for {Address} on chain {ChainId}",
            address, chainId);

        var url = $"/v1/balance?address={Uri.EscapeDataString(address)}&chainId={Uri.EscapeDataString(chainId)}";
        var response = await _httpClient.GetAsync(url, cancellationToken)
            .ConfigureAwait(false);

        await EnsureSuccessAsync(response, cancellationToken).ConfigureAwait(false);

        using var doc = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken).ConfigureAwait(false);

        if (!doc.Value.TryGetProperty("balance", out var balanceProp))
            throw new InvalidOperationException(
                "API balance response missing 'balance' property.");

        return balanceProp.GetDecimal();
    }

    // ────────────────────────────────────────────────────────────────────
    // Networks
    // ────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Get the list of available networks.
    /// </summary>
    public async Task<List<NetworkInfo>> GetNetworksAsync(
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        _logger?.LogDebug("Fetching available networks");

        var response = await _httpClient.GetAsync(
            "/v1/networks", cancellationToken).ConfigureAwait(false);

        await EnsureSuccessAsync(response, cancellationToken).ConfigureAwait(false);

        var networks = await response.Content.ReadFromJsonAsync<List<NetworkInfo>>(
            _jsonOptions, cancellationToken).ConfigureAwait(false);

        return networks ?? new List<NetworkInfo>();
    }

    /// <summary>
    /// Get details for a specific network by chain ID.
    /// </summary>
    public async Task<NetworkInfo> GetNetworkAsync(
        int chainId,
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        _logger?.LogDebug("Fetching network for chain {ChainId}", chainId);

        var response = await _httpClient.GetAsync(
            $"/v1/networks/{chainId}", cancellationToken).ConfigureAwait(false);

        await EnsureSuccessAsync(response, cancellationToken).ConfigureAwait(false);

        var network = await response.Content.ReadFromJsonAsync<NetworkInfo>(
            _jsonOptions, cancellationToken).ConfigureAwait(false);

        return network ?? throw new InvalidOperationException(
            $"Network with chain ID {chainId} not found.");
    }

    // ────────────────────────────────────────────────────────────────────
    // Sessions
    // ────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Create a new wallet session and return pairing data.
    /// </summary>
    /// <param name="walletId">Wallet connector identifier.</param>
    /// <param name="ns">Chain namespace (e.g. <c>"eip155"</c>).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Session result with session ID and pairing URI.</returns>
    public async Task<SessionResult> CreateSessionAsync(
        string walletId,
        string ns = "eip155",
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        _logger?.LogDebug(
            "Creating session for {WalletId}, namespace {Namespace}",
            walletId, ns);

        var payload = new { walletId, @namespace = ns };
        var response = await _httpClient.PostAsJsonAsync(
            "/v1/sessions", payload, _jsonOptions, cancellationToken)
            .ConfigureAwait(false);

        await EnsureSuccessAsync(response, cancellationToken).ConfigureAwait(false);

        var result = await response.Content.ReadFromJsonAsync<SessionResult>(
            _jsonOptions, cancellationToken).ConfigureAwait(false);

        return result ?? throw new InvalidOperationException(
            "API returned null session result.");
    }

    /// <summary>
    /// Get details of an active session.
    /// </summary>
    public async Task<SessionResult> GetSessionAsync(
        string sessionId,
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        _logger?.LogDebug("Fetching session {SessionId}", sessionId);

        var response = await _httpClient.GetAsync(
            $"/v1/sessions/{Uri.EscapeDataString(sessionId)}",
            cancellationToken).ConfigureAwait(false);

        await EnsureSuccessAsync(response, cancellationToken).ConfigureAwait(false);

        var result = await response.Content.ReadFromJsonAsync<SessionResult>(
            _jsonOptions, cancellationToken).ConfigureAwait(false);

        return result ?? throw new InvalidOperationException(
            "API returned null session response.");
    }

    /// <summary>
    /// List all active sessions for this project.
    /// </summary>
    public async Task<List<SessionResult>> ListSessionsAsync(
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();

        var response = await _httpClient.GetAsync(
            "/v1/sessions", cancellationToken).ConfigureAwait(false);

        await EnsureSuccessAsync(response, cancellationToken).ConfigureAwait(false);

        var sessions = await response.Content.ReadFromJsonAsync<List<SessionResult>>(
            _jsonOptions, cancellationToken).ConfigureAwait(false);

        return sessions ?? new List<SessionResult>();
    }

    // ────────────────────────────────────────────────────────────────────
    // Connect / Disconnect
    // ────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Connect to a wallet with the specified parameters.
    /// </summary>
    /// <param name="parameters">
    /// Connection parameters including wallet ID, chains, and optional
    /// pairing URI.
    /// </param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Connection result with session ID, accounts, and chain ID.</returns>
    public async Task<ConnectionResult> ConnectAsync(
        ConnectParams parameters,
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        _logger?.LogDebug("Initiating wallet connection");

        var response = await _httpClient.PostAsJsonAsync(
            "/v1/connect", parameters, _jsonOptions, cancellationToken)
            .ConfigureAwait(false);

        await EnsureSuccessAsync(response, cancellationToken).ConfigureAwait(false);

        var result = await response.Content.ReadFromJsonAsync<ConnectionResult>(
            _jsonOptions, cancellationToken).ConfigureAwait(false);

        return result ?? throw new InvalidOperationException(
            "API returned null connection result.");
    }

    /// <summary>
    /// Disconnect an active wallet session.
    /// </summary>
    /// <param name="sessionId">Session ID to disconnect.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task DisconnectAsync(
        string sessionId,
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        _logger?.LogDebug("Disconnecting session {SessionId}", sessionId);

        var response = await _httpClient.DeleteAsync(
            $"/v1/sessions/{Uri.EscapeDataString(sessionId)}",
            cancellationToken).ConfigureAwait(false);

        await EnsureSuccessAsync(response, cancellationToken).ConfigureAwait(false);
    }

    // ────────────────────────────────────────────────────────────────────
    // Transactions
    // ────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Send a transaction for signing by the connected wallet.
    /// </summary>
    /// <param name="request">Transaction parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Signed and broadcast transaction.</returns>
    public async Task<TransactionResult> SendTransactionAsync(
        TransactionRequest request,
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        _logger?.LogDebug(
            "Sending transaction: from {From} to {To}",
            request.From, request.To);

        var response = await _httpClient.PostAsJsonAsync(
            "/v1/transactions", request, _jsonOptions, cancellationToken)
            .ConfigureAwait(false);

        await EnsureSuccessAsync(response, cancellationToken).ConfigureAwait(false);

        var tx = await response.Content.ReadFromJsonAsync<TransactionResult>(
            _jsonOptions, cancellationToken).ConfigureAwait(false);

        return tx ?? throw new InvalidOperationException(
            "API returned null transaction response.");
    }

    /// <summary>
    /// Get the status of a transaction by hash.
    /// </summary>
    public async Task<TransactionStatus> GetTransactionStatusAsync(
        string txHash,
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();

        var response = await _httpClient.GetAsync(
            $"/v1/transactions/{Uri.EscapeDataString(txHash)}/status",
            cancellationToken).ConfigureAwait(false);

        await EnsureSuccessAsync(response, cancellationToken).ConfigureAwait(false);

        var status = await response.Content.ReadFromJsonAsync<TransactionStatus>(
            _jsonOptions, cancellationToken).ConfigureAwait(false);

        return status ?? throw new InvalidOperationException(
            "API returned null transaction status.");
    }

    // ────────────────────────────────────────────────────────────────────
    // Signing
    // ────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Sign a message using the connected wallet (EIP-191 personal_sign).
    /// </summary>
    /// <param name="address">Signer address.</param>
    /// <param name="message">Message to sign.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Hex-encoded signature.</returns>
    public async Task<string> SignMessageAsync(
        string address,
        string message,
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        _logger?.LogDebug("Signing message for address {Address}", address);

        var payload = new { address, message };
        var response = await _httpClient.PostAsJsonAsync(
            "/v1/sign/message", payload, _jsonOptions, cancellationToken)
            .ConfigureAwait(false);

        await EnsureSuccessAsync(response, cancellationToken).ConfigureAwait(false);

        using var doc = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken).ConfigureAwait(false);

        if (!doc.Value.TryGetProperty("signature", out var sigProp))
            throw new InvalidOperationException(
                "API sign response missing 'signature' property.");

        return sigProp.GetString() ?? string.Empty;
    }

    /// <summary>
    /// Sign typed structured data (EIP-712).
    /// </summary>
    /// <param name="address">Signer address.</param>
    /// <param name="typedData">JSON-encoded EIP-712 typed data.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Hex-encoded signature.</returns>
    public async Task<string> SignTypedDataAsync(
        string address,
        string typedData,
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        _logger?.LogDebug("Signing typed data for address {Address}", address);

        var payload = new { address, typedData };
        var response = await _httpClient.PostAsJsonAsync(
            "/v1/sign/typed-data", payload, _jsonOptions, cancellationToken)
            .ConfigureAwait(false);

        await EnsureSuccessAsync(response, cancellationToken).ConfigureAwait(false);

        using var doc = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken).ConfigureAwait(false);

        if (!doc.Value.TryGetProperty("signature", out var sigProp))
            throw new InvalidOperationException(
                "API sign response missing 'signature' property.");

        return sigProp.GetString() ?? string.Empty;
    }

    // ────────────────────────────────────────────────────────────────────
    // SIWE (Sign-In With Ethereum)
    // ────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Generate a Sign-In With Ethereum (EIP-4361) message.
    /// </summary>
    /// <param name="domain">dApp domain.</param>
    /// <param name="address">Wallet address.</param>
    /// <param name="nonce">Server nonce for replay protection.</param>
    /// <param name="uri">Optional URI override.</param>
    /// <param name="statement">Optional human-readable statement.</param>
    /// <returns>SIWE message string.</returns>
    public static string GenerateSiweMessage(
        string domain,
        string address,
        string nonce,
        string uri = null,
        string statement = null)
    {
        ArgumentNullException.ThrowIfNull(domain);
        ArgumentNullException.ThrowIfNull(address);
        ArgumentNullException.ThrowIfNull(nonce);

        var now = DateTime.UtcNow.ToString("o").TrimEnd('Z') + "Z";

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
        lines.Add($"URI: {uri ?? $"https://{domain}"}");
        lines.Add("Version: 1");
        lines.Add($"Chain ID: 1");
        lines.Add($"Nonce: {nonce}");
        lines.Add($"Issued At: {now}");

        return string.Join("\n", lines);
    }

    // ────────────────────────────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────────────────────────────

    private static async Task EnsureSuccessAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken)
                .ConfigureAwait(false);
            throw new HttpRequestException(
                $"Cinacoin API error: {(int)response.StatusCode} " +
                $"{response.ReasonPhrase}\n{body}");
        }
    }

    private void ThrowIfDisposed()
    {
        if (_disposed)
            throw new ObjectDisposedException(nameof(CinacoinClient));
    }

    /// <inheritdoc />
    public async ValueTask DisposeAsync()
    {
        if (_disposed) return;

        _disposed = true;
        _httpClient.Dispose();
        await Task.CompletedTask.ConfigureAwait(false);
    }
}

// ────────────────────────────────────────────────────────────────────────
// Data Models
// ────────────────────────────────────────────────────────────────────────

/// <summary>Account information returned from the API.</summary>
public record AccountInfo
{
    /// <summary>Wallet address.</summary>
    [JsonPropertyName("address")]
    public string Address { get; init; } = string.Empty;

    /// <summary>Human-readable label (ENS, etc.).</summary>
    [JsonPropertyName("label")]
    public string? Label { get; init; }

    /// <summary>Current chain ID.</summary>
    [JsonPropertyName("chainId")]
    public int ChainId { get; init; }

    /// <summary>Native token balance (decimal string).</summary>
    [JsonPropertyName("balance")]
    public string Balance { get; init; } = "0";

    /// <summary>Native token symbol.</summary>
    [JsonPropertyName("symbol")]
    public string Symbol { get; init; } = "ETH";

    /// <summary>Connector ID that owns this account.</summary>
    [JsonPropertyName("connectorId")]
    public string ConnectorId { get; init; } = string.Empty;
}

/// <summary>Network/chain information.</summary>
public record NetworkInfo
{
    /// <summary>Chain ID.</summary>
    [JsonPropertyName("chainId")]
    public int ChainId { get; init; }

    /// <summary>Human-readable name.</summary>
    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    /// <summary>RPC endpoint URL.</summary>
    [JsonPropertyName("rpcUrl")]
    public string RpcUrl { get; init; } = string.Empty;

    /// <summary>Block explorer URL.</summary>
    [JsonPropertyName("explorerUrl")]
    public string? ExplorerUrl { get; init; }

    /// <summary>Native currency symbol.</summary>
    [JsonPropertyName("symbol")]
    public string Symbol { get; init; } = "ETH";

    /// <summary>Whether this is a testnet.</summary>
    [JsonPropertyName("testnet")]
    public bool Testnet { get; init; }
}

/// <summary>Session result from create/list operations.</summary>
public record SessionResult
{
    /// <summary>Unique session identifier.</summary>
    [JsonPropertyName("sessionId")]
    public string SessionId { get; init; } = string.Empty;

    /// <summary>WalletConnect pairing URI (when creating a new session).</summary>
    [JsonPropertyName("pairingUri")]
    public string? PairingUri { get; init; }

    /// <summary>Connected accounts.</summary>
    [JsonPropertyName("accounts")]
    public List<string> Accounts { get; init; } = new();

    /// <summary>Active chain ID.</summary>
    [JsonPropertyName("chainId")]
    public int ChainId { get; init; }

    /// <summary>Session expiry (Unix timestamp).</summary>
    [JsonPropertyName("expiry")]
    public long? Expiry { get; init; }

    /// <summary>Whether the session is still valid.</summary>
    public bool IsActive =>
        Expiry == null || DateTimeOffset.UtcNow.ToUnixTimeSeconds() < Expiry;
}

/// <summary>Connection result from ConnectAsync.</summary>
public record ConnectionResult
{
    /// <summary>Session ID for the new connection.</summary>
    [JsonPropertyName("sessionId")]
    public string SessionId { get; init; } = string.Empty;

    /// <summary>Connected account addresses.</summary>
    [JsonPropertyName("accounts")]
    public List<string> Accounts { get; init; } = new();

    /// <summary>Active chain ID.</summary>
    [JsonPropertyName("chainId")]
    public int ChainId { get; init; }

    /// <summary>Wallet connector ID.</summary>
    [JsonPropertyName("connectorId")]
    public string ConnectorId { get; init; } = string.Empty;
}

/// <summary>Connection parameters for ConnectAsync.</summary>
public record ConnectParams
{
    /// <summary>Wallet connector ID (e.g. "metamask").</summary>
    [JsonPropertyName("walletId")]
    public string WalletId { get; init; } = string.Empty;

    /// <summary>Optional pairing URI (WalletConnect format).</summary>
    [JsonPropertyName("uri")]
    public string? Uri { get; init; }

    /// <summary>Optional relay URL override.</summary>
    [JsonPropertyName("relayUrl")]
    public string? RelayUrl { get; init; }

    /// <summary>Chain IDs the dApp supports.</summary>
    [JsonPropertyName("chains")]
    public List<int>? Chains { get; init; }

    /// <summary>Chain namespace (default: "eip155").</summary>
    [JsonPropertyName("namespace")]
    public string? Namespace { get; init; }
}

/// <summary>Transaction request parameters.</summary>
public record TransactionRequest
{
    /// <summary>Sender address.</summary>
    [JsonPropertyName("from")]
    public string From { get; init; } = string.Empty;

    /// <summary>Recipient address.</summary>
    [JsonPropertyName("to")]
    public string To { get; init; } = string.Empty;

    /// <summary>Value in hex.</summary>
    [JsonPropertyName("value")]
    public string? Value { get; init; }

    /// <summary>Calldata in hex.</summary>
    [JsonPropertyName("data")]
    public string? Data { get; init; }

    /// <summary>Gas limit in hex.</summary>
    [JsonPropertyName("gas")]
    public string? Gas { get; init; }

    /// <summary>Gas price in hex.</summary>
    [JsonPropertyName("gasPrice")]
    public string? GasPrice { get; init; }

    /// <summary>Max fee per gas in hex (EIP-1559).</summary>
    [JsonPropertyName("maxFeePerGas")]
    public string? MaxFeePerGas { get; init; }

    /// <summary>Max priority fee per gas in hex (EIP-1559).</summary>
    [JsonPropertyName("maxPriorityFeePerGas")]
    public string? MaxPriorityFeePerGas { get; init; }

    /// <summary>Nonce in hex.</summary>
    [JsonPropertyName("nonce")]
    public string? Nonce { get; init; }

    /// <summary>Chain ID.</summary>
    [JsonPropertyName("chainId")]
    public int? ChainId { get; init; }
}

/// <summary>Transaction result from SendTransactionAsync.</summary>
public record TransactionResult
{
    /// <summary>Transaction hash.</summary>
    [JsonPropertyName("hash")]
    public string Hash { get; init; } = string.Empty;

    /// <summary>Block number (null if pending).</summary>
    [JsonPropertyName("blockNumber")]
    public long? BlockNumber { get; init; }

    /// <summary>Gas used.</summary>
    [JsonPropertyName("gasUsed")]
    public string? GasUsed { get; init; }

    /// <summary>Transaction status.</summary>
    [JsonPropertyName("status")]
    public string Status { get; init; } = "pending";
}

/// <summary>Transaction status response.</summary>
public record TransactionStatus
{
    /// <summary>Transaction hash.</summary>
    [JsonPropertyName("hash")]
    public string Hash { get; init; } = string.Empty;

    /// <summary>One of: "pending", "confirmed", "failed".</summary>
    [JsonPropertyName("status")]
    public string Status { get; init; } = "pending";

    /// <summary>Confirmation count.</summary>
    [JsonPropertyName("confirmations")]
    public int Confirmations { get; init; }

    /// <summary>Block number.</summary>
    [JsonPropertyName("blockNumber")]
    public long? BlockNumber { get; init; }
}
