/**
 * DeepLinkHandler — handles deep linking and universal links for wallet connections.
 *
 * Manages URL scheme registration, deep link generation, and smart redirect
 * logic for iOS wallet app connections.
 *
 * ## Usage
 * ```swift
 * let handler = DeepLinkHandler()
 * handler.configure(with: config)
 *
 * // Generate a deep link
 * let url = handler.generateDeepLink(walletId: "metamask", uri: wcUri)
 *
 * // Open a wallet with fallback
 * let result = await handler.openWallet(walletId: "metamask", uri: wcUri)
 * ```
 *
 * ## Info.plist Setup
 * Add supported URL schemes for wallets you want to deep-link to:
 * ```xml
 * <key>LSApplicationQueriesSchemes</key>
 * <array>
 *     <string>metamask</string>
 *     <string>cbwallet</string>
 *     <string>rainbow</string>
 *     <string>trust</string>
 *     <string>phantom</string>
 * </array>
 * ```
 */

import Foundation

/// Platform for redirect decisions.
public enum DeepLinkPlatform: String, Sendable {
    case ios
    case android
    case web
}

/// Result of a deep link redirect attempt.
public struct RedirectResult: Sendable {
    /// Whether the redirect was initiated.
    public let success: Bool
    /// Method used: deep-link, universal-link, app-store.
    public let method: RedirectMethod
    /// The URL that was used.
    public let url: String
    /// Whether a fallback was used.
    public let fallbackUsed: Bool
    /// Error message if the redirect failed.
    public let error: String?
    
    public init(success: Bool, method: RedirectMethod, url: String, fallbackUsed: Bool, error: String? = nil) {
        self.success = success
        self.method = method
        self.url = url
        self.fallbackUsed = fallbackUsed
        self.error = error
    }
}

/// Redirect method used.
public enum RedirectMethod: String, Sendable {
    case deepLink = "deep-link"
    case universalLink = "universal-link"
    case appStore = "app-store"
    case qrCode = "qr-code"
}

/// Parameters for deep link generation.
public struct DeepLinkParams: Sendable {
    /// Wallet identifier.
    public let walletId: String
    /// URI to pass to the wallet.
    public let uri: String
    /// Additional query parameters.
    public let params: [String: String]?
    /// Timeout in ms before fallback.
    public let fallbackTimeoutMs: Int?
    
    public init(walletId: String, uri: String, params: [String: String]? = nil, fallbackTimeoutMs: Int? = nil) {
        self.walletId = walletId
        self.uri = uri
        self.params = params
        self.fallbackTimeoutMs = fallbackTimeoutMs
    }
}

/// Configuration for a specific wallet's deep link scheme.
public struct WalletDeepLinkConfig: Sendable {
    /// URL scheme prefix.
    public let scheme: String
    /// Universal link domain.
    public let universalDomain: String?
    /// App Store URL.
    public let appStoreUrl: String?
    /// Path template for the deep link.
    public let pathTemplate: String?
    
    public init(scheme: String, universalDomain: String? = nil, appStoreUrl: String? = nil, pathTemplate: String? = nil) {
        self.scheme = scheme
        self.universalDomain = universalDomain
        self.appStoreUrl = appStoreUrl
        self.pathTemplate = pathTemplate
    }
}

/// Handles deep linking for wallet connections.
public final class DeepLinkHandler {
    
    /// Wallet deep link configurations.
    public static var walletConfigs: [String: WalletDeepLinkConfig] = [
        "metamask": WalletDeepLinkConfig(
            scheme: "metamask://",
            universalDomain: "metamask.app.link",
            appStoreUrl: "https://apps.apple.com/app/metamask/id1438668043",
            pathTemplate: "/wc?uri={uri}"
        ),
        "walletconnect": WalletDeepLinkConfig(
            scheme: "wc://",
            universalDomain: "walletconnect.com",
            pathTemplate: "/wc?uri={uri}"
        ),
        "coinbase": WalletDeepLinkConfig(
            scheme: "cbwallet://",
            universalDomain: "go.cb-w.com",
            appStoreUrl: "https://apps.apple.com/app/coinbase-wallet/id1278383455"
        ),
        "rainbow": WalletDeepLinkConfig(
            scheme: "rainbow://",
            universalDomain: "rnbwapp.com",
            appStoreUrl: "https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021"
        ),
        "trust": WalletDeepLinkConfig(
            scheme: "trust://",
            universalDomain: "link.trustwallet.com",
            appStoreUrl: "https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409"
        ),
        "phantom": WalletDeepLinkConfig(
            scheme: "phantom://",
            universalDomain: "phantom.app",
            appStoreUrl: "https://apps.apple.com/app/phantom-crypto-wallet/id1598432977"
        ),
        "rabby": WalletDeepLinkConfig(
            scheme: "rabby://"
        ),
    ]
    
    private var config: CinacoinConfig?
    
    /// Configure the handler.
    public func configure(with config: CinacoinConfig) {
        self.config = config
    }
    
    /// Generate a deep link URL for a wallet.
    /// - Parameters:
    ///   - walletId: Wallet identifier.
    ///   - uri: WalletConnect URI to pass.
    ///   - queryParams: Additional query parameters.
    /// - Returns: Deep link URL string.
    public func generateDeepLink(
        walletId: String,
        uri: String,
        queryParams: [String: String]? = nil
    ) -> String {
        guard let walletConfig = Self.walletConfigs[walletId] else {
            return ""
        }
        
        var url = walletConfig.scheme
        
        // Apply path template if available
        if let template = walletConfig.pathTemplate {
            url += template.replacingOccurrences(of: "{uri}", with: uri)
        }
        
        // Append additional query params
        if let queryParams = queryParams, !queryParams.isEmpty {
            let separator = url.contains("?") ? "&" : "?"
            let query = queryParams.map { "\($0)=\($1)" }.joined(separator: "&")
            url += "\(separator)\(query)"
        }
        
        return url
    }
    
    /// Generate a universal link URL for a wallet.
    /// - Parameters:
    ///   - walletId: Wallet identifier.
    ///   - uri: WalletConnect URI to pass.
    /// - Returns: Universal link URL string.
    public func generateUniversalLink(walletId: String, uri: String) -> String? {
        guard let walletConfig = Self.walletConfigs[walletId],
              let domain = walletConfig.universalDomain else {
            return nil
        }
        
        let path = walletConfig.pathTemplate?.replacingOccurrences(of: "{uri}", with: uri) ?? "/wc?uri=\(uri)"
        return "https://\(domain)\(path)"
    }
    
    /// Open a wallet using deep linking with fallback logic.
    /// Tries: deep link → timeout → universal link → App Store.
    /// - Parameters:
    ///   - walletId: Wallet identifier.
    ///   - uri: WalletConnect URI.
    ///   - fallbackTimeoutMs: Timeout before fallback in milliseconds.
    /// - Returns: Redirect result.
    public func openWallet(
        walletId: String,
        uri: String,
        fallbackTimeoutMs: Int = 1500
    ) async -> RedirectResult {
        guard let walletConfig = Self.walletConfigs[walletId] else {
            return RedirectResult(
                success: false,
                method: .qrCode,
                url: "",
                fallbackUsed: false,
                error: "Wallet '\(walletId)' not configured for deep linking"
            )
        }
        
        // Step 1: Try deep link
        let deepLinkUrl = generateDeepLink(walletId: walletId, uri: uri)
        if let url = URL(string: deepLinkUrl), UIApplication.shared.canOpenURL(url) {
            let opened = UIApplication.shared.open(url)
            if opened {
                return RedirectResult(
                    success: true,
                    method: .deepLink,
                    url: deepLinkUrl,
                    fallbackUsed: false
                )
            }
        }
        
        // Step 2: Attempt deep link anyway (iOS may handle it without canOpenURL)
        if let url = URL(string: deepLinkUrl) {
            let opened = UIApplication.shared.open(url)
            if opened {
                // Step 3: Fallback to universal link after timeout
                try? await Task.sleep(nanoseconds: UInt64(fallbackTimeoutMs) * 1_000_000)
                
                if let universalUrl = generateUniversalLink(walletId: walletId, uri: uri),
                   let url = URL(string: universalUrl) {
                    let fallbackOpened = UIApplication.shared.open(url)
                    return RedirectResult(
                        success: fallbackOpened,
                        method: .universalLink,
                        url: universalUrl,
                        fallbackUsed: true
                    )
                }
                
                // Step 4: App Store fallback
                if let appStoreUrl = walletConfig.appStoreUrl,
                   let url = URL(string: appStoreUrl) {
                    let storeOpened = UIApplication.shared.open(url)
                    return RedirectResult(
                        success: storeOpened,
                        method: .appStore,
                        url: appStoreUrl,
                        fallbackUsed: true
                    )
                }
                
                return RedirectResult(
                    success: false,
                    method: .deepLink,
                    url: deepLinkUrl,
                    fallbackUsed: true,
                    error: "All fallback methods failed"
                )
            }
        }
        
        return RedirectResult(
            success: false,
            method: .deepLink,
            url: deepLinkUrl,
            fallbackUsed: false,
            error: "Could not open deep link"
        )
    }
    
    /// Register a custom wallet deep link configuration.
    /// - Parameters:
    ///   - walletId: Wallet identifier.
    ///   - config: Deep link configuration.
    public static func registerWallet(walletId: String, config: WalletDeepLinkConfig) {
        walletConfigs[walletId] = config
    }
}
