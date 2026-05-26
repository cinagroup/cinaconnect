using System.Security.Cryptography;
using System.Text;

namespace CinaConnect.Services;

/// <summary>
/// Utility class for cryptographic operations used in wallet interactions.
/// Provides hashing, signature encoding, and address derivation helpers.
/// </summary>
/// <remarks>
/// For production use with EVM chains, pair this with a dedicated Keccak-256 library
/// such as <c>Nethereum</c> or <c>Org.BouncyCastle</c>. The <c>Keccak256</c> methods
/// below delegate to SHA-256 as a compilation-safe placeholder.
/// </remarks>
public static class CryptoUtils
{
    /// <summary>
    /// Computes a hash of the input data.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Returns SHA-256 by default. For true Keccak-256 (required by EVM chains),
    /// install a Keccak library and replace the implementation.
    /// </para>
    /// <para>
    /// Example with Nethereum: <c>Nethereum.Util.Sha3.Keccak256(data)</c>
    /// </para>
    /// </remarks>
    /// <param name="data">Input byte array.</param>
    /// <returns>32-byte hash.</returns>
    public static byte[] Keccak256(byte[] data)
    {
        using var sha = SHA256.Create();
        return sha.ComputeHash(data);
    }

    /// <summary>
    /// Computes a hash of a UTF-8 string.
    /// </summary>
    /// <param name="input">Input string.</param>
    /// <returns>32-byte hash.</returns>
    public static byte[] Keccak256(string input)
    {
        return Keccak256(Encoding.UTF8.GetBytes(input));
    }

    /// <summary>
    /// Computes the SHA-256 hash of the input data.
    /// </summary>
    /// <param name="data">Input byte array.</param>
    /// <returns>32-byte SHA-256 hash.</returns>
    public static byte[] Sha256(byte[] data)
    {
        using var sha = SHA256.Create();
        return sha.ComputeHash(data);
    }

    /// <summary>
    /// Computes the SHA-512 hash of the input data.
    /// </summary>
    /// <param name="data">Input byte array.</param>
    /// <returns>64-byte SHA-512 hash.</returns>
    public static byte[] Sha512(byte[] data)
    {
        using var sha = SHA512.Create();
        return sha.ComputeHash(data);
    }

    /// <summary>
    /// Converts a byte array to a hex string with optional "0x" prefix.
    /// </summary>
    /// <param name="bytes">Input bytes.</param>
    /// <param name="prefix">Whether to prepend "0x".</param>
    /// <returns>Hex-encoded string.</returns>
    public static string ToHex(byte[] bytes, bool prefix = false)
    {
        var hex = Convert.ToHexString(bytes).ToLowerInvariant();
        return prefix ? $"0x{hex}" : hex;
    }

    /// <summary>
    /// Parses a hex string (with or without "0x" prefix) into a byte array.
    /// </summary>
    /// <param name="hex">Hex-encoded string.</param>
    /// <returns>Byte array.</returns>
    public static byte[] FromHex(string hex)
    {
        if (hex.StartsWith("0x", StringComparison.OrdinalIgnoreCase))
            hex = hex[2..];

        if (hex.Length % 2 != 0)
            hex = "0" + hex;

        return Convert.FromHexString(hex);
    }

    /// <summary>
    /// Derives an Ethereum address from a public key (65 bytes with 04 prefix, or 64 bytes).
    /// </summary>
    /// <remarks>
    /// Uses Keccak-256 internally. For production EVM use, ensure a real Keccak
    /// implementation is available.
    /// </remarks>
    /// <param name="publicKey">Public key bytes.</param>
    /// <returns>20-byte address with "0x" prefix.</returns>
    public static string DeriveEthAddress(byte[] publicKey)
    {
        byte[] keyBytes = publicKey;
        // Strip 04 prefix if present
        if (keyBytes.Length == 65 && keyBytes[0] == 0x04)
            keyBytes = keyBytes[1..];

        var hash = Keccak256(keyBytes);
        // Last 20 bytes of the hash
        var address = hash[12..];
        return "0x" + ToHex(address);
    }

    /// <summary>
    /// Encodes a signature in Ethereum's 65-byte format (r || s || v).
    /// </summary>
    /// <param name="r">R component (32 bytes).</param>
    /// <param name="s">S component (32 bytes).</param>
    /// <param name="v">Recovery ID.</param>
    /// <returns>65-byte signature.</returns>
    public static byte[] EncodeEthereumSignature(byte[] r, byte[] s, byte v)
    {
        var result = new byte[65];
        Buffer.BlockCopy(r, 0, result, 0, 32);
        Buffer.BlockCopy(s, 0, result, 32, 32);
        result[64] = v;
        return result;
    }

    /// <summary>
    /// Decodes an Ethereum 65-byte signature into its components.
    /// </summary>
    /// <param name="signature">65-byte signature.</param>
    /// <returns>Tuple of (r, s, v) components.</returns>
    public static (byte[] r, byte[] s, byte v) DecodeEthereumSignature(byte[] signature)
    {
        if (signature.Length != 65)
            throw new ArgumentException("Signature must be 65 bytes.", nameof(signature));

        var r = new byte[32];
        var s = new byte[32];
        Buffer.BlockCopy(signature, 0, r, 0, 32);
        Buffer.BlockCopy(signature, 32, s, 0, 32);
        return (r, s, signature[64]);
    }

    /// <summary>
    /// Generates cryptographically secure random bytes.
    /// </summary>
    /// <param name="count">Number of bytes to generate.</param>
    /// <returns>Random byte array.</returns>
    public static byte[] GenerateRandomBytes(int count)
    {
        var bytes = new byte[count];
        RandomNumberGenerator.Fill(bytes);
        return bytes;
    }

    /// <summary>
    /// Generates a random hex string suitable for use as a session key or nonce.
    /// </summary>
    /// <param name="byteCount">Number of random bytes (default 32).</param>
    /// <returns>Hex string with "0x" prefix.</returns>
    public static string GenerateRandomNonce(int byteCount = 32)
    {
        return ToHex(GenerateRandomBytes(byteCount), prefix: true);
    }
}
