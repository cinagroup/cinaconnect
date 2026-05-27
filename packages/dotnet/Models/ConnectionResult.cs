using System.Text.Json.Serialization;

namespace Cinacoin.Models;

/// <summary>
/// Result of a successful wallet connection.
/// Maps to <c>ConnectionResult</c> in the core SDK.
/// </summary>
public record ConnectionResult
{
    /// <summary>
    /// Session ID for the established connection.
    /// </summary>
    [JsonPropertyName("sessionId")]
    public required string SessionId { get; init; }

    /// <summary>
    /// Connected account addresses.
    /// </summary>
    [JsonPropertyName("accounts")]
    public required IReadOnlyList<string> Accounts { get; init; }

    /// <summary>
    /// Connected chain ID.
    /// </summary>
    [JsonPropertyName("chainId")]
    public required int ChainId { get; init; }

    /// <summary>
    /// Connector identifier that was used.
    /// </summary>
    [JsonPropertyName("connectorId")]
    public required string ConnectorId { get; init; }
}
