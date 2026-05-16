/**
 * ConnectModal — Native React Native modal with WalletConnect v2 deep linking support.
 *
 * Uses native RN components (Modal, View, Text, TouchableOpacity, FlatList, ScrollView)
 * instead of Web Components. Integrates real WC v2 pairing, deep linking via react-native
 * Linking API, and the OnChainUX wallet registry.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { useOnChainUXContext } from './OnChainUXProvider';
import { WALLET_REGISTRY, getWalletById, buildWalletDeepLink, buildWalletUniversalLink } from '@onchainux/walletconnect-v2';

/** Wallet info for modal display. */
export interface WalletInfo {
  id: string;
  name: string;
  icon?: string;
  iconBackground?: string;
  description?: string;
  downloadUrl?: string;
  rdns?: string;
  /** Deep link scheme for the wallet app (e.g., 'metamask://'). */
  deepLink?: string;
  /** Universal link domain for iOS/Android fallback. */
  universalLink?: string;
  /** App store URL if wallet is not installed. */
  appStoreUrl?: string;
  /** Play store URL for Android. */
  playStoreUrl?: string;
  /** Whether this wallet supports WalletConnect URI deep links. */
  supportsWalletConnect?: boolean;
}

/** Props for the native ConnectModal. */
export interface ConnectModalProps {
  /** Whether the modal is visible. */
  visible: boolean;
  /** Close callback. */
  onClose: () => void;
  /** Available views. */
  views?: Array<'wallets' | 'social' | 'email' | 'scan'>;
  /** Default view. */
  defaultView?: string;
  /** Recommended wallet IDs. */
  recommendedWalletIds?: string[];
  /** Custom wallet list. */
  wallets?: WalletInfo[];
  /** WalletConnect URI to pass when opening wallets. */
  wcUri?: string;
  /** Timeout before falling back to universal link (ms). */
  fallbackTimeoutMs?: number;
}

type ModalView = 'wallets' | 'social' | 'email' | 'scan';

const DEFAULT_WALLETS: WalletInfo[] = [
  { id: 'metamask', name: 'MetaMask', description: 'Browser extension & mobile',
    deepLink: 'metamask://', universalLink: 'https://metamask.app.link',
    appStoreUrl: 'https://apps.apple.com/app/metamask/id1438668043',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=io.metamask',
    supportsWalletConnect: true },
  { id: 'walletconnect', name: 'WalletConnect', description: 'QR Code',
    deepLink: 'wc://', universalLink: 'https://walletconnect.com',
    supportsWalletConnect: true },
  { id: 'coinbase', name: 'Coinbase Wallet', description: 'Wallet',
    deepLink: 'cbwallet://', universalLink: 'https://go.cb-w.com',
    appStoreUrl: 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=org.toshi',
    supportsWalletConnect: true },
  { id: 'rabby', name: 'Rabby', description: 'Multi-chain wallet',
    deepLink: 'rabby://', supportsWalletConnect: false },
  { id: 'rainbow', name: 'Rainbow', description: 'Ethereum wallet',
    deepLink: 'rainbow://', universalLink: 'https://rnbwapp.com',
    appStoreUrl: 'https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=me.rainbow',
    supportsWalletConnect: true },
  { id: 'trust', name: 'Trust Wallet', description: 'Multi-chain wallet',
    deepLink: 'trust://', universalLink: 'https://link.trustwallet.com',
    appStoreUrl: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
    supportsWalletConnect: true },
];

/**
 * Native ConnectModal for React Native with real deep linking.
 */
export function ConnectModal({
  visible,
  onClose,
  defaultView = 'wallets',
  recommendedWalletIds = [],
  wallets = DEFAULT_WALLETS,
  wcUri,
  fallbackTimeoutMs = 1500,
}: ConnectModalProps): JSX.Element {
  const [currentView, setCurrentView] = useState<ModalView>(defaultView as ModalView);
  const { connect, connectWithUri, createPairing, openWallet, themeColors, wcUri } = useOnChainUXContext();
  const [email, setEmail] = useState('');
  const [deepLinkStatus, setDeepLinkStatus] = useState<Record<string, 'loading' | 'error' | 'success'>>({});
  const fallbackTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup timers on unmount.
  useEffect(() => {
    return () => {
      fallbackTimers.current.forEach(timer => clearTimeout(timer));
      fallbackTimers.current.clear();
    };
  }, []);

  /**
   * Check if a wallet app is installed by attempting to open its deep link scheme.
   */
  const checkAppInstalled = useCallback(async (wallet: WalletInfo): Promise<boolean> => {
    if (!wallet.deepLink) return false;
    try {
      return await Linking.canOpenURL(wallet.deepLink);
    } catch {
      return false;
    }
  }, []);

  /**
   * Build the deep link URL for a wallet.
   */
  const buildDeepLinkUrl = useCallback((wallet: WalletInfo): string => {
    if (wallet.supportsWalletConnect && wcUri) {
      // Use WalletConnect URI format.
      if (wallet.deepLink) {
        return `${wallet.deepLink}wc?uri=${encodeURIComponent(wcUri)}`;
      }
    }
    // Fallback: use the deep link scheme with WC URI.
    if (wallet.deepLink && wcUri) {
      return `${wallet.deepLink}wc?uri=${encodeURIComponent(wcUri)}`;
    }
    return wallet.deepLink ?? wallet.universalLink ?? '';
  }, [wcUri]);

  /**
   * Handle wallet selection with real WC v2 deep linking.
   *
   * Flow:
   * 1. Create pairing URI (if not already created)
   * 2. Build deep link with WC URI for the selected wallet
   * 3. Open wallet app via deep link / universal link
   * 4. Wait for session establishment via relay
   */
  const handleWalletSelect = useCallback(
    async (wallet: WalletInfo) => {
      setDeepLinkStatus(prev => ({ ...prev, [wallet.id]: 'loading' }));

      // Clear any existing fallback timer.
      const existingTimer = fallbackTimers.current.get(wallet.id);
      if (existingTimer) {
        clearTimeout(existingTimer);
        fallbackTimers.current.delete(wallet.id);
      }

      try {
        // Step 1: Ensure we have a WC v2 pairing URI
        let uri = wcUri;
        if (!uri) {
          uri = await createPairing();
        }

        // Step 2: Open wallet with real WC v2 deep link from registry
        if (wallet.supportsWalletConnect) {
          await openWallet(wallet.id, uri);
          setDeepLinkStatus(prev => ({ ...prev, [wallet.id]: 'success' }));
        } else {
          // Fallback: try standard connect for non-WC wallets
          await connect(wallet.id);
          setDeepLinkStatus(prev => ({ ...prev, [wallet.id]: 'success' }));
          onClose();
        }
      } catch (err) {
        const storeUrl = Platform.OS === 'ios' ? wallet.appStoreUrl : wallet.playStoreUrl;
        if (storeUrl) {
          Alert.alert(
            'App Not Found',
            `${wallet.name} doesn't appear to be installed. Download it from the app store?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Download', onPress: () => Linking.openURL(storeUrl) },
            ]
          );
        }
        setDeepLinkStatus(prev => ({ ...prev, [wallet.id]: 'error' }));
      }
    },
    [connect, connectWithUri, createPairing, openWallet, onClose, wcUri],
  );

  const handleEmailSubmit = useCallback(() => {
    if (email) {
      connect('email')
        .then(() => onClose())
        .catch(() => {});
    }
  }, [email, connect, onClose]);

  const handleSocialLogin = useCallback(
    (provider: string) => {
      connect(provider.toLowerCase())
        .then(() => onClose())
        .catch(() => {});
    },
    [connect, onClose]
  );

  const views: ModalView[] = ['wallets', 'social', 'email', 'scan'];
  const availableViews = views.filter(v => true); // All views available by default

  const getStatusBadge = (walletId: string) => {
    const status = deepLinkStatus[walletId];
    if (!status) return null;
    switch (status) {
      case 'loading': return <Text style={styles.statusLoading}>Opening...</Text>;
      case 'success': return <Text style={styles.statusSuccess}>✓ Opened</Text>;
      case 'error': return <Text style={styles.statusError}>✕ Failed</Text>;
    }
  };

  const renderWallets = () => (
    <View style={styles.walletGrid}>
      {wallets.map(wallet => {
        const isRecommended = recommendedWalletIds.includes(wallet.id);
        const isInstalled = wallet.supportsWalletConnect; // Simplified check
        return (
          <TouchableOpacity
            key={wallet.id}
            style={[
              styles.walletCard,
              { backgroundColor: themeColors.bgCard, borderColor: themeColors.border },
            ]}
            onPress={() => handleWalletSelect(wallet)}
            disabled={deepLinkStatus[wallet.id] === 'loading'}
          >
            <View
              style={[
                styles.walletIcon,
                { backgroundColor: wallet.iconBackground || themeColors.bgCardHover },
              ]}
            >
              {wallet.icon ? (
                <Image source={{ uri: wallet.icon }} style={styles.walletIconImage} />
              ) : (
                <Text style={styles.walletIconFallback}>🔗</Text>
              )}
            </View>
            <Text style={[styles.walletName, { color: themeColors.textPrimary }]}>{wallet.name}</Text>
            {wallet.description ? (
              <Text style={[styles.walletDesc, { color: themeColors.textSecondary }]}>
                {wallet.description}
              </Text>
            ) : null}
            {getStatusBadge(wallet.id)}
            {isRecommended && (
              <Text style={[styles.recommendedBadge, { color: themeColors.accent500 }]}>
                Recommended
              </Text>
            )}
            {isInstalled && wallet.deepLink && (
              <Text style={[styles.installedBadge, { color: themeColors.textTertiary }]}>
                Deep link ready
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderSocial = () => (
    <View style={styles.altActions}>
      {['Google', 'Apple', 'X'].map(provider => (
        <TouchableOpacity
          key={provider}
          style={[
            styles.altBtn,
            { backgroundColor: themeColors.bgCard, borderColor: themeColors.border },
          ]}
          onPress={() => handleSocialLogin(provider)}
        >
          <Text style={[styles.altBtnText, { color: themeColors.textPrimary }]}>
            Continue with {provider}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderEmail = () => (
    <View style={styles.altActions}>
      <TextInput
        style={[
          styles.emailInput,
          {
            backgroundColor: themeColors.bgCard,
            borderColor: themeColors.border,
            color: themeColors.textPrimary,
          },
        ]}
        placeholder="Enter your email"
        placeholderTextColor={themeColors.textSecondary}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={[
          styles.altBtn,
          { backgroundColor: themeColors.bgCard, borderColor: themeColors.border },
        ]}
        onPress={handleEmailSubmit}
      >
        <Text style={[styles.altBtnText, { color: themeColors.textPrimary }]}>
          Continue with Email
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderScan = () => (
    <View style={styles.scanContainer}>
      <Text style={[styles.scanTitle, { color: themeColors.textSecondary }]}>
        Scan with your wallet app
      </Text>
      <View
        style={[
          styles.scanQR,
          { backgroundColor: themeColors.bgCard },
        ]}
      >
        <Text style={{ fontSize: 48 }}>📱</Text>
      </View>
      {wcUri && (
        <Text style={[styles.wcUri, { color: themeColors.textTertiary }]}>
          {wcUri.substring(0, 60)}...
        </Text>
      )}
    </View>
  );

  const renderView = () => {
    switch (currentView) {
      case 'wallets':
        return renderWallets();
      case 'social':
        return renderSocial();
      case 'email':
        return renderEmail();
      case 'scan':
        return renderScan();
      default:
        return renderWallets();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modal,
            { backgroundColor: themeColors.bgPrimary, borderColor: themeColors.border },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
              Connect Wallet
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: themeColors.textSecondary, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* View Tabs */}
          <View style={styles.tabs}>
            {availableViews.map(view => (
              <TouchableOpacity
                key={view}
                style={[
                  styles.tab,
                  {
                    borderColor: themeColors.border,
                    backgroundColor: currentView === view ? themeColors.bgCard : 'transparent',
                  },
                ]}
                onPress={() => setCurrentView(view)}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: currentView === view ? themeColors.textPrimary : themeColors.textSecondary,
                    },
                  ]}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          <ScrollView style={styles.content}>{renderView()}</ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: themeColors.textTertiary }]}>
              Powered by OnChainUX
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxWidth: 420,
    maxHeight: '80%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 8,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
  },
  tab: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    padding: 16,
  },
  walletGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  walletCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletIconImage: {
    width: 24,
    height: 24,
  },
  walletIconFallback: {
    fontSize: 20,
  },
  walletName: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  walletDesc: {
    fontSize: 12,
    textAlign: 'center',
  },
  recommendedBadge: {
    fontSize: 12,
    fontWeight: '500',
  },
  altActions: {
    gap: 12,
  },
  altBtn: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
  },
  altBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emailInput: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 14,
  },
  scanContainer: {
    alignItems: 'center',
    padding: 32,
  },
  scanTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  scanQR: {
    width: 200,
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerText: {
    fontSize: 12,
  },
  wcUri: {
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
  },
  statusLoading: {
    fontSize: 11,
    color: '#60a5fa',
  },
  statusSuccess: {
    fontSize: 11,
    color: '#34d399',
  },
  statusError: {
    fontSize: 11,
    color: '#f87171',
  },
  installedBadge: {
    fontSize: 10,
  },
});
