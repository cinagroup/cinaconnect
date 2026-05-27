/**
 * ConnectButton — Native React Native button with real WC v2 connection state.
 *
 * Uses native RN components and reads real connection state from
 * both CinacoinProvider and WalletConnectProvider for accurate
 * account display, balance fetching, and disconnect handling.
 */
import { type ViewStyle, type TextStyle } from 'react-native';
/** Props for the native ConnectButton. */
export interface ConnectButtonProps {
    /** Button text when disconnected. */
    label?: string;
    /** Button visual variant. */
    variant?: 'primary' | 'secondary' | 'ghost';
    /** Button size. */
    size?: 'sm' | 'md' | 'lg';
    /** Show account balance when connected. */
    showBalance?: boolean;
    /** Show avatar when connected. */
    showAvatar?: boolean;
    /** Show network badge when connected. */
    showNetwork?: boolean;
    /** Style override for the button container. */
    style?: ViewStyle;
    /** Style override for button text. */
    textStyle?: TextStyle;
    /** Click handler. */
    onPress?: () => void;
    /** Disconnect handler. */
    onDisconnect?: () => void;
}
/**
 * Native ConnectButton for React Native with real WC v2 state.
 *
 * Reads connection state from WalletConnectProvider (if available) and
 * CinacoinProvider. Supports balance fetching, network badge, avatar,
 * and real disconnect via WC session cleanup.
 */
export declare function ConnectButton({ label, variant, size, showBalance, showAvatar, showNetwork, style, textStyle, onPress, onDisconnect, }: ConnectButtonProps): JSX.Element;
export default ConnectButton;
//# sourceMappingURL=ConnectButton.d.ts.map