using System.Security.Cryptography;
using System.Text;
using Org.BouncyCastle.Crypto.Digests;

namespace Cinacoin.Services;

/// <summary>
/// Utility class for cryptographic operations used in wallet interactions.
/// Provides hashing, signature encoding, and address derivation helpers.
/// </summary>
/// <remarks>
/// Uses <c>BouncyCastle.Cryptography</c> for real Keccak-256 (SHA-3) hashing,
/// which is required by EVM chains for address derivation and message signing.
/// </remarks>
public static class CryptoUtils
{
    /// <summary>
    /// Computes a Keccak-256 hash of the input data using BouncyCastle.
    /// </summary>
    /// <remarks>
    /// Keccak-256 is NOT the same as SHA-256 or NIST SHA-3-256. It differs in
    /// the padding scheme. This implementation uses the correct Keccak-256
    /// (used by Ethereum and all EVM chains).
    /// </remarks>
    /// <param name="data">Input byte array.</param>
    /// <returns>32-byte Keccak-256 hash.</returns>
    public static byte[] Keccak256(byte[] data)
    {
        var digest = new KeccakDigest(256);
        digest.BlockUpdate(data, 0, data.Length);
        var result = new byte[digest.GetDigestSize()];
        digest.DoFinal(result, 0);
        return result;
    }

    /// <summary>
    /// Computes a Keccak-256 hash of a UTF-8 string.
    /// </summary>
    /// <param name="input">Input string.</param>
    /// <returns>32-byte Keccak-256 hash.</returns>
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
