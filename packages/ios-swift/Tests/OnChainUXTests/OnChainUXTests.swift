import XCTest
@testable import Cinacoin

final class CinacoinTests: XCTestCase {

    // MARK: - Configuration

    func testDefaultThemeColors() {
        let dark = ThemeColors(mode: .dark)
        XCTAssertEqual(dark.accent500, "#3B82F6")
        XCTAssertEqual(dark.bgPrimary, "#0F172A")

        let light = ThemeColors(mode: .light)
        XCTAssertEqual(light.accent500, "#2563EB")
        XCTAssertEqual(light.bgPrimary, "#FFFFFF")

        let minimal = ThemeColors(mode: .minimal)
        XCTAssertEqual(minimal.accent500, "#94A3B8")
        XCTAssertEqual(minimal.bgPrimary, "#000000")
    }

    func testChainPresets() {
        XCTAssertEqual(ChainConfig.ethereum.chainId, 1)
        XCTAssertEqual(ChainConfig.polygon.chainId, 137)
        XCTAssertEqual(ChainConfig.arbitrum.chainId, 42161)
    }

    func testNativeCurrency() {
        let eth = NativeCurrency.eth
        XCTAssertEqual(eth.symbol, "ETH")
        XCTAssertEqual(eth.decimals, 18)
    }

    func testConnectionStatusEquality() {
        XCTAssertEqual(ConnectionStatus.disconnected, .disconnected)
        XCTAssertEqual(ConnectionStatus.connecting, .connecting)
        XCTAssertEqual(ConnectionStatus.connected, .connected)
        XCTAssertEqual(ConnectionStatus.error("fail"), .error("fail"))
        XCTAssertNotEqual(ConnectionStatus.error("a"), .error("b"))
    }

    func testTruncateAddress() {
        let address = "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"
        let truncated = truncateAddress(address)
        XCTAssertTrue(truncated.hasPrefix("0x74"))
        XCTAssertTrue(truncated.hasSuffix("bD18"))
        XCTAssertTrue(truncated.contains("..."))
    }

    func testTruncateAddressShort() {
        let short = "0x1234"
        XCTAssertEqual(truncateAddress(short), short)
    }

    func testCinacoinSingleton() {
        XCTAssertTrue(Cinacoin.shared === Cinacoin.shared)
    }

    func testConfigure() {
        let config = CinacoinConfig(
            chains: [.ethereum, .polygon],
            themeMode: .light,
            recommendedWallets: ["metamask"]
        )
        Cinacoin.shared.configure(with: config)
        XCTAssertEqual(Cinacoin.shared.themeMode, .light)
        XCTAssertEqual(Cinacoin.shared.activeChainId, 1)
        XCTAssertEqual(Cinacoin.shared.themeColors.accent500, "#2563EB")
    }

    func testSwitchChain() async throws {
        let config = CinacoinConfig(chains: [.ethereum, .polygon])
        Cinacoin.shared.configure(with: config)

        try await Cinacoin.shared.switchChain(chainId: 137)
        XCTAssertEqual(Cinacoin.shared.activeChainId, 137)

        do {
            try await Cinacoin.shared.switchChain(chainId: 999)
            XCTFail("Should have thrown chainNotSupported")
        } catch let CinacoinError.chainNotSupported(id) {
            XCTAssertEqual(id, 999)
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    // MARK: - WalletManager

    func testWalletManagerInitialState() {
        let manager = WalletManager()
        XCTAssertNil(manager.connectedAccount)
        XCTAssertEqual(manager.connectionStatus, .disconnected)
    }

    func testWalletManagerGetConnectors() {
        let manager = WalletManager()
        let config = CinacoinConfig(chains: [.ethereum])
        manager.configure(with: config)
        let connectors = manager.getConnectors()
        XCTAssertFalse(connectors.isEmpty)
    }

    func testWalletManagerDisconnect() async {
        let manager = WalletManager()
        manager.configure(with: CinacoinConfig(chains: [.ethereum]))
        _ = try? await manager.connect(connectorId: "metamask")
        XCTAssertNotNil(manager.connectedAccount)

        await manager.disconnect()
        XCTAssertNil(manager.connectedAccount)
        XCTAssertEqual(manager.connectionStatus, .disconnected)
    }

    // MARK: - DeepLinkHandler

    func testGenerateDeepLink() {
        let handler = DeepLinkHandler()
        let link = handler.generateDeepLink(walletId: "metamask", uri: "wc:12345")
        XCTAssertTrue(link.hasPrefix("metamask://"))
        XCTAssertTrue(link.contains("12345"))
    }

    func testGenerateUniversalLink() {
        let handler = DeepLinkHandler()
        let link = handler.generateUniversalLink(walletId: "metamask", uri: "wc:12345")
        XCTAssertNotNil(link)
        XCTAssertTrue(link?.hasPrefix("https://") ?? false)
        XCTAssertTrue(link?.contains("metamask.app.link") ?? false)
    }

    func testGenerateDeepLinkUnknownWallet() {
        let handler = DeepLinkHandler()
        let link = handler.generateDeepLink(walletId: "unknown_wallet", uri: "wc:12345")
        XCTAssertEqual(link, "")
    }

    // MARK: - EVMChainAdapter

    func testEVMHexToEth() {
        // 1 ETH = 10^18 wei = 0x0DE0B6B3A7640000
        let eth = EVMChainAdapter.hexToEth("0x0DE0B6B3A7640000")
        XCTAssertEqual(eth, "1.000000")
    }

    func testEVMFormatTransaction() {
        let tx = TransactionRequest(
            from: "0xFrom",
            to: "0xTo",
            value: "0x1",
            data: "0xabc",
            chainId: 1
        )
        let formatted = EVMChainAdapter.formatTransaction(tx)
        XCTAssertEqual(formatted["from"], "0xFrom")
        XCTAssertEqual(formatted["to"], "0xTo")
        XCTAssertEqual(formatted["value"], "0x1")
        XCTAssertEqual(formatted["chainId"], "0x1")
    }

    func testEVMFindChain() {
        let adapter = EVMChainAdapter()
        adapter.registerChains([.ethereum, .polygon])

        XCTAssertNotNil(adapter.findChain(chainId: 1))
        XCTAssertNotNil(adapter.findChain(chainId: 137))
        XCTAssertNil(adapter.findChain(chainId: 999))
    }

    // MARK: - SolanaChainAdapter

    func testSolanaAddressValidation() {
        // Valid address (Phantom-style)
        XCTAssertTrue(SolanaChainAdapter.isValidAddress("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"))
        // Too short
        XCTAssertFalse(SolanaChainAdapter.isValidAddress("short"))
        // Invalid characters (contains 0 and O which are not in base58)
        XCTAssertFalse(SolanaChainAdapter.isValidAddress("0OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO"))
    }

    func testSolanaLamportsConversion() {
        XCTAssertEqual(SolanaChainAdapter.solToLamports(1.0), 1_000_000_000)
        XCTAssertEqual(SolanaChainAdapter.lamportsToSol(1_000_000_000), "1.000000")
        XCTAssertEqual(SolanaChainAdapter.lamportsToSol(500_000_000), "0.500000")
    }

    func testSolanaChainPresets() {
        let chains = SolanaChainAdapter.chains
        XCTAssertFalse(chains.isEmpty)
        XCTAssertEqual(chains[0].chainId, 101) // Mainnet
        XCTAssertEqual(chains[1].chainId, 102) // Devnet
    }

    func testSolanaWalletPresets() {
        let wallets = SolanaChainAdapter.wallets
        XCTAssertFalse(wallets.isEmpty)
        XCTAssertTrue(wallets.contains(where: { $0.id == "phantom" }))
        XCTAssertTrue(wallets.contains(where: { $0.id == "solflare" }))
        XCTAssertTrue(wallets.contains(where: { $0.id == "backpack" }))
    }

    // MARK: - SIWE

    func testSIWEConfig() {
        let config = SIWEAuthConfig(
            domain: "https://example.com",
            uri: "https://example.com/login",
            statement: "Sign in"
        )
        XCTAssertEqual(config.domain, "https://example.com")
        XCTAssertEqual(config.chainId, 1)
        XCTAssertEqual(config.expirationSeconds, 86400)
    }

    func testSIWENotAuthenticatedInitially() {
        let config = SIWEAuthConfig(
            domain: "https://example.com",
            uri: "https://example.com/login"
        )
        let siwe = SIWEAuth(config: config)
        XCTAssertFalse(siwe.isAuthenticated)
        XCTAssertNil(siwe.authenticatedAddress)
    }

    func testSIWESignOut() {
        let config = SIWEAuthConfig(
            domain: "https://example.com",
            uri: "https://example.com/login"
        )
        let siwe = SIWEAuth(config: config)
        siwe.signOut()
        XCTAssertFalse(siwe.isAuthenticated)
    }

    func testSIWEErrorDescription() {
        XCTAssertEqual(SIWEError.invalidMessage.errorDescription, "Invalid SIWE message format")
        XCTAssertEqual(SIWEError.notConnected.errorDescription, "Wallet not connected")
        XCTAssertEqual(SIWEError.sessionExpired.errorDescription, "SIWE session has expired")
    }

    // MARK: - TransactionRequest

    func testTransactionRequestDefaults() {
        let tx = TransactionRequest(from: "0xFrom", to: "0xTo")
        XCTAssertNil(tx.value)
        XCTAssertNil(tx.data)
        XCTAssertNil(tx.gas)
        XCTAssertNil(tx.gasPrice)
        XCTAssertNil(tx.maxFeePerGas)
        XCTAssertNil(tx.maxPriorityFeePerGas)
        XCTAssertNil(tx.nonce)
        XCTAssertNil(tx.chainId)
    }

    // MARK: - Version

    func testVersion() {
        XCTAssertEqual(ONCHAINUX_VERSION, "0.1.0")
    }
}
