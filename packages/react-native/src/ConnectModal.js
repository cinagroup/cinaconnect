import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ConnectModal — Native React Native modal with real WalletConnect v2 deep linking.
 *
 * Integrates real WC v2 pairing via WalletConnectProvider, deep linking via
 * react-native Linking API, and the Cinacoin wallet registry for a real
 * connection flow with actual wallet apps.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Image, Linking, Alert, Platform, } from 'react-native';
import { useCinacoinContext } from './CinacoinProvider.js';
import { useWalletConnect, WALLET_DEEP_LINKS } from './WalletConnectProvider.js';
import { buildWalletDeepLink, buildWalletUniversalLink } from '@cinacoin/walletconnect-v2';
const DEFAULT_WALLETS = [
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
export function ConnectModal({ visible, onClose, defaultView = 'wallets', recommendedWalletIds = [], wallets = DEFAULT_WALLETS, fallbackTimeoutMs = 1500, }) {
    const [currentView, setCurrentView] = useState(defaultView);
    const { connect, themeColors, wcUri: ctxWcUri } = useCinacoinContext();
    // Real WC v2 provider (may not be available)
    let createPairingUri = null;
    let connectWithUri = null;
    let openWalletDeepLink = null;
    let activePairingUri = null;
    let wcConnecting = false;
    try {
        const wc = useWalletConnect();
        createPairingUri = wc.createPairingUri;
        connectWithUri = wc.connectWithUri;
        openWalletDeepLink = wc.openWalletDeepLink;
        activePairingUri = wc.pairingUri;
        wcConnecting = wc.connecting;
    }
    catch {
        // WalletConnectProvider not in tree — use CinacoinProvider fallback
    }
    const [email, setEmail] = useState('');
    const [deepLinkStatus, setDeepLinkStatus] = useState({});
    const fallbackTimers = useRef(new Map());
    useEffect(() => {
        return () => {
            fallbackTimers.current.forEach(timer => clearTimeout(timer));
            fallbackTimers.current.clear();
        };
    }, []);
    /**
     * Handle wallet selection with real WC v2 deep linking.
     */
    const handleWalletSelect = useCallback(async (wallet) => {
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
                    }
                    catch {
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
            }
            else if (wallet.supportsWalletConnect && ctxWcUri) {
                // Fallback to CinacoinProvider wcUri
                const deepLink = buildWalletDeepLink(wallet.id, ctxWcUri);
                if (deepLink) {
                    const canOpen = await Linking.canOpenURL(deepLink);
                    if (canOpen) {
                        await Linking.openURL(deepLink);
                        setDeepLinkStatus(prev => ({ ...prev, [wallet.id]: 'success' }));
                    }
                    else {
                        throw new Error('Cannot open wallet');
                    }
                }
            }
            else {
                // Non-WC wallets: use standard connect
                await connect(wallet.id);
                setDeepLinkStatus(prev => ({ ...prev, [wallet.id]: 'success' }));
                onClose();
            }
        }
        catch (err) {
            const storeUrl = Platform.OS === 'ios' ? wallet.appStoreUrl : wallet.playStoreUrl;
            if (storeUrl) {
                Alert.alert('App Not Found', `${wallet.name} doesn't appear to be installed. Download it from the app store?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Download', onPress: () => Linking.openURL(storeUrl) },
                ]);
            }
            setDeepLinkStatus(prev => ({ ...prev, [wallet.id]: 'error' }));
        }
    }, [connect, createPairingUri, openWalletDeepLink, onClose, ctxWcUri, fallbackTimeoutMs]);
    /** Check if wallet app is installed via deep link scheme. */
    const checkInstalled = useCallback(async (walletId) => {
        const link = WALLET_DEEP_LINKS[walletId];
        if (link?.scheme) {
            try {
                return await Linking.canOpenURL(link.scheme);
            }
            catch {
                return false;
            }
        }
        return false;
    }, []);
    const handleEmailSubmit = useCallback(() => {
        if (email) {
            connect('email')
                .then(() => onClose())
                .catch(() => { });
        }
    }, [email, connect, onClose]);
    const handleSocialLogin = useCallback((provider) => {
        connect(provider.toLowerCase())
            .then(() => onClose())
            .catch(() => { });
    }, [connect, onClose]);
    const views = ['wallets', 'social', 'email', 'scan'];
    const availableViews = views.filter(v => true);
    const getStatusBadge = (walletId) => {
        const status = deepLinkStatus[walletId];
        if (!status)
            return null;
        switch (status) {
            case 'loading': return _jsx(Text, { style: styles.statusLoading, children: "Opening..." });
            case 'success': return _jsx(Text, { style: styles.statusSuccess, children: "\u2713 Opened" });
            case 'error': return _jsx(Text, { style: styles.statusError, children: "\u2715 Failed" });
        }
    };
    const renderWallets = () => (_jsx(View, { style: styles.walletGrid, children: wallets.map(wallet => {
            const isRecommended = recommendedWalletIds.includes(wallet.id);
            return (_jsxs(TouchableOpacity, { style: [
                    styles.walletCard,
                    { backgroundColor: themeColors.bgCard, borderColor: themeColors.border },
                ], onPress: () => handleWalletSelect(wallet), disabled: deepLinkStatus[wallet.id] === 'loading', children: [_jsx(View, { style: [
                            styles.walletIcon,
                            { backgroundColor: wallet.iconBackground || themeColors.bgCardHover },
                        ], children: wallet.icon ? (_jsx(Image, { source: { uri: wallet.icon }, style: styles.walletIconImage })) : (_jsx(Text, { style: styles.walletIconFallback, children: "\uD83D\uDD17" })) }), _jsx(Text, { style: [styles.walletName, { color: themeColors.textPrimary }], children: wallet.name }), wallet.description ? (_jsx(Text, { style: [styles.walletDesc, { color: themeColors.textSecondary }], children: wallet.description })) : null, getStatusBadge(wallet.id), isRecommended && (_jsx(Text, { style: [styles.recommendedBadge, { color: themeColors.accent500 }], children: "Recommended" })), wallet.supportsWalletConnect && (_jsx(Text, { style: [styles.installedBadge, { color: themeColors.textTertiary }], children: "WC v2" }))] }, wallet.id));
        }) }));
    const renderSocial = () => (_jsx(View, { style: styles.altActions, children: ['Google', 'Apple', 'X'].map(provider => (_jsx(TouchableOpacity, { style: [
                styles.altBtn,
                { backgroundColor: themeColors.bgCard, borderColor: themeColors.border },
            ], onPress: () => handleSocialLogin(provider), children: _jsxs(Text, { style: [styles.altBtnText, { color: themeColors.textPrimary }], children: ["Continue with ", provider] }) }, provider))) }));
    const renderEmail = () => (_jsxs(View, { style: styles.altActions, children: [_jsx(TextInput, { style: [
                    styles.emailInput,
                    {
                        backgroundColor: themeColors.bgCard,
                        borderColor: themeColors.border,
                        color: themeColors.textPrimary,
                    },
                ], placeholder: "Enter your email", placeholderTextColor: themeColors.textSecondary, value: email, onChangeText: setEmail, keyboardType: "email-address", autoCapitalize: "none" }), _jsx(TouchableOpacity, { style: [
                    styles.altBtn,
                    { backgroundColor: themeColors.bgCard, borderColor: themeColors.border },
                ], onPress: handleEmailSubmit, children: _jsx(Text, { style: [styles.altBtnText, { color: themeColors.textPrimary }], children: "Continue with Email" }) })] }));
    const renderScan = () => (_jsxs(View, { style: styles.scanContainer, children: [_jsx(Text, { style: [styles.scanTitle, { color: themeColors.textSecondary }], children: "Scan with your wallet app" }), _jsx(View, { style: [
                    styles.scanQR,
                    { backgroundColor: themeColors.bgCard },
                ], children: _jsx(Text, { style: { fontSize: 48 }, children: "\uD83D\uDCF1" }) }), activePairingUri && (_jsxs(Text, { style: [styles.wcUri, { color: themeColors.textTertiary }], children: [activePairingUri.substring(0, 60), "..."] })), wcConnecting && (_jsx(Text, { style: [styles.statusLoading, { marginTop: 8 }], children: "Waiting for wallet connection..." }))] }));
    const renderView = () => {
        switch (currentView) {
            case 'wallets': return renderWallets();
            case 'social': return renderSocial();
            case 'email': return renderEmail();
            case 'scan': return renderScan();
            default: return renderWallets();
        }
    };
    return (_jsx(Modal, { visible: visible, transparent: true, animationType: "fade", onRequestClose: onClose, children: _jsx(View, { style: styles.overlay, children: _jsxs(View, { style: [styles.modal, { backgroundColor: themeColors.bgPrimary, borderColor: themeColors.border }], children: [_jsxs(View, { style: styles.header, children: [_jsx(Text, { style: [styles.headerTitle, { color: themeColors.textPrimary }], children: "Connect Wallet" }), _jsx(TouchableOpacity, { onPress: onClose, style: styles.closeBtn, children: _jsx(Text, { style: { color: themeColors.textSecondary, fontSize: 18 }, children: "\u2715" }) })] }), _jsx(View, { style: styles.tabs, children: availableViews.map(view => (_jsx(TouchableOpacity, { style: [
                                styles.tab,
                                {
                                    borderColor: themeColors.border,
                                    backgroundColor: currentView === view ? themeColors.bgCard : 'transparent',
                                },
                            ], onPress: () => setCurrentView(view), children: _jsx(Text, { style: [styles.tabText, { color: currentView === view ? themeColors.textPrimary : themeColors.textSecondary }], children: view.charAt(0).toUpperCase() + view.slice(1) }) }, view))) }), _jsx(ScrollView, { style: styles.content, children: renderView() }), _jsx(View, { style: styles.footer, children: _jsx(Text, { style: [styles.footerText, { color: themeColors.textTertiary }], children: "Powered by Cinacoin" }) })] }) }) }));
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
//# sourceMappingURL=ConnectModal.js.map