mod config;
mod database;
mod handlers;
mod metrics;
mod middleware;
mod redis;

use axum::Router;
use std::sync::Arc;
use tokio::signal;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

use crate::database::DbPool;
use crate::redis::RedisClient;

/// Shared application state.
pub struct AppState {
    pub db: DbPool,
    pub redis: RedisClient,
    pub config: config::Config,
    pub start_time: std::time::Instant,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize metrics first
    metrics::init();

    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    tracing::info!("Starting keys-server");

    // Load configuration
    let config = config::Config::from_env()?;

    // Initialize database connection pool
    let db = database::create_pool(&config.database_url).await?;
    tracing::info!("Database connection pool created");

    // Run migrations
    database::run_migrations(&db).await?;
    tracing::info!("Database migrations applied");

    // Initialize Redis connection
    let redis = redis::create_client(&config.redis_url).await?;
    tracing::info!("Redis connection established");

    // Build shared state
    let state = Arc::new(AppState {
        db,
        redis,
        config,
        start_time: std::time::Instant::now(),
    });

    // Build router
    let app = Router::new()
        // Identity keys
        .route("/v1/identity/register", axum::routing::post(handlers::identity_keys::register))
        .route("/v1/identity/:user_id/key", axum::routing::get(handlers::identity_keys::get_key))
        .route("/v1/identity/:user_id/key", axum::routing::put(handlers::identity_keys::rotate_key))
        .route("/v1/identity/:user_id/key", axum::routing::delete(handlers::identity_keys::revoke_key))
        // Invite keys
        .route("/v1/invite/create", axum::routing::post(handlers::invite_keys::create_invite))
        .route("/v1/invite/:invite_code", axum::routing::get(handlers::invite_keys::get_invite))
        .route("/v1/invite/:invite_code/redeem", axum::routing::post(handlers::invite_keys::redeem_invite))
        .route("/v1/invite/:invite_code", axum::routing::delete(handlers::invite_keys::revoke_invite))
        // Wallet keys
        .route("/v1/wallet/generate", axum::routing::post(handlers::wallet_keys::generate_wallet))
        .route("/v1/wallet/:wallet_id", axum::routing::get(handlers::wallet_keys::get_wallet))
        .route("/v1/wallet/:wallet_id/sign", axum::routing::post(handlers::wallet_keys::sign_message))
        .route("/v1/wallet/:wallet_id", axum::routing::delete(handlers::wallet_keys::delete_wallet))
        // Health & metrics
        .route("/v1/health", axum::routing::get(health))
        .route("/metrics", axum::routing::get(metrics_handler))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            middleware::auth::auth_middleware,
        ))
        .with_state(state)
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive());

    let addr = format!("{}:{}", state.config.host, state.config.port);
    tracing::info!("Keys server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    tracing::info!("Graceful shutdown complete");
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutdown signal received");
}

/// Health check endpoint.
async fn health(axum::extract::State(state): axum::extract::State<Arc<AppState>>) -> impl axum::response::IntoResponse {
    use axum::http::StatusCode;
    use axum::Json;

    let uptime = state.start_time.elapsed().as_secs();

    // Check database
    let db_healthy = match sqlx::query("SELECT 1").execute(&state.db).await {
        Ok(_) => true,
        Err(e) => {
            tracing::warn!(error = %e, "Database health check failed");
            false
        }
    };

    // Check Redis
    let redis_healthy = state.redis.ping().await;

    let status = if db_healthy && redis_healthy {
        "healthy"
    } else {
        "degraded"
    };

    let body = serde_json::json!({
        "status": status,
        "version": env!("CARGO_PKG_VERSION"),
        "uptime_secs": uptime,
        "database": db_healthy,
        "redis": redis_healthy,
        "timestamp": chrono::Utc::now().to_rfc3339(),
    });

    (StatusCode::OK, Json(body))
}

/// Prometheus metrics endpoint.
async fn metrics_handler() -> impl axum::response::IntoResponse {
    use axum::http::StatusCode;
    use prometheus::Encoder;

    let encoder = prometheus::TextEncoder::new();
    let mut buffer = Vec::new();
    encoder.encode(&prometheus::gather(), &mut buffer).unwrap_or_default();

    (StatusCode::OK, buffer)
}
