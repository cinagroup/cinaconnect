use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::sync::Arc;
use uuid::Uuid;

use crate::AppState;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterIdentityRequest {
    pub user_id: String,
    pub public_key: String,
    pub key_algorithm: Option<String>, // "ed25519" (default) or "secp256k1"
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterIdentityResponse {
    pub user_id: String,
    pub key_id: String,
    pub public_key: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KeyResponse {
    pub user_id: String,
    pub key_id: String,
    pub public_key: String,
    pub key_algorithm: String,
    pub status: String, // "active" | "revoked" | "rotated"
    pub created_at: String,
    pub updated_at: String,
}

// ---------------------------------------------------------------------------
// POST /v1/identity/register
// ---------------------------------------------------------------------------

pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RegisterIdentityRequest>,
) -> impl axum::response::IntoResponse {
    let key_id = Uuid::new_v4();
    let algorithm = req.key_algorithm.unwrap_or_else(|| "ed25519".to_string());
    let now = Utc::now();

    match sqlx::query(
        "INSERT INTO identity_keys (user_id, key_id, public_key, algorithm, status, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'active', $5, $6, $7)",
    )
    .bind(&req.user_id)
    .bind(key_id)
    .bind(&req.public_key)
    .bind(&algorithm)
    .bind(&req.metadata)
    .bind(now)
    .bind(now)
    .execute(&state.db)
    .await
    {
        Ok(_) => {
            tracing::info!(user_id = %req.user_id, key_id = %key_id, "Identity key registered");

            crate::metrics::IDENTITY_KEY_OPS_TOTAL
                .with_label_values(&["register"])
                .inc();

            (
                StatusCode::CREATED,
                Json(RegisterIdentityResponse {
                    user_id: req.user_id,
                    key_id: key_id.to_string(),
                    public_key: req.public_key,
                    created_at: now.to_rfc3339(),
                }),
            )
        }
        Err(e) => {
            tracing::error!(error = %e, user_id = %req.user_id, "Failed to register identity key");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "failed to register identity key",
                    "detail": e.to_string(),
                })),
            )
        }
    }
}

// ---------------------------------------------------------------------------
// GET /v1/identity/:user_id/key
// ---------------------------------------------------------------------------

pub async fn get_key(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<String>,
) -> impl axum::response::IntoResponse {
    // Try cache first
    let cache_key = format!("identity:{}", user_id);
    if let Ok(Some(cached)) = state.redis.cache_get(&cache_key).await {
        crate::metrics::CACHE_HIT_TOTAL
            .with_label_values(&["identity"])
            .inc();
        if let Ok(response) = serde_json::from_str::<KeyResponse>(&cached) {
            return (StatusCode::OK, Json(response));
        }
    }

    // Fall back to database
    match sqlx::query(
        "SELECT user_id, key_id, public_key, algorithm, status, created_at, updated_at
         FROM identity_keys
         WHERE user_id = $1 AND status = 'active'
         ORDER BY created_at DESC
         LIMIT 1",
    )
    .bind(&user_id)
    .fetch_one(&state.db)
    .await
    {
        Ok(row) => {
            let response = KeyResponse {
                user_id: row.get("user_id"),
                key_id: row.get::<Uuid, _>("key_id").to_string(),
                public_key: row.get("public_key"),
                key_algorithm: row.get("algorithm"),
                status: row.get("status"),
                created_at: row.get::<DateTime<Utc>, _>("created_at").to_rfc3339(),
                updated_at: row.get::<DateTime<Utc>, _>("updated_at").to_rfc3339(),
            };

            // Cache the result
            if let Ok(serialized) = serde_json::to_string(&response) {
                let _ = state
                    .redis
                    .cache_set(&cache_key, &serialized, state.config.redis_cache_ttl_secs)
                    .await;
            }

            crate::metrics::IDENTITY_KEY_OPS_TOTAL
                .with_label_values(&["get"])
                .inc();

            (StatusCode::OK, Json(response))
        }
        Err(sqlx::Error::RowNotFound) => {
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "no active identity key found",
                    "user_id": user_id,
                })),
            )
        }
        Err(e) => {
            tracing::error!(error = %e, user_id = %user_id, "Failed to fetch identity key");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "failed to fetch identity key",
                    "detail": e.to_string(),
                })),
            )
        }
    }
}

// ---------------------------------------------------------------------------
// PUT /v1/identity/:user_id/key
// ---------------------------------------------------------------------------

pub async fn rotate_key(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<String>,
    Json(req): Json<RegisterIdentityRequest>,
) -> impl axum::response::IntoResponse {
    let key_id = Uuid::new_v4();
    let algorithm = req.key_algorithm.unwrap_or_else(|| "ed25519".to_string());
    let now = Utc::now();

    let mut tx = match state.db.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!(error = %e, "Failed to start transaction");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "failed to start transaction",
                    "detail": e.to_string(),
                })),
            );
        }
    };

    // Mark old active key as rotated
    if let Err(e) = sqlx::query(
        "UPDATE identity_keys SET status = 'rotated', updated_at = $1
         WHERE user_id = $2 AND status = 'active'",
    )
    .bind(now)
    .bind(&user_id)
    .execute(&mut *tx)
    .await
    {
        let _ = tx.rollback().await;
        tracing::error!(error = %e, user_id = %user_id, "Failed to rotate identity key");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "failed to rotate identity key",
                "detail": e.to_string(),
            })),
        );
    }

    // Insert new key
    if let Err(e) = sqlx::query(
        "INSERT INTO identity_keys (user_id, key_id, public_key, algorithm, status, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'active', $5, $6, $7)",
    )
    .bind(&user_id)
    .bind(key_id)
    .bind(&req.public_key)
    .bind(&algorithm)
    .bind(&req.metadata)
    .bind(now)
    .bind(now)
    .execute(&mut *tx)
    .await
    {
        let _ = tx.rollback().await;
        tracing::error!(error = %e, user_id = %user_id, "Failed to insert rotated key");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "failed to insert rotated key",
                "detail": e.to_string(),
            })),
        );
    }

    if let Err(e) = tx.commit().await {
        tracing::error!(error = %e, user_id = %user_id, "Failed to commit rotation transaction");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "failed to commit transaction",
                "detail": e.to_string(),
            })),
        );
    }

    // Invalidate cache
    let _ = state.redis.cache_delete(&format!("identity:{}", user_id)).await;

    tracing::info!(user_id = %user_id, key_id = %key_id, "Identity key rotated");

    crate::metrics::IDENTITY_KEY_OPS_TOTAL
        .with_label_values(&["rotate"])
        .inc();

    (
        StatusCode::OK,
        Json(RegisterIdentityResponse {
            user_id,
            key_id: key_id.to_string(),
            public_key: req.public_key,
            created_at: now.to_rfc3339(),
        }),
    )
}

// ---------------------------------------------------------------------------
// DELETE /v1/identity/:user_id/key
// ---------------------------------------------------------------------------

pub async fn revoke_key(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<String>,
) -> impl axum::response::IntoResponse {
    let now = Utc::now();

    match sqlx::query(
        "UPDATE identity_keys SET status = 'revoked', updated_at = $1
         WHERE user_id = $2 AND status = 'active'",
    )
    .bind(now)
    .bind(&user_id)
    .execute(&state.db)
    .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                return (
                    StatusCode::NOT_FOUND,
                    Json(serde_json::json!({
                        "error": "no active identity key found to revoke",
                        "user_id": user_id,
                    })),
                );
            }

            // Invalidate cache
            let _ = state.redis.cache_delete(&format!("identity:{}", user_id)).await;

            tracing::info!(user_id = %user_id, "Identity key revoked");

            crate::metrics::IDENTITY_KEY_OPS_TOTAL
                .with_label_values(&["revoke"])
                .inc();

            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "status": "revoked",
                    "user_id": user_id,
                })),
            )
        }
        Err(e) => {
            tracing::error!(error = %e, user_id = %user_id, "Failed to revoke identity key");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "failed to revoke identity key",
                    "detail": e.to_string(),
                })),
            )
        }
    }
}
