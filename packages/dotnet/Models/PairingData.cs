using System.Text.Json.Serialization;

namespace Cinacoin.Models;

/// <summary>
/// Pairing data structure for wallet connection.
/// Maps to <c>PairingData</c> in the core SDK.
/// </summary>
public record PairingData
{
    /// <summary>
    /// Pairing topic.
    /// </summary>
    [JsonPropertyName("topic")]
    public required string Topic { get; init; }

    /// <summary>
    /// Pairing URI (WalletConnect format).
    /// </summary>
    [JsonPropertyName("uri")]
    public required string Uri { get; init; }

    /// <summary>
    /// Peer metadata, if available.
    /// </summary>
    [JsonPropertyName("peerMetadata")]
    public AppMetadata? PeerMetadata { get; init; }

    /// <summary>
    /// Whether the pairing is active.
    /// </summary>
    [JsonPropertyName("active")]
    public required bool Active { get; init; }

    /// <summary>
    /// Expiration timestamp in milliseconds since Unix epoch.
    /// </summary>
    [JsonPropertyName("expiry")]
    public required long Expiry { get; init; }
}
