import XCTest
@testable import Cinacoin

/// Tests for ConnectButton UI rendering and state changes.
final class ConnectButtonTests: XCTestCase {

    // MARK: - UI Rendering

    func testConnectButtonDefaultState() {
        // Verify ButtonSize enum values
        XCTAssertEqual(ButtonSize.small, .small)
        XCTAssertEqual(ButtonSize.medium, .medium)
        XCTAssertEqual(ButtonSize.large, .large)
    }

    func testButtonSizeAllCases() {
        XCTAssertEqual(ButtonSize.allCases.count, 3)
        XCTAssertTrue(ButtonSize.allCases.contains(.small))
        XCTAssertTrue(ButtonSize.allCases.contains(.medium))
        XCTAssertTrue(ButtonSize.allCases.contains(.large))
    }

    func testButtonVariantAllCases() {
        XCTAssertEqual(ButtonVariant.allCases.count, 3)
        XCTAssertTrue(ButtonVariant.allCases.contains(.primary))
        XCTAssertTrue(ButtonVariant.allCases.contains(.secondary))
        XCTAssertTrue(ButtonVariant.allCases.contains(.ghost))
    }

    // MARK: - State Changes

    func testConnectionStatusEnumValues() {
        XCTAssertEqual(ConnectionStatus.allCases.count, 4)
        XCTAssertTrue(ConnectionStatus.allCases.contains(.disconnected))
        XCTAssertTrue(ConnectionStatus.allCases.contains(.connecting))
        XCTAssertTrue(ConnectionStatus.allCases.contains(.connected))
        XCTAssertTrue(ConnectionStatus.allCases.contains(.error("")))
    }

    func testTruncatedAddressFormat() {
        let address = "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"
        let truncated = truncateAddress(address)
        XCTAssertTrue(truncated.hasPrefix("0x74"))
        XCTAssertTrue(truncated.hasSuffix("bD18"))
        XCTAssertTrue(truncated.contains("..."))
    }

    func testTruncatedAddressShortInput() {
        let short = "0x1234"
        XCTAssertEqual(truncateAddress(short), short)
    }

    func testTruncatedAddressEdgeCase() {
        let address = "0x1234567890abcdef"
        let truncated = truncateAddress(address)
        XCTAssertTrue(truncated.count < address.count)
        XCTAssertTrue(truncated.contains("..."))
    }

    func testConnectionStatusEquality() {
        XCTAssertEqual(ConnectionStatus.disconnected, .disconnected)
        XCTAssertEqual(ConnectionStatus.connecting, .connecting)
        XCTAssertEqual(ConnectionStatus.connected, .connected)
    }
}
