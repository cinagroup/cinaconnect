# Cinacoin iOS Example

> iOS 原生 Swift 示例，展示 Cinacoin iOS SDK 集成。

## 目录结构

```
CinacoinExample.xcodeproj/    # Xcode 项目文件
CinacoinExample/
├── ContentView.swift          # 主视图 (TabView)
├── ConnectView.swift          # 连接视图
├── SwapView.swift             # Swap 视图
└── MultiChainView.swift       # 多链资产总览
```

## 运行

1. 用 **Xcode 15+** 打开 `CinacoinExample.xcodeproj`
2. 选择目标设备（模拟器或真机）
3. 点击 **Run** (⌘R)

## 要求

- **iOS 15+**
- **Xcode 15+**
- **Swift 5.9+**

## 功能

- **ConnectView** — 钱包列表、连接/断开、状态显示
- **SwapView** — Token 选择、报价、滑点设置
- **MultiChainView** — 多链资产总览、链切换
- **Deep Link** — 处理钱包回调

## 快速集成

```swift
import Cinacoin

// 初始化
let config = CinacoinConfig(
    projectId: "your-project-id",
    relayUrl: "wss://relay.yourdomain.com/v1",
    chains: [
        Chain(id: 1, name: "Ethereum", symbol: "ETH"),
        Chain(id: 137, name: "Polygon", symbol: "MATIC"),
    ]
)

Cinacoin.shared.configure(with: config)
```
