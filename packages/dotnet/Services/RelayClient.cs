using System.Net.Http.Headers;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Cinacoin.Models;
using Microsoft.Extensions.Logging;

namespace Cinacoin.Services;

/// <summary>
/// Relay client for managing wallet connection sessions via the Cinacoin relay server.
/// Handles WebSocket connections, session pairing, and message relay.
/// </summary>
public sealed class RelayClient : IAsyncDisposable
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<RelayClient>? _logger;
    private readonly Uri _relayUrl;
    private ClientWebSocket? _webSocket;
    private readonly SemaphoreSlim _sendLock = new(1, 1);
    private bool _disposed;

    /// <summary>
    /// Creates a new RelayClient instance.
    /// </summary>
    /// <param name="relayUrl">Relay server URL (default: wss://relay.cinacoin.com).</param>
    /// <param name="logger">Optional logger instance.</param>
    public RelayClient(
        string relayUrl = "wss://relay.cinacoin.com",
        ILogger<RelayClient>? logger = null)
    {
        _relayUrl = new Uri(relayUrl);
        _logger = logger;
        _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
    }

    /// <summary>
    /// Whether the relay client has an active WebSocket connection.
    /// </summary>
    public bool IsConnected => _webSocket?.State == WebSocketState.Open;

    /// <summary>
    /// Establishes a WebSocket connection to the relay server.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task ConnectAsync(CancellationToken cancellationToken = default)
    {
        if (IsConnected)
            return;

        _webSocket?.Dispose();
        _webSocket = new ClientWebSocket();
        _logger?.LogDebug("Connecting to relay at {Url}", _relayUrl);

        await _webSocket.ConnectAsync(_relayUrl, cancellationToken).ConfigureAwait(false);
        _logger?.LogInformation("Connected to relay server.");
    }

    /// <summary>
    /// Disconnects from the relay server.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task DisconnectAsync(CancellationToken cancellationToken = default)
    {
        if (_webSocket is { State: WebSocketState.Open or WebSocketState.CloseReceived })
        {
            _logger?.LogDebug("Disconnecting from relay.");
            await _webSocket.CloseAsync(
                WebSocketCloseStatus.NormalClosure,
                "Client disconnecting",
                cancellationToken).ConfigureAwait(false);
            _logger?.LogInformation("Disconnected from relay server.");
        }

        _webSocket?.Dispose();
        _webSocket = null;
    }

    /// <summary>
    /// Sends a JSON message to the relay server.
    /// </summary>
    /// <typeparam name="T">Type of the payload.</typeparam>
    /// <param name="topic">Message topic.</param>
    /// <param name="payload">Payload to send.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task SendMessageAsync<T>(
        string topic,
        T payload,
        CancellationToken cancellationToken = default)
    {
        if (_webSocket?.State != WebSocketState.Open)
            throw new InvalidOperationException("Relay client is not connected. Call ConnectAsync first.");

        var envelope = new RelayEnvelope<T>
        {
            Topic = topic,
            Payload = payload,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

        var json = JsonSerializer.Serialize(envelope, JsonSerializerOptions);
        var bytes = Encoding.UTF8.GetBytes(json);

        await _sendLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            await _webSocket.SendAsync(
                new ArraySegment<byte>(bytes),
                WebSocketMessageType.Text,
                endOfMessage: true,
                cancellationToken).ConfigureAwait(false);
            _logger?.LogDebug("Sent message to topic {Topic}", topic);
        }
        finally
        {
            _sendLock.Release();
        }
    }

    /// <summary>
    /// Receives a single message from the relay server.
    /// </summary>
    /// <typeparam name="T">Type of the expected payload.</typeparam>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The deserialized relay envelope.</returns>
    public async Task<RelayEnvelope<T>> ReceiveMessageAsync<T>(
        CancellationToken cancellationToken = default)
    {
        if (_webSocket?.State != WebSocketState.Open)
            throw new InvalidOperationException("Relay client is not connected. Call ConnectAsync first.");

        var buffer = new byte[65536];
        var result = await _webSocket.ReceiveAsync(
            new ArraySegment<byte>(buffer),
            cancellationToken).ConfigureAwait(false);

        if (result.MessageType == WebSocketMessageType.Close)
            throw new WebSocketException("Relay server closed the connection.");

        var json = Encoding.UTF8.GetString(buffer, 0, result.Count);
        var envelope = JsonSerializer.Deserialize<RelayEnvelope<T>>(json, JsonSerializerOptions)
            ?? throw new InvalidOperationException("Failed to deserialize relay message.");

        _logger?.LogDebug("Received message for topic {Topic}", envelope.Topic);
        return envelope;
    }

    /// <summary>
    /// Subscribes to a topic and starts listening for messages.
    /// </summary>
    /// <param name="topic">Topic to subscribe to.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task SubscribeAsync(string topic, CancellationToken cancellationToken = default)
    {
        var body = new { topic };
        var content = new StringContent(
            JsonSerializer.Serialize(body, JsonSerializerOptions),
            Encoding.UTF8,
            "application/json");

        var response = await _httpClient.PostAsync(
            new Uri(_relayUrl, "/subscribe"),
            content,
            cancellationToken).ConfigureAwait(false);

        response.EnsureSuccessStatusCode();
        _logger?.LogDebug("Subscribed to topic {Topic}", topic);
    }

    /// <summary>
    /// Unsubscribes from a topic.
    /// </summary>
    /// <param name="topic">Topic to unsubscribe from.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task UnsubscribeAsync(string topic, CancellationToken cancellationToken = default)
    {
        var body = new { topic };
        var content = new StringContent(
            JsonSerializer.Serialize(body, JsonSerializerOptions),
            Encoding.UTF8,
            "application/json");

        var response = await _httpClient.PostAsync(
            new Uri(_relayUrl, "/unsubscribe"),
            content,
            cancellationToken).ConfigureAwait(false);

        response.EnsureSuccessStatusCode();
        _logger?.LogDebug("Unsubscribed from topic {Topic}", topic);
    }

    /// <inheritdoc />
    public async ValueTask DisposeAsync()
    {
        if (_disposed)
            return;

        _disposed = true;
        await DisconnectAsync().ConfigureAwait(false);
        _httpClient.Dispose();
        _sendLock.Dispose();
    }

    private static readonly JsonSerializerOptions JsonSerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };
}

/// <summary>
/// Envelope for relay messages.
/// </summary>
/// <typeparam name="T">Payload type.</typeparam>
public record RelayEnvelope<T>
{
    /// <summary>Topic the message was sent to.</summary>
    public required string Topic { get; init; }

    /// <summary>Message payload.</summary>
    public required T Payload { get; init; }

    /// <summary>Timestamp in Unix milliseconds.</summary>
    public required long Timestamp { get; init; }
}
