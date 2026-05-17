import React from 'react';
export interface WalletState {
    connected: boolean;
    address: string;
    chainId: number;
    walletId: string | null;
    connecting: boolean;
    error: string | null;
}
interface WalletContextValue extends WalletState {
    connectMetaMask: () => Promise<void>;
    connectWalletConnect: () => Promise<void>;
    disconnect: () => void;
    clearError: () => void;
}
export declare function useWallet(): WalletContextValue;
declare function formatAddress(addr: string): string;
declare global {
    interface Window {
        ethereum?: any;
    }
}
export declare const WalletProvider: React.FC<{
    children: React.ReactNode;
}>;
export { formatAddress };
//# sourceMappingURL=WalletContext.d.ts.map