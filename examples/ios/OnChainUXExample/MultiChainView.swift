// CinacoinExample/MultiChainView.swift
// 多链资产总览视图

import SwiftUI

struct ChainBalance: Identifiable {
    let id: Int
    let name: String
    let symbol: String
    let balance: String
    let usdValue: String
    let icon: String
}

struct MultiChainView: View {
    let chains: [ChainBalance] = [
        .init(id: 1, name: "Ethereum", symbol: "ETH", balance: "1.2345", usdValue: "$3,703.50", icon: "🔷"),
        .init(id: 137, name: "Polygon", symbol: "MATIC", balance: "500.00", usdValue: "$450.00", icon: "🟣"),
        .init(id: 42161, name: "Arbitrum", symbol: "ETH", balance: "0.5000", usdValue: "$1,500.00", icon: "🔵"),
    ]

    @State private var selectedChainId = 1

    var selectedChain: ChainBalance? {
        chains.first { $0.id == selectedChainId }
    }

    var body: some View {
        List {
            // 总资产卡片
            Section {
                VStack(spacing: 4) {
                    Text("总资产估值")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("$5,653.50")
                        .font(.system(size: 32, weight: .bold))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
            }

            // 各链资产
            Section("各链资产") {
                ForEach(chains) { chain in
                    HStack {
                        Text(chain.icon)
                            .font(.title2)

                        VStack(alignment: .leading) {
                            Text(chain.name)
                                .fontWeight(.medium)
                            Text("\(chain.balance) \(chain.symbol)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        Spacer()

                        Text(chain.usdValue)
                            .fontWeight(.semibold)
                    }
                    .contentShape(Rectangle())
                    .onTapGesture {
                        selectedChainId = chain.id
                    }
                    .background(selectedChainId == chain.id ? Color.blue.opacity(0.1) : Color.clear)
                }
            }

            // 网络详情
            if let chain = selectedChain {
                Section("网络详情") {
                    DetailRow(label: "网络", value: "\(chain.icon) \(chain.name)")
                    DetailRow(label: "Chain ID", value: "\(chain.id)")
                    DetailRow(label: "余额", value: "\(chain.balance) \(chain.symbol)")
                    DetailRow(label: "估值", value: chain.usdValue)
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("多链资产")
    }
}

struct DetailRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
        }
    }
}
