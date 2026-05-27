using System.Text.Json.Serialization;

namespace Cinacoin.Models;

/// <summary>
/// Represents a blockchain account.
/// Matches <c>Cinacoin.Models.Account</c> in the TypeScript type definitions.
/// </summary>
public record Account
{
    /// <summary>
    /// The wallet address.
    /// </summary>
    [JsonPropertyName("address")]
    public required string Address { get; init; }

    /// <summary>
    /// The chain ID.
    /// </summary>
    [JsonPropertyName("chainId")]
    public required string ChainId { get; init; }

    /// <summary>
    /// The account balance (as a string to preserve precision).
    /// </summary>
    [JsonPropertyName("balance")]
    public required string Balance { get; init; }

    /// <summary>
    /// Human-readable label for the account.
    /// </summary>
    [JsonPropertyName("label")]
    public required string Label { get; init; }
}
