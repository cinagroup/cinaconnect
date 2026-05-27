using System.Text.Json.Serialization;

namespace Cinacoin.Models;

/// <summary>
/// Represents a blockchain network.
/// Matches <c>Cinacoin.Models.Network</c> in the TypeScript type definitions.
/// </summary>
public record Network
{
    /// <summary>
    /// Unique network identifier.
    /// </summary>
    [JsonPropertyName("id")]
    public required string Id { get; init; }

    /// <summary>
    /// Human-readable network name.
    /// </summary>
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    /// <summary>
    /// Chain ID number.
    /// </summary>
    [JsonPropertyName("chainId")]
    public required int ChainId { get; init; }

    /// <summary>
    /// RPC endpoint URL.
    /// </summary>
    [JsonPropertyName("rpcUrl")]
    public required string RpcUrl { get; init; }

    /// <summary>
    /// Native currency symbol.
    /// </summary>
    [JsonPropertyName("currency")]
    public required string Currency { get; init; }

    /// <summary>
    /// Block explorer URL.
    /// </summary>
    [JsonPropertyName("explorerUrl")]
    public required string ExplorerUrl { get; init; }

    /// <summary>
    /// Whether this is a testnet.
    /// </summary>
    [JsonPropertyName("isTestnet")]
    public required bool IsTestnet { get; init; }
}
