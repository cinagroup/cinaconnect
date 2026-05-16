use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;

use crate::apns::ApnsClient;
use crate::fcm::FcmClient;
use crate::metrics;
use crate::types::{
    DeviceRecord, HealthResponse, Platform, PushRequest, PushResponse, RegisterRequest,
    RegisterResponse,
};

/// Shared application state injected into handlers.
pub struct AppState {
    pub apns_client: ApnsClient,
    pub fcm_client: FcmClient,
    pub redis_url: String,
}

// ---------------------------------------------------------------------------
// POST /v1/push
// ---------------------------------------------------------------------------

/// Unified push endpoint.
/// Routes to APNs or FCM based on the `platform` field.
pub async fn push(
    State(state): State<AppState>,
    Json(req): Json<PushRequest>,
) -> impl IntoResponse {
    tracing::info!(
        platform = ?req.platform,
        token_len = req.token.len(),
        "Push request received"
    );

    let resp = match req.platform {
        Platform::Apns => {
            state
                .apns_client
                .send(
                    &req.token,
                    req.title.as_deref(),
                    &req.body,
                    &req.data,
                    req.priority.as_deref(),
                    req.badge,
                    req.sound.as_deref(),
                    req.thread_id.as_deref(),
                    req.mutable_content,
                    req.category.as_deref(),
                )
                .await
        }
        Platform::Fcm => {
            state
                .fcm_client
                .send(
                    &req.token,
                    req.title.as_deref(),
                    &req.body,
                    &req.data,
                    req.ttl,
                    req.priority.as_deref(),
                    req.collapse_key.as_deref(),
                )
                .await
        }
    };

    if resp.success {
        tracing::info!(message_id = ?resp.message_id, "Push sent successfully");
    } else {
        tracing::warn!(error = ?resp.error, "Push failed");
    }

    (StatusCode::OK, Json(resp))
}

// ---------------------------------------------------------------------------
// POST /v1/register
// ---------------------------------------------------------------------------

/// Register a device token in Redis.
pub async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> impl IntoResponse {
    tracing::info!(
        platform = ?req.platform,
        user_id = ?req.user_id,
        "Device registration"
    );

    let device_id = format!("device:{}", req.token.chars().take(16).collect::<String>());

    let record = DeviceRecord {
        token: req.token.clone(),
        platform: req.platform,
        user_id: req.user_id,
        app_version: req.app_version,
        device_model: req.device_model,
        registered_at: chrono::Utc::now(),
    };

    let value = match serde_json::to_string(&record) {
        Ok(v) => v,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(RegisterResponse {
                    success: false,
                    device_id: None,
                    error: Some(format!("Serialization error: {}", e)),
                }),
            );
        }
    };

    // Best-effort Redis store.
    if let Ok(client) = redis::Client::open(state.redis_url.as_str()) {
        if let Ok(mut conn) = client.get_multiplexed_async_connection().await {
            let result: redis::RedisResult<()> = redis::cmd("SET")
                .arg(&device_id)
                .arg(&value)
                .arg("EX")
                .arg(2_592_000u64) // 30 days TTL
                .query_async(&mut conn)
                .await;
            if let Err(e) = result {
                tracing::warn!(error = %e, "Redis SET failed (non-fatal)");
            }
        }
    }

    (
        StatusCode::CREATED,
        Json(RegisterResponse {
            success: true,
            device_id: Some(device_id),
            error: None,
        }),
    )
}

// ---------------------------------------------------------------------------
// GET /v1/health
// ---------------------------------------------------------------------------

/// Health check endpoint.
pub async fn health(State(state): State<AppState>) -> impl IntoResponse {
    let redis_connected = match redis::Client::open(state.redis_url.as_str()) {
        Ok(client) => {
            match client.get_multiplexed_async_connection().await {
                Ok(mut conn) => {
                    let _: redis::RedisResult<()> =
                        redis::cmd("PING").query_async(&mut conn).await;
                    true
                }
                Err(_) => false,
            }
        }
        Err(_) => false,
    };

    let apns_configured = !std::env::var("APNS_TEAM_ID").unwrap_or_default().is_empty()
        && !std::env::var("APNS_KEY_ID").unwrap_or_default().is_empty();

    let fcm_configured = !std::env::var("FCM_PROJECT_ID").unwrap_or_default().is_empty();

    Json(HealthResponse {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        apns_configured,
        fcm_configured,
        redis_connected,
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

// ---------------------------------------------------------------------------
// GET /metrics
// ---------------------------------------------------------------------------

/// Prometheus metrics endpoint.
pub async fn metrics_handler() -> impl IntoResponse {
    use prometheus::Encoder;
    let encoder = prometheus::TextEncoder::new();
    let mut buffer = Vec::new();
    encoder
        .encode(&prometheus::gather(), &mut buffer)
        .unwrap_or_default();
    (StatusCode::OK, buffer)
}
