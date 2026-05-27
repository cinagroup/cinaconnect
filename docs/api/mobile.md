# Mobile SDK API

> `@cinacoin/react-native` — React Native 移动端 SDK 参考。

## 概述

Cinacoin React Native SDK 提供原生的移动端钱包连接体验，使用 React Native 原生组件而非 Web 包装。

## 安装

```bash
npm install @cinacoin/core @cinacoin/react-native

# iOS
cd ios && pod install && cd ..

# 如果需要使用 QR 扫码功能
npm install react-native-camera
# 或 react-native-vision-camera (推荐)
```

## CinacoinProvider

```tsx
import { CinacoinProvider } from '@cinacoin/react-native'

function App() {
  return (
    <CinacoinProvider
      config={{
        projectId: 'your-project-id',
        relayUrl: 'wss://relay.yourdomain.com/v1',
        chains: [mainnet, polygon],
        metadata: {
          name: 'My dApp Mobile',
          description: 'Mobile dApp',
          url: 'https://mydapp.com',
          icons: ['https://mydapp.com/icon.png'],
        },
      }}
    >
      <Navigation />
    </CinacoinProvider>
  )
}
```

### Config

与 Web SDK 相同，见 [配置文档](/guide/configuration)。

## ConnectButton

移动端连接按钮。

```tsx
import { ConnectButton } from '@cinacoin/react-native'

<ConnectButton
  onPress={() => setShowModal(true)}
  account={account}
  balance={balance}
  variant="primary"
  size="md"
/>
```

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `onPress` | `() => void` | ✅ | 点击回调 |
| `account` | `string \| null` | — | 当前账户地址 |
| `balance` | `string \| null` | — | 账户余额 |
| `variant` | `'primary' \| 'secondary' \| 'ghost'` | `'primary'` | 按钮样式 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 按钮尺寸 |
| `style` | `ViewStyle` | — | 自定义样式 |

## ConnectModal

移动端连接弹窗。

```tsx
import { ConnectModal } from '@cinacoin/react-native'

<ConnectModal
  visible={showModal}
  onClose={() => setShowModal(false)}
  wallets={wallets}
  onWalletSelect={handleWalletSelect}
/>
```

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `visible` | `boolean` | ✅ | 是否显示 |
| `onClose` | `() => void` | ✅ | 关闭回调 |
| `wallets` | `WalletInfo[]` | ✅ | 钱包列表 |
| `onWalletSelect` | `(wallet: WalletInfo) => void` | ✅ | 选择钱包回调 |
| `views` | `Array<'wallets' \| 'qr'>` | `['wallets', 'qr']` | 连接方式 |

### 扫码连接

```tsx
import { Camera } from 'react-native-camera'

function handleWalletSelect(wallet: WalletInfo) {
  if (wallet.type === 'qr') {
    // 打开相机扫码
    launchCamera({
      onScan: (uri: string) => {
        connectViaWalletConnect(uri)
      },
    })
  } else if (wallet.type === 'injected') {
    // 使用注入的钱包（如 MetaMask Mobile Browser）
    connectInjected(wallet)
  } else if (wallet.type === 'walletconnect') {
    // 通过 WalletConnect 连接
    connectWalletConnect(wallet)
  }
}
```

## WalletList

钱包列表组件。

```tsx
import { WalletList } from '@cinacoin/react-native'

<WalletList
  wallets={wallets}
  onSelect={(wallet) => handleSelect(wallet)}
  recommended={['metamask', 'rainbow', 'coinbase']}
/>
```

## ChainSwitcher

移动端链切换器。

```tsx
import { ChainSwitcher } from '@cinacoin/react-native'

<ChainSwitcher
  chains={chains}
  activeChainId={chainId}
  onChainChange={(chainId) => switchChain(chainId)}
/>
```

## useCinacoin Hook

```tsx
import { useCinacoin } from '@cinacoin/react-native'

function MobileComponent() {
  const {
    account,
    chainId,
    status,
    connectors,
    connect,
    disconnect,
    switchChain,
    signMessage,
    balance,
  } = useCinacoin()

  // ...
}
```

## Deep Link 处理

```tsx
import { Linking } from 'react-native'
import { useCinacoin } from '@cinacoin/react-native'

function App() {
  const { handleDeepLink } = useCinacoin()

  useEffect(() => {
    // 处理 URL（钱包回调）
    const handleUrl = (url: string) => {
      handleDeepLink(url)
    }

    Linking.addEventListener('url', ({ url }) => handleUrl(url))
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url)
    })

    return () => {
      Linking.removeEventListener('url', handleUrl)
    }
  }, [])

  return <Navigation />
}
```

## Push 通知

```tsx
import { setupPushNotifications } from '@cinacoin/react-native'

// 注册 Push Token
async function registerPush() {
  const pushToken = await registerForPushNotifications()

  await setupPushNotifications({
    token: pushToken,
    platform: Platform.OS === 'ios' ? 'apns' : 'fcm',
  })
}
```
