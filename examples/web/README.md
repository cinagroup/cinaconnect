# Cinacoin Web Example

> 完整的 Web dApp 示例，展示 Cinacoin 核心功能。

## 功能

- **钱包连接** — ConnectButton、ConnectModal、连接状态管理
- **Swap 交易** — Token 选择、报价获取、滑点设置、交易提交
- **多链切换** — ChainSwitcher、跨链资产展示
- **SIWE 认证** — EIP-4361 消息生成、钱包签名、认证流程

## 运行

```bash
npm install
npm run dev
```

访问 `http://localhost:5173`

## 技术栈

- React 18 + TypeScript
- Vite
- Cinacoin Core SDK + React Adapter
