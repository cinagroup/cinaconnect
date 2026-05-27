/// Flutter Connect Modal (bottom sheet with wallet list).
///
/// Mirrors the core-sdk + react ConnectModal API surface.
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'types.dart';
import 'wallet_registry.dart';

/// Props for the ConnectModal widget.
class ConnectModalProps {
  /// Whether the modal is open.
  final bool isOpen;
  /// Close callback.
  final VoidCallback onClose;
  /// Available views.
  final List<String> views; // 'wallets' | 'social' | 'email' | 'scan'
  /// Default view.
  final String defaultView;
  /// Recommended wallet IDs.
  final List<String>? recommendedWalletIds;
  /// Theme override.
  final Map<String, String>? theme;

  const ConnectModalProps({
    this.isOpen = false,
    required this.onClose,
    this.views = const ['wallets'],
    this.defaultView = 'wallets',
    this.recommendedWalletIds,
    this.theme,
  });
}

/// Connect Modal — Flutter bottom sheet with wallet list.
///
/// Shows a list of wallets with their icons, supports QR code display,
/// and recommended wallet ordering.
///
/// ```dart
/// showModalBottomSheet(
///   context: context,
///   builder: (_) => CinacoinConnectModal(
///     wallets: wallets,
///     onWalletSelect: (wallet) => connect(wallet),
///   ),
/// )
/// ```
class CinacoinConnectModal extends StatefulWidget {
  /// Available wallets to display.
  final List<WalletInfo> wallets;
  /// Callback when a wallet is selected.
  final Function(WalletInfo) onWalletSelect;
  /// Recommended wallet IDs (shown first).
  final List<String>? recommendedWalletIds;
  /// WalletConnect URI for QR display.
  final String? wcUri;
  /// Title text.
  final String title;
  /// Subtitle text.
  final String? subtitle;

  const CinacoinConnectModal({
    super.key,
    required this.wallets,
    required this.onWalletSelect,
    this.recommendedWalletIds,
    this.wcUri,
    this.title = 'Connect a Wallet',
    this.subtitle,
  });

  @override
  State<CinacoinConnectModal> createState() => _CinacoinConnectModalState();
}

class _CinacoinConnectModalState extends State<CinacoinConnectModal> {
  String? _selectedWalletId;
  bool _showQR = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          _buildHeader(),
          const Divider(height: 1),
          // Content
          Flexible(
            child: _showQR && widget.wcUri != null
                ? _buildQRView()
                : _buildWalletList(),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.title,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                if (widget.subtitle != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      widget.subtitle!,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: () {
              setState(() {
                _showQR = false;
                _selectedWalletId = null;
              });
              Navigator.pop(context);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildWalletList() {
    // Sort wallets: recommended first, then alphabetically
    final sortedWallets = List<WalletInfo>.from(widget.wallets);
    if (widget.recommendedWalletIds != null) {
      final recommended = widget.recommendedWalletIds!;
      sortedWallets.sort((a, b) {
        final aIndex = recommended.indexOf(a.id);
        final bIndex = recommended.indexOf(b.id);
        if (aIndex >= 0 && bIndex >= 0) return aIndex.compareTo(bIndex);
        if (aIndex >= 0) return -1;
        if (bIndex >= 0) return 1;
        return a.name.compareTo(b.name);
      });
    }

    return ListView.builder(
      shrinkWrap: true,
      itemCount: sortedWallets.length,
      itemBuilder: (context, index) {
        final wallet = sortedWallets[index];
        return _WalletListTile(
          wallet: wallet,
          onTap: () => _handleWalletTap(wallet),
        );
      },
    );
  }

  Widget _buildQRView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          if (_selectedWalletId != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.check_circle,
                    color: Theme.of(context).primaryColor,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Scan with ${_getWalletName(_selectedWalletId!)}',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                ],
              ),
            ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 10,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: QrImageView(
              data: widget.wcUri!,
              version: QrVersions.auto,
              size: 250,
              backgroundColor: Colors.white,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Or connect with a different wallet',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          TextButton(
            onPressed: () {
              setState(() {
                _showQR = false;
              });
            },
            child: const Text('Back to wallets'),
          ),
        ],
      ),
    );
  }

  void _handleWalletTap(WalletInfo wallet) {
    setState(() {
      _selectedWalletId = wallet.id;
    });
    widget.onWalletSelect(wallet);
  }

  String _getWalletName(String walletId) {
    final wallet = WalletRegistry.get(walletId);
    return wallet?.name ?? walletId;
  }
}

/// Wallet list tile widget.
class _WalletListTile extends StatelessWidget {
  final WalletInfo wallet;
  final VoidCallback onTap;

  const _WalletListTile({
    required this.wallet,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: wallet.iconUrl != null
            ? Image.network(
                wallet.iconUrl!,
                width: 40,
                height: 40,
                errorBuilder: (_, __, ___) => _buildDefaultIcon(),
              )
            : _buildDefaultIcon(),
      ),
      title: Text(wallet.name),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }

  Widget _buildDefaultIcon() {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(Icons.account_balance_wallet, color: Colors.grey[600]),
    );
  }
}
