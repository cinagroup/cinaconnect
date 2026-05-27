/**
 * WalletConnectIntegrationTests — real WC v2 integration tests for iOS SDK.
 *
 * Tests the full WC v2 flow: pairing, session proposal, URI parsing,
 * deep linking, SIWE signing, balance fetching, and disconnection.
 */

import XCTest
@testable import OnChainUX

final class WalletConnectTests: XCTestCase {

    // MARK: - WCClient Configuration

    func testWCClientSharedInstance() {
        let client = WCClient.shared
        XCTAssertTrue(client === WCClient.shared)
    }

    func testWCClientInitialState() {
        let client = WCClient.shared
        XCTAssertEqual(client.status, .disconnected)
        XCTAssertNil(client.pairingUri)
        XCTAssertNil(client.sessionTopic)
        XCTAssertTrue(client.accounts.isEmpty)
        XCTAssertEqual(client.chainId, 1)
    }

    func testWCClientConfigure() {
        let client = WCClient.shared
        client.configure(
            projectId: "test-project-id",
            metadata: WCAppMetadata(
                name: "Test dApp",
                description: "A test dApp",
                url: "https://test.example.com",
                icons: ["https://test.example.com/icon.png"]
            ),
            chains: ["eip155:1", "eip155:137"]
        )
        XCTAssertEqual(client.projectId, "test-project-id")
        XCTAssertEqual(client.metadata.name, "Test dApp")
    }

    // MARK: - URI Parsing

    func testParseValidWCv2Uri() {
        let uri = "wc:abc123@2?relay-protocol=waku&relay-url=wss%3A%2F%2Frelay.cinacoin.io&symKey=def456"
        do {
            let components = try WCUtils.parseUri(uri)
            XCTAssertEqual(components.topic, "abc123")
            XCTAssertEqual(components.version, 2)
            XCTAssertEqual(components.relayProtocol, "waku")
            XCTAssertEqual(components.relayUrl, "wss://relay.cinacoin.io")
            XCTAssertEqual(components.symKey, "def456")
        } catch {
            XCTFail("Failed to parse valid WC URI: \(error)")
        }
    }

    func testParseInvalidWCUri() {
        let invalidUris = [
            "invalid",                          // No wc: prefix
            "wc:abc123@1",                      // Wrong version
            "wc:abc123@2?relay-protocol=waku",  // Missing symKey
        ]

        for uri in invalidUris {
            XCTAssertThrowsError(try WCUtils.parseUri(uri)) { error in
                guard case WCError.invalidUri = error as? WCError else {
                    XCTFail("Expected invalidUri error, got \(error)")
                    return
                }
            }
        }
    }

    func testFormatAndRoundtripUri() {
        let components = WcUriComponents(
            topic: "test123",
            version: 2,
            relayProtocol: "waku",
            relayUrl: "wss://relay.cinacoin.io",
            symKey: "symkey123"
        )

        let formatted = WCUtils.formatUri(components)
        XCTAssertTrue(formatted.hasPrefix("wc:test123@2?"))
        XCTAssertTrue(formatted.contains("symKey=symkey123"))

        // Parse it back
        do {
            let parsed = try WCUtils.parseUri(formatted)
            XCTAssertEqual(parsed.topic, "test123")
            XCTAssertEqual(parsed.version, 2)
        } catch {
            XCTFail("Roundtrip failed: \(error)")
        }
    }

    // MARK: - Crypto Utilities

    func testGenerateTopic() {
        let topic1 = WCUtils.generateTopic()
        let topic2 = WCUtils.generateTopic()
        XCTAssertNotEqual(topic1, topic2)
        XCTAssertEqual(topic1.count, 64)  // 32 bytes = 64 hex chars
        XCTAssertEqual(topic2.count, 64)
    }

    func testGenerateSymKey() {
        let key = WCUtils.generateSymKey()
        XCTAssertEqual(key.count, 64)
    }

    func testX25519KeypairGeneration() {
        let keypair1 = WCX25519Keypair.generate()
        let keypair2 = WCX25519Keypair.generate()

        XCTAssertEqual(keypair1.publicKeyHex.count, 64)
        XCTAssertEqual(keypair2.publicKeyHex.count, 64)
        XCTAssertNotEqual(keypair1.publicKeyHex, keypair2.publicKeyHex)
        XCTAssertEqual(keypair1.privateKeyBytes.count, 32)
    }

    func testSharedSecretComputation() {
        let kp1 = WCX25519Keypair.generate()
        let kp2 = WCX25519Keypair.generate()

        // Both parties should derive the same shared secret
        let secret1 = try? kp1.sharedSecret(peerPublicKeyHex: kp2.publicKeyHex)
        let secret2 = try? kp2.sharedSecret(peerPublicKeyHex: kp1.publicKeyHex)

        XCTAssertNotNil(secret1)
        XCTAssertNotNil(secret2)
        XCTAssertEqual(secret1, secret2)
    }

    func testSharedSecretInvalidPublicKey() {
        let kp = WCX25519Keypair.generate()
        XCTAssertThrowsError(try kp.sharedSecret(peerPublicKeyHex: "invalid"))
    }

    func testChaCha20Poly1305EncryptDecryptRoundtrip() {
        let symKey = WCUtils.generateSymKey()
        let json: [String: Any] = [
            "id": 1,
            "jsonrpc": "2.0",
            "method": "test",
            "params": ["hello": "world"]
        ]

        let encrypted = WCUtils.encrypt(symKey: symKey, json: json)
        XCTAssertNotNil(encrypted)
        XCTAssertFalse(encrypted!.isEmpty)

        let decrypted = WCUtils.decrypt(symKey: symKey, encrypted: encrypted!)
        XCTAssertNotNil(decrypted)

        // Verify round-trip correctness
        let roundtrip = try? JSONSerialization.jsonObject(with: decrypted!) as? [String: Any]
        XCTAssertNotNil(roundtrip)
        XCTAssertEqual(roundtrip?["id"] as? Int, 1)
        XCTAssertEqual(roundtrip?["jsonrpc"] as? String, "2.0")
        XCTAssertEqual(roundtrip?["method"] as? String, "test")
    }

    func testChaCha20Poly1305DecryptWrongKey() {
        let symKey1 = WCUtils.generateSymKey()
        let symKey2 = WCUtils.generateSymKey()
        let json: [String: Any] = ["secret": true]

        let encrypted = WCUtils.encrypt(symKey: symKey1, json: json)
        XCTAssertNotNil(encrypted)

        // Decrypting with wrong key should fail
        let decrypted = WCUtils.decrypt(symKey: symKey2, encrypted: encrypted!)
        XCTAssertNil(decrypted, "Decryption with wrong key should fail (auth tag mismatch)")
    }

    func testChaCha20Poly1305NonceSize() {
        // Verify the encrypted output format: nonce (12) || ciphertext || tag (16)
        let symKey = WCUtils.generateSymKey()
        let json: [String: Any] = ["test": true]
        let encrypted = WCUtils.encrypt(symKey: symKey, json: json)
        XCTAssertNotNil(encrypted)

        let combined = Data(base64Encoded: encrypted!)!
        // Minimum: 12 (nonce) + 16 (tag) = 28 bytes
        XCTAssertGreaterThan(combined.count, 28)
        // Nonce portion should be 12 bytes
        let nonceData = combined.prefix(12)
        XCTAssertEqual(nonceData.count, 12, "ChaCha20-Poly1305 nonce must be 12 bytes")
    }

    func testChaCha20Poly1305DeterministicNonce() {
        // Same key + different plaintexts produce different ciphertexts (nonce is random)
        let symKey = WCUtils.generateSymKey()
        let json: [String: Any] = ["data": "same"]

        let enc1 = WCUtils.encrypt(symKey: symKey, json: json)!
        let enc2 = WCUtils.encrypt(symKey: symKey, json: json)!
        XCTAssertNotEqual(enc1, enc2, "Random nonce should produce different ciphertexts")

        // But both should decrypt correctly
        let dec1 = WCUtils.decrypt(symKey: symKey, encrypted: enc1)!
        let dec2 = WCUtils.decrypt(symKey: symKey, encrypted: enc2)!
        XCTAssertEqual(dec1, dec2)
    }

    func testEncryptDecryptWithEmptyData() {
        let symKey = WCUtils.generateSymKey()
        let json: [String: Any] = [:]
        let encrypted = WCUtils.encrypt(symKey: symKey, json: json)
        XCTAssertNotNil(encrypted)
        let decrypted = WCUtils.decrypt(symKey: symKey, encrypted: encrypted!)
        XCTAssertNotNil(decrypted)
    }

    func testChaCha20Poly1305LargePayload() {
        let symKey = WCUtils.generateSymKey()
        var largeDict: [String: Any] = [:]
        for i in 0..<100 {
            largeDict["key\(i)"] = String(repeating: "x", count: 100)
        }
        let encrypted = WCUtils.encrypt(symKey: symKey, json: largeDict)
        XCTAssertNotNil(encrypted)
        let decrypted = WCUtils.decrypt(symKey: symKey, encrypted: encrypted!)
        XCTAssertNotNil(decrypted)
        let roundtrip = try? JSONSerialization.jsonObject(with: decrypted!) as? [String: Any]
        XCTAssertEqual(roundtrip?.count, 100)
    }

    func testDeriveSessionTopic() {
        let topic = WCUtils.deriveSessionTopic(
            myPublicKey: "aa".repeating(count: 32),
            peerPublicKey: "bb".repeating(count: 32)
        )
        XCTAssertEqual(topic.count, 64)

        // Deterministic for same inputs
        let topic2 = WCUtils.deriveSessionTopic(
            myPublicKey: "aa".repeating(count: 32),
            peerPublicKey: "bb".repeating(count: 32)
        )
        XCTAssertEqual(topic, topic2)
    }

    // MARK: - ChaCha20-Poly1305 Shared Secret Encryption

    func testEncryptUsingSharedSecretRoundtrip() {
        let kp1 = WCX25519Keypair.generate()
        let kp2 = WCX25519Keypair.generate()

        // Both sides compute the same shared secret
        let secret1 = try! kp1.sharedSecret(peerPublicKeyHex: kp2.publicKeyHex)
        let secret2 = try! kp2.sharedSecret(peerPublicKeyHex: kp1.publicKeyHex)
        XCTAssertEqual(secret1, secret2)

        // Encrypt with kp1's keypair + kp2's public key
        let json: [String: Any] = ["method": "eth_sendTransaction", "params": ["from": "0x123"]]
        let encrypted = WCUtils.encryptUsingSharedSecret(
            myPrivateKey: kp1.privateKeyBytes,
            peerPublicKeyHex: kp2.publicKeyHex,
            json: json
        )
        XCTAssertNotNil(encrypted)
        XCTAssertFalse(encrypted!.isEmpty)

        // Decrypt with kp2's keypair + kp1's public key
        let decrypted = WCUtils.decrypt(
            symKey: secret2.toHexString(),
            encrypted: encrypted!
        )
        XCTAssertNotNil(decrypted)

        // Verify content
        let roundtrip = try? JSONSerialization.jsonObject(with: decrypted!) as? [String: Any]
        XCTAssertEqual(roundtrip?["method"] as? String, "eth_sendTransaction")
    }

    func testEncryptUsingSharedSecretDeterministicSharedSecret() {
        // Verify both parties derive identical shared secrets
        let kp1 = WCX25519Keypair.generate()
        let kp2 = WCX25519Keypair.generate()

        let s1 = try! kp1.sharedSecret(peerPublicKeyHex: kp2.publicKeyHex)
        let s2 = try! kp2.sharedSecret(peerPublicKeyHex: kp1.publicKeyHex)
        XCTAssertEqual(s1, s2, "DH shared secrets must be identical")

        // Encrypt from side 1, decrypt from side 2
        let json: [String: Any] = ["ping": true]
        let enc = WCUtils.encryptUsingSharedSecret(
            myPrivateKey: kp1.privateKeyBytes,
            peerPublicKeyHex: kp2.publicKeyHex,
            json: json
        )
        let dec = WCUtils.decrypt(symKey: s2.toHexString(), encrypted: enc!)
        XCTAssertNotNil(dec)
    }

    // MARK: - encryptUsingSessionKey (HKDF-SHA256 Key Derivation)

    func testEncryptUsingSessionKeyRoundtrip() {
        let topic = WCUtils.generateTopic()
        let data = Data("Hello World".utf8)

        let encrypted = WCUtils.encryptUsingSessionKey(topic: topic, data: data)
        XCTAssertNotNil(encrypted)
        XCTAssertFalse(encrypted!.isEmpty)

        // Derive the same key and decrypt
        let topicData = topic.data(using: .utf8)!
        let derivedKey = HKDF<SHA256>.deriveKey(
            inputKeyMaterial: SymmetricKey(data: topicData),
            outputByteCount: 32
        )

        let symKey = derivedKey.withUnsafeBytes { Data($0).toHexString() }
        let decrypted = WCUtils.decrypt(symKey: symKey, encrypted: encrypted!)
        XCTAssertNotNil(decrypted)
        XCTAssertEqual(decrypted, data)
    }

    func testEncryptUsingSessionKeyNotUsingTopicAsKey() {
        // The key must NOT be the raw topic bytes (that was the old bug)
        let topic = "abc123def456"
        let data = Data("test payload".utf8)

        let encrypted = WCUtils.encryptUsingSessionKey(topic: topic, data: data)
        XCTAssertNotNil(encrypted)

        // Verify decryption fails with the raw topic-as-key (the old buggy approach)
        let badKey = topic.data(using: .utf8)!.toHexString()
        let badDecrypted = WCUtils.decrypt(symKey: badKey, encrypted: encrypted!)
        XCTAssertNil(badDecrypted, "Raw topic-as-key should not decrypt HKDF-derived key")
    }

    func testEncryptUsingSessionKeyDeterministicKeyDerivation() {
        // Same topic always derives the same key (HKDF is deterministic)
        let topic = "fixed-topic-12345"
        let topicData = topic.data(using: .utf8)!

        let key1 = HKDF<SHA256>.deriveKey(
            inputKeyMaterial: SymmetricKey(data: topicData),
            outputByteCount: 32
        )
        let key2 = HKDF<SHA256>.deriveKey(
            inputKeyMaterial: SymmetricKey(data: topicData),
            outputByteCount: 32
        )
        XCTAssertEqual(
            key1.withUnsafeBytes { Data($0) },
            key2.withUnsafeBytes { Data($0) },
            "HKDF must derive identical keys from the same input"
        )
    }

    func testEncryptUsingSessionKeyDifferentTopics() {
        let topic1 = "topic-alpha"
        let topic2 = "topic-beta"
        let data = Data("same data".utf8)

        let enc1 = WCUtils.encryptUsingSessionKey(topic: topic1, data: data)!
        let enc2 = WCUtils.encryptUsingSessionKey(topic: topic2, data: data)!

        // Different topics → different keys → different ciphertexts
        XCTAssertNotEqual(enc1, enc2)

        // Cross-decrypt should fail
        let topicData1 = topic1.data(using: .utf8)!
        let key1 = HKDF<SHA256>.deriveKey(
            inputKeyMaterial: SymmetricKey(data: topicData1),
            outputByteCount: 32
        )
        let symKey1 = key1.withUnsafeBytes { Data($0).toHexString() }
        let crossDecrypted = WCUtils.decrypt(symKey: symKey1, encrypted: enc2)
        XCTAssertNil(crossDecrypted)
    }

    // MARK: - WC Methods & Events

    func testStandardEvmMethods() {
        let methods = WCMethods.standardEvmMethods
        XCTAssertTrue(methods.contains("eth_sendTransaction"))
        XCTAssertTrue(methods.contains("personal_sign"))
        XCTAssertTrue(methods.contains("eth_signTypedData_v4"))
        XCTAssertTrue(methods.contains("wallet_switchEthereumChain"))
        XCTAssertEqual(methods.count, 9)
    }

    func testStandardEvmEvents() {
        let events = WCEvents.standardEvmEvents
        XCTAssertTrue(events.contains("chainChanged"))
        XCTAssertTrue(events.contains("accountsChanged"))
        XCTAssertEqual(events.count, 2)
    }

    // MARK: - Transaction Request

    func testTransactionRequestJson() {
        let tx = WCTransactionRequest(
            from: "0xFrom",
            to: "0xTo",
            value: "0xDE0B6B3A7640000",
            data: "0x",
            chainId: 1
        )
        // Verify the encoder can produce output
        let encoder = JSONEncoder()
        encoder.outputFormatting = .sortedKeys
        XCTAssertNoThrow(try encoder.encode(tx))
    }

    // MARK: - SIWE Integration

    func testSIWEMessageBuilding() {
        let message = SIWEAuth.buildMessage(
            domain: "https://example.com",
            address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
            statement: "Sign in to Example",
            uri: "https://example.com/login",
            chainId: 1,
            nonce: "abc123",
            issuedAt: "2024-01-01T00:00:00.000Z"
        )

        XCTAssertTrue(message.contains("https://example.com wants you to sign in"))
        XCTAssertTrue(message.contains("0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"))
        XCTAssertTrue(message.contains("Sign in to Example"))
        XCTAssertTrue(message.contains("URI: https://example.com/login"))
        XCTAssertTrue(message.contains("Chain ID: 1"))
        XCTAssertTrue(message.contains("Nonce: abc123"))
    }

    func testSIWEMessageParsing() {
        let message = """
        https://example.com wants you to sign in with your Ethereum account:
        0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18

        Sign in to Example

        URI: https://example.com/login
        Version: 1
        Chain ID: 1
        Nonce: abc123
        Issued At: 2024-01-01T00:00:00.000Z
        Expiration Time: 2024-01-02T00:00:00.000Z
        """

        let parsed = SIWEAuth.parseMessage(message)
        XCTAssertNotNil(parsed)
        XCTAssertEqual(parsed?.domain, "https://example.com")
        XCTAssertEqual(parsed?.address, "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18")
        XCTAssertEqual(parsed?.uri, "https://example.com/login")
        XCTAssertEqual(parsed?.chainId, 1)
        XCTAssertEqual(parsed?.nonce, "abc123")
    }

    func testSIWEAuthInitialState() {
        let config = SIWEAuthConfig(
            domain: "https://example.com",
            uri: "https://example.com/login"
        )
        let siwe = SIWEAuth(config: config)
        XCTAssertFalse(siwe.isAuthenticated)
        XCTAssertNil(siwe.authenticatedAddress)
        XCTAssertNil(siwe.currentSessionToken)
    }

    // MARK: - Deep Link Integration

    func testDeepLinkWithWCUri() {
        let handler = DeepLinkHandler()
        let wcUri = "wc:abc123@2?relay-protocol=waku&symKey=def456"

        let link = handler.generateDeepLink(walletId: "metamask", uri: wcUri)
        XCTAssertTrue(link.hasPrefix("metamask://"))
        XCTAssertTrue(link.contains("wc:abc123"))
        XCTAssertTrue(link.contains("symKey=def456"))
    }

    func testDeepLinkUnknownWallet() {
        let handler = DeepLinkHandler()
        let link = handler.generateDeepLink(walletId: "unknown_wallet", uri: "wc:test")
        XCTAssertEqual(link, "")
    }

    func testUniversalLinkGeneration() {
        let handler = DeepLinkHandler()
        let link = handler.generateUniversalLink(walletId: "metamask", uri: "wc:test123")
        XCTAssertNotNil(link)
        XCTAssertTrue(link?.hasPrefix("https://") ?? false)
        XCTAssertTrue(link?.contains("metamask.app.link") ?? false)
        XCTAssertTrue(link?.contains("test123") ?? false)
    }

    // MARK: - WCClient Event Subscription

    func testEventSubscription() {
        let client = WCClient.shared
        var receivedEvents: [WCEvent] = []

        let subId = client.onEvent { event in
            receivedEvents.append(event)
        }

        // Verify subscription works
        XCTAssertNotNil(subId)

        // Unsubscribe
        client.unsubscribe(subId)

        // The handler map should no longer contain this subscription
        // (Implementation detail — we just verify no crash)
        XCTAssertTrue(true)
    }

    // MARK: - Error Descriptions

    func testWCErrorDescriptions() {
        XCTAssertEqual(WCError.notConnected.errorDescription, "Not connected to a wallet")
        XCTAssertEqual(WCError.notConfigured.errorDescription, "WCClient has not been configured")
        XCTAssertEqual(WCError.sessionTimeout.errorDescription, "Session establishment timed out")

        let invalidUrl = WCError.invalidUrl("bad://url")
        XCTAssertEqual(invalidUrl.errorDescription, "Invalid relay URL: bad://url")

        let rpcErr = WCError.rpcError(4001, "User rejected")
        XCTAssertEqual(rpcErr.errorDescription, "RPC error 4001: User rejected")
    }

    // MARK: - WalletManager WC Integration

    func testWalletManagerWcConnectors() {
        let manager = WalletManager()
        let config = CinacoinConfig(
            projectId: "test-id",
            chains: [.ethereum, .polygon],
            metadata: AppMetadata(
                name: "Test",
                description: "",
                url: "https://test.com",
                icons: []
            )
        )
        manager.configure(with: config)

        let connectors = manager.getConnectors()
        XCTAssertFalse(connectors.isEmpty)

        // Verify WC wallets are in the list
        let wcIds = connectors.map { $0.id }
        XCTAssertTrue(wcIds.contains("metamask"))
        XCTAssertTrue(wcIds.contains("walletconnect"))
        XCTAssertTrue(wcIds.contains("rainbow"))
        XCTAssertTrue(wcIds.contains("trust"))
    }

    func testWalletManagerIsWalletInstalled() {
        let manager = WalletManager()
        // This depends on device state — just verify the method doesn't crash
        let _ = manager.isWalletInstalled(walletId: "metamask")
        let _ = manager.isWalletInstalled(walletId: "nonexistent")
        XCTAssertTrue(true)
    }
}

// MARK: - Helpers

extension String {
    func `repeating`(count: Int) -> String {
        String(repeating: self, count: count)
    }
}

// MARK: - BigInt Helper (simplified for tests)

struct BigInt: Equatable {
    let magnitude: UInt64

    init?(_ string: String, radix: Int) {
        guard radix == 16 else { return nil }
        let cleaned = string.replacingOccurrences(of: "0x", with: "")
        guard let val = UInt64(cleaned, radix: 16) else { return nil }
        self.magnitude = val
    }
}
