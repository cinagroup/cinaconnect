using System.Text.Json.Serialization;

namespace Cinacoin.Models;

/// <summary>
/// Transaction request to be signed by a connected wallet.
/// Maps to <c>TransactionRequest</c> in the core SDK.
/// </summary>
public record TransactionRequest
{
    /// <summary>
    /// From address.
    /// </summary>
    [JsonPropertyName("from")]
    public required string From { get; init; }

    /// <summary>
    /// To address.
    /// </summary>
    [JsonPropertyName("to")]
    public required string To { get; init; }

    /// <summary>
    /// Value in wei (hex string).
    /// </summary>
    [JsonPropertyName("value")]
    public string? Value { get; init; }

    /// <summary>
    /// Data payload (hex string).
    /// </summary>
    [JsonPropertyName("data")]
    public string? Data { get; init; }

    /// <summary>
    /// Gas limit (hex string).
    /// </summary>
    [JsonPropertyName("gas")]
    public string? Gas { get; init; }

    /// <summary>
    /// Gas price (hex string).
    /// </summary>
    [JsonPropertyName("gasPrice")]
    public string? GasPrice { get; init; }

    /// <summary>
    /// Max fee per gas (EIP-1559, hex string).
    /// </summary>
    [JsonPropertyName("maxFeePerGas")]
    public string? MaxFeePerGas { get; init; }

    /// <summary>
    /// Max priority fee per gas (EIP-1559, hex string).
    /// </summary>
    [JsonPropertyName("maxPriorityFeePerGas")]
    public string? MaxPriorityFeePerGas { get; init; }

    /// <summary>
    /// Nonce (hex string).
    /// </summary>
    [JsonPropertyName("nonce")]
    public string? Nonce { get; init; }

    /// <summary>
    /// Chain ID.
    /// </summary>
    [JsonPropertyName("chainId")]
    public int? ChainId { get; init; }
}
