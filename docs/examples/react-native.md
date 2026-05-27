# React Native 示例

> 移动端 React Native 示例，展示 Cinacoin 移动端集成。

## 目录结构

```
examples/react-native/
├── App.tsx                         # 主应用
├── screens/
│   ├── ConnectScreen.tsx           # 连接页面
│   ├── SwapScreen.tsx              # Swap 页面
│   └── MultiChainScreen.tsx        # 多链页面
├── components/
│   └── WalletList.tsx              # 钱包列表组件
├── utils/
│   └── walletConfig.ts             # 钱包配置
└── README.md
```

## 运行示例

```bash
cd examples/react-native

# 安装依赖
npm install

# iOS
cd ios && pod install && cd ..
npx react-native run-ios

# Android
npx react-native run-android
```

## 功能说明

### 1. 连接页面 (`ConnectScreen`)

展示移动端钱包连接流程：

- 已安装钱包列表（EIP-6963 发现）
- QR 码扫描连接
- 社交登录入口
- 邮箱登录入口

### 2. Swap 页面 (`SwapScreen`)

移动端 Swap UI：

- Token 选择器（带搜索）
- 金额输入
- 实时报价显示
- 滑点设置
- 确认弹窗

### 3. 多链页面 (`MultiChainScreen`)

多链资产总览：

- 各链余额汇总
- 链切换器
- 资产分布饼图

### 4. 钱包列表 (`WalletList`)

可复用的钱包列表组件：

- 推荐钱包置顶
- 已安装标记
- 下载链接（未安装时）
- 图标缓存

### 5. 钱包配置 (`walletConfig.ts`)

预置的钱包配置数据：

```typescript
export interface WalletConfig {
  id: string
  name: string
  icon: string
  rdns: string
  downloadUrl: {
    ios?: string
    android?: string
  }
  supportedChains: number[]
}

export const defaultWallets: WalletConfig[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: 'https://example.com/metamask.png',
    rdns: 'io.metamask',
    downloadUrl: {
      ios: 'https://apps.apple.com/app/metamask/id1438144202',
      android: 'https://play.google.com/store/apps/details?id=io.metamask',
    },
    supportedChains: [1, 137, 42161, 10],
  },
  // ...
]
```

## 移动端特有功能

- **Deep Link 处理**：处理钱包 App 回调
- **Push 通知注册**：APNs / FCM
- **原生相机集成**：QR 码扫描
- **生物识别**：Face ID / Touch ID 签名确认
- **安全存储**：Keychain / Keystore 存储会话
