using System.Text.Json.Serialization;

namespace Cinacoin.Models;

/// <summary>
/// Native currency metadata for a chain.
/// </summary>
public record NativeCurrency
{
    /// <summary>Currency name (e.g., "Ether").</summary>
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    /// <summary>Currency symbol (e.g., "ETH").</summary>
    [JsonPropertyName("symbol")]
    public required string Symbol { get; init; }

    /// <summary>Number of decimal places.</summary>
    [JsonPropertyName("decimals")]
    public required int Decimals { get; init; }
}
