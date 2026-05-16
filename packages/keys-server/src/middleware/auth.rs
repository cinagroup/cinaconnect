use axum::body::Body;
use axum::extract::State;
use axum::http::{Request, StatusCode};
use axum::middleware::Next;
use axum::response::Response;
use jsonwebtoken::{decode, DecodingKey, Validation};
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::AppState;

/// JWT claims expected in incoming tokens.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    /// Subject (user identifier).
    pub sub: String,
    /// Issuer.
    pub iss: String,
    /// Expiration time (seconds since epoch).
    pub exp: u64,
    /// Issued-at time (seconds since epoch).
    pub iat: u64,
}

/// Authentication middleware.
///
/// Validates the `Authorization: Bearer <token>` header on all requests
/// except `/v1/health` and `/metrics`.
pub async fn auth_middleware(
    State(state): State<Arc<AppState>>,
    request: Request<Body>,
    next: Next,
) -> Response {
    let path = request.uri().path().to_string();

    // Allow-listed paths that don't require authentication.
    if path == "/v1/health" || path == "/metrics" {
        return next.run(request).await;
    }

    // Extract the Authorization header.
    let auth_header = request
        .headers()
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok());

    let token = match auth_header {
        Some(header) => {
            if let Some(token) = header.strip_prefix("Bearer ") {
                token
            } else {
                return unauthorized_response("Invalid authorization header format");
            }
        }
        None => {
            return unauthorized_response("Missing authorization header");
        }
    };

    // Validate JWT token: signature, expiry, and blacklist check.
    match validate_token(token, &state).await {
        Ok(claims) => {
            // Token is valid — attach subject to request extensions for downstream use.
            let (mut parts, body) = request.into_parts();
            parts.extensions.insert(claims);
            let request = Request::from_parts(parts, body);
            next.run(request).await
        }
        Err(e) => {
            crate::metrics::AUTH_FAILURE_TOTAL
                .with_label_values(&["invalid_token"])
                .inc();
            unauthorized_response(&e)
        }
    }
}

/// Validate a JWT token: decode, verify signature, check expiry, and check blacklist.
async fn validate_token(token: &str, state: &AppState) -> Result<Claims, String> {
    let secret = state.config.jwt_secret.as_bytes();

    // 1. Decode and verify signature with HMAC-SHA256.
    let mut validation = Validation::new(jsonwebtoken::Algorithm::HS256);
    // Allow up to 10 seconds of clock skew.
    validation.leeway = 10;
    validation.set_issuer(&["keys-server"]);

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret),
        &validation,
    )
    .map_err(|e| match e.kind() {
        jsonwebtoken::errors::ErrorKind::ExpiredSignature => {
            "Token has expired".to_string()
        }
        jsonwebtoken::errors::ErrorKind::InvalidSignature => {
            "Invalid token signature".to_string()
        }
        jsonwebtoken::errors::ErrorKind::InvalidIssuer => {
            "Invalid token issuer".to_string()
        }
        _ => format!("Invalid token: {}", e),
    })?;

    let claims = token_data.claims;

    // 2. Extra defence-in-depth: verify expiry manually.
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();
    if claims.exp < now {
        return Err("Token has expired".to_string());
    }

    // 3. Check token blacklist in Redis (for revoked/logged-out tokens).
    let blacklist_key = format!("token:blacklist:{}", token);
    if let Ok(mut conn) = state.redis.connection().await {
        // Best-effort blacklist check — don't fail auth if Redis is down.
        let is_blacklisted: Result<bool, redis::RedisError> = conn.exists(&blacklist_key).await;
        if let Ok(true) = is_blacklisted {
            return Err("Token has been revoked".to_string());
        }
    }

    Ok(claims)
}

fn unauthorized_response(message: &str) -> Response {
    Response::builder()
        .status(StatusCode::UNAUTHORIZED)
        .body(Body::from(
            serde_json::json!({
                "error": "unauthorized",
                "message": message,
            })
            .to_string(),
        ))
        .unwrap()
}
