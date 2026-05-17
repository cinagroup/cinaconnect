# iOS 示例

> iOS 原生 Swift 示例，展示 CinaConnect iOS SDK 集成。

## 目录结构

```
examples/ios/
├── CinaConnectExample.xcodeproj/     # Xcode 项目
├── CinaConnectExample/
│   ├── ContentView.swift           # 主视图
│   ├── ConnectView.swift           # 连接视图
│   └── SwapView.swift              # Swap 视图
└── README.md
```

## 运行示例

1. 用 Xcode 打开 `CinaConnectExample.xcodeproj`
2. 选择目标设备（模拟器或真机）
3. 点击 Run (⌘R)

## 要求

- **iOS 15+**
- **Xcode 15+**
- **Swift 5.9+**

## 功能说明

### 1. ContentView

主视图，使用 SwiftUI 构建：

- 导航结构
- 连接状态展示
- 页面切换

### 2. ConnectView

钱包连接界面：

- 钱包列表（UITableView）
- QR 码扫描
- 连接状态指示器
- 错误处理

### 3. SwapView

Swap 操作界面：

- Token 选择
- 金额输入
- 报价展示
- 确认和提交

## iOS SDK 使用

```swift
import CinaConnect

// 初始化
let config = CinaConnectConfig(
    projectId: "your-project-id",
    relayUrl: "wss://relay.yourdomain.com/v1",
    chains: [
        Chain(id: 1, name: "Ethereum", symbol: "ETH"),
        Chain(id: 137, name: "Polygon", symbol: "MATIC"),
    ]
)

let cinaconnect = CinaConnect(config: config)

// 连接
cinaconnect.connect(walletId: "metamask") { result in
    switch result {
    case .success(let connection):
        print("Connected: \(connection.address)")
    case .failure(let error):
        print("Error: \(error)")
    }
}

// 监听状态
cinaconnect.onAccountChange { address in
    print("Account changed: \(address)")
}
```

## Deep Link 配置

在 `Info.plist` 中添加 URL Scheme：

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.cinaconnect.example</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>cinaconnect-example</string>
        </array>
    </dict>
</array>
```
