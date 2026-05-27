import XCTest
@testable import Cinacoin

final class DeepLinkHandlerTests: XCTestCase {

    // MARK: - URI Parsing

    func testGenerateDeepLinkForMetamask() {
        let handler = DeepLinkHandler()
        let link = handler.generateDeepLink(walletId: "metamask", uri: "wc:abc123")
        XCTAssertTrue(link.hasPrefix("metamask://"))
        XCTAssertTrue(link.contains("wc:abc123"))
    }

    func testGenerateDeepLinkForPhantom() {
        let handler = DeepLinkHandler()
        let link = handler.generateDeepLink(walletId: "phantom", uri: "wc:xyz789")
        XCTAssertTrue(link.hasPrefix("phantom://"))
        XCTAssertTrue(link.contains("wc:xyz789"))
    }

    // MARK: - Wallet Detection

    func testKnownWalletsGenerateLinks() {
        let handler = DeepLinkHandler()
        let wallets = ["metamask", "walletconnect", "coinbase", "rainbow", "trust", "phantom", "rabby"]
        for walletId in wallets {
            let link = handler.generateDeepLink(walletId: walletId, uri: "wc:test")
            XCTAssertFalse(link.isEmpty, "Expected link for \(walletId)")
        }
    }

    func testUnknownWalletReturnsEmpty() {
        let handler = DeepLinkHandler()
        let link = handler.generateDeepLink(walletId: "unknown_wallet", uri: "wc:12345")
        XCTAssertEqual(link, "")
    }

    func testGenerateDeepLinkWithQueryParams() {
        let handler = DeepLinkHandler()
        let link = handler.generateDeepLink(
            walletId: "metamask",
            uri: "wc:abc",
            queryParams: ["foo": "bar", "baz": "qux"]
        )
        XCTAssertTrue(link.contains("foo=bar"))
        XCTAssertTrue(link.contains("baz=qux"))
    }

    func testGenerateDeepLinkWithoutQueryParams() {
        let handler = DeepLinkHandler()
        let link = handler.generateDeepLink(walletId: "metamask", uri: "wc:abc", queryParams: nil)
        XCTAssertEqual(link, "metamask:///wc?uri=wc:abc")
    }

    // MARK: - Universal Links

    func testGenerateUniversalLink() {
        let handler = DeepLinkHandler()
        let link = handler.generateUniversalLink(walletId: "metamask", uri: "wc:abc")
        XCTAssertNotNil(link)
        XCTAssertTrue(link?.hasPrefix("https://") ?? false)
        XCTAssertTrue(link?.contains("metamask.app.link") ?? false)
        XCTAssertTrue(link?.contains("wc:abc") ?? false)
    }

    func testUniversalLinkForWalletWithoutUniversalDomain() {
        let handler = DeepLinkHandler()
        // rabby has no universalDomain
        let link = handler.generateUniversalLink(walletId: "rabby", uri: "wc:test")
        XCTAssertNil(link)
    }
}
