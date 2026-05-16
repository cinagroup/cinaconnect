using System;
using System.Threading.Tasks;

namespace OnChainUX
{
    /// <summary>
    /// Deep link handler for mobile builds (iOS/Android).
    /// Opens wallet apps via deep links with fallback to universal links.
    /// </summary>
    public class DeepLinkHandler
    {
        /// Platform detection.
        public enum Platform
        {
            iOS,
            Android,
            Web
        }

        /// Result of a redirect attempt.
        public class RedirectResult
        {
            public bool Success;
            public string Method; // deep-link | universal-link | app-store | qr-code
            public string Url;
            public bool FallbackUsed;
            public string Error;
        }

        private Platform _platform;

        public DeepLinkHandler()
        {
#if UNITY_IOS
            _platform = Platform.iOS;
#elif UNITY_ANDROID
            _platform = Platform.Android;
#else
            _platform = Platform.Web;
#endif
        }

        /// Generate a deep link URL for a wallet.
        public string GenerateDeepLink(string walletId, string uri)
        {
            var wallet = WalletRegistry.Get(walletId);
            if (wallet == null)
                throw new ArgumentException($"Unknown wallet ID: {walletId}");

            var scheme = string.IsNullOrEmpty(wallet.DeepLinkScheme) ? "wc://" : wallet.DeepLinkScheme;
            return $"{scheme}wc?uri={Uri.EscapeDataString(uri)}";
        }

        /// Generate a universal link URL for fallback.
        public string GenerateUniversalLink(string walletId, string uri)
        {
            var wallet = WalletRegistry.Get(walletId);
            if (wallet == null)
                throw new ArgumentException($"Unknown wallet ID: {walletId}");

            var domain = string.IsNullOrEmpty(wallet.UniversalLinkDomain)
                ? "walletconnect.com"
                : wallet.UniversalLinkDomain;

            return $"https://{domain}/wc?uri={Uri.EscapeDataString(uri)}";
        }

        /// Open a deep link for a wallet app.
        public async Task<RedirectResult> OpenDeepLinkAsync(string walletId, string uri)
        {
            var wallet = WalletRegistry.Get(walletId);
            if (wallet == null)
            {
                return new RedirectResult
                {
                    Success = false,
                    Method = "deep-link",
                    Error = $"Unknown wallet ID: {walletId}"
                };
            }

            try
            {
                // Try deep link first
                var deepLinkUrl = GenerateDeepLink(walletId, uri);
                bool opened = Application.OpenURL(deepLinkUrl);

                if (opened)
                {
                    return new RedirectResult
                    {
                        Success = true,
                        Method = "deep-link",
                        Url = deepLinkUrl
                    };
                }

                // Fallback to universal link
                var universalUrl = GenerateUniversalLink(walletId, uri);
                Application.OpenURL(universalUrl);

                return new RedirectResult
                {
                    Success = true,
                    Method = "universal-link",
                    Url = universalUrl,
                    FallbackUsed = true
                };
            }
            catch (Exception ex)
            {
                return new RedirectResult
                {
                    Success = false,
                    Method = "qr-code",
                    Error = ex.Message
                };
            }
        }

        /// Set the target platform.
        public void SetPlatform(Platform platform)
        {
            _platform = platform;
        }
    }
}
