using System.Text.Json.Serialization;

namespace Cinacoin.Models;

/// <summary>
/// Chain reference in CAIP-2 format (namespace:reference).
/// Maps to <c>ChainReference</c> in the core SDK.
/// </summary>
public record ChainReference
{
    /// <summary>
    /// Chain namespace (e.g., 'eip155').
    /// </summary>
    [JsonPropertyName("namespace")]
    public required ChainNamespace Namespace { get; init; }

    /// <summary>
    /// Chain reference (e.g., '1' for Ethereum mainnet).
    /// </summary>
    [JsonPropertyName("reference")]
    public required string Reference { get; init; }
}
