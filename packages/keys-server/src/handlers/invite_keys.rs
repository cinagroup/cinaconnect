use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use chrono::{DateTime, Utc};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::sync::Arc;
use uuid::Uuid;

use crate::AppState;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateInviteRequest {
    /// Number of uses allowed (0 = unlimited).
    pub max_uses: Option<u32>,
    /// Expiration timestamp (RFC3339). None = never expires.
    pub expires_at: Option<String>,
    /// Metadata attached to the invite.
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateInviteResponse {
    pub invite_code: String,
    pub invite_url: String,
    pub max_uses: Option<u32>,
    pub expires_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InviteResponse {
    pub invite_code: String,
    pub max_uses: Option<u32>,
    pub current_uses: u32,
    pub expires_at: Option<String>,
    pub status: String, // "active" | "expired" | "revoked" | "redeemed"
    pub created_at: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RedeemInviteRequest {
    pub user_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RedeemInviteResponse {
    pub success: bool,
    pub user_id: String,
    pub error: Option<String>,
}

// ---------------------------------------------------------------------------
// POST /v1/invite/create
// ---------------------------------------------------------------------------

pub async fn create_invite(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateInviteRequest>,
) -> impl axum::response::IntoResponse {
    let invite_code = generate_invite_code();
    let now = Utc::now();
    let max_uses = req.max_uses.unwrap_or(0);

    // Parse expires_at if provided
    let expires_at = req.expires_at.clone().and_then(|s| {
        DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|dt| dt.with_timezone(&Utc))
    });

    match sqlx::query(
        "INSERT INTO invite_keys (invite_code, max_uses, current_uses, expires_at, metadata, status, created_at, updated_at)
         VALUES ($1, $2, 0, $3, $4, 'active', $5, $6)",
    )
    .bind(&invite_code)
    .bind(max_uses as i32)
    .bind(expires_at)
    .bind(&req.metadata)
    .bind(now)
    .bind(now)
    .execute(&state.db)
    .await
    {
        Ok(_) => {
            tracing::info!(invite_code = %invite_code, max_uses = max_uses, "Invite created");

            crate::metrics::INVITE_KEY_OPS_TOTAL
                .with_label_values(&["create"])
                .inc();

            (
                StatusCode::CREATED,
                Json(CreateInviteResponse {
                    invite_code: invite_code.clone(),
                    invite_url: format!("/v1/invite/{}", invite_code),
                    max_uses: req.max_uses,
                    expires_at: req.expires_at.clone(),
                    created_at: now.to_rfc3339(),
                }),
            )
        }
        Err(e) => {
            if e.to_string().contains("duplicate") || e.to_string().contains("unique") {
                // Retry with a new code
                return create_invite(State(state), Json(req)).await;
            }
            tracing::error!(error = %e, "Failed to create invite");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "failed to create invite",
                    "detail": e.to_string(),
                })),
            )
        }
    }
}

// ---------------------------------------------------------------------------
// GET /v1/invite/:invite_code
// ---------------------------------------------------------------------------

pub async fn get_invite(
    State(state): State<Arc<AppState>>,
    Path(invite_code): Path<String>,
) -> impl axum::response::IntoResponse {
    // Try cache first
    let cache_key = format!("invite:{}", invite_code);
    if let Ok(Some(cached)) = state.redis.cache_get(&cache_key).await {
        crate::metrics::CACHE_HIT_TOTAL
            .with_label_values(&["invite"])
            .inc();
        if let Ok(response) = serde_json::from_str::<InviteResponse>(&cached) {
            return (StatusCode::OK, Json(response));
        }
    }

    // Fall back to database
    match sqlx::query(
        "SELECT invite_code, max_uses, current_uses, expires_at, status, metadata, created_at
         FROM invite_keys
         WHERE invite_code = $1",
    )
    .bind(&invite_code)
    .fetch_one(&state.db)
    .await
    {
        Ok(row) => {
            let max_uses: i32 = row.get("max_uses");
            let current_uses: i32 = row.get("current_uses");
            let status: String = row.get("status");
            let expires_at: Option<DateTime<Utc>> = row.get("expires_at");

            // Check if invite has expired
            let final_status = if status == "active" {
                if let Some(expiry) = expires_at {
                    if Utc::now() > expiry {
                        // Auto-expire the invite
                        "expired".to_string()
                    } else {
                        status
                    }
                } else {
                    status
                }
            } else {
                status
            };

            let response = InviteResponse {
                invite_code: row.get("invite_code"),
                max_uses: if max_uses == 0 { None } else { Some(max_uses as u32) },
                current_uses: current_uses as u32,
                expires_at: expires_at.map(|dt| dt.to_rfc3339()),
                status: final_status.clone(),
                created_at: row.get::<DateTime<Utc>, _>("created_at").to_rfc3339(),
                metadata: row.get("metadata"),
            };

            // Cache the result
            if let Ok(serialized) = serde_json::to_string(&response) {
                let _ = state.redis.cache_set(&cache_key, &serialized, state.config.redis_cache_ttl_secs).await;
            }

            crate::metrics::INVITE_KEY_OPS_TOTAL
                .with_label_values(&["get"])
                .inc();

            (StatusCode::OK, Json(response))
        }
        Err(sqlx::Error::RowNotFound) => {
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "invite not found",
                    "invite_code": invite_code,
                })),
            )
        }
        Err(e) => {
            tracing::error!(error = %e, invite_code = %invite_code, "Failed to fetch invite");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "failed to fetch invite",
                    "detail": e.to_string(),
                })),
            )
        }
    }
}

// ---------------------------------------------------------------------------
// POST /v1/invite/:invite_code/redeem
// ---------------------------------------------------------------------------

pub async fn redeem_invite(
    State(state): State<Arc<AppState>>,
    Path(invite_code): Path<String>,
    Json(req): Json<RedeemInviteRequest>,
) -> impl axum::response::IntoResponse {
    // Use a transaction to prevent race conditions
    let mut tx = match state.db.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!(error = %e, "Failed to start transaction");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(RedeemInviteResponse {
                    success: false,
                    user_id: req.user_id,
                    error: Some("database error".to_string()),
                }),
            );
        }
    };

    // Fetch invite with FOR UPDATE to lock the row
    let row = match sqlx::query(
        "SELECT invite_code, max_uses, current_uses, expires_at, status
         FROM invite_keys
         WHERE invite_code = $1
         FOR UPDATE",
    )
    .bind(&invite_code)
    .fetch_one(&mut *tx)
    .await
    {
        Ok(row) => row,
        Err(sqlx::Error::RowNotFound) => {
            let _ = tx.rollback().await;
            return (
                StatusCode::NOT_FOUND,
                Json(RedeemInviteResponse {
                    success: false,
                    user_id: req.user_id,
                    error: Some("invite not found".to_string()),
                }),
            );
        }
        Err(e) => {
            let _ = tx.rollback().await;
            tracing::error!(error = %e, "Failed to fetch invite for redemption");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(RedeemInviteResponse {
                    success: false,
                    user_id: req.user_id,
                    error: Some("database error".to_string()),
                }),
            );
        }
    };

    let max_uses: i32 = row.get("max_uses");
    let current_uses: i32 = row.get("current_uses");
    let status: String = row.get("status");
    let expires_at: Option<DateTime<Utc>> = row.get("expires_at");

    // Validate invite
    if status != "active" {
        let _ = tx.rollback().await;
        return (
            StatusCode::BAD_REQUEST,
            Json(RedeemInviteResponse {
                success: false,
                user_id: req.user_id,
                error: Some(format!("invite is {}", status)),
            }),
        );
    }

    // Check expiry
    if let Some(expiry) = expires_at {
        if Utc::now() > expiry {
            let _ = tx.commit().await; // Commit to allow status update below
            // Update status to expired
            let _ = sqlx::query(
                "UPDATE invite_keys SET status = 'expired', updated_at = $1 WHERE invite_code = $2",
            )
            .bind(Utc::now())
            .bind(&invite_code)
            .execute(&state.db)
            .await;

            return (
                StatusCode::BAD_REQUEST,
                Json(RedeemInviteResponse {
                    success: false,
                    user_id: req.user_id,
                    error: Some("invite has expired".to_string()),
                }),
            );
        }
    }

    // Check usage limit
    if max_uses > 0 && current_uses >= max_uses {
        let _ = tx.rollback().await;
        return (
            StatusCode::BAD_REQUEST,
            Json(RedeemInviteResponse {
                success: false,
                user_id: req.user_id,
                error: Some("invite has reached maximum uses".to_string()),
            }),
        );
    }

    // Increment usage count
    let new_uses = current_uses + 1;
    let is_maxed = max_uses > 0 && new_uses >= max_uses;
    let new_status = if is_maxed { "redeemed" } else { "active" };

    if let Err(e) = sqlx::query(
        "UPDATE invite_keys SET current_uses = $1, status = $2, updated_at = $3
         WHERE invite_code = $4",
    )
    .bind(new_uses)
    .bind(new_status)
    .bind(Utc::now())
    .bind(&invite_code)
    .execute(&mut *tx)
    .await
    {
        let _ = tx.rollback().await;
        tracing::error!(error = %e, "Failed to update invite usage");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(RedeemInviteResponse {
                success: false,
                user_id: req.user_id,
                error: Some("failed to redeem invite".to_string()),
            }),
        );
    }

    if let Err(e) = tx.commit().await {
        tracing::error!(error = %e, "Failed to commit redemption");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(RedeemInviteResponse {
                success: false,
                user_id: req.user_id,
                error: Some("failed to commit transaction".to_string()),
            }),
        );
    }

    // Invalidate cache
    let _ = state.redis.cache_delete(&format!("invite:{}", invite_code)).await;

    crate::metrics::INVITE_KEY_OPS_TOTAL
        .with_label_values(&["redeem"])
        .inc();

    (
        StatusCode::OK,
        Json(RedeemInviteResponse {
            success: true,
            user_id: req.user_id,
            error: None,
        }),
    )
}

// ---------------------------------------------------------------------------
// DELETE /v1/invite/:invite_code
// ---------------------------------------------------------------------------

pub async fn revoke_invite(
    State(state): State<Arc<AppState>>,
    Path(invite_code): Path<String>,
) -> impl axum::response::IntoResponse {
    match sqlx::query(
        "UPDATE invite_keys SET status = 'revoked', updated_at = $1
         WHERE invite_code = $2 AND status IN ('active', 'redeemed')",
    )
    .bind(Utc::now())
    .bind(&invite_code)
    .execute(&state.db)
    .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                return (
                    StatusCode::NOT_FOUND,
                    Json(serde_json::json!({
                        "error": "invite not found or already revoked",
                        "invite_code": invite_code,
                    })),
                );
            }

            // Invalidate cache
            let _ = state.redis.cache_delete(&format!("invite:{}", invite_code)).await;

            crate::metrics::INVITE_KEY_OPS_TOTAL
                .with_label_values(&["revoke"])
                .inc();

            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "status": "revoked",
                    "invite_code": invite_code,
                })),
            )
        }
        Err(e) => {
            tracing::error!(error = %e, invite_code = %invite_code, "Failed to revoke invite");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "failed to revoke invite",
                    "detail": e.to_string(),
                })),
            )
        }
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

pub(crate) fn generate_invite_code() -> String {
    let mut rng = rand::thread_rng();
    // Generate a 8-character alphanumeric code
    let chars: Vec<char> = (0..8)
        .map(|_| {
            let idx = rng.gen_range(0..36);
            if idx < 26 {
                (b'A' + idx as u8) as char
            } else {
                (b'0' + (idx - 26) as u8) as char
            }
        })
        .collect();
    chars.into_iter().collect()
}
