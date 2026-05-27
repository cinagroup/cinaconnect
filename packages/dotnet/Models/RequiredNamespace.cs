using System.Text.Json.Serialization;

namespace Cinacoin.Models;

/// <summary>
/// Required namespace specification for session proposals.
/// Maps to <c>RequiredNamespace</c> in the core SDK.
/// </summary>
public record RequiredNamespace
{
    /// <summary>
    /// Required chains in CAIP-2 format.
    /// </summary>
    [JsonPropertyName("chains")]
    public required IReadOnlyList<string> Chains { get; init; }

    /// <summary>
    /// Required JSON-RPC methods.
    /// </summary>
    [JsonPropertyName("methods")]
    public required IReadOnlyList<string> Methods { get; init; }

    /// <summary>
    /// Required event types.
    /// </summary>
    [JsonPropertyName("events")]
    public required IReadOnlyList<string> Events { get; init; }
}
