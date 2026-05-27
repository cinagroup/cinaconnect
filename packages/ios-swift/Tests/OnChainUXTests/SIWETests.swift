import XCTest
@testable import Cinacoin

final class SIWETests: XCTestCase {

    // MARK: - Message Generation

    func testBuildSIWEMessageIncludesRequiredFields() {
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

        XCTAssertTrue(message.contains("example.com wants you to sign in with your Ethereum account:"))
        XCTAssertTrue(message.contains("0x1234567890abcdef1234567890abcdef12345678"))
        XCTAssertTrue(message.contains("Sign in to Example"))
        XCTAssertTrue(message.contains("URI: https://example.com/login"))
        XCTAssertTrue(message.contains("Version: 1"))
        XCTAssertTrue(message.contains("Chain ID: 1"))
        XCTAssertTrue(message.contains("Nonce: abc123"))
        XCTAssertTrue(message.contains("Issued At: 2024-01-01T00:00:00.000Z"))
        XCTAssertTrue(message.contains("Expiration Time: 2024-01-02T00:00:00.000Z"))
    }

    func testBuildSIWEMessageWithoutOptionalFields() {
        let message = SIWEAuth.buildMessage(
            domain: "example.com",
            address: "0x1234567890abcdef1234567890abcdef12345678",
            statement: nil,
            uri: "https://example.com",
            chainId: nil,
            nonce: "abc",
            issuedAt: "2024-01-01T00:00:00.000Z"
        )

        XCTAssertTrue(message.contains("URI: https://example.com"))
        XCTAssertTrue(message.contains("Version: 1"))
        XCTAssertFalse(message.contains("Chain ID:"))
        XCTAssertFalse(message.contains("Expiration Time:"))
    }

    func testSIWEParamsConstructsWithResources() {
        let params = SIWEParams(
            domain: "example.com",
            address: "0x1234567890abcdef1234567890abcdef12345678",
            uri: "https://example.com",
            chainId: 1,
            nonce: "abc",
            issuedAt: "2024-01-01T00:00:00.000Z",
            resources: ["https://example.com/terms"]
        )

        XCTAssertEqual(params.resources?.count, 1)
        XCTAssertEqual(params.resources?.first, "https://example.com/terms")
    }

    func testSIWEAuthConfigDefaults() {
        let config = SIWEAuthConfig(domain: "example.com", uri: "https://example.com")
        XCTAssertEqual(config.domain, "example.com")
        XCTAssertEqual(config.uri, "https://example.com")
        XCTAssertNil(config.statement)
        XCTAssertEqual(config.chainId, 1)
        XCTAssertEqual(config.expirationSeconds, 86400)
    }

    // MARK: - Verification

    func testVerifyValidSIWEMessage() async {
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
        XCTAssertNotNil(result.data)
        XCTAssertEqual(result.data?.domain, "example.com")
        XCTAssertEqual(result.data?.address, "0x1234567890abcdef1234567890abcdef12345678")
        XCTAssertEqual(result.data?.nonce, "abc123")
    }

    func testVerifyInvalidSIWEMessage() async {
        let result = await SIWEAuth.verify(
            message: "not a valid SIWE message",
            signature: "0x" + String(repeating: "ab", count: 65),
            providerAddress: "0x1234"
        )

        XCTAssertFalse(result.valid)
        XCTAssertNotNil(result.error)
    }

    // MARK: - Message Parsing

    func testParseMessageReturnsNilForInvalidMessage() {
        let result = SIWEAuth.parseMessage("this is not a SIWE message")
        XCTAssertNil(result)
    }

    func testParseMessageValidMessage() {
        let message = """
        example.com wants you to sign in with your Ethereum account:
        0x1234567890abcdef1234567890abcdef12345678

        URI: https://example.com
        Version: 1
        Chain ID: 137
        Nonce: nonce123
        Issued At: 2024-01-01T00:00:00.000Z
        Expiration Time: 2024-01-02T00:00:00.000Z
        """

        let parsed = SIWEAuth.parseMessage(message)
        XCTAssertNotNil(parsed)
        XCTAssertEqual(parsed?.domain, "example.com")
        XCTAssertEqual(parsed?.chainId, 137)
        XCTAssertEqual(parsed?.nonce, "nonce123")
        XCTAssertEqual(parsed?.expirationTime, "2024-01-02T00:00:00.000Z")
    }

    // MARK: - SIWEAuth Lifecycle

    func testSIWEAuthNotAuthenticatedInitially() {
        let config = SIWEAuthConfig(domain: "example.com", uri: "https://example.com")
        let siwe = SIWEAuth(config: config)
        XCTAssertFalse(siwe.isAuthenticated)
        XCTAssertNil(siwe.authenticatedAddress)
        XCTAssertNil(siwe.currentSessionToken)
    }

    func testSIWEAuthSignOutClearsState() {
        let config = SIWEAuthConfig(domain: "example.com", uri: "https://example.com")
        let siwe = SIWEAuth(config: config)
        siwe.signOut()
        XCTAssertFalse(siwe.isAuthenticated)
        XCTAssertNil(siwe.authenticatedAddress)
        XCTAssertNil(siwe.currentSessionToken)
    }
}
