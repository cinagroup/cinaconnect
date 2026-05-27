/**
 * ConnectButton — SwiftUI component.
 *
 * A drop-in wallet connection button that adapts its appearance based on
 * connection state. Shows "Connect Wallet" when disconnected, displays
 * the connected address when connected, and shows a loading spinner
 * while connecting.
 *
 * ## Usage
 * ```swift
 * ConnectButton(label: "Connect Wallet")
 * ConnectButton(size: .large, showBalance: true, showAvatar: true)
 * ```
 */

import SwiftUI

/// Button size preset.
public enum ConnectButtonSize: String, CaseIterable {
    case small = "sm"
    case medium = "md"
    case large = "lg"
    
    var height: CGFloat {
        switch self {
        case .small: return 36
        case .medium: return 44
        case .large: return 52
        }
    }
    
    var horizontalPadding: CGFloat {
        switch self {
        case .small: return 16
        case .medium: return 24
        case .large: return 32
        }
    }
    
    var fontSize: CGFloat {
        switch self {
        case .small: return 12
        case .medium: return 14
        case .large: return 16
        }
    }
}

/// Visual variant of the button.
public enum ConnectButtonVariant: String, CaseIterable {
    case primary
    case secondary
    case ghost
}

/// SwiftUI Connect Button component.
public struct ConnectButton: View {
    @EnvironmentObject private var onChainUX: Cinacoin
    
    /// Button text when disconnected.
    public var label: String
    /// Button visual variant.
    public var variant: ConnectButtonVariant
    /// Button size.
    public var size: ConnectButtonSize
    /// Show account balance when connected.
    public var showBalance: Bool
    /// Show avatar indicator when connected.
    public var showAvatar: Bool
    /// Show network badge when connected.
    public var showNetwork: Bool
    /// Click handler.
    public var onPress: (() -> Void)?
    /// Disconnect handler.
    public var onDisconnect: (() -> Void)?
    
    /// Create a ConnectButton with default settings.
    public init(
        label: String = "Connect Wallet",
        variant: ConnectButtonVariant = .primary,
        size: ConnectButtonSize = .medium,
        showBalance: Bool = false,
        showAvatar: Bool = false,
        showNetwork: Bool = false,
        onPress: (() -> Void)? = nil,
        onDisconnect: (() -> Void)? = nil
    ) {
        self.label = label
        self.variant = variant
        self.size = size
        self.showBalance = showBalance
        self.showAvatar = showAvatar
        self.showNetwork = showNetwork
        self.onPress = onPress
        self.onDisconnect = onDisconnect
    }
    
    public var body: some View {
        Button(action: handlePress) {
            if onChainUX.status == .connecting {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: buttonForegroundColor))
                    .frame(height: size.height)
            } else if case .connected = onChainUX.status, let account = onChainUX.account {
                HStack(spacing: 8) {
                    if showAvatar {
                        Circle()
                            .fill(Color.accentColor)
                            .frame(width: size.fontSize, height: size.fontSize)
                    }
                    Text(truncateAddress(account.address))
                        .font(.system(size: size.fontSize, weight: .medium, design: .monospaced))
                    if showBalance {
                        Text("\(account.balance) \(account.chainSymbol)")
                            .font(.system(size: size.fontSize - 2, weight: .regular))
                            .foregroundColor(onChainUX.themeColors.secondaryColor)
                    }
                    if showNetwork {
                        NetworkBadge(chainId: account.chainId)
                    }
                }
                .foregroundColor(buttonForegroundColor)
            } else if case .error = onChainUX.status {
                Text("❌ Error")
                    .foregroundColor(onChainUX.themeColors.errorColor)
                    .font(.system(size: size.fontSize, weight: .semibold))
            } else {
                Text(label)
                    .foregroundColor(buttonForegroundColor)
                    .font(.system(size: size.fontSize, weight: .semibold))
            }
        }
        .frame(height: size.height)
        .padding(.horizontal, size.horizontalPadding)
        .background(buttonBackgroundColor)
        .cornerRadius(24)
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(borderColor, lineWidth: needsBorder ? 1 : 0)
        )
        .disabled(onChainUX.status == .connecting)
        .accessibilityLabel(accessibilityLabel)
    }
    
    // MARK: - Styling
    
    private var buttonBackgroundColor: Color {
        let colors = onChainUX.themeColors
        switch (onChainUX.status, variant) {
        case (.connected, _), (_, .secondary):
            return Color(hex: colors.bgCard)
        case (.error(_), _):
            return Color(hex: colors.error).opacity(0.15)
        case (_, .ghost):
            return Color.clear
        default:
            return Color(hex: colors.accent500)
        }
    }
    
    private var buttonForegroundColor: Color {
        let colors = onChainUX.themeColors
        switch (onChainUX.status, variant) {
        case (.connected, _), (_, .secondary):
            return Color(hex: colors.textPrimary)
        case (.error(_), _):
            return Color(hex: colors.error)
        case (_, .ghost):
            return Color(hex: colors.textPrimary)
        default:
            return .white
        }
    }
    
    private var borderColor: Color {
        let colors = onChainUX.themeColors
        switch (onChainUX.status, variant) {
        case (.connected, _), (_, .secondary):
            return Color(hex: colors.border)
        default:
            return .clear
        }
    }
    
    private var needsBorder: Bool {
        switch (onChainUX.status, variant) {
        case (.connected, _), (_, .secondary):
            return true
        default:
            return false
        }
    }
    
    private var accessibilityLabel: String {
        if case .connected = onChainUX.status, let account = onChainUX.account {
            return "Connected as \(truncateAddress(account.address))"
        }
        return label
    }
    
    // MARK: - Actions
    
    private func handlePress() {
        if case .connected = onChainUX.status {
            Task {
                await onChainUX.disconnect()
                onDisconnect?()
            }
            return
        }
        
        Task {
            do {
                try await onChainUX.connect(connectorId: "metamask")
                onPress?()
            } catch {
                // Error state is handled by Cinacoin
            }
        }
    }
}

/// Network badge showing chain name.
private struct NetworkBadge: View {
    let chainId: Int
    
    var body: some View {
        Text(chainName(for: chainId))
            .font(.system(size: 10, weight: .medium))
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Color.accentColor.opacity(0.2))
            .cornerRadius(4)
    }
    
    private func chainName(for chainId: Int) -> String {
        switch chainId {
        case 1: return "ETH"
        case 137: return "POLY"
        case 42161: return "ARB"
        case 56: return "BSC"
        case 10: return "OP"
        default: return String(chainId)
        }
    }
}

// MARK: - Helpers

/// Truncate an Ethereum address for display.
func truncateAddress(_ address: String, prefix: Int = 4, suffix: Int = 4) -> String {
    guard address.count > prefix + suffix + 2 else { return address }
    let startIndex = address.index(address.startIndex, offsetBy: prefix + 2)
    let endIndex = address.index(address.endIndex, offsetBy: -suffix)
    return "\(address.prefix(prefix + 2))...\(address.suffix(suffix))"
}

/// Extension to create Color from hex string.
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6: // RGB
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

extension ThemeColors {
    var secondaryColor: Color { Color(hex: textSecondary) }
    var errorColor: Color { Color(hex: error) }
}
