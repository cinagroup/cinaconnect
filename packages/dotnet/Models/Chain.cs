using System.Text.Json.Serialization;

namespace Cinacoin.Models;

/// <summary>
/// Full chain definition with metadata.
/// Maps to <c>Chain</c> in the core SDK.
/// </summary>
public record Chain
{
    /// <summary>
    /// Unique chain ID.
    /// </summary>
    [JsonPropertyName("id")]
    public required string Id { get; init; }

    /// <summary>
    /// Human-readable chain name.
    /// </summary>
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    /// <summary>
    /// RPC endpoint URL.
    /// </summary>
    [JsonPropertyName("rpcUrl")]
    public required string RpcUrl { get; init; }

    /// <summary>
    /// Native currency information.
    /// </summary>
    [JsonPropertyName("nativeCurrency")]
    public NativeCurrency? NativeCurrency { get; init; }

    /// <summary>
    /// Block explorer URL.
    /// </summary>
    [JsonPropertyName("explorerUrl")]
    public string? ExplorerUrl { get; init; }

    /// <summary>
    /// Chain icon URL.
    /// </summary>
    [JsonPropertyName("iconUrl")]
    public string? IconUrl { get; init; }
}
