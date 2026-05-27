/// Cinacoin Flutter SDK — Self-hosted wallet connection toolkit.
///
/// A complete replacement for Reown/WalletConnect infrastructure for Flutter apps.
///
/// ## Quick Start
///
/// ```dart
/// import 'package:cinacoin/cinacoin.dart';
///
/// // Initialize the wallet manager
/// final walletManager = WalletManager(
///   projectId: 'YOUR_PROJECT_ID',
///   metadata: AppMetadata(
///     name: 'My dApp',
///     description: 'A Flutter dApp',
///     url: 'https://mydapp.com',
///     icons: ['https://mydapp.com/icon.png'],
///   ),
/// );
///
/// await walletManager.init();
///
/// // Connect to a wallet
/// final result = await walletManager.connect(walletId: 'metamask');
///
/// // Sign a message
/// final signature = await walletManager.signMessage('Hello!');
/// ```
///
/// ## API Surface
///
/// This SDK matches the web SDK (core-sdk) API surface:
/// - WalletManager ↔ Connector + SessionManager
/// - EvmAdapter ↔ EvmAdapter (core-sdk)
/// - SolanaChainAdapter ↔ SolanaChainAdapter (core-sdk)
/// - SIWEAuth ↔ SIWEAuth (core-sdk)
/// - DeepLinkHandler ↔ links module (core-sdk)
/// - WalletRegistry ↔ WALLET_DEEP_LINKS (core-sdk)

// Types
export 'src/types.dart';

// Core Manager
export 'src/wallet_manager.dart';

// Wallet Registry
export 'src/wallet_registry.dart';

// UI Components
export 'src/connect_button.dart';
export 'src/connect_modal.dart';

// Deep Linking
export 'src/deep_link_handler.dart';

// Push Notifications
export 'src/push_handler.dart';

// Adapters
export 'src/adapters/evm_adapter.dart';
export 'src/adapters/solana_adapter.dart';

// Authentication
export 'src/auth/siwe.dart';

// Utilities
export 'src/utils.dart';

/// SDK version.
const String cinacoinVersion = '0.1.0';
