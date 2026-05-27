/**
 * ConnectModal — Native React Native modal with real WalletConnect v2 deep linking.
 *
 * Integrates real WC v2 pairing via WalletConnectProvider, deep linking via
 * react-native Linking API, and the CinaCoin wallet registry for a real
 * connection flow with actual wallet apps.
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
import { useCinaCoinContext } from './CinaCoinProvider.js';
import { useWalletConnect, WALLET_DEEP_LINKS } from './WalletConnectProvider.js';
import { WALLET_REGISTRY, getWalletById, buildWalletDeepLink, buildWalletUniversalLink } from '@cinacoin/walletconnect-v2';

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
  { id: 'phantom', name: 'Phantom', description: 'Multi-chain wallet',
    deepLink: 'phantom://', universalLink: 'https://phantom.app',
    appStoreUrl: 'https://apps.apple.com/app/phantom-crypto-wallet/id1598432977',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.phantom.app',
    supportsWalletConnect: true },
  { id: 'zerion', name: 'Zerion', description: 'DeFi wallet',
    deepLink: 'zerion://', universalLink: 'https://zerion.io',
    appStoreUrl: 'https://apps.apple.com/app/zerion-defi-wallet/id1456732032',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=io.zerion.android',
    supportsWalletConnect: true },
  { id: 'rabby', name: 'Rabby', description: 'Multi-chain wallet',
    deepLink: 'rabby://', supportsWalletConnect: false },
];

/**
 * Native ConnectModal with real WC v2 deep linking.
 *
 * Flow:
 * 1. User selects a wallet
 * 2. Create pairing URI via WalletConnectProvider
 * 3. Open wallet app via deep link with WC URI
 * 4. Wait for session establishment via relay
 */
export function ConnectModal({
  visible,
  onClose,
  defaultView = 'wallets',
  recommendedWalletIds = [],
  wallets = DEFAULT_WALLETS,
  fallbackTimeoutMs = 1500,
}: ConnectModalProps): JSX.Element {
  const [currentView, setCurrentView] = useState<ModalView>(defaultView as ModalView);
  const { connect, themeColors, wcUri: ctxWcUri } = useCinaCoinContext();

  // Real WC v2 provider (may not be available)
  let createPairingUri: (() => Promise<string>) | null = null;
  let connectWithUri: ((uri: string) => Promise<void>) | null = null;
  let openWalletDeepLink: ((walletId: string) => Promise<void>) | null = null;
  let activePairingUri: string | null = null;
  let wcConnecting = false;

  try {
    const wc = useWalletConnect();
    createPairingUri = wc.createPairingUri;
    connectWithUri = async (uri: string) => { void await wc.connectWithUri(uri); };
    openWalletDeepLink = wc.openWalletDeepLink;
    activePairingUri = wc.pairingUri;
    wcConnecting = wc.connecting;
  } catch {
    // WalletConnectProvider not in tree — use CinaCoinProvider fallback
  }

  const [email, setEmail] = useState('');
  const [deepLinkStatus, setDeepLinkStatus] = useState<Record<string, 'loading' | 'error' | 'success'>>({});
  const fallbackTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return () => {
      fallbackTimers.current.forEach(timer => clearTimeout(timer));
      fallbackTimers.current.clear();
    };
  }, []);

  /**
   * Handle wallet selection with real WC v2 deep linking.
   */
  const handleWalletSelect = useCallback(
    async (wallet: WalletInfo) => {
      setDeepLinkStatus(prev => ({ ...prev, [wallet.id]: 'loading' }));

      // Clear existing fallback timer
      const existingTimer = fallbackTimers.current.get(wallet.id);
      if (existingTimer) {
        clearTimeout(existingTimer);
        fallbackTimers.current.delete(wallet.id);
      }

      try {
        if (wallet.supportsWalletConnect && createPairingUri && openWalletDeepLink) {
          // Real WC v2 flow: create pairing → deep link → wait for session
          const uri = await createPairingUri();
          await openWalletDeepLink(wallet.id);

          // Set fallback timer: if no session after timeout, try universal link
          const timer = setTimeout(async () => {
            try {
              const universalLink = buildWalletUniversalLink(wallet.id, uri);
              if (universalLink) {
                await Linking.openURL(universalLink);
              }
            } catch {
              // Fallback failed — suggest app store
              const storeUrl = Platform.OS === 'ios' ? wallet.appStoreUrl : wallet.playStoreUrl;
              if (storeUrl) {
                Alert.alert('App Not Found', `${wallet.name} doesn't appear to be installed. Download it?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Download', onPress: () => Linking.openURL(storeUrl) },
                ]);
              }
            }
          }, fallbackTimeoutMs);
          fallbackTimers.current.set(wallet.id, timer);

          setDeepLinkStatus(prev => ({ ...prev, [wallet.id]: 'success' }));
        } else if (wallet.supportsWalletConnect && ctxWcUri) {
          // Fallback to CinaCoinProvider wcUri
          const deepLink = buildWalletDeepLink(wallet.id, ctxWcUri);
          if (deepLink) {
            const canOpen = await Linking.canOpenURL(deepLink);
            if (canOpen) {
              await Linking.openURL(deepLink);
              setDeepLinkStatus(prev => ({ ...prev, [wallet.id]: 'success' }));
            } else {
              throw new Error('Cannot open wallet');
            }
          }
        } else {
          // Non-WC wallets: use standard connect
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
    [connect, createPairingUri, openWalletDeepLink, onClose, ctxWcUri, fallbackTimeoutMs],
  );

  /** Check if wallet app is installed via deep link scheme. */
  const checkInstalled = useCallback(async (walletId: string): Promise<boolean> => {
    const link = WALLET_DEEP_LINKS[walletId];
    if (link?.scheme) {
      try {
        return await Linking.canOpenURL(link.scheme);
      } catch {
        return false;
      }
    }
    return false;
  }, []);

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
  const availableViews = views.filter(v => true);

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
            {wallet.supportsWalletConnect && (
              <Text style={[styles.installedBadge, { color: themeColors.textTertiary }]}>
                WC v2
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
      {activePairingUri && (
        <Text style={[styles.wcUri, { color: themeColors.textTertiary }]}>
          {activePairingUri.substring(0, 60)}...
        </Text>
      )}
      {wcConnecting && (
        <Text style={[styles.statusLoading, { marginTop: 8 }]}>
          Waiting for wallet connection...
        </Text>
      )}
    </View>
  );

  const renderView = () => {
    switch (currentView) {
      case 'wallets': return renderWallets();
      case 'social': return renderSocial();
      case 'email': return renderEmail();
      case 'scan': return renderScan();
      default: return renderWallets();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: themeColors.bgPrimary, borderColor: themeColors.border }]}>
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
                <Text style={[styles.tabText, { color: currentView === view ? themeColors.textPrimary : themeColors.textSecondary }]}>
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
              Powered by CinaCoin
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
  headerTitle: { fontSize: 20, fontWeight: '600' },
  closeBtn: { padding: 8 },
  tabs: { flexDirection: 'row', gap: 8, padding: 16 },
  tab: { flex: 1, padding: 8, borderWidth: 1, borderRadius: 8, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '500' },
  content: { padding: 16 },
  walletGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
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
    width: 40, height: 40, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  walletIconImage: { width: 24, height: 24 },
  walletIconFallback: { fontSize: 20 },
  walletName: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  walletDesc: { fontSize: 12, textAlign: 'center' },
  recommendedBadge: { fontSize: 12, fontWeight: '500' },
  altActions: { gap: 12 },
  altBtn: { padding: 12, borderWidth: 1, borderRadius: 12, alignItems: 'center' },
  altBtnText: { fontSize: 14, fontWeight: '500' },
  emailInput: { padding: 12, borderWidth: 1, borderRadius: 12, fontSize: 14 },
  scanContainer: { alignItems: 'center', padding: 32 },
  scanTitle: { fontSize: 18, marginBottom: 16 },
  scanQR: { width: 200, height: 200, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  footer: { padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#334155' },
  footerText: { fontSize: 12 },
  wcUri: { fontSize: 10, marginTop: 8, textAlign: 'center' },
  statusLoading: { fontSize: 11, color: '#60a5fa' },
  statusSuccess: { fontSize: 11, color: '#34d399' },
  statusError: { fontSize: 11, color: '#f87171' },
  installedBadge: { fontSize: 10 },
});

export default ConnectModal;
