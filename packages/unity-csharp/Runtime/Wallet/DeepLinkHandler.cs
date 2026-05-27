using System;
using System.Threading.Tasks;
using UnityEngine;

namespace Cinacoin
{
    /// <summary>
    /// Deep link handler for mobile builds (iOS/Android) and desktop.
    /// Opens wallet apps via deep links with fallback to universal links.
    /// Supports WalletConnect deep link protocol for wallet-to-app communication.
    /// </summary>
    public class DeepLinkHandler
    {
        /// Platform detection.
        public enum Platform
        {
            iOS,
            Android,
            WebGL,
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
#elif UNITY_WEBGL
            _platform = Platform.WebGL;
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

            // WalletConnect deep link format
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

        /// Generate an app store URL for a wallet.
        public string GenerateAppStoreUrl(string walletId)
        {
            var wallet = WalletRegistry.Get(walletId);
            if (wallet == null)
                throw new ArgumentException($"Unknown wallet ID: {walletId}");

#if UNITY_IOS
            return wallet.AppStoreUrl;
#elif UNITY_ANDROID
            return wallet.PlayStoreUrl;
#else
            return wallet.AppStoreUrl; // Default to App Store
#endif
        }

        /// Open a deep link for a wallet app.
        /// Returns success/failure with the method used.
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
                // On mobile: try deep link, then fallback to universal link, then app store
                // On desktop/web: just return the URI for QR display

                if (_platform == Platform.WebGL || _platform == Platform.Web)
                {
                    // Desktop/Web: cannot deep link, signal QR code display
                    return new RedirectResult
                    {
                        Success = false,
                        Method = "qr-code",
                        Url = uri,
                        Error = "QR code display required on desktop"
                    };
                }

                // Try deep link first
                var deepLinkUrl = GenerateDeepLink(walletId, uri);
                bool opened = OpenURL(deepLinkUrl);

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
                OpenURL(universalUrl);

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

        /// Open a URL using the platform-appropriate method.
        private bool OpenURL(string url)
        {
            if (string.IsNullOrEmpty(url)) return false;

            try
            {
                Application.OpenURL(url);
                return true;
            }
            catch
            {
                return false;
            }
        }

        /// Open the app store page for a wallet.
        public RedirectResult OpenAppStore(string walletId)
        {
            try
            {
                var url = GenerateAppStoreUrl(walletId);
                if (string.IsNullOrEmpty(url))
                {
                    return new RedirectResult
                    {
                        Success = false,
                        Method = "app-store",
                        Error = "No app store URL available"
                    };
                }

                OpenURL(url);
                return new RedirectResult
                {
                    Success = true,
                    Method = "app-store",
                    Url = url
                };
            }
            catch (Exception ex)
            {
                return new RedirectResult
                {
                    Success = false,
                    Method = "app-store",
                    Error = ex.Message
                };
            }
        }

        /// Set the target platform (for testing).
        public void SetPlatform(Platform platform)
        {
            _platform = platform;
        }

        /// Get the current platform.
        public Platform GetCurrentPlatform() => _platform;

        /// Check if deep linking is supported on the current platform.
        public bool IsDeepLinkSupported()
        {
            return _platform == Platform.iOS || _platform == Platform.Android;
        }

        /// Build a WalletConnect v2 deep link callback URL for mobile wallets.
        /// After the wallet approves, it will redirect back to this URL with the session data.
        public string BuildCallbackUrl(string protocol = "cinacoin")
        {
            return $"{protocol}://wc-callback";
        }
    }
}
