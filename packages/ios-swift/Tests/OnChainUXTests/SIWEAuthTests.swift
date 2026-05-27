import XCTest
@testable import Cinacoin

// MARK: - Message Generation

final class SIWEAuthTests: XCTestCase {

    func testGenerateMessageWithStatement() {
        let message = SIWEAuth.buildMessage(
            domain: "example.com",
            address: "0x1234567890abcdef1234567890abcdef12345678",
            statement: "Sign in to Example",
            uri: "https://example.com/login",
            chainId: 1,
            nonce: "abc123",
            issuedAt: "2024-01-01T00:00:00.000Z",
            expirationTime: "2024-01-02T00:00:00.000Z"
        )

        XCTAssertTrue(message.contains("example.com wants you to sign in"))
        XCTAssertTrue(message.contains("0x1234567890abcdef1234567890abcdef12345678"))
        XCTAssertTrue(message.contains("Sign in to Example"))
        XCTAssertTrue(message.contains("URI: https://example.com/login"))
        XCTAssertTrue(message.contains("Version: 1"))
        XCTAssertTrue(message.contains("Chain ID: 1"))
        XCTAssertTrue(message.contains("Nonce: abc123"))
    }

    func testGenerateMessageWithoutOptionalFields() {
        let message = SIWEAuth.buildMessage(
            domain: "example.com",
            address: "0x1234",
            statement: nil,
            uri: "https://example.com",
            chainId: nil,
            nonce: "abc",
            issuedAt: "2024-01-01T00:00:00.000Z"
        )

        XCTAssertTrue(message.contains("example.com wants you to sign in"))
        XCTAssertTrue(message.contains("URI: https://example.com"))
        XCTAssertFalse(message.contains("Chain ID:"))
    }

    // MARK: - Verification

    func testVerifyValidMessage() async {
        let message = """
        example.com wants you to sign in with your Ethereum account:
        0x1234567890abcdef1234567890abcdef12345678

        URI: https://example.com
        Version: 1
        Chain ID: 1
        Nonce: abc123
        Issued At: 2024-01-01T00:00:00.000Z
        """

        let result = await SIWEAuth.verify(
            message: message,
            signature: "0x" + String(repeating: "ab", count: 65),
            providerAddress: "0x1234567890abcdef1234567890abcdef12345678"
        )

        XCTAssertTrue(result.valid)
        XCTAssertEqual(result.data?.domain, "example.com")
        XCTAssertEqual(result.data?.address, "0x1234567890abcdef1234567890abcdef12345678")
    }

    func testVerifyInvalidMessage() async {
        let result = await SIWEAuth.verify(
            message: "not a SIWE message",
            signature: "0x" + String(repeating: "ab", count: 65),
            providerAddress: "0x1234"
        )

        XCTAssertFalse(result.valid)
        XCTAssertNotNil(result.error)
    }

    // MARK: - Message Parsing

    func testParseMessageReturnsNilForInvalid() {
        let result = SIWEAuth.parseMessage("not valid")
        XCTAssertNil(result)
    }

    func testParseMessageReturnsDataForValid() {
        let message = """
        example.com wants you to sign in with your Ethereum account:
        0x1234567890abcdef1234567890abcdef12345678

        URI: https://example.com
        Version: 1
        Chain ID: 1
        Nonce: abc123
        Issued At: 2024-01-01T00:00:00.000Z
        """
        let parsed = SIWEAuth.parseMessage(message)
        XCTAssertNotNil(parsed)
        XCTAssertEqual(parsed?.nonce, "abc123")
        XCTAssertEqual(parsed?.chainId, 1)
    }

    // MARK: - Config & Lifecycle

    func testSIWEAuthConfig() {
        let config = SIWEAuthConfig(
            domain: "https://example.com",
            uri: "https://example.com/login",
            statement: "Sign in",
            chainId: 1,
            expirationSeconds: 86400
        )
        XCTAssertEqual(config.domain, "https://example.com")
        XCTAssertEqual(config.chainId, 1)
        XCTAssertEqual(config.expirationSeconds, 86400)
    }

    func testSIWEAuthNotAuthenticatedInitially() {
        let config = SIWEAuthConfig(
            domain: "https://example.com",
            uri: "https://example.com/login"
        )
        let siwe = SIWEAuth(config: config)
        XCTAssertFalse(siwe.isAuthenticated)
        XCTAssertNil(siwe.authenticatedAddress)
        XCTAssertNil(siwe.currentSessionToken)
    }

    func testSIWEAuthSignOut() {
        let config = SIWEAuthConfig(
            domain: "https://example.com",
            uri: "https://example.com/login"
        )
        let siwe = SIWEAuth(config: config)
        siwe.signOut()
        XCTAssertFalse(siwe.isAuthenticated)
    }

    func testSIWEErrorDescriptions() {
        XCTAssertEqual(SIWEError.invalidMessage.errorDescription, "Invalid SIWE message format")
        XCTAssertEqual(SIWEError.notConnected.errorDescription, "Wallet not connected")
        XCTAssertEqual(SIWEError.sessionExpired.errorDescription, "SIWE session has expired")
    }
}
