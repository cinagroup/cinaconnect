/**
 * ConnectModal — Native React Native modal with real WalletConnect v2 deep linking.
 *
 * Integrates real WC v2 pairing via WalletConnectProvider, deep linking via
 * react-native Linking API, and the Cinacoin wallet registry for a real
 * connection flow with actual wallet apps.
 */
/** Wallet info for modal display. */
export interface WalletInfo {
    id: string;
    name: string;
    icon?: string;
    iconBackground?: string;
    description?: string;
    downloadUrl?: string;
    rdns?: string;
    deepLink?: string;
    universalLink?: string;
    appStoreUrl?: string;
    playStoreUrl?: string;
    supportsWalletConnect: boolean;
}
/** Props for the native ConnectModal. */
export interface ConnectModalProps {
    visible: boolean;
    onClose: () => void;
    views?: Array<'wallets' | 'social' | 'email' | 'scan'>;
    defaultView?: string;
    recommendedWalletIds?: string[];
    wallets?: WalletInfo[];
    wcUri?: string;
    fallbackTimeoutMs?: number;
}
/**
 * Native ConnectModal with real WC v2 deep linking.
 *
 * Flow:
 * 1. User selects a wallet
 * 2. Create pairing URI via WalletConnectProvider
 * 3. Open wallet app via deep link with WC URI
 * 4. Wait for session establishment via relay
 */
export declare function ConnectModal({ visible, onClose, defaultView, recommendedWalletIds, wallets, fallbackTimeoutMs, }: ConnectModalProps): JSX.Element;
export default ConnectModal;
//# sourceMappingURL=ConnectModal.d.ts.map