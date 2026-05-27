using System;
using System.Collections.Generic;
using System.Linq;

namespace Cinacoin
{
    /// <summary>
    /// Registry of supported wallets with deep link schemes.
    /// Mirrors the core-sdk WALLET_DEEP_LINKS registry.
    /// </summary>
    public static class WalletRegistry
    {
        private static readonly Dictionary<string, WalletInfo> _wallets = new Dictionary<string, WalletInfo>
        {
            ["metamask"] = new WalletInfo(
                id: "metamask",
                name: "MetaMask",
                iconUrl: "https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg",
                scheme: "metamask://",
                universalDomain: "metamask.app.link",
                appStore: "https://apps.apple.com/app/metamask/id1438668043",
                playStore: "https://play.google.com/store/apps/details?id=io.metamask",
                chains: new[] { "eip155:1", "eip155:137", "eip155:42161", "eip155:10" }
            ),
            ["walletconnect"] = new WalletInfo(
                id: "walletconnect",
                name: "WalletConnect",
                iconUrl: "https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Icon/Blue%20(Default)/Icon.svg",
                scheme: "wc://",
                universalDomain: "walletconnect.com",
                appStore: "",
                playStore: "",
                chains: new[] { "eip155:1", "eip155:137", "eip155:42161", "eip155:10", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" }
            ),
            ["rainbow"] = new WalletInfo(
                id: "rainbow",
                name: "Rainbow",
                iconUrl: "https://raw.githubusercontent.com/rainbow-me/assets/master/images/rainbow-logo.png",
                scheme: "rainbow://",
                universalDomain: "rnbwapp.com",
                appStore: "https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021",
                playStore: "https://play.google.com/store/apps/details?id=me.rainbow",
                chains: new[] { "eip155:1", "eip155:137", "eip155:42161", "eip155:10" }
            ),
            ["coinbase"] = new WalletInfo(
                id: "coinbase",
                name: "Coinbase Wallet",
                iconUrl: "https://www.coinbase.com/img/favicon/favicon-32x32.png",
                scheme: "cbwallet://",
                universalDomain: "go.cb-w.com",
                appStore: "https://apps.apple.com/app/coinbase-wallet/id1278383455",
                playStore: "https://play.google.com/store/apps/details?id=org.toshi",
                chains: new[] { "eip155:1", "eip155:137", "eip155:42161", "eip155:10" }
            ),
            ["trust"] = new WalletInfo(
                id: "trust",
                name: "Trust Wallet",
                iconUrl: "https://trustwallet.com/assets/images/favicon.ico",
                scheme: "trust://",
                universalDomain: "link.trustwallet.com",
                appStore: "https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409",
                playStore: "https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp",
                chains: new[] { "eip155:1", "eip155:137", "eip155:56", "eip155:42161" }
            ),
            ["phantom"] = new WalletInfo(
                id: "phantom",
                name: "Phantom",
                iconUrl: "https://phantom.app/favicon.ico",
                scheme: "phantom://",
                universalDomain: "phantom.app",
                appStore: "https://apps.apple.com/app/phantom-crypto-wallet/id1598432977",
                playStore: "https://play.google.com/store/apps/details?id=app.phantom",
                chains: new[] { "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", "eip155:1", "eip155:137" }
            ),
            ["zerion"] = new WalletInfo(
                id: "zerion",
                name: "Zerion",
                iconUrl: "https://zerion.io/favicon.ico",
                scheme: "zerion://",
                universalDomain: "links.zerion.io",
                appStore: "https://apps.apple.com/app/zerion-crypto-web3-wallet/id1456732032",
                playStore: "https://play.google.com/store/apps/details?id=io.zerion.android",
                chains: new[] { "eip155:1", "eip155:137", "eip155:42161" }
            ),
            ["rabby"] = new WalletInfo(
                id: "rabby",
                name: "Rabby",
                iconUrl: "https://rabby.io/favicon.ico",
                scheme: "rabby://",
                universalDomain: "rabby.io",
                appStore: "https://apps.apple.com/app/rabby-wallet/id1631750692",
                playStore: "https://play.google.com/store/apps/details?id=io.rabby.wallet",
                chains: new[] { "eip155:1", "eip155:137", "eip155:42161", "eip155:10" }
            ),
            ["safe"] = new WalletInfo(
                id: "safe",
                name: "Safe{Wallet}",
                iconUrl: "https://safe.global/favicon.ico",
                scheme: "safe://",
                universalDomain: "safe.global",
                appStore: "https://apps.apple.com/app/safe-wallet/id1572832312",
                playStore: "https://play.google.com/store/apps/details?id=io.gnosis.safe",
                chains: new[] { "eip155:1", "eip155:137", "eip155:42161", "eip155:10" }
            ),
            ["ledger"] = new WalletInfo(
                id: "ledger",
                name: "Ledger Live",
                iconUrl: "https://www.ledger.com/favicon.ico",
                scheme: "ledgerlive://",
                universalDomain: "ledgerlive.com",
                appStore: "https://apps.apple.com/app/ledger-live/id1361671700",
                playStore: "https://play.google.com/store/apps/details?id=com.ledger.live",
                chains: new[] { "eip155:1", "eip155:137", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" }
            ),
            ["exodus"] = new WalletInfo(
                id: "exodus",
                name: "Exodus",
                iconUrl: "https://www.exodus.com/favicon.ico",
                scheme: "exodus://",
                universalDomain: "exodus.com",
                appStore: "https://apps.apple.com/app/exodus-crypto-wallet/id1424287736",
                playStore: "https://play.google.com/store/apps/details?id=exodusmovement.exodus",
                chains: new[] { "eip155:1", "eip155:137", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" }
            ),
            ["tokenpocket"] = new WalletInfo(
                id: "tokenpocket",
                name: "TokenPocket",
                iconUrl: "https://www.tokenpocket.pro/favicon.ico",
                scheme: "tpoutside://",
                universalDomain: "tokenpocket.pro",
                appStore: "https://apps.apple.com/app/tokenpocket/id1376157709",
                playStore: "https://play.google.com/store/apps/details?id=vip.mytokenpocket",
                chains: new[] { "eip155:1", "eip155:137", "eip155:56" }
            ),
            ["imtoken"] = new WalletInfo(
                id: "imtoken",
                name: "imToken",
                iconUrl: "https://token.im/favicon.ico",
                scheme: "imtokenv2://",
                universalDomain: "token.im",
                appStore: "https://apps.apple.com/app/imtoken/id1376157709",
                playStore: "https://play.google.com/store/apps/details?id=im.token.app",
                chains: new[] { "eip155:1", "eip155:137", "eip155:56" }
            ),
            ["okx"] = new WalletInfo(
                id: "okx",
                name: "OKX Wallet",
                iconUrl: "https://www.okx.com/favicon.ico",
                scheme: "okx://",
                universalDomain: "okx.com",
                appStore: "https://apps.apple.com/app/okx/id1234567890",
                playStore: "https://play.google.com/store/apps/details?id=com.okinc.okex",
                chains: new[] { "eip155:1", "eip155:137", "eip155:56", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" }
            ),
            ["bitget"] = new WalletInfo(
                id: "bitget",
                name: "Bitget Wallet",
                iconUrl: "https://www.bitget.com/favicon.ico",
                scheme: "bitkeep://",
                universalDomain: "bitget.com",
                appStore: "https://apps.apple.com/app/bitget-wallet/id1390626923",
                playStore: "https://play.google.com/store/apps/details?id=com.bitkeep.wallet",
                chains: new[] { "eip155:1", "eip155:137", "eip155:56", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" }
            ),
            ["uniswap"] = new WalletInfo(
                id: "uniswap",
                name: "Uniswap Wallet",
                iconUrl: "https://uniswap.org/favicon.ico",
                scheme: "uniswap://",
                universalDomain: "uniswap.org",
                appStore: "https://apps.apple.com/app/uniswap-wallet/id6443870843",
                playStore: "https://play.google.com/store/apps/details?id=com.uniswap.wallet",
                chains: new[] { "eip155:1", "eip155:137", "eip155:42161", "eip155:10" }
            )
        };

        /// Get a wallet by ID.
        public static WalletInfo Get(string walletId)
        {
            _wallets.TryGetValue(walletId, out var wallet);
            return wallet;
        }

        /// Get all registered wallets.
        public static List<WalletInfo> GetAll() => _wallets.Values.ToList();

        /// Get wallets that support a specific chain.
        public static List<WalletInfo> GetForChain(string chainId)
        {
            return _wallets.Values.Where(w => Array.IndexOf(w.SupportedChains, chainId) >= 0).ToList();
        }

        /// Register a custom wallet at runtime.
        public static void Register(WalletInfo wallet)
        {
            _wallets[wallet.Id] = wallet;
        }

        /// Check if a wallet is registered.
        public static bool Has(string walletId) => _wallets.ContainsKey(walletId);
    }
}
