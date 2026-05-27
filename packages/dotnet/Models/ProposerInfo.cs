using System.Text.Json.Serialization;

namespace Cinacoin.Models;

/// <summary>
/// Proposer metadata within a session proposal.
/// </summary>
public record ProposerInfo
{
    /// <summary>
    /// Proposer's public key.
    /// </summary>
    [JsonPropertyName("publicKey")]
    public required string PublicKey { get; init; }

    /// <summary>
    /// Proposer's application metadata.
    /// </summary>
    [JsonPropertyName("metadata")]
    public required AppMetadata Metadata { get; init; }
}
