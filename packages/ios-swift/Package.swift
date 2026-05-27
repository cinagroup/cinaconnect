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
    dependencies: [
        .package(url: "https://github.com/WalletConnect/WalletConnectSwiftV2.git", exact: "1.13.0"),
    ],
    targets: [
        .target(
            name: "OnChainUX",
            dependencies: [
                .product(name: "WalletConnect", package: "WalletConnectSwiftV2"),
                .product(name: "WalletConnectNetworking", package: "WalletConnectSwiftV2"),
            ],
            path: "Sources/OnChainUX",
            // Sources are automatically discovered under path:
            //   OnChainUX.swift, WalletManager.swift, ConnectButton.swift,
            //   ConnectModal.swift, DeepLinkHandler.swift, PushNotificationHandler.swift
            //   Auth/SIWE.swift
            //   ChainAdapter/SolanaAdapter.swift, ChainAdapter/EVMAdapter.swift
            //   WalletConnect/WCClient.swift, WalletConnect/WCUtils.swift
        ),
        .testTarget(
            name: "OnChainUXTests",
            dependencies: ["OnChainUX"],
            path: "Tests/OnChainUXTests"),
    ]
)
