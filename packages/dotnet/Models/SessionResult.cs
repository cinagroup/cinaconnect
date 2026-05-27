using System.Text.Json.Serialization;

namespace Cinacoin.Models;

/// <summary>
/// Result of a wallet session creation.
/// Matches <c>Cinacoin.SessionResult</c> in the TypeScript type definitions.
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
