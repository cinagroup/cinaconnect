using UnityEngine;

namespace Cinacoin
{
    /// <summary>
    /// Core type definitions for the Cinacoin Unity SDK.
    /// Mirrors the TypeScript core-sdk types.ts API surface.
    /// </summary>

    /// Supported blockchain network types (CAIP-2 namespace).
    public enum ChainNamespace
    {
        Eip155,
        Solana,
        Bip121,
        Tron
    }

    /// Chain reference (CAIP-2 format: namespace:reference).
    [System.Serializable]
    public class ChainReference
    {
        public ChainNamespace Namespace;
        public string Reference;

        public ChainReference(ChainNamespace ns, string reference)
        {
            Namespace = ns;
            Reference = reference;
        }

        /// Create from CAIP-2 string (e.g., "eip155:1").
        public static ChainReference FromCaip2(string caip2)
        {
            var parts = caip2.Split(':');
            if (parts.Length != 2)
                throw new System.ArgumentException($"Invalid CAIP-2 format: {caip2}");

            var ns = parts[0].ToLowerInvariant() switch
            {
                "eip155" => ChainNamespace.Eip155,
                "solana" => ChainNamespace.Solana,
                "bip121" => ChainNamespace.Bip121,
                "tron" => ChainNamespace.Tron,
                _ => ChainNamespace.Eip155
            };

            return new ChainReference(ns, parts[1]);
        }

        /// Convert to CAIP-2 string.
        public string ToCaip2() => $"{Namespace.ToString().ToLowerInvariant()}:{Reference}";
    }

    /// Full chain definition.
    [System.Serializable]
    public class Chain
    {
        public string Id;
        public string Name;
        public string RpcUrl;
        public NativeCurrency NativeCurrency;
        public string ExplorerUrl;
        public string IconUrl;

        public static Chain Ethereum => new Chain
        {
            Id = "eip155:1",
            Name = "Ethereum",
            RpcUrl = "https://eth.llamarpc.com",
            NativeCurrency = new NativeCurrency { Name = "Ether", Symbol = "ETH", Decimals = 18 },
            ExplorerUrl = "https://etherscan.io"
        };

        public static Chain Polygon => new Chain
        {
            Id = "eip155:137",
            Name = "Polygon",
            RpcUrl = "https://polygon-rpc.com",
            NativeCurrency = new NativeCurrency { Name = "MATIC", Symbol = "MATIC", Decimals = 18 },
            ExplorerUrl = "https://polygonscan.com"
        };

        public static Chain Arbitrum => new Chain
        {
            Id = "eip155:42161",
            Name = "Arbitrum One",
            RpcUrl = "https://arb1.arbitrum.io/rpc",
            NativeCurrency = new NativeCurrency { Name = "Ether", Symbol = "ETH", Decimals = 18 },
            ExplorerUrl = "https://arbiscan.io"
        };

        public static Chain Optimism => new Chain
        {
            Id = "eip155:10",
            Name = "Optimism",
            RpcUrl = "https://mainnet.optimism.io",
            NativeCurrency = new NativeCurrency { Name = "Ether", Symbol = "ETH", Decimals = 18 },
            ExplorerUrl = "https://optimistic.etherscan.io"
        };

        public static Chain Solana => new Chain
        {
            Id = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
            Name = "Solana",
            RpcUrl = "https://api.mainnet-beta.solana.com",
            NativeCurrency = new NativeCurrency { Name = "Solana", Symbol = "SOL", Decimals = 9 },
            ExplorerUrl = "https://solscan.io"
        };
    }

    /// Native currency info for a chain.
    [System.Serializable]
    public class NativeCurrency
    {
        public string Name;
        public string Symbol;
        public int Decimals;
    }

    /// Connection parameters matching core-sdk ConnectParams.
    public class ConnectParams
    {
        public string Topic;
        public string RelayUrl;
        public string Uri;
        public int[] Chains;
        public AppMetadata Metadata;
    }

    /// Application metadata for pairing.
    [System.Serializable]
    public class AppMetadata
    {
        public string Name;
        public string Description;
        public string Url;
        public string[] Icons;

        public AppMetadata(string name, string description, string url, string[] icons = null)
        {
            Name = name;
            Description = description;
            Url = url;
            Icons = icons ?? System.Array.Empty<string>();
        }
    }

    /// Result of a successful wallet connection.
    public class ConnectionResult
    {
        public string SessionId;
        public string[] Accounts;
        public int ChainId;
        public string ConnectorId;

        public ConnectionResult(string sessionId, string[] accounts, int chainId, string connectorId)
        {
            SessionId = sessionId;
            Accounts = accounts;
            ChainId = chainId;
            ConnectorId = connectorId;
        }
    }

    /// Transaction request matching core-sdk TransactionRequest.
    public class TransactionRequest
    {
        public string From;
        public string To;
        public string Value;
        public string Data;
        public string Gas;
        public string GasPrice;
        public string MaxFeePerGas;
        public string MaxPriorityFeePerGas;
        public string Nonce;
        public int? ChainId;
    }

    /// Connection state discriminator.
    public enum ConnectionStatus
    {
        Disconnected,
        Connecting,
        Connected,
        Error
    }

    /// Session state matching core-sdk session.ts SessionState.
    public class SessionState
    {
        public ConnectionStatus Status;
        public string ConnectorId;
        public string[] Accounts;
        public int ChainId;
        public string SessionId;
        public string Error;

        public static SessionState Disconnected => new SessionState
        {
            Status = ConnectionStatus.Disconnected
        };

        public static SessionState Connecting(string connectorId) => new SessionState
        {
            Status = ConnectionStatus.Connecting,
            ConnectorId = connectorId
        };

        public static SessionState Connected(string[] accounts, int chainId, string sessionId, string connectorId) => new SessionState
        {
            Status = ConnectionStatus.Connected,
            Accounts = accounts,
            ChainId = chainId,
            SessionId = sessionId,
            ConnectorId = connectorId
        };

        public static SessionState Errored(string error) => new SessionState
        {
            Status = ConnectionStatus.Error,
            Error = error
        };
    }

    /// Wallet info for the registry.
    [System.Serializable]
    public class WalletInfo
    {
        public string Id;
        public string Name;
        public string IconUrl;
        public string DeepLinkScheme;
        public string UniversalLinkDomain;
        public string AppStoreUrl;
        public string PlayStoreUrl;
        public string[] SupportedChains;

        public WalletInfo(
            string id, string name, string iconUrl, string scheme,
            string universalDomain, string appStore, string playStore,
            string[] supportedChains)
        {
            Id = id;
            Name = name;
            IconUrl = iconUrl;
            DeepLinkScheme = scheme;
            UniversalLinkDomain = universalDomain;
            AppStoreUrl = appStore;
            PlayStoreUrl = playStore;
            SupportedChains = supportedChains;
        }
    }

    /// SDK version.
    public static class CinacoinVersion
    {
        public const string Value = "0.1.0";
    }
}
