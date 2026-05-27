import XCTest
@testable import Cinacoin

// MARK: - SOL Balance Tests

final class SolanaAdapterTests: XCTestCase {

    func testSolanaBalanceValidAddress() {
        // Valid base58 address, 32-44 chars, no 0/O/I/l
        XCTAssertTrue(SolanaChainAdapter.isValidAddress("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"))
        XCTAssertTrue(SolanaChainAdapter.isValidAddress("So11111111111111111111111111111111111111112"))
    }

    func testSolanaBalanceInvalidAddress() {
        XCTAssertFalse(SolanaChainAdapter.isValidAddress(""))
        XCTAssertFalse(SolanaChainAdapter.isValidAddress("short"))
        XCTAssertFalse(SolanaChainAdapter.isValidAddress("0x1234567890abcdef")) // contains 0
    }

    func testSolanaBalanceConvertToSol() {
        XCTAssertEqual(SolanaChainAdapter.lamportsToSol(1_000_000_000), "1.000000")
        XCTAssertEqual(SolanaChainAdapter.lamportsToSol(500_000_000), "0.500000")
        XCTAssertEqual(SolanaChainAdapter.lamportsToSol(0), "0.000000")
    }

    func testSolanaBalanceConvertToLamports() {
        XCTAssertEqual(SolanaChainAdapter.solToLamports(1.0), 1_000_000_000)
        XCTAssertEqual(SolanaChainAdapter.solToLamports(0.5), 500_000_000)
    }

    // MARK: - TX Signing Tests

    func testSignMessageNotConnected() async {
        let adapter = SolanaChainAdapter()
        // connectedAddress is nil by default
        do {
            _ = try await adapter.signMessage("Hello")
            XCTFail("Should have thrown notConnected")
        } catch SolanaError.notConnected {
            // expected
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testGetBalanceThrowsWithInvalidRpc() async {
        let adapter = SolanaChainAdapter()
        adapter.setRpcUrl("invalid-url")
        do {
            _ = try await adapter.getBalance(address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU")
            XCTFail("Should have thrown")
        } catch SolanaError.invalidRpcUrl {
            // expected
        } catch {
            // Network error also acceptable
        }
    }

    // MARK: - Chain Presets

    func testSolanaChainPresets() {
        let chains = SolanaChainAdapter.chains
        XCTAssertFalse(chains.isEmpty)
        XCTAssertEqual(chains[0].chainId, 101) // Mainnet
        XCTAssertEqual(chains[1].chainId, 102) // Devnet
        XCTAssertEqual(chains[2].chainId, 103) // Testnet
    }

    func testSolanaWalletPresets() {
        let wallets = SolanaChainAdapter.wallets
        XCTAssertTrue(wallets.contains(where: { $0.id == "phantom" }))
        XCTAssertTrue(wallets.contains(where: { $0.id == "solflare" }))
        XCTAssertTrue(wallets.contains(where: { $0.id == "backpack" }))
    }

    // MARK: - Address Validation Edge Cases

    func testSolanaAddressTooShort() {
        XCTAssertFalse(SolanaChainAdapter.isValidAddress("abc"))
    }

    func testSolanaAddressTooLong() {
        let long = String(repeating: "A", count: 45)
        XCTAssertFalse(SolanaChainAdapter.isValidAddress(long))
    }
}
