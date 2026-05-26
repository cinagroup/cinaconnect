using System.Text.Json.Serialization;

namespace CinaConnect.Models;

/// <summary>
/// Result of a wallet session creation.
/// Matches <c>CinaConnect.SessionResult</c> in the TypeScript type definitions.
/// </summary>
public record SessionResult
{
    /// <summary>
    /// Session identifier.
    /// </summary>
    [JsonPropertyName("sessionId")]
    public required string SessionId { get; init; }

    /// <summary>
    /// WalletConnect URI for pairing.
    /// </summary>
    [JsonPropertyName("uri")]
    public required string Uri { get; init; }
}
