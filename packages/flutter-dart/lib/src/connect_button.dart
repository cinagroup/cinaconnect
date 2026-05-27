/// Flutter Connect Button widget (Material Design).
///
/// Mirrors the core-sdk + react ConnectButton API surface.
import 'package:flutter/material.dart';
import 'types.dart';

/// Props for the ConnectButton widget.
class ConnectButtonProps {
  /// Button text when disconnected.
  final String label;
  /// Button visual variant.
  final String variant; // 'primary' | 'secondary' | 'ghost'
  /// Button size.
  final String size; // 'sm' | 'md' | 'lg'
  /// Show account balance when connected.
  final bool showBalance;
  /// Show avatar when connected.
  final bool showAvatar;
  /// Show network badge when connected.
  final bool showNetwork;
  /// Click handler.
  final VoidCallback? onClick;
  /// Disconnect handler.
  final VoidCallback? onDisconnect;

  const ConnectButtonProps({
    this.label = 'Connect Wallet',
    this.variant = 'primary',
    this.size = 'md',
    this.showBalance = false,
    this.showAvatar = false,
    this.showNetwork = false,
    this.onClick,
    this.onDisconnect,
  });
}

/// Connect Button — Flutter Material Design widget.
///
/// Automatically shows connection state and supports click-to-connect
/// and long-press-to-disconnect patterns.
///
/// ```dart
/// CinacoinConnectButton(
///   status: ConnectionStatus.connected,
///   account: '0x1234...abcd',
///   onClick: () => openModal(),
/// )
/// ```
class CinacoinConnectButton extends StatelessWidget {
  /// Current connection status.
  final ConnectionStatus status;
  /// Connected account address.
  final String? account;
  /// Connected balance (optional).
  final String? balance;
  /// Chain symbol (optional).
  final String? chainSymbol;
  /// Network/chain name (optional).
  final String? networkName;
  /// Button text when disconnected.
  final String label;
  /// Button visual variant.
  final String variant;
  /// Button size.
  final String size;
  /// Show account balance when connected.
  final bool showBalance;
  /// Show avatar when connected.
  final bool showAvatar;
  /// Show network badge when connected.
  final bool showNetwork;
  /// Click handler.
  final VoidCallback? onClick;
  /// Disconnect handler.
  final VoidCallback? onDisconnect;
  /// CSS class name equivalent (for styling).
  final String? className;

  const CinacoinConnectButton({
    super.key,
    required this.status,
    this.account,
    this.balance,
    this.chainSymbol,
    this.networkName,
    this.label = 'Connect Wallet',
    this.variant = 'primary',
    this.size = 'md',
    this.showBalance = false,
    this.showAvatar = false,
    this.showNetwork = false,
    this.onClick,
    this.onDisconnect,
    this.className,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        if (status == ConnectionStatus.disconnected ||
            status == ConnectionStatus.error) {
          onClick?.call();
        } else if (status == ConnectionStatus.connected) {
          onClick?.call();
        }
      },
      onLongPress: () {
        if (status == ConnectionStatus.connected) {
          _showDisconnectDialog(context);
        }
      },
      child: _buildButton(context),
    );
  }

  Widget _buildButton(BuildContext context) {
    final buttonSize = _getSize();
    final textStyle = _getTextStyle(context);

    if (status == ConnectionStatus.connected && account != null) {
      return _buildConnectedState(context, buttonSize, textStyle);
    }

    if (status == ConnectionStatus.connecting) {
      return _buildConnectingState(context, buttonSize);
    }

    if (status == ConnectionStatus.error) {
      return _buildErrorState(context, buttonSize, textStyle);
    }

    // Disconnected state
    return _buildDisconnectedState(context, buttonSize, textStyle);
  }

  Widget _buildConnectedState(
    BuildContext context,
    Size buttonSize,
    TextStyle textStyle,
  ) {
    final formattedAddress = _formatAddress(account!);

    return Container(
      height: buttonSize.height,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: variant == 'primary'
            ? Theme.of(context).primaryColor
            : variant == 'secondary'
                ? Colors.grey[200]
                : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        border: variant == 'ghost'
            ? Border.all(color: Colors.grey[300]!)
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showAvatar)
            CircleAvatar(
              radius: 12,
              backgroundColor: Theme.of(context).primaryColor.withOpacity(0.2),
              child: Icon(
                Icons.account_circle,
                size: 16,
                color: Theme.of(context).primaryColor,
              ),
            ),
          if (showAvatar) const SizedBox(width: 8),
          Text(formattedAddress, style: textStyle),
          if (showBalance && balance != null && chainSymbol != null) ...[
            const SizedBox(width: 8),
            Text(
              '$balance $chainSymbol',
              style: textStyle.copyWith(
                fontSize: textStyle.fontSize! * 0.8,
                color: Colors.grey[600],
              ),
            ),
          ],
          if (showNetwork && networkName != null) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.green[100],
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                networkName!,
                style: textStyle.copyWith(
                  fontSize: textStyle.fontSize! * 0.7,
                  color: Colors.green[800],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDisconnectedState(
    BuildContext context,
    Size buttonSize,
    TextStyle textStyle,
  ) {
    return Container(
      height: buttonSize.height,
      padding: EdgeInsets.symmetric(
        horizontal: buttonSize.width * 0.5,
        vertical: 8,
      ),
      decoration: BoxDecoration(
        color: variant == 'primary'
            ? Theme.of(context).primaryColor
            : variant == 'secondary'
                ? Colors.grey[200]
                : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        border: variant == 'ghost'
            ? Border.all(color: Colors.grey[300]!)
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.account_balance_wallet, size: 18),
          const SizedBox(width: 8),
          Text(label, style: textStyle),
        ],
      ),
    );
  }

  Widget _buildConnectingState(BuildContext context, Size buttonSize) {
    return Container(
      height: buttonSize.height,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey[300],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(Colors.grey[600]!),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            'Connecting...',
            style: TextStyle(
              color: Colors.grey[700],
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(
    BuildContext context,
    Size buttonSize,
    TextStyle textStyle,
  ) {
    return Container(
      height: buttonSize.height,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.red[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red[300]!),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.error_outline, size: 18, color: Colors.red[700]),
          const SizedBox(width: 8),
          Text(
            'Retry',
            style: textStyle.copyWith(color: Colors.red[700]),
          ),
        ],
      ),
    );
  }

  void _showDisconnectDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Disconnect Wallet'),
        content: const Text('Are you sure you want to disconnect?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              onDisconnect?.call();
            },
            child: Text(
              'Disconnect',
              style: TextStyle(color: Colors.red[700]),
            ),
          ),
        ],
      ),
    );
  }

  Size _getSize() {
    switch (size) {
      case 'sm':
        return const Size(120, 32);
      case 'lg':
        return const Size(180, 48);
      case 'md':
      default:
        return const Size(150, 40);
    }
  }

  TextStyle _getTextStyle(BuildContext context) {
    final baseStyle = TextStyle(
      color: variant == 'primary' ? Colors.white : Colors.grey[800],
      fontWeight: FontWeight.w600,
      fontSize: _getFontSize(),
    );

    return baseStyle;
  }

  double _getFontSize() {
    switch (size) {
      case 'sm':
        return 12;
      case 'lg':
        return 16;
      case 'md':
      default:
        return 14;
    }
  }

  String _formatAddress(String address) {
    if (address.length <= 10) return address;
    return '${address.substring(0, 6)}...${address.substring(address.length - 4)}';
  }
}
