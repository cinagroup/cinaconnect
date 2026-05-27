// CinacoinExample/SwapView.swift
// Swap 交易视图

import SwiftUI

struct TokenInfo: Identifiable, Equatable {
    let id = UUID()
    let symbol: String
    let name: String
    let icon: String
}

struct SwapQuote {
    let toAmount: String
    let priceImpact: String
    let gasEstimate: String
    let provider: String
}

struct SwapView: View {
    @State private var fromToken = TokenInfo(symbol: "WETH", name: "Wrapped Ether", icon: "bitcoinsign.circle")
    @State private var toToken = TokenInfo(symbol: "USDC", name: "USD Coin", icon: "dollarsign.circle")
    @State private var fromAmount = ""
    @State private var slippage = 50
    @State private var quote: SwapQuote?
    @State private var isLoading = false

    let tokens = [
        TokenInfo(symbol: "WETH", name: "Wrapped Ether", icon: "bitcoinsign.circle"),
        TokenInfo(symbol: "USDC", name: "USD Coin", icon: "dollarsign.circle"),
        TokenInfo(symbol: "USDT", name: "Tether", icon: "dollarsign.circle.fill"),
        TokenInfo(symbol: "DAI", name: "Dai", icon: "circle.hexagongrid.fill"),
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // From
                VStack(alignment: .leading, spacing: 8) {
                    Text("From")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    HStack {
                        TextField("0.0", text: $fromAmount)
                            .keyboardType(.decimalPad)
                            .font(.title2)
                            .fontWeight(.semibold)

                        TokenSelector(tokens: tokens, selected: $fromToken)
                    }
                    .padding()
                    .background(Color(.secondarySystemGroupedBackground))
                    .cornerRadius(12)
                }

                // Swap Arrow
                Button(action: swapTokens) {
                    Image(systemName: "arrow.up.arrow.down")
                        .font(.title2)
                        .padding(12)
                        .background(Color(.secondarySystemGroupedBackground))
                        .clipShape(Circle())
                }

                // To
                VStack(alignment: .leading, spacing: 8) {
                    Text("To (estimated)")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    HStack {
                        Text(quote?.toAmount ?? "0.0")
                            .font(.title2)
                            .fontWeight(.semibold)
                            .foregroundColor(.secondary)

                        TokenSelector(tokens: tokens, selected: $toToken)
                    }
                    .padding()
                    .background(Color(.secondarySystemGroupedBackground))
                    .cornerRadius(12)
                }

                // Slippage
                VStack(alignment: .leading, spacing: 8) {
                    Text("Slippage Tolerance")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    HStack(spacing: 8) {
                        ForEach([10, 50, 100], id: \.self) { bps in
                            Button(action: { slippage = bps }) {
                                Text(String(format: "%.1f%%", Double(bps) / 100))
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 8)
                                    .background(slippage == bps ? Color.blue : Color(.secondarySystemGroupedBackground))
                                    .foregroundColor(slippage == bps ? .white : .primary)
                                    .cornerRadius(8)
                            }
                        }
                    }
                }

                // Quote
                if let quote = quote {
                    VStack(alignment: .leading, spacing: 8) {
                        QuoteRow(label: "Provider", value: quote.provider)
                        QuoteRow(label: "Price Impact", value: quote.priceImpact)
                        QuoteRow(label: "Gas", value: quote.gasEstimate)
                        QuoteRow(
                            label: "Minimum Received",
                            value: String(format: "%.2f %@", Double(quote.toAmount)! * (1 - Double(slippage) / 10000), toToken.symbol)
                        )
                    }
                    .padding()
                    .background(Color(.secondarySystemGroupedBackground))
                    .cornerRadius(12)
                }

                // Action
                Button(action: quote != nil ? executeSwap : getQuote) {
                    Text(quote != nil ? "Swap \(fromAmount) \(fromToken.symbol)" : "Get Quote")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                }
                .disabled(fromAmount.isEmpty)
            }
            .padding()
        }
        .navigationTitle("Swap")
    }

    private func swapTokens() {
        let temp = fromToken
        fromToken = toToken
        toToken = temp
        fromAmount = ""
        quote = nil
    }

    private func getQuote() {
        isLoading = true
        // Simulate quote fetch
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            if let amount = Double(fromAmount) {
                quote = SwapQuote(
                    toAmount: String(format: "%.2f", amount * 3000),
                    priceImpact: "0.12%",
                    gasEstimate: "~0.003 ETH",
                    provider: "Uniswap V3"
                )
            }
            isLoading = false
        }
    }

    private func executeSwap() {
        // Execute swap transaction
        print("Swap: \(fromAmount) \(fromToken.symbol) → \(toToken.symbol)")
    }
}

struct TokenSelector: View {
    let tokens: [TokenInfo]
    @Binding var selected: TokenInfo

    var body: some View {
        Menu {
            ForEach(tokens) { token in
                Button(action: { selected = token }) {
                    Label(token.symbol, systemImage: token.icon)
                }
            }
        } label: {
            Label(selected.symbol, systemImage: selected.icon)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(.systemGray5))
                .cornerRadius(20)
        }
    }
}

struct QuoteRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.medium)
        }
    }
}
