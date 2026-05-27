using System.Text.Json.Serialization;

namespace Cinacoin.Models;

/// <summary>
/// Relayer protocol specification for session proposals.
/// </summary>
public record RelayInfo
{
    /// <summary>
    /// Protocol name (e.g., "irn").
    /// </summary>
    [JsonPropertyName("protocol")]
    public required string Protocol { get; init; }

    /// <summary>
    /// Protocol-specific data.
    /// </summary>
    [JsonPropertyName("data")]
    public string? Data { get; init; }
}
