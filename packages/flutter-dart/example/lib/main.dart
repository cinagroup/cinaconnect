/// Example app demonstrating Cinacoin Flutter SDK usage.
import 'package:flutter/material.dart';
import 'package:cinacoin/cinacoin.dart';

void main() {
  runApp(const CinacoinExampleApp());
}

class CinacoinExampleApp extends StatelessWidget {
  const CinacoinExampleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Cinacoin Example',
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF3B82F6),
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late WalletManager _walletManager;
  SessionState _sessionState = SessionState.disconnected;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initWalletManager();
  }

  Future<void> _initWalletManager() async {
    _walletManager = WalletManager(
      projectId: 'YOUR_PROJECT_ID', // Replace with your WC v2 project ID
      metadata: const AppMetadata(
        name: 'Cinacoin Example',
        description: 'A Flutter dApp example',
        url: 'https://example.com',
        icons: [],
      ),
    );

    await _walletManager.init();

    // Listen to state changes
    _walletManager.stateChanges.listen((state) {
      setState(() => _sessionState = state);
    });

    // Try to restore session
    final restored = await _walletManager.restore();
    setState(() => _sessionState = restored);
  }

  Future<void> _connectWallet(String walletId) async {
    setState(() => _errorMessage = null);
    try {
      final result = await _walletManager.connect(walletId: walletId);
      setState(() {
        _sessionState = SessionState.disconnected.connected(
          accounts: result.accounts,
          chainId: result.chainId,
          sessionId: result.sessionId,
          connectorId: result.connectorId,
        );
      });
    } catch (e) {
      setState(() => _errorMessage = e.toString());
    }
  }

  Future<void> _disconnect() async {
    await _walletManager.disconnect();
    setState(() => _sessionState = SessionState.disconnected);
  }

  void _showConnectModal() {
    showModalBottomSheet(
      context: context,
      builder: (_) => CinacoinConnectModal(
        wallets: WalletRegistry.getAll(),
        recommendedWalletIds: ['metamask', 'rainbow', 'coinbase'],
        onWalletSelect: (wallet) {
          Navigator.pop(context);
          _connectWallet(wallet.id);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cinacoin Example'),
        actions: [
          Padding(
            padding: const EdgeInsets.all(8),
            child: CinacoinConnectButton(
              status: _sessionState.status,
              account: _sessionState.accounts?.first,
              showAvatar: true,
              showNetwork: true,
              networkName: 'Ethereum',
              onClick: _showConnectModal,
              onDisconnect: _disconnect,
            ),
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_errorMessage != null) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Card(
          color: Colors.red[50],
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.error, color: Colors.red[700]),
                    const SizedBox(width: 8),
                    Text(
                      'Connection Error',
                      style: TextStyle(
                        color: Colors.red[700],
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(_errorMessage!),
              ],
            ),
          ),
        ),
      );
    }

    switch (_sessionState.status) {
      case ConnectionStatus.connected:
        return _buildConnectedView();
      case ConnectionStatus.connecting:
        return const Center(child: CircularProgressIndicator());
      case ConnectionStatus.error:
        return Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
              const SizedBox(height: 16),
              const Text('Connection failed'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _showConnectModal,
                child: const Text('Try Again'),
              ),
            ],
          ),
        );
      case ConnectionStatus.disconnected:
      default:
        return _buildDisconnectedView();
    }
  }

  Widget _buildConnectedView() {
    final accounts = _sessionState.accounts ?? [];
    final address = accounts.isNotEmpty ? accounts.first : 'Unknown';

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle, size: 64, color: Colors.green),
          const SizedBox(height: 16),
          Text(
            'Connected!',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text('Address: $address'),
          Text('Chain ID: ${_sessionState.chainId ?? "Unknown"}'),
          Text('Session: ${_sessionState.sessionId ?? "Unknown"}'),
          const SizedBox(height: 24),
          Row(
            children: [
              ElevatedButton.icon(
                icon: const Icon(Icons.logout),
                label: const Text('Disconnect'),
                onPressed: _disconnect,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red[100],
                  foregroundColor: Colors.red[800],
                ),
              ),
              const SizedBox(width: 12),
              ElevatedButton.icon(
                icon: const Icon(Icons.switch_access_shortcut),
                label: const Text('Switch Chain'),
                onPressed: () async {
                  try {
                    await _walletManager.switchChain(137); // Polygon
                    setState(() {});
                  } catch (e) {
                    setState(() => _errorMessage = e.toString());
                  }
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDisconnectedView() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.account_balance_wallet,
            size: 80,
            color: Theme.of(context).primaryColor.withOpacity(0.3),
          ),
          const SizedBox(height: 24),
          Text(
            'Connect Your Wallet',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Choose a wallet to get started',
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: _showConnectModal,
            child: const Text('Connect Wallet'),
          ),
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: () {
              // Quick connect with WalletConnect
              _connectWallet('walletconnect');
            },
            child: const Text('Quick Connect'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _walletManager.dispose();
    super.dispose();
  }
}
