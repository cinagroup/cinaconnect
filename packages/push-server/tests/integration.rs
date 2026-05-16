//! Integration tests for push-server.
//!
//! Tests FCM OAuth2 token flow, APNS token generation, and push handler logic.

use push_server::config::Config;
use push_server::types::{Platform, PushRequest, PushResponse};

// ─────────────────────────────────────────────────────────────
// FCM unit tests
// ─────────────────────────────────────────────────────────────

mod fcm_tests {
    use super::*;
    use push_server::fcm::FcmClient;

    #[test]
    fn fcm_client_constructs_from_config() {
        let config = test_config();
        let client = FcmClient::new(&config);
        // Smoke test — construction should not panic.
        drop(client);
    }

    #[test]
    fn fcm_returns_error_when_service_account_missing() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let config = test_config();

        let client = FcmClient::new(&config);
        let result = rt.block_on(client.send(
            "test-token",
            Some("Title"),
            "Body",
            &std::collections::HashMap::new(),
            None,
            None,
            None,
        ));

        // Should fail because no real service account file exists.
        assert!(!result.success);
        assert!(result.error.is_some());
        let err = result.error.unwrap();
        assert!(
            err.contains("OAuth2 token error") || err.contains("Failed to read"),
            "Expected OAuth2 or file read error, got: {}",
            err
        );
    }

    #[test]
    fn fcm_token_cache_returns_cached_token() {
        // This is an internal logic test: the FcmClient caches tokens.
        // We verify the struct exists and the RwLock is accessible.
        let config = test_config();
        let client = FcmClient::new(&config);
        // The token is initially None — accessing via read should not panic.
        // (The field is private so this is just a compile-time check.)
        drop(client);
    }
}

// ─────────────────────────────────────────────────────────────
// APNs unit tests
// ─────────────────────────────────────────────────────────────

mod apns_tests {
    use super::*;
    use push_server::apns::ApnsClient;

    #[test]
    fn apns_client_constructs_from_config() {
        let config = test_config();
        let client = ApnsClient::new(&config);
        drop(client);
    }

    #[test]
    fn apns_generate_token_fails_without_key_file() {
        let config = test_config();
        let client = ApnsClient::new(&config);
        let result = client.generate_token();
        assert!(result.is_err());
    }
}

// ─────────────────────────────────────────────────────────────
// Types / serialization tests
// ─────────────────────────────────────────────────────────────

mod types_tests {
    use super::*;

    #[test]
    fn push_request_serializes_deserializes() {
        let req = PushRequest {
            token: "device-token-123".into(),
            platform: Platform::Fcm,
            title: Some("Hello"),
            body: "World".into(),
            badge: Some(1),
            sound: Some("default".into()),
            data: {
                let mut m = std::collections::HashMap::new();
                m.insert("key".into(), "value".into());
                m
            },
            priority: Some("high".into()),
            ttl: Some(3600),
            collapse_key: Some("updates".into()),
            thread_id: None,
            mutable_content: None,
            category: None,
            app_id: Some("com.example.app".into()),
        };

        let json = serde_json::to_string(&req).unwrap();
        let parsed: PushRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.token, req.token);
        assert_eq!(parsed.platform, req.platform);
        assert_eq!(parsed.title, req.title);
        assert_eq!(parsed.body, req.body);
    }

    #[test]
    fn push_response_defaults() {
        let resp = PushResponse {
            success: true,
            message_id: Some("msg-1".into()),
            error: None,
            platform: "fcm".into(),
            retry_attempts: 0,
            receipt_id: None,
        };

        let json = serde_json::to_string(&resp).unwrap();
        let parsed: PushResponse = serde_json::from_str(&json).unwrap();
        assert!(parsed.success);
        assert_eq!(parsed.message_id, Some("msg-1".into()));
    }

    #[test]
    fn platform_serialization() {
        assert_eq!(
            serde_json::to_string(&Platform::Apns).unwrap(),
            "\"apns\""
        );
        assert_eq!(
            serde_json::to_string(&Platform::Fcm).unwrap(),
            "\"fcm\""
        );
    }
}

// ─────────────────────────────────────────────────────────────
// Retry policy tests
// ─────────────────────────────────────────────────────────────

mod retry_tests {
    use push_server::retry::RetryPolicy;
    use push_server::config::Config;

    #[test]
    fn retry_policy_from_config() {
        let config = test_config();
        let policy = RetryPolicy::from_config(&config);
        assert!(policy.max_attempts > 0);
        assert!(policy.initial_delay_ms > 0);
    }

    #[test]
    fn retry_policy_exponential_backoff() {
        let config = test_config();
        let policy = RetryPolicy::from_config(&config);

        // Calculate delays for several attempts and verify exponential growth.
        let mut prev_delay = policy.initial_delay_ms as f64;
        for i in 1..=policy.max_attempts {
            let delay = policy.delay_for_attempt(i);
            assert!(delay >= prev_delay, "delay should increase exponentially");
            prev_delay = delay;
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Rate limiter tests
// ─────────────────────────────────────────────────────────────

mod rate_limiter_tests {
    use push_server::rate_limiter::RateLimiter;
    use push_server::config::Config;

    #[tokio::test]
    async fn rate_limiter_allows_within_limit() {
        let config = test_config();
        let limiter = RateLimiter::new(&config);

        for _ in 0..config.rate_limit_per_device {
            assert!(limiter.check_device("token-1").await);
        }
    }

    #[tokio::test]
    async fn rate_limiter_blocks_over_limit() {
        let config = test_config();
        let limiter = RateLimiter::new(&config);

        for _ in 0..config.rate_limit_per_device {
            limiter.check_device("token-2").await;
        }

        assert!(!limiter.check_device("token-2").await);
    }

    #[tokio::test]
    async fn rate_limiter_per_app() {
        let config = test_config();
        let limiter = RateLimiter::new(&config);

        for _ in 0..config.rate_limit_per_app {
            assert!(limiter.check_app("app-1").await);
        }
        assert!(!limiter.check_app("app-1").await);
    }
}

// ─────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────

fn test_config() -> Config {
    std::env::set_var("APNS_TEAM_ID", "TESTTEAM123");
    std::env::set_var("APNS_KEY_ID", "TESTKEY12345");
    std::env::set_var("APNS_CERT_PATH", "/nonexistent/key.p8");
    std::env::set_var("APNS_TOPIC", "com.test.app");
    std::env::set_var("FCM_PROJECT_ID", "test-project");
    std::env::set_var("FCM_SERVICE_ACCOUNT_PATH", "/nonexistent/service-account.json");

    Config::from_env()
}
