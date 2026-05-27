/**
 * Cinacoin 钱包配置
 *
 * 预置的钱包列表，包含图标、RDNS、下载链接等信息。
 */
export interface WalletConfig {
    /** 钱包唯一标识 */
    id: string;
    /** 钱包名称 */
    name: string;
    /** 钱包图标 URL */
    icon: string;
    /** EIP-6963 反向 DNS */
    rdns: string;
    /** 下载链接 */
    downloadUrl: {
        ios?: string;
        android?: string;
        web?: string;
    };
    /** 支持的链 ID */
    supportedChains: number[];
}
export declare const defaultWallets: WalletConfig[];
/**
 * 按链 ID 筛选支持的钱包
 */
export declare function getWalletsForChain(chainId: number): WalletConfig[];
/**
 * 按 RDNS 查找钱包
 */
export declare function getWalletByRdns(rdns: string): WalletConfig | undefined;
//# sourceMappingURL=walletConfig.d.ts.map