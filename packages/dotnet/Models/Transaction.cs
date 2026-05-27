using System.Text.Json.Serialization;

namespace Cinacoin.Models;

/// <summary>
/// Represents a blockchain transaction.
/// Matches <c>Cinacoin.Models.Transaction</c> in the TypeScript type definitions.
/// </summary>
public record Transaction
{
    /// <summary>
    /// Transaction hash.
    /// </summary>
    [JsonPropertyName("hash")]
    public required string Hash { get; init; }

    /// <summary>
    /// Sender address.
    /// </summary>
    [JsonPropertyName("from")]
    public required string From { get; init; }

    /// <summary>
    /// Recipient address.
    /// </summary>
    [JsonPropertyName("to")]
    public required string To { get; init; }

    /// <summary>
    /// Transaction value (as a string to preserve precision).
    /// </summary>
    [JsonPropertyName("value")]
    public required string Value { get; init; }

    /// <summary>
    /// Gas limit (as a string, typically hex).
    /// </summary>
    [JsonPropertyName("gasLimit")]
    public required string GasLimit { get; init; }

    /// <summary>
    /// Gas price (as a string, typically hex).
    /// </summary>
    [JsonPropertyName("gasPrice")]
    public required string GasPrice { get; init; }

    /// <summary>
    /// Transaction data payload (hex string).
    /// </summary>
    [JsonPropertyName("data")]
    public required string Data { get; init; }

    /// <summary>
    /// Chain ID.
    /// </summary>
    [JsonPropertyName("chainId")]
    public required string ChainId { get; init; }

    /// <summary>
    /// Transaction status code (0 = pending, 1 = confirmed, 2 = failed).
    /// </summary>
    [JsonPropertyName("status")]
    public required int Status { get; init; }

    /// <summary>
    /// Block number where this transaction was included.
    /// </summary>
    [JsonPropertyName("blockNumber")]
    public required long BlockNumber { get; init; }

    /// <summary>
    /// Unix timestamp (seconds) when the transaction was mined.
    /// </summary>
    [JsonPropertyName("timestamp")]
    public required long Timestamp { get; init; }
}
