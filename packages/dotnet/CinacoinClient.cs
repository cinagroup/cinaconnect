using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Cinacoin.Models;
using Cinacoin.Services;
using Microsoft.Extensions.Logging;

namespace Cinacoin;

/// <summary>
/// Main client for interacting with the Cinacoin SDK.
/// Provides wallet connectivity, transaction signing, session management,
/// and multi-chain network operations.
/// </summary>
/// <remarks>
/// This client wraps HTTP calls to the Cinacoin API and manages
/// lifecycle of connections. It implements <see cref="IAsyncDisposable"/>
/// for proper resource cleanup.
/// </remarks>
public sealed class CinacoinClient : IAsyncDisposable
{
    private readonly HttpClient _httpClient;
    private readonly string _projectId;
    private readonly ILogger<CinacoinClient>? _logger;
    private readonly JsonSerializerOptions _jsonOptions;
    private bool _disposed;

    /// <summary>
    /// Creates a new Cinacoin client instance.
    /// </summary>
    /// <param name="projectId">Your Cinacoin project ID.</param>
    /// <param name="baseUrl">API base URL (default: https://api.cinacoin.com).</param>
    /// <param name="logger">Optional logger instance.</param>
    public CinacoinClient(
        string projectId,
        string baseUrl = "https://api.cinacoin.com",
        ILogger<CinacoinClient>? logger = null)
    {
        _projectId = projectId ?? throw new ArgumentNullException(nameof(projectId));
        _logger = logger;

        _httpClient = new HttpClient { BaseAddress = new Uri(baseUrl) };
        _httpClient.DefaultRequestHeaders.Add("X-Project-Id", projectId);
        _httpClient.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        };

        _logger?.LogDebug(
            "CinacoinClient initialized with base URL {BaseUrl}", baseUrl);
    }

    // -----------------------------------------------------------------------
    // Account
    // -----------------------------------------------------------------------

    /// <summary>
    /// Gets account information for the connected wallet.
    /// </summary>
    /// <param name="walletId">
    /// Wallet connector identifier (e.g., "metamask", "walletconnect", "coinbase").
    /// </param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Account information including address, chain ID, balance, and label.</returns>
    /// <exception cref="HttpRequestException">Thrown when the API request fails.</exception>
    public async Task<Account> GetAccountAsync(
        string walletId,
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        _logger?.LogDebug("Fetching account for wallet {WalletId}", walletId);

        var response = await _httpClient.GetAsync(
            $"/v1/wallets/{Uri.EscapeDataString(walletId)}/account",
            cancellationToken).ConfigureAwait(false);

        await EnsureSuccessAsync(response, cancellationToken).ConfigureAwait(false);

        var account = await response.Content.ReadFromJsonAsync<Account>(
            _jsonOptions, cancellationToken).ConfigureAwait(false);

        return account ?? throw new InvalidOperationException(
            "API returned null account response.");
    }

    // -----------------------------------------------------------------------
    // Balance
    // -----------------------------------------------------------------------

    /// <summary>
    /// Gets the native token balance for a given address.
    /// </summary>
    /// <param name="address">Wallet address (e.g., "0x...").</param>
    /// <param name="chainId">Chain ID (default: "1" for Ethereum mainnet).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The balance as a decimal value.</returns>
    /// <exception cref="HttpRequestException">Thrown when the API request fails.</exception>
    public async Task<decimal> GetBalanceAsync(
        string address,
        string chainId = "1",
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        _logger?.LogDebug(
            "Fetching balance for address {Address} on chain {ChainId}",
            address, chainId);

        var url = $"/v1/balance?address={Uri.EscapeDataString(address)}&chainId={Uri.EscapeDataString(chainId)}";
        var response = await _httpClient.GetAsync(url, cancellationToken)
            .ConfigureAwait(false);

        await EnsureSuccessAsync(response, cancellationToken).ConfigureAwait(false);

        // The API returns a JSON object like: { "balance": "1.23456", "symbol": "ETH" }
        using var doc = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken).ConfigureAwait(false);

        if (!doc.Value.TryGetProperty("balance", out var balanceProp))
            throw new InvalidOperationException(
                "API balance response missing 'balance' property.");

        return balanceProp.GetDecimal();
    }

    // -----------------------------------------------------------------------
    // Networks
    // -----------------------------------------------------------------------

    /// <summary>
    /// Gets the list of available networks.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of available networks.</returns>
    /// <exception cref="HttpRequestException">Thrown when the API request fails.</exception>
    public async Task<List<Network>> GetNetworksAsync(
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        _logger?.LogDebug("Fetching available networks");

        var response = await _httpClient.GetAsync(
            "/v1/networks", cancellationToken).ConfigureAwait(false);

        await EnsureSuccessAsync(response, cancellationToken).ConfigureAwait(false);

        var networks = await response.Content.ReadFromJsonAsync<List<Network>>(
            _jsonOptions, cancellationToken).ConfigureAwait(false);

        return networks ?? new List<Network>();
    }

    // -----------------------------------------------------------------------
    // Sessions
    // -----------------------------------------------------------------------

    /// <summary>
    /// Creates a new wallet session and returns pairing data.
    /// </summary>
    /// <param name="walletId">Wallet connector identifier.</param>
    /// <param name="ns">Chain namespace (e.g., "eip155").</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Session result containing a session ID and pairing URI.</returns>
    /// <exception cref="HttpRequestException">Thrown when the API request fails.</exception>
    public async Task<SessionResult> CreateSessionAsync(
        string walletId,
        string ns,
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        _logger?.LogDebug(
            "Creating session for wallet {WalletId}, namespace {Namespace}",
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

    // -----------------------------------------------------------------------
    // Connect / Disconnect
    // -----------------------------------------------------------------------

    /// <summary>
    /// Connects to a wallet using the specified connection parameters.
    /// </summary>
    /// <param name="parameters">Connection parameters including optional pairing URI, relay URL, and metadata.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Connection result with session ID, accounts, and chain ID.</returns>
    /// <exception cref="HttpRequestException">Thrown when the API request fails.</exception>
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
    /// Disconnects an active wallet session.
    /// </summary>
    /// <param name="sessionId">The session ID to disconnect.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <exception cref="HttpRequestException">Thrown when the API request fails.</exception>
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

    // -----------------------------------------------------------------------
    // Transactions
    // -----------------------------------------------------------------------

    /// <summary>
    /// Sends a transaction for signing by the connected wallet.
    /// </summary>
    /// <param name="request">Transaction request containing from, to, value, data, etc.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The signed and broadcast transaction.</returns>
    /// <exception cref="HttpRequestException">Thrown when the API request fails.</exception>
    public async Task<Transaction> SendTransactionAsync(
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

        var tx = await response.Content.ReadFromJsonAsync<Transaction>(
            _jsonOptions, cancellationToken).ConfigureAwait(false);

        return tx ?? throw new InvalidOperationException(
            "API returned null transaction response.");
    }

    // -----------------------------------------------------------------------
    // Signing
    // -----------------------------------------------------------------------

    /// <summary>
    /// Signs a message using the connected wallet (EIP-191 personal sign).
    /// </summary>
    /// <param name="address">Address of the signer.</param>
    /// <param name="message">Message to sign.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Hex-encoded signature string.</returns>
    /// <exception cref="HttpRequestException">Thrown when the API request fails.</exception>
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
    /// Signs typed structured data using the connected wallet (EIP-712).
    /// </summary>
    /// <param name="address">Address of the signer.</param>
    /// <param name="typedData">JSON-encoded EIP-712 typed data object.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Hex-encoded signature string.</returns>
    /// <exception cref="HttpRequestException">Thrown when the API request fails.</exception>
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

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private static async Task EnsureSuccessAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken)
                .ConfigureAwait(false);
            throw new HttpRequestException(
                $"Cinacoin API error: {(int)response.StatusCode} {response.ReasonPhrase}\n{body}");
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
        if (_disposed)
            return;

        _disposed = true;
        _httpClient.Dispose();
        await Task.CompletedTask.ConfigureAwait(false);
    }
}
