// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "OnChainUX",
    platforms: [
        .iOS(.v15),
        .macOS(.v12),
    ],
    products: [
        .library(
            name: "OnChainUX",
            targets: ["OnChainUX"]),
    ],
    dependencies: [],
    targets: [
        .target(
            name: "OnChainUX",
            dependencies: [],
            path: "Sources/OnChainUX",
            // Include WalletConnect v2 module files
            sources: [
                "OnChainUX.swift",
                "WalletManager.swift",
                "ConnectButton.swift",
                "ConnectModal.swift",
                "DeepLinkHandler.swift",
                "PushNotificationHandler.swift",
                "Auth/SIWE.swift",
                "ChainAdapter/SolanaAdapter.swift",
                "ChainAdapter/EVMAdapter.swift",
                "WalletConnect/WCClient.swift",
                "WalletConnect/WCUtils.swift",
            ]),
        .testTarget(
            name: "OnChainUXTests",
            dependencies: ["OnChainUX"],
            path: "Tests/OnChainUXTests"),
    ]
)
