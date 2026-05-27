import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ConnectButton — Native React Native button with real WC v2 connection state.
 *
 * Uses native RN components and reads real connection state from
 * both CinacoinProvider and WalletConnectProvider for accurate
 * account display, balance fetching, and disconnect handling.
 */
import React, { useCallback, useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator, } from 'react-native';
import { useCinacoinContext } from './CinacoinProvider.js';
import { useWalletConnect } from './WalletConnectProvider.js';
const SIZE_HEIGHT = { sm: 36, md: 44, lg: 52 };
const SIZE_PADDING = { sm: 16, md: 24, lg: 32 };
const SIZE_FONT = { sm: 12, md: 14, lg: 16 };
/** Truncate an Ethereum address. */
function truncateAddress(address, prefix = 4, suffix = 4) {
    if (address.length <= prefix + suffix + 2)
        return address;
    return `${address.slice(0, prefix + 2)}...${address.slice(-suffix)}`;
}
/** Derive a chain short name from a chain ID. */
function chainName(chainId) {
    switch (chainId) {
        case 1: return 'ETH';
        case 137: return 'POLY';
        case 42161: return 'ARB';
        case 56: return 'BSC';
        case 10: return 'OP';
        case 8453: return 'BASE';
        default: return String(chainId);
    }
}
/**
 * Native ConnectButton for React Native with real WC v2 state.
 *
 * Reads connection state from WalletConnectProvider (if available) and
 * CinacoinProvider. Supports balance fetching, network badge, avatar,
 * and real disconnect via WC session cleanup.
 */
export function ConnectButton({ label = 'Connect Wallet', variant = 'primary', size = 'md', showBalance = false, showAvatar = false, showNetwork = false, style, textStyle, onPress, onDisconnect, }) {
    const { account, status, connect, disconnect, themeColors } = useCinacoinContext();
    // Try to get real WC v2 state (may not be available if not wrapped)
    let wcBalance = null;
    let wcSession = null;
    let wcDisconnect = null;
    let wcFetching = false;
    try {
        const wc = useWalletConnect();
        wcBalance = wc.balance;
        wcSession = wc.session;
        wcDisconnect = wc.disconnect;
        wcFetching = wc.connecting;
    }
    catch {
        // WalletConnectProvider not in tree — use CinacoinProvider only
    }
    const [fetchingBalance, setFetchingBalance] = useState(false);
    // Derive effective connected state
    const isConnected = status === 'connected' || wcSession !== null;
    const isConnecting = status === 'connecting' || wcFetching;
    const isError = status === 'error';
    const handlePress = useCallback(() => {
        if (isConnecting)
            return;
        if (isConnected) {
            // Toggle: disconnect via WC or Cinacoin
            if (wcDisconnect) {
                wcDisconnect().then(() => onDisconnect?.()).catch(() => { });
            }
            else {
                disconnect().then(() => onDisconnect?.()).catch(() => { });
            }
            return;
        }
        // Open connect flow — delegate to ConnectModal
        connect('walletconnect')
            .then(() => onPress?.())
            .catch(() => { });
    }, [isConnected, isConnecting, connect, disconnect, wcDisconnect, onPress, onDisconnect]);
    // Fetch balance on connect
    React.useEffect(() => {
        if (isConnected && showBalance && !wcBalance && !fetchingBalance) {
            setFetchingBalance(true);
            try {
                const wc = useWalletConnect();
                wc.fetchBalance()
                    .catch(() => { })
                    .finally(() => setFetchingBalance(false));
            }
            catch {
                setFetchingBalance(false);
            }
        }
    }, [isConnected, showBalance, wcBalance, fetchingBalance]);
    // Use real balance from WC if available
    const displayBalance = wcBalance?.balance ?? account?.balance;
    const displaySymbol = wcBalance?.symbol ?? account?.chainSymbol ?? '';
    const displayAddress = account?.address ?? '';
    const displayChainId = account?.chainId ?? 1;
    const buttonStyle = getButtonStyle(variant, isConnected, isError, themeColors);
    const height = SIZE_HEIGHT[size] ?? 44;
    const padding = SIZE_PADDING[size] ?? 24;
    const fontSize = SIZE_FONT[size] ?? 14;
    return (_jsx(TouchableOpacity, { style: [
            styles.button,
            { height, paddingHorizontal: padding, borderRadius: 24 },
            buttonStyle,
            style,
        ], onPress: handlePress, activeOpacity: 0.7, disabled: isConnecting, accessibilityRole: "button", accessibilityLabel: isConnected
            ? `Connected as ${truncateAddress(displayAddress)}`
            : label, children: isConnecting ? (_jsx(ActivityIndicator, { color: buttonStyle.color ?? '#fff', size: "small" })) : isConnected ? (_jsxs(View, { style: styles.connectedContent, children: [showAvatar && (_jsx(View, { style: [styles.avatar, { width: fontSize, height: fontSize }] })), _jsx(Text, { style: [
                        styles.addressText,
                        { fontSize, color: buttonStyle.color ?? themeColors.textPrimary },
                        textStyle,
                    ], children: truncateAddress(displayAddress) }), showBalance && (_jsxs(Text, { style: [styles.balanceText, { color: themeColors.textSecondary }], children: [displayBalance, " ", displaySymbol] })), showNetwork && (_jsx(View, { style: [styles.networkBadge, { borderColor: themeColors.accent500 }], children: _jsx(Text, { style: [styles.networkBadgeText, { color: themeColors.accent500 }], children: chainName(displayChainId) }) }))] })) : isError ? (_jsx(Text, { style: [styles.text, { fontSize, color: themeColors.error }, textStyle], children: "\u274C Error" })) : (_jsx(Text, { style: [styles.text, { fontSize, color: buttonStyle.color ?? '#fff' }, textStyle], children: label })) }));
}
function getButtonStyle(variant, isConnected, isError, colors) {
    if (isConnected || variant === 'secondary') {
        return {
            backgroundColor: colors.bgCard,
            borderWidth: 1,
            borderColor: colors.border,
            color: colors.textPrimary,
        };
    }
    if (isError) {
        return {
            backgroundColor: colors.error + '26',
            color: colors.error,
        };
    }
    if (variant === 'ghost') {
        return {
            backgroundColor: 'transparent',
            color: colors.textPrimary,
        };
    }
    return {
        backgroundColor: colors.accent500,
        color: '#FFFFFF',
    };
}
const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    text: {
        fontWeight: '600',
        textAlign: 'center',
    },
    connectedContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    avatar: {
        borderRadius: 12,
        backgroundColor: '#3B82F6',
    },
    addressText: {
        fontFamily: 'monospace',
        fontWeight: '500',
    },
    balanceText: {
        fontSize: 12,
    },
    networkBadge: {
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    networkBadgeText: {
        fontSize: 10,
        fontWeight: '600',
    },
});
export default ConnectButton;
//# sourceMappingURL=ConnectButton.js.map