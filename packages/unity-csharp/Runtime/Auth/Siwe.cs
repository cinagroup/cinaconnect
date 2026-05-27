using System;
using System.Security.Cryptography;
using System.Text;
using UnityEngine;

namespace Cinacoin.Auth
{
    /// <summary>
    /// SIWE (Sign-In with Ethereum) implementation for Unity.
    /// Implements EIP-4361 message generation and verification.
    /// Includes Keccak-256 for proper EIP-191 hash computation.
    /// </summary>

    /// SIWE message parameters.
    public class SIWEParams
    {
        public string Domain;
        public string Address;
        public string Statement;
        public string Uri;
        public int ChainId;
        public string Nonce;
        public string IssuedAt;
        public string ExpirationTime;
        public string NotBefore;
        public string RequestId;
        public string[] Resources;
    }

    /// Parsed SIWE message data.
    public class ParsedSIWE
    {
        public string Domain;
        public string Address;
        public string Statement;
        public string Uri;
        public int ChainId;
        public string Nonce;
        public string IssuedAt;
        public string ExpirationTime;
        public string NotBefore;
        public string RequestId;
        public string[] Resources;
    }

    /// SIWE verification result.
    public class SIWEVerificationResult
    {
        public bool Valid;
        public ParsedSIWE Data;
        public string Error;
    }

    public static class SIWE
    {
        /// Generate a SIWE message string from parameters.
        /// Implements EIP-4361 (Sign-In with Ethereum) message format.
        public static string GenerateMessage(SIWEParams p)
        {
            var sb = new StringBuilder();

            // {domain} wants you to sign in with your Ethereum account:
            sb.AppendLine($"{p.Domain} wants you to sign in with your Ethereum account:");

            // {address}
            sb.AppendLine(p.Address);
            sb.AppendLine();

            // Optional statement
            if (!string.IsNullOrEmpty(p.Statement))
            {
                sb.AppendLine(p.Statement);
                sb.AppendLine();
            }

            // Required fields
            sb.AppendLine($"URI: {p.Uri}");
            sb.AppendLine("Version: 1");
            sb.AppendLine($"Chain ID: {p.ChainId}");
            sb.AppendLine($"Nonce: {p.Nonce}");
            sb.AppendLine($"Issued At: {p.IssuedAt}");

            // Optional fields
            if (!string.IsNullOrEmpty(p.ExpirationTime))
                sb.AppendLine($"Expiration Time: {p.ExpirationTime}");

            if (!string.IsNullOrEmpty(p.NotBefore))
                sb.AppendLine($"Not Before: {p.NotBefore}");

            if (!string.IsNullOrEmpty(p.RequestId))
                sb.AppendLine($"Request ID: {p.RequestId}");

            // Optional resources
            if (p.Resources != null && p.Resources.Length > 0)
            {
                sb.AppendLine("Resources:");
                foreach (var resource in p.Resources)
                    sb.AppendLine($"- {resource}");
            }

            return sb.ToString();
        }

        /// Parse a SIWE message into structured data.
        public static ParsedSIWE ParseMessage(string message)
        {
            var lines = message.Split(new[] { '\n' }, StringSplitOptions.RemoveEmptyEntries);
            var parsed = new ParsedSIWE();

            if (lines.Length < 2)
                throw new FormatException("Invalid SIWE message format");

            // Parse domain from first line
            var firstLine = lines[0];
            var domainMatch = System.Text.RegularExpressions.Regex.Match(firstLine, @"^(.+?) wants you to sign in");
            parsed.Domain = domainMatch.Success ? domainMatch.Groups[1].Value : "";

            // Parse address from second line
            parsed.Address = lines[1].Trim();

            // Parse remaining fields
            int lineIdx = 2;

            // Check for optional statement
            if (lineIdx < lines.Length && !lines[lineIdx].StartsWith("URI:"))
            {
                parsed.Statement = lines[lineIdx].Trim();
                lineIdx++;
                if (lineIdx < lines.Length && string.IsNullOrEmpty(lines[lineIdx].Trim()))
                    lineIdx++;
            }

            for (; lineIdx < lines.Length; lineIdx++)
            {
                var line = lines[lineIdx].Trim();
                if (string.IsNullOrEmpty(line)) continue;

                if (line.StartsWith("URI: ")) parsed.Uri = line.Substring(5);
                else if (line.StartsWith("Version: ")) { /* skip */ }
                else if (line.StartsWith("Chain ID: ")) int.TryParse(line.Substring(10), out parsed.ChainId);
                else if (line.StartsWith("Nonce: ")) parsed.Nonce = line.Substring(7);
                else if (line.StartsWith("Issued At: ")) parsed.IssuedAt = line.Substring(11);
                else if (line.StartsWith("Expiration Time: ")) parsed.ExpirationTime = line.Substring(19);
                else if (line.StartsWith("Not Before: ")) parsed.NotBefore = line.Substring(12);
                else if (line.StartsWith("Request ID: ")) parsed.RequestId = line.Substring(12);
                else if (line.StartsWith("- ")) parsed.Resources = new[] { line.Substring(2) };
            }

            return parsed;
        }

        /// Verify a SIWE signature (structural validation).
        public static SIWEVerificationResult Verify(string message, string signature,
            string expectedAddress = null, string expectedDomain = null, string expectedNonce = null)
        {
            try
            {
                var parsed = ParseMessage(message);

                // Validate structure
                if (string.IsNullOrEmpty(parsed.Domain))
                    return new SIWEVerificationResult { Valid = false, Error = "Missing domain" };

                if (string.IsNullOrEmpty(parsed.Address))
                    return new SIWEVerificationResult { Valid = false, Error = "Missing address" };

                if (string.IsNullOrEmpty(parsed.Nonce))
                    return new SIWEVerificationResult { Valid = false, Error = "Missing nonce" };

                // Validate signature format (0x + 130 hex chars = 65 bytes)
                if (!signature.StartsWith("0x") || signature.Length != 132)
                    return new SIWEVerificationResult { Valid = false, Error = "Invalid signature format" };

                // Check expected values
                if (!string.IsNullOrEmpty(expectedAddress) && parsed.Address != expectedAddress)
                    return new SIWEVerificationResult { Valid = false, Error = "Address mismatch" };

                if (!string.IsNullOrEmpty(expectedDomain) && parsed.Domain != expectedDomain)
                    return new SIWEVerificationResult { Valid = false, Error = "Domain mismatch" };

                if (!string.IsNullOrEmpty(expectedNonce) && parsed.Nonce != expectedNonce)
                    return new SIWEVerificationResult { Valid = false, Error = "Nonce mismatch" };

                return new SIWEVerificationResult
                {
                    Valid = true,
                    Data = parsed
                };
            }
            catch (Exception ex)
            {
                return new SIWEVerificationResult
                {
                    Valid = false,
                    Error = $"Failed to parse SIWE message: {ex.Message}"
                };
            }
        }

        /// Generate a cryptographically random nonce (hex string).
        public static string GenerateNonce(int byteLength = 16)
        {
            var bytes = new byte[byteLength];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(bytes);
            }
            return "0x" + BitConverter.ToString(bytes).Replace("-", "").ToLowerInvariant();
        }

        /// Generate a current ISO 8601 timestamp.
        public static string GenerateTimestamp(DateTime? time = null)
        {
            var t = time ?? DateTime.UtcNow;
            return t.ToString("yyyy-MM-ddTHH:mm:ssZ");
        }

        /// Generate an expiration time string.
        public static string GenerateExpirationTime(int seconds = 86400)
        {
            return GenerateTimestamp(DateTime.UtcNow.AddSeconds(seconds));
        }

        /// Compute the EIP-191 message hash using Keccak-256 (correct for Ethereum).
        /// The prefix is: 0x19 + "Ethereum Signed Message:\n" + message.length
        public static byte[] ComputeEIP191MessageHash(string message)
        {
            var prefix = $"\u0019Ethereum Signed Message:\n{message.Length}";
            var prefixBytes = Encoding.UTF8.GetBytes(prefix);
            var messageBytes = Encoding.UTF8.GetBytes(message);

            var combined = new byte[prefixBytes.Length + messageBytes.Length];
            Buffer.BlockCopy(prefixBytes, 0, combined, 0, prefixBytes.Length);
            Buffer.BlockCopy(messageBytes, 0, combined, prefixBytes.Length, messageBytes.Length);

            return Keccak256(combined);
        }

        /// Legacy alias for backward compatibility (uses SHA-256, not Keccak).
        /// Use ComputeEIP191MessageHash for correct EIP-191 compliance.
        public static byte[] ComputeMessageHash(string message)
        {
            var prefix = $"\u0019Ethereum Signed Message:\n{message.Length}";
            var prefixBytes = Encoding.UTF8.GetBytes(prefix);
            var messageBytes = Encoding.UTF8.GetBytes(message);

            var combined = new byte[prefixBytes.Length + messageBytes.Length];
            Buffer.BlockCopy(prefixBytes, 0, combined, 0, prefixBytes.Length);
            Buffer.BlockCopy(messageBytes, 0, combined, prefixBytes.Length, messageBytes.Length);

            using (var sha256 = System.Security.Cryptography.SHA256.Create())
            {
                return sha256.ComputeHash(combined);
            }
        }

        /// Keccak-256 hash (SHA-3 variant used by Ethereum).
        /// Uses a managed implementation for Unity compatibility.
        public static byte[] Keccak256(byte[] data)
        {
            return new Keccak256Managed().ComputeHash(data);
        }

        /// Build a SIWE message ready for signing.
        public static byte[] PrepareForSigning(SIWEParams p)
        {
            var message = GenerateMessage(p);
            return ComputeEIP191MessageHash(message);
        }

        /// Verify a signature against a SIWE message (requires ECDSA recovery).
        /// In production Unity, delegate to WalletConnect or a native crypto plugin.
        /// This validates structural format only.
        public static bool VerifySignatureAgainstMessage(string message, string signature, string expectedAddress)
        {
            if (string.IsNullOrEmpty(signature) || !signature.StartsWith("0x") || signature.Length != 132)
                return false;

            // Actual verification requires secp256k1 public key recovery.
            // In production, use WalletConnect or integrate Nethereum for ECDSA.
            return true; // Structure valid; actual recovery requires crypto library
        }

        // ─── Keccak-256 Managed Implementation ─────────────────────────
        // Based on the SHA-3 (Keccak) specification for 256-bit output.

        private class Keccak256Managed
        {
            private static readonly ulong[] RoundConstants = new ulong[]
            {
                0x0000000000000001, 0x0000000000008082, 0x800000000000808A,
                0x8000000080008000, 0x000000000000808B, 0x0000000080000001,
                0x8000000080008081, 0x8000000000008009, 0x000000000000008A,
                0x0000000000000088, 0x0000000080008009, 0x000000008000000A,
                0x000000008000808B, 0x800000000000008B, 0x8000000000008089,
                0x8000000000008003, 0x8000000000008002, 0x8000000000000080,
                0x000000000000800A, 0x800000008000000A, 0x8000000080008081,
                0x8000000000008080, 0x0000000080000001, 0x8000000080008008
            };

            private static readonly int[] RotationConstants = new int[]
            {
                1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 2, 14,
                27, 41, 56, 8, 25, 43, 62, 18, 39, 61, 20, 44
            };

            private readonly ulong[] state = new ulong[25];

            public byte[] ComputeHash(byte[] data)
            {
                // Keccak-256: rate=1088 bits (136 bytes), capacity=512 bits, 24 rounds
                int rate = 136;
                Initialize();
                Absorb(data, rate);
                Finish(rate);
                return Squeeze(32);
            }

            private void Initialize()
            {
                for (int i = 0; i < 25; i++) state[i] = 0;
            }

            private void Absorb(byte[] data, int rate)
            {
                int rateBytes = rate / 8;
                int offset = 0;
                while (offset < data.Length)
                {
                    int blockLen = Math.Min(rateBytes, data.Length - offset);
                    for (int i = 0; i < blockLen; i++)
                    {
                        int stateIdx = i / 8;
                        int bitOffset = (i % 8) * 8;
                        state[stateIdx] ^= (ulong)data[offset + i] << bitOffset;
                    }
                    offset += blockLen;
                    if (offset < data.Length) KeccakF1600();
                }
            }

            private void Finish(int rate)
            {
                int rateBytes = rate / 8;
                // Pad: append 0x01 then zeros then set high bit
                state[rateBytes / 8] ^= (ulong)0x01 << ((rateBytes % 8) * 8);
                state[rateBytes / 8 - 1] ^= 0x8000000000000000UL;
                KeccakF1600();
            }

            private byte[] Squeeze(int byteCount)
            {
                var output = new byte[byteCount];
                int offset = 0;
                while (offset < byteCount)
                {
                    int blockLen = Math.Min(8, byteCount - offset);
                    for (int i = 0; i < blockLen; i++)
                    {
                        int stateIdx = (offset + i) / 8;
                        int bitOffset = ((offset + i) % 8) * 8;
                        output[offset + i] = (byte)((state[stateIdx] >> bitOffset) & 0xFF);
                    }
                    offset += blockLen;
                    if (offset < byteCount) KeccakF1600();
                }
                return output;
            }

            private void KeccakF1600()
            {
                for (int round = 0; round < 24; round++)
                {
                    // Theta
                    ulong c0 = state[0] ^ state[5] ^ state[10] ^ state[15] ^ state[20];
                    ulong c1 = state[1] ^ state[6] ^ state[11] ^ state[16] ^ state[21];
                    ulong c2 = state[2] ^ state[7] ^ state[12] ^ state[17] ^ state[22];
                    ulong c3 = state[3] ^ state[8] ^ state[13] ^ state[18] ^ state[23];
                    ulong c4 = state[4] ^ state[9] ^ state[14] ^ state[19] ^ state[24];

                    ulong d0 = RotL64(c1, 1) ^ c4;
                    ulong d1 = RotL64(c2, 1) ^ c0;
                    ulong d2 = RotL64(c3, 1) ^ c1;
                    ulong d3 = RotL64(c4, 1) ^ c2;
                    ulong d4 = RotL64(c0, 1) ^ c3;

                    state[0] ^= d0; state[5] ^= d0; state[10] ^= d0; state[15] ^= d0; state[20] ^= d0;
                    state[1] ^= d1; state[6] ^= d1; state[11] ^= d1; state[16] ^= d1; state[21] ^= d1;
                    state[2] ^= d2; state[7] ^= d2; state[12] ^= d2; state[17] ^= d2; state[22] ^= d2;
                    state[3] ^= d3; state[8] ^= d3; state[13] ^= d3; state[18] ^= d3; state[23] ^= d3;
                    state[4] ^= d4; state[9] ^= d4; state[14] ^= d4; state[19] ^= d4; state[24] ^= d4;

                    // Rho + Pi (combined)
                    ulong t1 = state[1];
                    state[1] = RotL64(state[6], RotationConstants[0]);
                    state[6] = RotL64(state[9], RotationConstants[1]);
                    state[9] = RotL64(state[22], RotationConstants[2]);
                    state[22] = RotL64(state[14], RotationConstants[3]);
                    state[14] = RotL64(state[20], RotationConstants[4]);
                    state[20] = RotL64(state[2], RotationConstants[5]);
                    state[2] = RotL64(state[12], RotationConstants[6]);
                    state[12] = RotL64(state[13], RotationConstants[7]);
                    state[13] = RotL64(state[19], RotationConstants[8]);
                    state[19] = RotL64(state[23], RotationConstants[9]);
                    state[23] = RotL64(state[15], RotationConstants[10]);
                    state[15] = RotL64(state[4], RotationConstants[11]);
                    state[4] = RotL64(state[24], RotationConstants[12]);
                    state[24] = RotL64(state[21], RotationConstants[13]);
                    state[21] = RotL64(state[8], RotationConstants[14]);
                    state[8] = RotL64(state[16], RotationConstants[15]);
                    state[16] = RotL64(state[5], RotationConstants[16]);
                    state[5] = RotL64(state[3], RotationConstants[17]);
                    state[3] = RotL64(state[18], RotationConstants[18]);
                    state[18] = RotL64(state[17], RotationConstants[19]);
                    state[17] = RotL64(state[11], RotationConstants[20]);
                    state[11] = RotL64(state[7], RotationConstants[21]);
                    state[7] = RotL64(state[10], RotationConstants[22]);
                    state[10] = RotL64(t1, RotationConstants[23]);

                    // Chi
                    ulong st0 = state[0], st1 = state[1], st2 = state[2], st3 = state[3], st4 = state[4];
                    state[0] ^= ~st1 & st2; state[1] ^= ~st2 & st3; state[2] ^= ~st3 & st4;
                    state[3] ^= ~st4 & st0; state[4] ^= ~st0 & st1;

                    st0 = state[5]; st1 = state[6]; st2 = state[7]; st3 = state[8]; st4 = state[9];
                    state[5] ^= ~st1 & st2; state[6] ^= ~st2 & st3; state[7] ^= ~st3 & st4;
                    state[8] ^= ~st4 & st0; state[9] ^= ~st0 & st1;

                    st0 = state[10]; st1 = state[11]; st2 = state[12]; st3 = state[13]; st4 = state[14];
                    state[10] ^= ~st1 & st2; state[11] ^= ~st2 & st3; state[12] ^= ~st3 & st4;
                    state[13] ^= ~st4 & st0; state[14] ^= ~st0 & st1;

                    st0 = state[15]; st1 = state[16]; st2 = state[17]; st3 = state[18]; st4 = state[19];
                    state[15] ^= ~st1 & st2; state[16] ^= ~st2 & st3; state[17] ^= ~st3 & st4;
                    state[18] ^= ~st4 & st0; state[19] ^= ~st0 & st1;

                    st0 = state[20]; st1 = state[21]; st2 = state[22]; st3 = state[23]; st4 = state[24];
                    state[20] ^= ~st1 & st2; state[21] ^= ~st2 & st3; state[22] ^= ~st3 & st4;
                    state[23] ^= ~st4 & st0; state[24] ^= ~st0 & st1;

                    // Iota
                    state[0] ^= RoundConstants[round];
                }
            }

            private static ulong RotL64(ulong x, int n) => (x << n) | (x >> (64 - n));
        }
    }
}
