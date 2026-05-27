// CinacoinExample/ContentView.swift
// 主视图 — 使用 TabView 组织各功能页面

import SwiftUI

struct ContentView: View {
    @StateObject var cinacoin = Cinacoin.shared

    var body: some View {
        TabView {
            NavigationStack {
                ConnectView()
            }
            .tabItem {
                Image(systemName: "link")
                Text("连接")
            }

            NavigationStack {
                SwapView()
            }
            .tabItem {
                Image(systemName: "arrow.2.squarepath")
                Text("Swap")
            }

            NavigationStack {
                MultiChainView()
            }
            .tabItem {
                Image(systemName: "circle.grid.3x3")
                Text("多链")
            }
        }
        .tint(Color.blue)
        .onOpenURL { url in
            // 处理 Deep Link（钱包回调）
            Cinacoin.shared.handleDeepLink(url)
        }
    }
}

#Preview {
    ContentView()
}
