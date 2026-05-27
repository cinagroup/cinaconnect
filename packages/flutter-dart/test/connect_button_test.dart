import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:cinacoin/cinacoin.dart';

void main() {
  group('ConnectButton', () {
    testWidgets('renders Connect Wallet label when disconnected', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CinacoinConnectButton(
              status: ConnectionStatus.disconnected,
              label: 'Connect Wallet',
            ),
          ),
        ),
      );

      expect(find.text('Connect Wallet'), findsOneWidget);
    });

    testWidgets('renders connecting state with spinner', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CinacoinConnectButton(
              status: ConnectionStatus.connecting,
            ),
          ),
        ),
      );

      expect(find.text('Connecting...'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('renders connected address', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CinacoinConnectButton(
              status: ConnectionStatus.connected,
              account: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
            ),
          ),
        ),
      );

      expect(find.textContaining('0x742d'), findsOneWidget);
    });

    testWidgets('shows balance when showBalance is true', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CinacoinConnectButton(
              status: ConnectionStatus.connected,
              account: '0x1234567890abcdef1234567890abcdef12345678',
              balance: '1.5',
              chainSymbol: 'ETH',
              showBalance: true,
            ),
          ),
        ),
      );

      expect(find.textContaining('1.5 ETH'), findsOneWidget);
    });

    testWidgets('shows avatar when showAvatar is true', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CinacoinConnectButton(
              status: ConnectionStatus.connected,
              account: '0x1234567890abcdef1234567890abcdef12345678',
              showAvatar: true,
            ),
          ),
        ),
      );

      expect(find.byType(CircleAvatar), findsOneWidget);
    });

    testWidgets('renders error state', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CinacoinConnectButton(
              status: ConnectionStatus.error,
            ),
          ),
        ),
      );

      expect(find.text('Retry'), findsOneWidget);
    });
  });
}
