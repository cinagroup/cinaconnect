using System.Text.Json.Serialization;

namespace Cinacoin.Models;

/// <summary>
/// Application metadata for wallet pairing.
/// Maps to <c>AppMetadata</c> in the core SDK.
/// </summary>
public record AppMetadata
{
    /// <summary>
    /// Application name.
    /// </summary>
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    /// <summary>
    /// Application description.
    /// </summary>
    [JsonPropertyName("description")]
    public required string Description { get; init; }

    /// <summary>
    /// Application URL.
    /// </summary>
    [JsonPropertyName("url")]
    public required string Url { get; init; }

    /// <summary>
    /// Icon URLs for the application.
    /// </summary>
    [JsonPropertyName("icons")]
    public required IReadOnlyList<string> Icons { get; init; }
}
