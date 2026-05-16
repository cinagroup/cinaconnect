//! Integration tests for keys-server.
//!
//! Tests JWT auth middleware, key management handlers, and Redis operations.

// ─────────────────────────────────────────────────────────────
// JWT Auth middleware tests
// ─────────────────────────────────────────────────────────────

mod auth_tests {
    use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
    use keys_server::middleware::auth::Claims;
    use serde::{Deserialize, Serialize};
    use std::time::{SystemTime, UNIX_EPOCH};

    /// Helper: create a valid JWT for testing.
    fn make_valid_token(secret: &str, sub: &str, expiry_secs: u64) -> String {
        #[derive(Serialize, Deserialize)]
        struct TestClaims {
            sub: String,
            iss: String,
            exp: u64,
            iat: u64,
        }

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let claims = TestClaims {
            sub: sub.to_string(),
            iss: "keys-server".to_string(),
            exp: now + expiry_secs,
            iat: now,
        };

        encode(
            &Header::new(Algorithm::HS256),
            &claims,
            &EncodingKey::from_secret(secret.as_bytes()),
        )
        .unwrap()
    }

    /// Helper: create a JWT with a wrong signing key.
    fn make_wrong_key_token(secret: &str, sub: &str) -> String {
        #[derive(Serialize, Deserialize)]
        struct TestClaims {
            sub: String,
            iss: String,
            exp: u64,
            iat: u64,
        }

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let claims = TestClaims {
            sub: sub.to_string(),
            iss: "keys-server".to_string(),
            exp: now + 3600,
            iat: now,
        };

        // Encode with a DIFFERENT secret
        encode(
            &Header::new(Algorithm::HS256),
            &claims,
            &EncodingKey::from_secret("wrong-secret".as_bytes()),
        )
        .unwrap()
    }

    #[test]
    fn claims_serialize_deserialize() {
        let claims = Claims {
            sub: "user-123".into(),
            iss: "keys-server".into(),
            exp: 1_700_000_000,
            iat: 1_699_999_000,
        };

        let json = serde_json::to_string(&claims).unwrap();
        let parsed: Claims = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.sub, "user-123");
        assert_eq!(parsed.iss, "keys-server");
    }

    #[test]
    fn valid_token_can_be_created() {
        let token = make_valid_token("test-secret", "user-1", 3600);
        assert!(!token.is_empty());
        // Token has 3 parts separated by dots
        let parts: Vec<&str> = token.split('.').collect();
        assert_eq!(parts.len(), 3);
    }

    #[test]
    fn expired_token_creation() {
        // Create a token that's already expired (0 seconds)
        let token = make_valid_token("test-secret", "user-2", 0);
        assert!(!token.is_empty());
    }

    #[test]
    fn wrong_key_token_has_different_signature() {
        let valid_token = make_valid_token("test-secret", "user-3", 3600);
        let wrong_token = make_wrong_key_token("test-secret", "user-3");

        // Both tokens are valid JWTs but have different signatures
        let valid_parts: Vec<&str> = valid_token.split('.').collect();
        let wrong_parts: Vec<&str> = wrong_token.split('.').collect();

        // Headers and claims are the same, but signature differs
        assert_eq!(valid_parts[0], wrong_parts[0]);
        assert_eq!(valid_parts[1], wrong_parts[1]);
        assert_ne!(valid_parts[2], wrong_parts[2]);
    }
}

// ─────────────────────────────────────────────────────────────
// Config tests
// ─────────────────────────────────────────────────────────────

mod config_tests {
    use keys_server::config::Config;

    #[test]
    fn config_from_env_defaults() {
        // Ensure we get defaults when no env vars are set.
        let config = Config::from_env();
        assert_eq!(config.host, "0.0.0.0");
        assert_eq!(config.port, 3001);
        assert_eq!(config.default_key_algorithm, "ed25519");
        assert_eq!(config.max_keys_per_wallet, 10);
    }

    #[test]
    fn config_from_env_custom_values() {
        std::env::set_var("KEYS_SERVER_HOST", "127.0.0.1");
        std::env::set_var("KEYS_SERVER_PORT", "4000");
        std::env::set_var("JWT_SECRET", "super-secret-key");
        std::env::set_var("JWT_EXPIRY_SECS", "7200");
        std::env::set_var("DEFAULT_KEY_ALGORITHM", "secp256k1");
        std::env::set_var("MAX_KEYS_PER_WALLET", "25");

        let config = Config::from_env();
        assert_eq!(config.host, "127.0.0.1");
        assert_eq!(config.port, 4000);
        assert_eq!(config.jwt_secret, "super-secret-key");
        assert_eq!(config.jwt_expiry_secs, 7200);
        assert_eq!(config.default_key_algorithm, "secp256k1");
        assert_eq!(config.max_keys_per_wallet, 25);
    }
}

// ─────────────────────────────────────────────────────────────
// Redis client tests
// ─────────────────────────────────────────────────────────────

mod redis_tests {
    use keys_server::redis::RedisClient;

    #[tokio::test]
    async fn redis_client_connection_fails_without_server() {
        // Should fail to connect when Redis is not running.
        let result = RedisClient::new("redis://localhost:16379").await;
        // This may succeed in creating the client struct but ping should fail.
        if let Ok(client) = result {
            let healthy = client.ping().await;
            assert!(!healthy, "Redis should not be available on port 16379");
        }
        // Or the creation itself may fail — both are acceptable.
    }
}

// ─────────────────────────────────────────────────────────────
// Handler unit tests (serialization / validation logic)
// ─────────────────────────────────────────────────────────────

mod handler_tests {
    use keys_server::handlers::identity_keys::RegisterIdentityRequest;
    use keys_server::handlers::invite_keys::CreateInviteRequest;
    use keys_server::handlers::wallet_keys::GenerateWalletRequest;

    #[test]
    fn register_identity_request_serializes() {
        let req = RegisterIdentityRequest {
            user_id: "user-123".into(),
            public_key: "ed25519-pubkey-hex".into(),
            algorithm: Some("ed25519".into()),
            metadata: None,
        };

        let json = serde_json::to_string(&req).unwrap();
        let parsed: RegisterIdentityRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.user_id, "user-123");
    }

    #[test]
    fn create_invite_request_serializes() {
        let req = CreateInviteRequest {
            max_uses: Some(5),
            expires_at: Some(chrono::Utc::now() + chrono::Duration::hours(24)),
            metadata: None,
        };

        let json = serde_json::to_string(&req).unwrap();
        assert!(json.contains("max_uses"));
        assert!(json.contains("expires_at"));
    }

    #[test]
    fn generate_wallet_request_serializes() {
        let req = GenerateWalletRequest {
            wallet_name: "My Wallet".into(),
            key_algorithm: Some("secp256k1".into()),
        };

        let json = serde_json::to_string(&req).unwrap();
        let parsed: GenerateWalletRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.wallet_name, "My Wallet");
    }
}
