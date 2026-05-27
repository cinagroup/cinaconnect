use serde::Deserialize;

/// Application configuration loaded from environment variables.
#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    // --- Server ---
    pub host: String,
    pub port: u16,
    pub shutdown_timeout_secs: u64,

    // --- Database ---
    pub database_url: String,
    pub database_max_connections: u32,

    // --- Redis ---
    pub redis_url: String,
    pub redis_cache_ttl_secs: u64,

    // --- Auth ---
    /// JWT signing secret. Must be set via JWT_SECRET env var — no default.
    pub jwt_secret: String,
    /// JWT token expiry in seconds.
    pub jwt_expiry_secs: u64,

    // --- Rate Limiting ---
    pub rate_limit_per_ip: u32,
    pub rate_limit_window_secs: u64,

    // --- Key Management ---
    /// Default key algorithm: "ed25519" or "secp256k1".
    pub default_key_algorithm: String,
    /// Max keys per wallet.
    pub max_keys_per_wallet: u32,

    // --- Metrics ---
    pub metrics_path: String,
}

impl Config {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        // JWT_SECRET is mandatory — no default, refuse to start without it.
        let jwt_secret = std::env::var("JWT_SECRET")
            .map_err(|_| "JWT_SECRET environment variable is required. Refusing to start without a secure JWT signing key.")?;

        // Enforce minimum length for JWT secret
        if jwt_secret.len() < 16 {
            return Err("JWT_SECRET must be at least 16 characters long for security.".into());
        }

        Ok(Self {
            host: std::env::var("KEYS_SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            port: std::env::var("KEYS_SERVER_PORT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(3001),
            shutdown_timeout_secs: std::env::var("KEYS_SHUTDOWN_TIMEOUT_SECS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(30),

            database_url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://keys:keys@localhost:5432/keys".into()),
            database_max_connections: std::env::var("DATABASE_MAX_CONNECTIONS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(20),

            redis_url: std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".into()),
            redis_cache_ttl_secs: std::env::var("REDIS_CACHE_TTL_SECS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(300),

            jwt_secret,
            jwt_expiry_secs: std::env::var("JWT_EXPIRY_SECS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(3600),

            rate_limit_per_ip: std::env::var("KEYS_RATE_LIMIT_PER_IP")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(100),
            rate_limit_window_secs: std::env::var("KEYS_RATE_LIMIT_WINDOW_SECS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(60),

            default_key_algorithm: std::env::var("DEFAULT_KEY_ALGORITHM")
                .unwrap_or_else(|_| "ed25519".into()),
            max_keys_per_wallet: std::env::var("MAX_KEYS_PER_WALLET")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(10),

            metrics_path: std::env::var("KEYS_METRICS_PATH")
                .unwrap_or_else(|_| "/metrics".into()),
        })
    }
}
