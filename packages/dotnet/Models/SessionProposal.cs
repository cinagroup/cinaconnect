using System.Text.Json.Serialization;

namespace Cinacoin.Models;

/// <summary>
/// Session proposal data from a wallet connection attempt.
/// Maps to <c>SessionProposal</c> in the core SDK.
/// </summary>
public record SessionProposal
{
    /// <summary>
    /// Unique proposal ID.
    /// </summary>
    [JsonPropertyName("id")]
    public required long Id { get; init; }

    /// <summary>
    /// Required namespaces (CAIP-2 keyed).
    /// </summary>
    [JsonPropertyName("requiredNamespaces")]
    public required IReadOnlyDictionary<string, RequiredNamespace> RequiredNamespaces { get; init; }

    /// <summary>
    /// Optional namespaces (CAIP-2 keyed).
    /// </summary>
    [JsonPropertyName("optionalNamespaces")]
    public IReadOnlyDictionary<string, RequiredNamespace>? OptionalNamespaces { get; init; }

    /// <summary>
    /// Relayer protocols.
    /// </summary>
    [JsonPropertyName("relays")]
    public required IReadOnlyList<RelayInfo> Relays { get; init; }

    /// <summary>
    /// Proposer's public key and metadata.
    /// </summary>
    [JsonPropertyName("proposer")]
    public required ProposerInfo Proposer { get; init; }
}
