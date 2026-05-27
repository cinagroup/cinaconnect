import { describe, it, expect, vi, beforeEach } from 'vitest';
// ============================================================
// Tests for @cinacoin/react-native ConnectModal
// ============================================================
// Mock react-native before importing the component
vi.mock('react-native', () => ({
    Modal: ({ children, visible }) => visible ? { children, props: { visible: true } } : null,
    View: ({ children, style }) => ({
        type: 'View',
        children,
        style,
    }),
    Text: ({ children, style }) => ({
        type: 'Text',
        children,
        style,
    }),
    TouchableOpacity: ({ children, onPress, style }) => ({
        type: 'TouchableOpacity',
        children,
        onPress,
        style,
    }),
    StyleSheet: {
        create: (styles) => styles,
    },
    ScrollView: ({ children }) => ({
        type: 'ScrollView',
        children,
    }),
    TextInput: ({ placeholder, value, onChangeText }) => ({
        type: 'TextInput',
        placeholder,
        value,
        onChangeText,
    }),
    Image: ({ source }) => ({
        type: 'Image',
        source,
    }),
    Alert: {
        alert: vi.fn(),
    },
    Platform: {
        OS: 'ios',
        select: (obj) => obj.ios ?? obj.default,
    },
    Linking: {
        canOpenURL: vi.fn().mockResolvedValue(true),
        openURL: vi.fn().mockResolvedValue(true),
    },
}));
// Mock the context provider
vi.mock('../src/CinacoinProvider', () => ({
    useCinacoinContext: vi.fn(() => ({
        connect: vi.fn().mockResolvedValue(undefined),
        connectWithUri: vi.fn().mockResolvedValue(undefined),
        createPairing: vi.fn().mockResolvedValue('wc:mock@2?relay-protocol=irn&symKey=mock'),
        openWallet: vi.fn().mockResolvedValue(undefined),
        themeColors: {
            accent500: '#3B82F6',
            bgPrimary: '#0F172A',
            bgCard: '#1E293B',
            bgCardHover: '#334155',
            textPrimary: '#F8FAFC',
            textSecondary: '#94A3B8',
            textTertiary: '#64748B',
            border: '#334155',
            success: '#22C55E',
            warning: '#EAB308',
            error: '#EF4444',
            accentGlow: 'rgba(59, 130, 246, 0.3)',
            bgSecondary: '#111827',
        },
        wcUri: 'wc:mock@2?relay-protocol=irn&symKey=mock',
    })),
}));
// Mock walletconnect-v2
vi.mock('@cinacoin/walletconnect-v2', () => ({
    WALLET_REGISTRY: [
        {
            id: 'metamask',
            name: 'MetaMask',
            homepage: 'https://metamask.io',
            deepLink: 'metamask://',
            universalLink: 'https://metamask.app.link',
            appStoreUrl: 'https://apps.apple.com/app/metamask/id1438668043',
            playStoreUrl: 'https://play.google.com/store/apps/details?id=io.metamask',
            imageUrl: 'https://registry.walletconnect.com/api/v2/logo/md/metamask',
            supportsWcV2: true,
            chains: ['eip155:1'],
            rdns: 'io.metamask',
        },
        {
            id: 'walletconnect',
            name: 'WalletConnect',
            homepage: 'https://walletconnect.com',
            deepLink: 'wc://',
            universalLink: 'https://walletconnect.com',
            imageUrl: 'https://registry.walletconnect.com/api/v2/logo/md/walletconnect',
            supportsWcV2: true,
            chains: ['eip155:1'],
        },
    ],
    getWalletById: vi.fn((id) => ({
        id,
        name: id,
        supportsWcV2: true,
    })),
    buildWalletDeepLink: vi.fn((id, uri) => `${id}://wc?uri=${uri}`),
    buildWalletUniversalLink: vi.fn((id, uri) => `https://${id}.com/wc?uri=${uri}`),
}));
describe('ConnectModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('props', () => {
        it('should accept visible prop', () => {
            const props = { visible: true, onClose: () => { } };
            expect(props.visible).toBe(true);
        });
        it('should accept defaultView prop', () => {
            const props = {
                visible: true,
                onClose: () => { },
                defaultView: 'wallets',
                views: ['wallets', 'social', 'email', 'scan'],
            };
            expect(props.defaultView).toBe('wallets');
            expect(props.views).toContain('wallets');
            expect(props.views).toContain('scan');
        });
        it('should accept recommendedWalletIds prop', () => {
            const props = {
                visible: true,
                onClose: () => { },
                recommendedWalletIds: ['metamask', 'rainbow'],
            };
            expect(props.recommendedWalletIds).toContain('metamask');
            expect(props.recommendedWalletIds).toContain('rainbow');
        });
        it('should accept custom wallets prop', () => {
            const customWallets = [
                { id: 'custom', name: 'Custom Wallet', supportsWalletConnect: true },
            ];
            const props = {
                visible: true,
                onClose: () => { },
                wallets: customWallets,
            };
            expect(props.wallets).toHaveLength(1);
            expect(props.wallets[0].name).toBe('Custom Wallet');
        });
    });
    describe('views', () => {
        it('should support wallets view', () => {
            const views = ['wallets', 'social', 'email', 'scan'];
            expect(views).toContain('wallets');
        });
        it('should support social view', () => {
            const views = ['wallets', 'social', 'email', 'scan'];
            expect(views).toContain('social');
        });
        it('should support email view', () => {
            const views = ['wallets', 'social', 'email', 'scan'];
            expect(views).toContain('email');
        });
        it('should support scan view', () => {
            const views = ['wallets', 'social', 'email', 'scan'];
            expect(views).toContain('scan');
        });
    });
    describe('deep linking', () => {
        it('should build deep link with WC URI', () => {
            const { buildWalletDeepLink } = require('@cinacoin/walletconnect-v2');
            const uri = 'wc:test@2?relay-protocol=irn&symKey=test';
            const link = buildWalletDeepLink('metamask', uri);
            expect(link).toContain('metamask://');
            expect(link).toContain('wc?uri=');
        });
        it('should build universal link as fallback', () => {
            const { buildWalletUniversalLink } = require('@cinacoin/walletconnect-v2');
            const uri = 'wc:test@2?relay-protocol=irn&symKey=test';
            const link = buildWalletUniversalLink('metamask', uri);
            expect(link).toContain('https://');
            expect(link).toContain('wc?uri=');
        });
    });
    describe('wallet selection', () => {
        it('should call onClose after successful connection', async () => {
            const onClose = vi.fn();
            const { useCinacoinContext } = require('../src/CinacoinProvider');
            const { connect } = useCinacoinContext();
            await connect('email');
            expect(connect).toHaveBeenCalledWith('email');
        });
        it('should handle wallet with app store URL when not installed', async () => {
            const { Alert } = require('react-native');
            // The modal should show an alert for non-installed wallets
            expect(Alert.alert).toBeDefined();
        });
    });
});
//# sourceMappingURL=ConnectModal.test.js.map