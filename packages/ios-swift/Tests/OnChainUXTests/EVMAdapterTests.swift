import XCTest
@testable import Cinacoin

// MARK: - Balance Tests

final class EVMAdapterTests: XCTestCase {

    func testGetBalanceThrowsWhenRpcNotConfigured() async {
        let adapter = EVMChainAdapter()
        do {
            _ = try await adapter.getBalance(address: "0x1234")
            XCTFail("Should have thrown")
        } catch EVMError.rpcNotConfigured {
            // expected
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testGetBalanceFormattedThrowsWhenRpcNotConfigured() async {
        let adapter = EVMChainAdapter()
        do {
            _ = try await adapter.getBalanceFormatted(address: "0x1234")
            XCTFail("Should have thrown")
        } catch EVMError.rpcNotConfigured {
            // expected
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testGetTokenBalanceThrowsWhenRpcNotConfigured() async {
        let adapter = EVMChainAdapter()
        do {
            _ = try await adapter.getTokenBalance(
                tokenAddress: "0xToken",
                userAddress: "0xUser"
            )
            XCTFail("Should have thrown")
        } catch EVMError.rpcNotConfigured {
            // expected
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    // MARK: - Transaction Signing Tests

    func testEstimateGasThrowsWhenRpcNotConfigured() async {
        let adapter = EVMChainAdapter()
        do {
            _ = try await adapter.estimateGas(tx: ["from": "0xFrom", "to": "0xTo"])
            XCTFail("Should have thrown")
        } catch EVMError.rpcNotConfigured {
            // expected
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testGetGasPriceThrowsWhenRpcNotConfigured() async {
        let adapter = EVMChainAdapter()
        do {
            _ = try await adapter.getGasPrice()
            XCTFail("Should have thrown")
        } catch EVMError.rpcNotConfigured {
            // expected
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testGetTransactionThrowsWhenRpcNotConfigured() async {
        let adapter = EVMChainAdapter()
        do {
            _ = try await adapter.getTransaction(hash: "0xhash")
            XCTFail("Should have thrown")
        } catch EVMError.rpcNotConfigured {
            // expected
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    // MARK: - Chain Switch Tests

    func testRegisterAndFindChain() {
        let adapter = EVMChainAdapter()
        adapter.registerChains([.ethereum, .polygon, .arbitrum])

        XCTAssertNotNil(adapter.findChain(chainId: 1))
        XCTAssertNotNil(adapter.findChain(chainId: 137))
        XCTAssertNotNil(adapter.findChain(chainId: 42161))
        XCTAssertNil(adapter.findChain(chainId: 999))
    }

    func testFindChainByName() {
        let adapter = EVMChainAdapter()
        adapter.registerChains([.ethereum, .polygon])

        XCTAssertEqual(adapter.findChain(chainId: 1)?.name, "Ethereum")
        XCTAssertEqual(adapter.findChain(chainId: 137)?.name, "Polygon")
    }

    func testRpcUrlConfiguration() {
        let adapter = EVMChainAdapter()
        adapter.setRpcUrl("https://eth.llamarpc.com")
        // Setting RPC URL should not throw
    }

    // MARK: - Formatting Tests

    func testHexToEthOneEther() {
        let eth = EVMChainAdapter.hexToEth("0x0DE0B6B3A7640000")
        XCTAssertEqual(eth, "1.000000")
    }

    func testHexToEthHalfEther() {
        let eth = EVMChainAdapter.hexToEth("0x6F05B59D3B20000")
        XCTAssertEqual(eth, "0.500000")
    }

    func testCallThrowsWhenRpcNotConfigured() async {
        let adapter = EVMChainAdapter()
        do {
            _ = try await adapter.call(params: EthCallParams(to: "0xContract", data: "0x"))
            XCTFail("Should have thrown")
        } catch EVMError.rpcNotConfigured {
            // expected
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }
}
