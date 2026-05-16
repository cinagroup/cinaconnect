use serde::Deserialize;

/// Application configuration loaded from environment variables.
#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    /// Server bind host.
    pub host: String,
    /// Server bind port.
    pub port: u16,

    // --- APNs ---
    /// APNs team ID (10-char string from Apple Developer portal).
    pub apns_team_id: String,
    /// APNs key ID (10-char string for the .p8 key).
    pub apns_key_id: String,
    /// Path to the APNs private key file (PKCS#8 .p8).
    pub apns_cert_path: String,
    /// APNs bundle identifier (e.g. "com.example.app").
    pub apns_topic: String,
    /// APNs environment: "production" or "development".
    pub apns_environment: String,
    /// Base URL for APNs (Apple manages this; override for testing).
    pub apns_base_url: String,

    // --- FCM ---
    /// Firebase Cloud Messaging project ID.
    pub fcm_project_id: String,
    /// Path to Firebase service account JSON key.
    pub fcm_service_account_path: String,

    // --- Redis ---
    /// Redis URL for device token caching and rate limiting.
    pub redis_url: String,
}

impl Config {
    /// Load configuration from environment variables.
    /// Panics on missing required variables.
    pub fn from_env() -> Self {
        Self {
            host: std::env::var("PUSH_SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            port: std::env::var("PUSH_SERVER_PORT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(3000),

            apns_team_id: require_env("APNS_TEAM_ID"),
            apns_key_id: require_env("APNS_KEY_ID"),
            apns_cert_path: require_env("APNS_CERT_PATH"),
            apns_topic: require_env("APNS_TOPIC"),
            apns_environment: std::env::var("APNS_ENVIRONMENT").unwrap_or_else(|_| "production".into()),
            apns_base_url: std::env::var("APNS_BASE_URL")
                .unwrap_or_else(|_| "https://api.push.apple.com".into()),

            fcm_project_id: require_env("FCM_PROJECT_ID"),
            fcm_service_account_path: require_env("FCM_SERVICE_ACCOUNT_PATH"),

            redis_url: std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".into()),
        }
    }
}

fn require_env(key: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| panic!("Missing required env var: {}", key))
}
