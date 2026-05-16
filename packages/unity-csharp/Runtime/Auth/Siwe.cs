using System;
using System.Security.Cryptography;
using System.Text;
using UnityEngine;

namespace OnChainUX.Auth
{
    /// <summary>
    /// SIWE (Sign-In with Ethereum) implementation for Unity.
    /// Implements EIP-4361 message generation and verification.
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

        /// Compute the EIP-191 message hash.
        public static byte[] ComputeMessageHash(string message)
        {
            var prefix = $"\u0019Ethereum Signed Message:\n{message.Length}";
            var prefixBytes = Encoding.UTF8.GetBytes(prefix);
            var messageBytes = Encoding.UTF8.GetBytes(message);

            var combined = new byte[prefixBytes.Length + messageBytes.Length];
            Buffer.BlockCopy(prefixBytes, 0, combined, 0, prefixBytes.Length);
            Buffer.BlockCopy(messageBytes, 0, combined, prefixBytes.Length, messageBytes.Length);

            using (var sha256 = SHA256.Create())
            {
                return sha256.ComputeHash(combined);
            }
        }
    }
}
