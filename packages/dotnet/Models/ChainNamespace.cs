namespace Cinacoin.Models;

/// <summary>
/// Supported blockchain network namespaces (CAIP-2 format).
/// Maps to <c>ChainNamespace</c> in the core SDK.
/// </summary>
public enum ChainNamespace
{
    /// <summary>Ethereum Virtual Chain (EIP-155 compatible chains).</summary>
    Eip155,

    /// <summary>Solana blockchain.</summary>
    Solana,

    /// <summary>Bitcoin (BIP-121).</summary>
    Bip121,

    /// <summary>Bitcoin (BIP-122).</summary>
    Bip122,

    /// <summary>TRON blockchain.</summary>
    Tron,

    /// <summary>TON blockchain.</summary>
    Ton,

    /// <summary>Polkadot blockchain.</summary>
    Polkadot,
}
