using Cinacoin.Models;

namespace Cinacoin.Services;

/// <summary>
/// Service for high-level wallet operations.
/// Wraps <see cref="CinacoinClient"/> with convenience methods for common
/// wallet interactions including balance queries, network enumeration,
/// transaction building, and connection management.
/// </summary>
public sealed class WalletService : IAsyncDisposable
{
    private readonly CinacoinClient _client;
    private bool _disposed;

    /// <summary>
    /// Creates a new WalletService instance.
    /// </summary>
    /// <param name="client">The Cinacoin client to use.</param>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="client"/> is null.</exception>
    public WalletService(CinacoinClient client)
    {
        _client = client ?? throw new ArgumentNullException(nameof(client));
    }

    /// <summary>
    /// Gets the native token balance for a specific address.
    /// </summary>
    /// <param name="address">Wallet address.</param>
    /// <param name="chainId">Chain ID (default: "1" for Ethereum mainnet).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The balance as a decimal.</returns>
    public async Task<decimal> GetTokenBalanceAsync(
        string address,
        string chainId = "1",
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        return await _client.GetBalanceAsync(address, chainId, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Gets available networks.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Array of available networks.</returns>
    public async Task<Network[]> GetNetworksAsync(CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        var networks = await _client.GetNetworksAsync(cancellationToken).ConfigureAwait(false);
        return networks.ToArray();
    }

    /// <summary>
    /// Gets account information for a connected wallet.
    /// </summary>
    /// <param name="walletId">Wallet connector ID (e.g., "metamask", "walletconnect").</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Account information.</returns>
    public async Task<Account> GetAccountAsync(
        string walletId,
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        return await _client.GetAccountAsync(walletId, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Creates a new wallet session and returns pairing data.
    /// </summary>
    /// <param name="walletId">Wallet connector ID.</param>
    /// <param name="ns">Chain namespace (e.g., "eip155").</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Session result with pairing URI.</returns>
    public async Task<SessionResult> CreateSessionAsync(
        string walletId,
        string ns,
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        return await _client.CreateSessionAsync(walletId, ns, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Connects to a wallet using the specified connection parameters.
    /// </summary>
    /// <param name="parameters">Connection parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Connection result with session details.</returns>
    public async Task<ConnectionResult> ConnectAsync(
        ConnectParams parameters,
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        return await _client.ConnectAsync(parameters, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Disconnects the current wallet session.
    /// </summary>
    /// <param name="sessionId">Session ID to disconnect.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task DisconnectAsync(
        string sessionId,
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        await _client.DisconnectAsync(sessionId, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Sends a transaction for signing by the connected wallet.
    /// </summary>
    /// <param name="request">Transaction request details.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The signed transaction.</returns>
    public async Task<Transaction> SendTransactionAsync(
        TransactionRequest request,
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        return await _client.SendTransactionAsync(request, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Signs a message using the connected wallet.
    /// </summary>
    /// <param name="address">Address of the signer.</param>
    /// <param name="message">Message to sign.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The hex-encoded signature.</returns>
    public async Task<string> SignMessageAsync(
        string address,
        string message,
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        return await _client.SignMessageAsync(address, message, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Signs a typed data message (EIP-712) using the connected wallet.
    /// </summary>
    /// <param name="address">Address of the signer.</param>
    /// <param name="typedData">JSON-encoded EIP-712 typed data.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The hex-encoded signature.</returns>
    public async Task<string> SignTypedDataAsync(
        string address,
        string typedData,
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        return await _client.SignTypedDataAsync(address, typedData, cancellationToken).ConfigureAwait(false);
    }

    private void ThrowIfDisposed()
    {
        if (_disposed)
            throw new ObjectDisposedException(nameof(WalletService));
    }

    /// <inheritdoc />
    public async ValueTask DisposeAsync()
    {
        if (_disposed)
            return;

        _disposed = true;
        await _client.DisposeAsync().ConfigureAwait(false);
    }
}
