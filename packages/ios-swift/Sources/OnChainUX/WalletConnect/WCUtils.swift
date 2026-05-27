/**
 * WCUtils — Crypto and URI utilities for WalletConnect v2 (iOS).
 *
 * Provides pure-Swift implementations of:
 * - X25519 keypair generation (using Apple CryptoKit)
 * - ChaCha20-Poly1305 encryption/decryption
 * - SHA-256 hashing for topic derivation
 * - WC v2 URI parsing and formatting
 * - Symmetric key management for pairing channels
 *
 * Uses CryptoKit (iOS 13+) — no third-party dependencies needed.
 */

import Foundation
import CryptoKit

// MARK: - X25519 Keypair

/// X25519 keypair for Diffie-Hellman key exchange.
public struct WCX25519Keypair {
    /// Private key (32 bytes).
    public let privateKey: Curve25519.KeyAgreement.PrivateKey
    /// Public key (32 bytes).
    public let publicKey: Curve25519.KeyAgreement.PublicKey
    
    /// Public key as a 64-character hex string.
    public var publicKeyHex: String {
        publicKey.rawRepresentation.toHexString()
    }
    
    /// Private key as raw bytes.
    public var privateKeyBytes: Data {
        privateKey.rawRepresentation
    }
    
    /// Generate a new random X25519 keypair.
    public static func generate() -> WCX25519Keypair {
        let privateKey = Curve25519.KeyAgreement.PrivateKey()
        return WCX25519Keypair(privateKey: privateKey, publicKey: privateKey.publicKey)
    }
    
    /// Compute the shared secret with a peer's public key.
    /// - Parameter peerPublicKey: Peer's public key as raw bytes.
    /// - Returns: 32-byte shared secret.
    public func sharedSecret(peerPublicKey: Data) throws -> Data {
        guard let peerPub = try? Curve25519.KeyAgreement.PublicKey(rawRepresentation: peerPublicKey) else {
            throw WCError.cryptoError("Invalid peer public key")
        }
        let shared = try privateKey.sharedSecretFromKeyAgreement(with: peerPub)
        return shared.withUnsafeBytes { Data($0) }
    }
    
    /// Compute the shared secret with a peer's hex-encoded public key.
    /// - Parameter peerPublicKeyHex: Peer's public key as 64-char hex string.
    /// - Returns: 32-byte shared secret.
    public func sharedSecret(peerPublicKeyHex: String) throws -> Data {
        guard let peerData = Data(hex: peerPublicKeyHex) else {
            throw WCError.cryptoError("Invalid hex public key")
        }
        return try sharedSecret(peerPublicKey: peerData)
    }
}

// MARK: - Encryption / Decryption

/// Namespace for WC v2 encryption operations.
public enum WCUtils {
    
    // MARK: - Random Generation
    
    /// Generate a random 32-byte topic (64 hex chars).
    public static func generateTopic() -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        _ = SecRandomCopyBytes(kSecRandomDefault, 32, &bytes)
        return Data(bytes).toHexString()
    }
    
    /// Generate a random 32-byte symmetric key (64 hex chars).
    public static func generateSymKey() -> String {
        generateTopic()
    }
    
    // MARK: - URI Parsing
    
    /// Parse a WalletConnect v2 URI string.
    /// - Parameter uri: WC v2 URI (e.g., `wc:topic@2?relay-protocol=waku&relay-url=...&symKey=...`).
    /// - Returns: Parsed components.
    /// - Throws: `WCError.invalidUri` if the URI is malformed.
    public static func parseUri(_ uri: String) throws -> WcUriComponents {
        guard uri.hasPrefix("wc:") else {
            throw WCError.invalidUri(uri)
        }
        
        let withoutPrefix = String(uri.dropFirst(3))
        let parts = withoutPrefix.split(separator: "?", maxSplits: 1)
        guard parts.count >= 1 else {
            throw WCError.invalidUri(uri)
        }
        
        let topicVersion = parts[0].split(separator: "@", maxSplits: 1)
        guard topicVersion.count == 2 else {
            throw WCError.invalidUri(uri)
        }
        
        let topic = String(topicVersion[0])
        let versionStr = String(topicVersion[1])
        guard let version = Int(versionStr), version == 2 else {
            throw WCError.invalidUri("Unsupported WC version: \(versionStr)")
        }
        
        var relayProtocol = "waku"
        var relayUrl = ""
        var symKey = ""
        
        if parts.count == 2 {
            let queryParams = parts[1].split(separator: "&")
            for param in queryParams {
                let kv = param.split(separator: "=", maxSplits: 1)
                if kv.count == 2 {
                    let key = String(kv[0])
                    let value = String(kv[1]).removingPercentEncoding ?? String(kv[1])
                    switch key {
                    case "relay-protocol":
                        relayProtocol = value
                    case "relay-url":
                        relayUrl = value
                    case "symKey":
                        symKey = value
                    default:
                        break
                    }
                }
            }
        }
        
        guard !symKey.isEmpty else {
            throw WCError.invalidUri("Missing symKey")
        }
        
        return WcUriComponents(
            topic: topic,
            version: version,
            relayProtocol: relayProtocol,
            relayUrl: relayUrl,
            symKey: symKey
        )
    }
    
    /// Format a WC v2 URI from components.
    public static func formatUri(_ components: WcUriComponents) -> String {
        var query = "relay-protocol=\(components.relayProtocol)"
        query += "&relay-url=\(components.relayUrl.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? components.relayUrl)"
        query += "&symKey=\(components.symKey)"
        return "wc:\(components.topic)@\(components.version)?\(query)"
    }
    
    // MARK: - Encryption (ChaCha20-Poly1305 via CryptoKit)

    /// Encrypt a JSON object using the symmetric key (ChaCha20-Poly1305).
    /// Output format: base64(nonce[12] || ciphertext || tag[16]).
    ///
    /// - Parameters:
    ///   - symKey: 64-character hex symmetric key.
    ///   - json: JSON-serializable object to encrypt.
    /// - Returns: Base64-encoded encrypted payload.
    public static func encrypt(symKey: String, json: Any) -> String? {
        guard let keyData = Data(hex: symKey), keyData.count == 32 else { return nil }
        guard let jsonData = try? JSONSerialization.data(withJSONObject: json) else { return nil }

        do {
            let nonce = ChaChaPoly.Nonce()
            let sealedBox = try ChaChaPoly.seal(
                jsonData,
                using: SymmetricKey(data: keyData),
                nonce: nonce
            )
            return sealedBox.combined?.base64EncodedString()
        } catch {
            print("[WCUtils] ChaCha20-Poly1305 encrypt failed: \(error)")
            return nil
        }
    }

    /// Decrypt a message using the symmetric key (ChaCha20-Poly1305).
    ///
    /// - Parameters:
    ///   - symKey: 64-character hex symmetric key.
    ///   - encrypted: Base64-encoded encrypted payload.
    /// - Returns: Decrypted raw bytes, or nil on failure.
    public static func decrypt(symKey: String, encrypted: String) -> Data? {
        guard let keyData = Data(hex: symKey), keyData.count == 32 else { return nil }
        guard let combined = Data(base64Encoded: encrypted) else { return nil }

        // ChaCha20-Poly1305 uses a 12-byte nonce (not 16 as in AES-GCM).
        // Layout: nonce (12 bytes) || ciphertext || tag (16 bytes)
        guard combined.count > 28 else { return nil } // 12 nonce + 16 tag minimum
        let nonceData = combined.prefix(12)
        let ciphertextWithTag = combined.suffix(from: 12)

        do {
            let nonce = ChaChaPoly.Nonce(data: nonceData)
            let sealedBox = try ChaChaPoly.SealedBox(
                nonce: nonce,
                ciphertext: ciphertextWithTag
            )
            return try ChaChaPoly.open(sealedBox, using: SymmetricKey(data: keyData))
        } catch {
            print("[WCUtils] ChaCha20-Poly1305 decrypt failed: \(error)")
            return nil
        }
    }

    // MARK: - Session Key Encryption

    /// Encrypt using X25519 shared secret (for session-level messages).
    ///
    /// - Parameters:
    ///   - myPrivateKey: Our X25519 private key bytes.
    ///   - peerPublicKeyHex: Peer's public key (hex).
    ///   - json: JSON object to encrypt.
    /// - Returns: Base64-encoded encrypted payload, or nil on failure.
    public static func encryptUsingSharedSecret(
        myPrivateKey: Data,
        peerPublicKeyHex: String,
        json: Any
    ) -> String? {
        guard let peerKeyData = Data(hex: peerPublicKeyHex) else { return nil }

        do {
            let privateKey = try Curve25519.KeyAgreement.PrivateKey(rawRepresentation: myPrivateKey)
            let publicKey = try Curve25519.KeyAgreement.PublicKey(rawRepresentation: peerKeyData)
            let sharedSecret = try privateKey.sharedSecretFromKeyAgreement(with: publicKey)
            let keyBytes = sharedSecret.withUnsafeBytes { Data($0) }

            guard let jsonData = try? JSONSerialization.data(withJSONObject: json) else { return nil }

            let nonce = ChaChaPoly.Nonce()
            let sealedBox = try ChaChaPoly.seal(
                jsonData,
                using: SymmetricKey(data: keyBytes),
                nonce: nonce
            )
            return sealedBox.combined?.base64EncodedString()
        } catch {
            print("[WCUtils] ChaCha20-Poly1305 encryptUsingSharedSecret failed: \(error)")
            return nil
        }
    }

    /// Encrypt data using a session key derived from the topic.
    /// Uses HKDF-SHA256 to derive a proper 256-bit encryption key.
    ///
    /// - Parameters:
    ///   - topic: Session topic.
    ///   - data: Data to encrypt.
    /// - Returns: Base64-encoded encrypted payload, or nil.
    public static func encryptUsingSessionKey(topic: String, data: Data) -> String? {
        guard let topicData = topic.data(using: .utf8) else { return nil }

        // Derive a 32-byte key from the topic using HKDF-SHA256
        let ikm = SymmetricKey(data: topicData)
        let derivedKey = HKDF<SHA256>.deriveKey(
            inputKeyMaterial: ikm,
            outputByteCount: 32
        )

        do {
            let nonce = ChaChaPoly.Nonce()
            let sealedBox = try ChaChaPoly.seal(data, using: derivedKey, nonce: nonce)
            return sealedBox.combined?.base64EncodedString()
        } catch {
            print("[WCUtils] ChaCha20-Poly1305 encryptUsingSessionKey failed: \(error)")
            return nil
        }
    }
    
    // MARK: - Topic Derivation
    
    /// Derive a session topic from two public keys using SHA-256.
    ///
    /// - Parameters:
    ///   - myPublicKey: Our public key (64-char hex).
    ///   - peerPublicKey: Peer's public key (64-char hex).
    /// - Returns: 64-character hex session topic.
    public static func deriveSessionTopic(myPublicKey: String, peerPublicKey: String) -> String {
        let combined = (myPublicKey + peerPublicKey).data(using: .utf8) ?? Data()
        let hash = SHA256.hash(data: combined)
        return hash.map { String(format: "%02x", $0) }.joined()
    }
}

// MARK: - Parsed URI Components

/// Components parsed from a WalletConnect v2 URI.
public struct WcUriComponents {
    public let topic: String
    public let version: Int
    public let relayProtocol: String
    public let relayUrl: String
    public let symKey: String
}

// MARK: - JSON Value Wrapper

/// Wrapper for encoding arbitrary JSON values.
struct JSONValue: Encodable {
    private let data: Data
    
    init(_ data: Data) {
        self.data = data
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        if let json = try? JSONSerialization.jsonObject(with: data) {
            try container.encode(JSONReferencer(json))
        }
    }
}

/// Helper for encoding arbitrary JSON objects/arrays.
struct JSONReferencer: Encodable {
    private let object: Any
    
    init(_ object: Any) {
        self.object = object
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        if let dict = object as? [String: Any] {
            try container.encode(JSONDictionary(dict))
        } else if let array = object as? [Any] {
            try container.encode(JSONArray(array))
        } else if let string = object as? String {
            try container.encode(string)
        } else if let number = object as? NSNumber {
            try container.encodeNumber(number)
        } else if let bool = object as? Bool {
            try container.encode(bool)
        }
    }
}

struct JSONDictionary: Encodable {
    private let dict: [String: Any]
    
    init(_ dict: [String: Any]) {
        self.dict = dict
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: DynamicCodingKey.self)
        for (key, value) in dict {
            let codingKey = DynamicCodingKey(key)
            try container.encode(JSONReferencer(value), forKey: codingKey)
        }
    }
}

struct JSONArray: Encodable {
    private let array: [Any]
    
    init(_ array: [Any]) {
        self.array = array
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.unkeyedContainer()
        for value in array {
            try container.encode(JSONReferencer(value))
        }
    }
}

extension KeyedEncodingContainer {
    mutating func encodeNumber(_ number: NSNumber) throws {
        if number === kCFBooleanTrue {
            try encode(true)
        } else if number === kCFBooleanFalse {
            try encode(false)
        } else {
            try encode(number.doubleValue)
        }
    }
}

struct DynamicCodingKey: CodingKey {
    var stringValue: String
    var intValue: Int?
    
    init(_ stringValue: String) {
        self.stringValue = stringValue
        self.intValue = nil
    }
    
    init?(stringValue: String) {
        self.stringValue = stringValue
        self.intValue = nil
    }
    
    init?(intValue: Int) {
        self.stringValue = "\(intValue)"
        self.intValue = intValue
    }
}

// MARK: - Data Extensions

extension Data {
    /// Convert data to a hex string.
    func toHexString() -> String {
        map { String(format: "%02x", $0) }.joined()
    }
    
    /// Create data from a hex string.
    init?(hex: String) {
        var hex = hex
        if hex.hasPrefix("0x") {
            hex = String(hex.dropFirst(2))
        }
        guard hex.count.isMultiple(of: 2) else { return nil }
        self = hex.enumerated().compactMap { (i, char) in
            guard i % 2 == 0 else { return nil }
            let start = hex.index(hex.startIndex, offsetBy: i)
            let end = hex.index(start, offsetBy: 2)
            return UInt8(hex[start..<end], radix: 16)
        }.data
    }
}
