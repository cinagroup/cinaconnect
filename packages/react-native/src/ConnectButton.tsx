/**
 * ConnectButton — Native React Native button with real WC v2 connection state.
 *
 * Uses native RN components and reads real connection state from
 * both CinaCoinProvider and WalletConnectProvider for accurate
 * account display, balance fetching, and disconnect handling.
 */

import React, { useCallback, useState } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useCinaCoinContext } from './CinaCoinProvider.js';
import { useWalletConnect, type BalanceState } from './WalletConnectProvider.js';

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

const SIZE_HEIGHT: Record<string, number> = { sm: 36, md: 44, lg: 52 };
const SIZE_PADDING: Record<string, number> = { sm: 16, md: 24, lg: 32 };
const SIZE_FONT: Record<string, number> = { sm: 12, md: 14, lg: 16 };

/** Truncate an Ethereum address. */
function truncateAddress(address: string, prefix = 4, suffix = 4): string {
  if (address.length <= prefix + suffix + 2) return address;
  return `${address.slice(0, prefix + 2)}...${address.slice(-suffix)}`;
}

/** Derive a chain short name from a chain ID. */
function chainName(chainId: number): string {
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
 * CinaCoinProvider. Supports balance fetching, network badge, avatar,
 * and real disconnect via WC session cleanup.
 */
export function ConnectButton({
  label = 'Connect Wallet',
  variant = 'primary',
  size = 'md',
  showBalance = false,
  showAvatar = false,
  showNetwork = false,
  style,
  textStyle,
  onPress,
  onDisconnect,
}: ConnectButtonProps): JSX.Element {
  const { account, status, connect, disconnect, themeColors } = useCinaCoinContext();

  // Try to get real WC v2 state (may not be available if not wrapped)
  let wcBalance: BalanceState | null = null;
  let wcSession = null;
  let wcDisconnect: (() => Promise<void>) | null = null;
  let wcFetching = false;

  try {
    const wc = useWalletConnect();
    wcBalance = wc.balance;
    wcSession = wc.session;
    wcDisconnect = wc.disconnect;
    wcFetching = wc.connecting;
  } catch {
    // WalletConnectProvider not in tree — use CinaCoinProvider only
  }

  const [fetchingBalance, setFetchingBalance] = useState(false);

  // Derive effective connected state
  const isConnected = status === 'connected' || wcSession !== null;
  const isConnecting = status === 'connecting' || wcFetching;
  const isError = status === 'error';

  const handlePress = useCallback(() => {
    if (isConnecting) return;

    if (isConnected) {
      // Toggle: disconnect via WC or CinaCoin
      if (wcDisconnect) {
        wcDisconnect().then(() => onDisconnect?.()).catch(() => {});
      } else {
        disconnect().then(() => onDisconnect?.()).catch(() => {});
      }
      return;
    }

    // Open connect flow — delegate to ConnectModal
    connect('walletconnect')
      .then(() => onPress?.())
      .catch(() => {});
  }, [isConnected, isConnecting, connect, disconnect, wcDisconnect, onPress, onDisconnect]);

  // Fetch balance on connect
  React.useEffect(() => {
    if (isConnected && showBalance && !wcBalance && !fetchingBalance) {
      setFetchingBalance(true);
      try {
        const wc = useWalletConnect();
        wc.fetchBalance()
          .catch(() => {})
          .finally(() => setFetchingBalance(false));
      } catch {
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

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { height, paddingHorizontal: padding, borderRadius: 24 },
        buttonStyle,
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={isConnecting}
      accessibilityRole="button"
      accessibilityLabel={
        isConnected
          ? `Connected as ${truncateAddress(displayAddress)}`
          : label
      }
    >
      {isConnecting ? (
        <ActivityIndicator color={buttonStyle.color ?? '#fff'} size="small" />
      ) : isConnected ? (
        <View style={styles.connectedContent}>
          {showAvatar && (
            <View style={[styles.avatar, { width: fontSize, height: fontSize }]} />
          )}
          <Text
            style={[
              styles.addressText,
              { fontSize, color: buttonStyle.color ?? themeColors.textPrimary },
              textStyle,
            ]}
          >
            {truncateAddress(displayAddress)}
          </Text>
          {showBalance && (
            <Text style={[styles.balanceText, { color: themeColors.textSecondary }]}>
              {displayBalance} {displaySymbol}
            </Text>
          )}
          {showNetwork && (
            <View style={[styles.networkBadge, { borderColor: themeColors.accent500 }]}>
              <Text style={[styles.networkBadgeText, { color: themeColors.accent500 }]}>
                {chainName(displayChainId)}
              </Text>
            </View>
          )}
        </View>
      ) : isError ? (
        <Text style={[styles.text, { fontSize, color: themeColors.error }, textStyle]}>
          ❌ Error
        </Text>
      ) : (
        <Text style={[styles.text, { fontSize, color: buttonStyle.color ?? '#fff' }, textStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

interface ButtonColors {
  bgCard: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  error: string;
  accent500: string;
}

function getButtonStyle(
  variant: string,
  isConnected: boolean,
  isError: boolean,
  colors: ButtonColors,
) {
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
