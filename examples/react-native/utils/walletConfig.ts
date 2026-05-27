/**
 * Cinacoin 钱包配置
 *
 * 预置的钱包列表，包含图标、RDNS、下载链接等信息。
 */

export interface WalletConfig {
  /** 钱包唯一标识 */
  id: string
  /** 钱包名称 */
  name: string
  /** 钱包图标 URL */
  icon: string
  /** EIP-6963 反向 DNS */
  rdns: string
  /** 下载链接 */
  downloadUrl: {
    ios?: string
    android?: string
    web?: string
  }
  /** 支持的链 ID */
  supportedChains: number[]
}

export const defaultWallets: WalletConfig[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: 'https://example.com/icons/metamask.png',
    rdns: 'io.metamask',
    downloadUrl: {
      ios: 'https://apps.apple.com/app/metamask/id1438144202',
      android: 'https://play.google.com/store/apps/details?id=io.metamask',
    },
    supportedChains: [1, 137, 42161, 10, 56],
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    icon: 'https://example.com/icons/rainbow.png',
    rdns: 'me.rainbow',
    downloadUrl: {
      ios: 'https://apps.apple.com/app/rainbow-wallet/id1457119021',
      android: 'https://play.google.com/store/apps/details?id=me.rainbow',
    },
    supportedChains: [1, 137, 42161, 10],
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: 'https://example.com/icons/coinbase.png',
    rdns: 'com.coinbase.wallet',
    downloadUrl: {
      ios: 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
      android: 'https://play.google.com/store/apps/details?id=org.toshi',
    },
    supportedChains: [1, 137, 42161, 10, 56, 8453],
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: 'https://example.com/icons/trust.png',
    rdns: 'com.trustwallet.app',
    downloadUrl: {
      ios: 'https://apps.apple.com/app/trust-crypto-wallet/id1288339409',
      android: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
    },
    supportedChains: [1, 137, 56, 42161],
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: 'https://example.com/icons/walletconnect.png',
    rdns: '',
    downloadUrl: {},
    supportedChains: [],
  },
]

/**
 * 按链 ID 筛选支持的钱包
 */
export function getWalletsForChain(chainId: number): WalletConfig[] {
  return defaultWallets.filter(
    (w) =>
      w.supportedChains.length === 0 || w.supportedChains.includes(chainId)
  )
}

/**
 * 按 RDNS 查找钱包
 */
export function getWalletByRdns(rdns: string): WalletConfig | undefined {
  return defaultWallets.find((w) => w.rdns === rdns)
}
