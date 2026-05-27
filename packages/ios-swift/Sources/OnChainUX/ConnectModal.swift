/**
 * ConnectModal — SwiftUI modal for wallet connection.
 *
 * Presents a native iOS modal with tabs for Wallet, Social, Email, and QR Scan.
 * Integrates real deep linking via `DeepLinkHandler` for wallet app redirects.
 *
 * ## Usage
 * ```swift
 * struct ContentView: View {
 *     @State private var showModal = false
 *     @EnvironmentObject var onChainUX: Cinacoin
 *
 *     var body: some View {
 *         ConnectButton { showModal = true }
 *             .sheet(isPresented: $showModal) {
 *                 ConnectModal(isPresented: $showModal)
 *             }
 *     }
 * }
 * ```
 */

import SwiftUI

/// Wallet info for modal display.
public struct WalletInfo: Identifiable, Sendable {
    public let id: String
    public let name: String
    public let icon: String?
    public let iconBackground: String?
    public let description: String
    public let downloadUrl: String?
    public let rdns: String?
    /// Deep link scheme (e.g., "metamask://").
    public let deepLink: String?
    /// Universal link domain for iOS fallback.
    public let universalLink: String?
    /// App Store URL.
    public let appStoreUrl: String?
    /// Whether the wallet supports WalletConnect URI deep links.
    public let supportsWalletConnect: Bool
    
    public init(
        id: String,
        name: String,
        icon: String? = nil,
        iconBackground: String? = nil,
        description: String = "",
        downloadUrl: String? = nil,
        rdns: String? = nil,
        deepLink: String? = nil,
        universalLink: String? = nil,
        appStoreUrl: String? = nil,
        supportsWalletConnect: Bool = false
    ) {
        self.id = id
        self.name = name
        self.icon = icon
        self.iconBackground = iconBackground
        self.description = description
        self.downloadUrl = downloadUrl
        self.rdns = rdns
        self.deepLink = deepLink
        self.universalLink = universalLink
        self.appStoreUrl = appStoreUrl
        self.supportsWalletConnect = supportsWalletConnect
    }
}

/// Modal view tab options.
public enum ConnectModalView: String, CaseIterable, Identifiable {
    case wallets
    case social
    case email
    case scan
    
    public var id: String { rawValue }
    
    public var displayName: String {
        switch self {
        case .wallets: return "Wallets"
        case .social: return "Social"
        case .email: return "Email"
        case .scan: return "Scan"
        }
    }
}

/// SwiftUI Connect Modal.
public struct ConnectModal: View {
    @EnvironmentObject private var onChainUX: Cinacoin
    
    /// Binding controlling modal visibility.
    @Binding public var isPresented: Bool
    /// Available views.
    public var views: [ConnectModalView]
    /// Default view.
    public var defaultView: ConnectModalView
    /// Recommended wallet IDs to highlight.
    public var recommendedWalletIds: [String]
    /// Custom wallet list (uses defaults if empty).
    public var wallets: [WalletInfo]
    /// WalletConnect URI to pass when opening wallets.
    public var wcUri: String?
    
    @State private var currentView: ConnectModalView
    @State private var email: String = ""
    @State private var deepLinkStatus: [String: DeepLinkState] = [:]
    
    /// Create a ConnectModal.
    public init(
        isPresented: Binding<Bool>,
        views: [ConnectModalView] = ConnectModalView.allCases,
        defaultView: ConnectModalView = .wallets,
        recommendedWalletIds: [String] = [],
        wallets: [WalletInfo] = WalletInfo.defaults,
        wcUri: String? = nil
    ) {
        self._isPresented = isPresented
        self.views = views
        self.defaultView = defaultView
        self.recommendedWalletIds = recommendedWalletIds
        self.wallets = wallets
        self.wcUri = wcUri
        self._currentView = State(initialValue: defaultView)
    }
    
    public var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Tab bar
                tabView
                
                Divider()
                    .background(onChainUX.themeColors.borderColor)
                
                // Content
                ScrollView {
                    switch currentView {
                    case .wallets: walletListView
                    case .social: socialLoginView
                    case .email: emailLoginView
                    case .scan: scanView
                    }
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Connect Wallet")
                        .font(.headline)
                        .foregroundColor(onChainUX.themeColors.textColor)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        isPresented = false
                    }
                    .foregroundColor(onChainUX.themeColors.accentColor)
                }
            }
        }
    }
    
    // MARK: - Tab Bar
    
    private var tabView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(views) { view in
                    Button(action: { currentView = view }) {
                        Text(view.displayName)
                            .font(.system(size: 14, weight: currentView == view ? .semibold : .regular))
                            .foregroundColor(currentView == view ? onChainUX.themeColors.textColor : onChainUX.themeColors.secondaryColor)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(currentView == view ? onChainUX.themeColors.cardColor : Color.clear)
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(onChainUX.themeColors.borderColor, lineWidth: 1)
                            )
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
    }
    
    // MARK: - Wallet List
    
    private var walletListView: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            ForEach(wallets) { wallet in
                walletCard(wallet: wallet)
            }
        }
        .padding(16)
    }
    
    private func walletCard(wallet: WalletInfo) -> some View {
        Button(action: { handleWalletSelect(wallet) }) {
            VStack(spacing: 8) {
                // Icon placeholder
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(wallet.iconBackground.map { Color(hex: $0) } ?? onChainUX.themeColors.cardColor)
                        .frame(width: 40, height: 40)
                    Text("🔗").font(.system(size: 20))
                }
                
                Text(wallet.name)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(onChainUX.themeColors.textColor)
                    .multilineTextAlignment(.center)
                
                if !wallet.description.isEmpty {
                    Text(wallet.description)
                        .font(.system(size: 12))
                        .foregroundColor(onChainUX.themeColors.secondaryColor)
                        .multilineTextAlignment(.center)
                }
                
                if let status = deepLinkStatus[wallet.id] {
                    status.badge
                }
                
                if recommendedWalletIds.contains(wallet.id) {
                    Text("Recommended")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(onChainUX.themeColors.accentColor)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(16)
            .background(onChainUX.themeColors.cardColor)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(onChainUX.themeColors.borderColor, lineWidth: 1)
            )
        }
        .disabled(deepLinkStatus[wallet.id] == .loading)
    }
    
    // MARK: - Social Login
    
    private var socialLoginView: some View {
        VStack(spacing: 12) {
            ForEach(["Google", "Apple", "X"], id: \.self) { provider in
                Button(action: { handleSocialLogin(provider) }) {
                    Text("Continue with \(provider)")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(onChainUX.themeColors.textColor)
                        .frame(maxWidth: .infinity)
                        .padding(12)
                        .background(onChainUX.themeColors.cardColor)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(onChainUX.themeColors.borderColor, lineWidth: 1)
                        )
                }
            }
        }
        .padding(16)
    }
    
    // MARK: - Email Login
    
    private var emailLoginView: some View {
        VStack(spacing: 12) {
            TextField("Enter your email", text: $email)
                .keyboardType(.emailAddress)
                .autocapitalization(.none)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .padding(.horizontal, 16)
            
            Button(action: handleEmailSubmit) {
                Text("Continue with Email")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(onChainUX.themeColors.textColor)
                    .frame(maxWidth: .infinity)
                    .padding(12)
                    .background(onChainUX.themeColors.cardColor)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(onChainUX.themeColors.borderColor, lineWidth: 1)
                    )
            }
        }
        .padding(16)
    }
    
    // MARK: - QR Scan
    
    private var scanView: some View {
        VStack(spacing: 16) {
            Text("Scan with your wallet app")
                .font(.title3)
                .foregroundColor(onChainUX.themeColors.secondaryColor)
            
            // QR placeholder
            RoundedRectangle(cornerRadius: 12)
                .fill(onChainUX.themeColors.cardColor)
                .frame(width: 200, height: 200)
                .overlay(Text("📱").font(.system(size: 48)))
            
            if let uri = wcUri {
                Text(uri.prefix(60) + "...")
                    .font(.system(size: 10))
                    .foregroundColor(onChainUX.themeColors.tertiaryColor)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
        }
        .padding(32)
    }
    
    // MARK: - Actions
    
    private func handleWalletSelect(_ wallet: WalletInfo) {
        deepLinkStatus[wallet.id] = .loading
        
        Task {
            do {
                // Try deep link if supported
                if let deepLink = wallet.deepLink, wallet.supportsWalletConnect {
                    let url = buildDeepLink(wallet: wallet)
                    if let url = URL(string: url), UIApplication.shared.canOpenURL(url) {
                        UIApplication.shared.open(url)
                        deepLinkStatus[wallet.id] = .success
                        try await onChainUX.connect(connectorId: wallet.id)
                        isPresented = false
                        return
                    }
                }
                
                // Fallback to standard connect
                try await onChainUX.connect(connectorId: wallet.id)
                deepLinkStatus[wallet.id] = .success
                isPresented = false
            } catch {
                deepLinkStatus[wallet.id] = .error(error.localizedDescription)
            }
        }
    }
    
    private func buildDeepLink(wallet: WalletInfo) -> String {
        if wallet.supportsWalletConnect, let uri = wcUri, let deepLink = wallet.deepLink {
            return "\(deepLink)wc?uri=\(uri.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")"
        }
        return wallet.deepLink ?? wallet.universalLink ?? ""
    }
    
    private func handleSocialLogin(_ provider: String) {
        Task {
            do {
                try await onChainUX.connect(connectorId: provider.lowercased())
                isPresented = false
            } catch {}
        }
    }
    
    private func handleEmailSubmit() {
        guard !email.isEmpty else { return }
        Task {
            do {
                try await onChainUX.connect(connectorId: "email")
                isPresented = false
            } catch {}
        }
    }
}

/// Deep link status for UI feedback.
enum DeepLinkState {
    case loading
    case success
    case error(String)
    
    @ViewBuilder
    var badge: some View {
        switch self {
        case .loading:
            Text("Opening...")
                .font(.system(size: 11))
                .foregroundColor(.blue)
        case .success:
            Text("✓ Opened")
                .font(.system(size: 11))
                .foregroundColor(.green)
        case let .error(msg):
            Text("✕ \(msg)")
                .font(.system(size: 11))
                .foregroundColor(.red)
        }
    }
}

// MARK: - Default Wallets

extension WalletInfo {
    /// Default wallet configurations.
    public static let defaults: [WalletInfo] = [
        WalletInfo(
            id: "metamask", name: "MetaMask",
            description: "Browser extension & mobile",
            deepLink: "metamask://", universalLink: "https://metamask.app.link",
            appStoreUrl: "https://apps.apple.com/app/metamask/id1438668043",
            supportsWalletConnect: true
        ),
        WalletInfo(
            id: "walletconnect", name: "WalletConnect",
            description: "QR Code",
            deepLink: "wc://", universalLink: "https://walletconnect.com",
            supportsWalletConnect: true
        ),
        WalletInfo(
            id: "coinbase", name: "Coinbase Wallet",
            description: "Wallet",
            deepLink: "cbwallet://", universalLink: "https://go.cb-w.com",
            appStoreUrl: "https://apps.apple.com/app/coinbase-wallet/id1278383455",
            supportsWalletConnect: true
        ),
        WalletInfo(
            id: "rainbow", name: "Rainbow",
            description: "Ethereum wallet",
            deepLink: "rainbow://", universalLink: "https://rnbwapp.com",
            appStoreUrl: "https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021",
            supportsWalletConnect: true
        ),
        WalletInfo(
            id: "trust", name: "Trust Wallet",
            description: "Multi-chain wallet",
            deepLink: "trust://", universalLink: "https://link.trustwallet.com",
            appStoreUrl: "https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409",
            supportsWalletConnect: true
        ),
        WalletInfo(
            id: "rabby", name: "Rabby",
            description: "Multi-chain wallet",
            deepLink: "rabby://",
            supportsWalletConnect: false
        ),
    ]
}

// MARK: - Color helpers for ThemeColors

extension ThemeColors {
    var accentColor: Color { Color(hex: accent500) }
    var cardColor: Color { Color(hex: bgCard) }
    var borderColor: Color { Color(hex: border) }
    var textColor: Color { Color(hex: textPrimary) }
    var secondaryColor: Color { Color(hex: textSecondary) }
    var tertiaryColor: Color { Color(hex: textTertiary) }
}
