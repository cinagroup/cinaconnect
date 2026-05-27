// CinacoinExample/ConnectView.swift
// 钱包连接视图

import SwiftUI

struct ConnectView: View {
    @ObservedObject var cinacoin = Cinacoin.shared
    @State private var showWalletSheet = false

    let wallets: [WalletInfo] = [
        .init(id: "metamask", name: "MetaMask", icon: "bitcoinsign.circle", installed: true, recommended: true),
        .init(id: "rainbow", name: "Rainbow", icon: "cloud.rainbow", installed: true, recommended: true),
        .init(id: "coinbase", name: "Coinbase Wallet", icon: "building.columns", installed: false, recommended: false),
        .init(id: "trust", name: "Trust Wallet", icon: "shield.checkered", installed: false, recommended: false),
        .init(id: "walletconnect", name: "WalletConnect", icon: "link", installed: false, recommended: false),
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // 状态卡片
                VStack(alignment: .leading, spacing: 12) {
                    Text("连接状态")
                        .font(.headline)

                    HStack {
                        Text("状态")
                        Spacer()
                        statusBadge
                    }

                    HStack {
                        Text("地址")
                        Spacer()
                        Text(cinacoin.account.map { truncated($0) } ?? "未连接")
                            .font(.system(.body, design: .monospaced))
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
                .background(Color(.secondarySystemGroupedBackground))
                .cornerRadius(12)

                // 连接按钮
                Button(action: { showWalletSheet = true }) {
                    HStack {
                        Image(systemName: "link")
                        Text(cinacoin.isConnected ? "更换钱包" : "连接钱包")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }

                // 断开连接
                if cinacoin.isConnected {
                    Button(action: {
                        Task { await cinacoin.disconnect() }
                    }) {
                        Text("断开连接")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.red.opacity(0.1))
                            .foregroundColor(.red)
                            .cornerRadius(12)
                    }
                }

                // 钱包列表
                if showWalletSheet {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("选择钱包")
                            .font(.headline)
                            .padding(.horizontal)

                        ForEach(wallets) { wallet in
                            WalletRow(wallet: wallet)
                                .onTapGesture {
                                    showWalletSheet = false
                                    Task { await cinacoin.connect(walletId: wallet.id) }
                                }
                        }
                    }
                    .padding(.vertical)
                }
            }
            .padding()
        }
        .navigationTitle("钱包连接")
    }

    private var statusBadge: some View {
        HStack {
            Circle()
                .fill(cinacoin.isConnected ? Color.green : Color.gray)
                .frame(width: 8, height: 8)
            Text(cinacoin.isConnected ? "已连接" : "未连接")
                .foregroundColor(.secondary)
        }
    }

    private func truncated(_ address: String) -> String {
        let prefix = String(address.prefix(6))
        let suffix = String(address.suffix(4))
        return "\(prefix)...\(suffix)"
    }
}

struct WalletInfo: Identifiable {
    let id: String
    let name: String
    let icon: String
    let installed: Bool
    let recommended: Bool
}

struct WalletRow: View {
    let wallet: WalletInfo

    var body: some View {
        HStack {
            Image(systemName: wallet.icon)
                .font(.title2)
                .frame(width: 40, height: 40)
                .background(Color(.systemGray5))
                .clipShape(Circle())

            VStack(alignment: .leading) {
                HStack {
                    Text(wallet.name)
                        .fontWeight(.medium)

                    if wallet.recommended {
                        Text("推荐")
                            .font(.caption)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(4)
                    }
                }

                if !wallet.installed {
                    Text("点击安装")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .foregroundColor(.secondary)
                .font(.caption)
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }
}
