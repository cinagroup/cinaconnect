using System.Text.Json.Serialization;

namespace Cinacoin.Models;

/// <summary>
/// Connection parameters for establishing a wallet connection.
/// Maps to <c>ConnectParams</c> in the core SDK.
/// </summary>
public record ConnectParams
{
    /// <summary>
    /// Optional topic for an existing session.
    /// </summary>
    [JsonPropertyName("topic")]
    public string? Topic { get; init; }

    /// <summary>
    /// Optional relay URL override.
    /// </summary>
    [JsonPropertyName("relayUrl")]
    public string? RelayUrl { get; init; }

    /// <summary>
    /// Optional pairing URI (WalletConnect format).
    /// </summary>
    [JsonPropertyName("uri")]
    public string? Uri { get; init; }

    /// <summary>
    /// Chain IDs the dApp supports.
    /// </summary>
    [JsonPropertyName("chains")]
    public IReadOnlyList<int>? Chains { get; init; }

    /// <summary>
    /// Optional metadata about the dApp.
    /// </summary>
    [JsonPropertyName("metadata")]
    public AppMetadata? Metadata { get; init; }
}
