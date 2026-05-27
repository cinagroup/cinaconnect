use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chacha20poly1305::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    ChaCha20Poly1305, Nonce,
};
use chrono::{DateTime, Utc};
use ed25519_dalek::{Signer, SigningKey};
use hkdf::Hkdf;
use k256::ecdsa::SigningKey as SecpSigningKey;
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use sha3::{Digest, Keccak256};
use sqlx::Row;
use std::sync::Arc;
use uuid::Uuid;
use zeroize::Zeroize;

use crate::AppState;

// HKDF "info" label for key material encryption.
const KEY_MATERIAL_INFO: &[u8] = b"cinacoin-key-material-encryption";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateWalletRequest {
    pub user_id: String,
    /// Key derivation path (BIP32/BIP44).
    pub derivation_path: Option<String>,
    /// Chain type: "ethereum", "solana", "bitcoin".
    pub chain_type: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateWalletResponse {
    pub wallet_id: String,
    pub public_key: String,
    pub address: String,
    pub chain_type: String,
    pub derivation_path: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WalletResponse {
    pub wallet_id: String,
    pub public_key: String,
    pub address: String,
    pub chain_type: String,
    pub status: String, // "active" | "deleted"
    pub created_at: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SignMessageRequest {
    /// Hex-encoded message to sign.
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SignMessageResponse {
    pub signature: String,
    pub wallet_id: String,
}

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

/// Encrypt key material using ChaCha20-Poly1305 AEAD with an HKDF-derived key.
///
/// Uses HKDF-SHA256 to derive a 256-bit encryption key from the master secret,
/// then encrypts with ChaCha20-Poly1305 (IETF variant).
/// Output format: base64(nonce(12) || ciphertext || tag(16)).
fn encrypt_key_material(raw_key: &[u8], master_secret: &[u8]) -> String {
    // Derive a 32-byte encryption key via HKDF-SHA256.
    let hk = Hkdf::<Sha256>::new(None, master_secret);
    let mut encryption_key = [0u8; 32];
    hk.expand(KEY_MATERIAL_INFO, &mut encryption_key)
        .expect("HKDF expand failed for key material encryption");

    let cipher = ChaCha20Poly1305::new(encryption_key.into());
    let nonce = ChaCha20Poly1305::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce, raw_key)
        .expect("encryption failed");

    // Zeroize derived key immediately.
    encryption_key.zeroize();

    // Prepend nonce to ciphertext (nonce is 12 bytes for ChaCha20-Poly1305 IETF).
    let mut combined = Vec::with_capacity(nonce.len() + ciphertext.len());
    combined.extend_from_slice(nonce.as_slice());
    combined.extend_from_slice(&ciphertext);

    BASE64.encode(combined)
}

/// Decrypt key material encrypted with `encrypt_key_material`.
///
/// Input format: base64(nonce(12) || ciphertext || tag(16)).
fn decrypt_key_material(encoded: &str, master_secret: &[u8]) -> Result<Vec<u8>, String> {
    let combined = BASE64.decode(encoded).map_err(|e| e.to_string())?;

    if combined.len() < 12 {
        return Err("encrypted data too short (missing nonce)".into());
    }

    // Derive the same encryption key via HKDF-SHA256.
    let hk = Hkdf::<Sha256>::new(None, master_secret);
    let mut encryption_key = [0u8; 32];
    hk.expand(KEY_MATERIAL_INFO, &mut encryption_key)
        .expect("HKDF expand failed for key material decryption");

    let cipher = ChaCha20Poly1305::new(encryption_key.into());
    let nonce_bytes = &combined[..12];
    let ciphertext_and_tag = &combined[12..];
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext_and_tag)
        .map_err(|_| "decryption failed (invalid key or corrupted data)".into());

    // Zeroize derived key immediately.
    encryption_key.zeroize();

    plaintext
}

/// Generate a keypair and return (raw_private_key, public_key_hex, address).
fn generate_keypair(chain_type: &str) -> Result<(Vec<u8>, String, String), String> {
    match chain_type {
        "ethereum" => {
            let secret_key = SecpSigningKey::random(&mut OsRng);
            let public_key = secret_key.verifying_key();
            let public_key_hex = format!("0x{}", hex::encode(public_key.to_encoded_point(false).as_bytes()));

            // Derive Ethereum address: last 20 bytes of keccak256(public_key_bytes[1..])
            let public_key_bytes = public_key.to_encoded_point(false).as_bytes();
            let mut hasher = Keccak256::new();
            hasher.update(&public_key_bytes[1..]);
            let hash = hasher.finalize();
            let address = format!("0x{}", hex::encode(&hash[12..]));

            let private_key_bytes = secret_key.to_bytes().to_vec();
            Ok((private_key_bytes, public_key_hex, address))
        }
        "solana" => {
            let secret_key = SigningKey::generate(&mut OsRng);
            let public_key = secret_key.verifying_key();
            let public_key_hex = hex::encode(public_key.to_bytes());

            // Solana address = base58(public_key)
            let address = bs58::encode(public_key.to_bytes()).into_string();

            let private_key_bytes = secret_key.to_bytes().to_vec();
            Ok((private_key_bytes, public_key_hex, address))
        }
        _ => {
            // Default to ethereum-style for any other chain type
            let secret_key = SecpSigningKey::random(&mut OsRng);
            let public_key = secret_key.verifying_key();
            let public_key_hex = format!("0x{}", hex::encode(public_key.to_encoded_point(false).as_bytes()));

            let public_key_bytes = public_key.to_encoded_point(false).as_bytes();
            let mut hasher = Keccak256::new();
            hasher.update(&public_key_bytes[1..]);
            let hash = hasher.finalize();
            let address = format!("0x{}", hex::encode(&hash[12..]));

            let private_key_bytes = secret_key.to_bytes().to_vec();
            Ok((private_key_bytes, public_key_hex, address))
        }
    }
}

/// Sign a hex-encoded message using the decrypted private key.
fn sign_message(chain_type: &str, private_key_bytes: &[u8], message_hex: &str) -> Result<String, String> {
    let message = hex::decode(message_hex).map_err(|e| format!("invalid hex message: {}", e))?;

    match chain_type {
        "ethereum" => {
            let secret_key = SecpSigningKey::from_bytes(private_key_bytes.into())
                .map_err(|e| format!("failed to parse private key: {}", e))?;
            let signature = secret_key.sign(&message);
            Ok(format!("0x{}", hex::encode(signature.to_bytes())))
        }
        "solana" => {
            let secret_key = SigningKey::try_from(private_key_bytes)
                .map_err(|e| format!("failed to parse private key: {}", e))?;
            let signature = secret_key.sign(&message);
            Ok(hex::encode(signature.to_bytes()))
        }
        _ => {
            let secret_key = SecpSigningKey::from_bytes(private_key_bytes.into())
                .map_err(|e| format!("failed to parse private key: {}", e))?;
            let signature = secret_key.sign(&message);
            Ok(format!("0x{}", hex::encode(signature.to_bytes())))
        }
    }
}

// ---------------------------------------------------------------------------
// POST /v1/wallet/generate
// ---------------------------------------------------------------------------

pub async fn generate_wallet(
    State(state): State<Arc<AppState>>,
    Json(req): Json<GenerateWalletRequest>,
) -> impl axum::response::IntoResponse {
    let wallet_id = Uuid::new_v4();
    let chain_type = req.chain_type.unwrap_or_else(|| "ethereum".to_string());
    let derivation_path = req.derivation_path.unwrap_or_else(|| {
        match chain_type.as_str() {
            "ethereum" => "m/44'/60'/0'/0/0".to_string(),
            "solana" => "m/44'/501'/0'/0'".to_string(),
            _ => "m/44'/60'/0'/0/0".to_string(),
        }
    });
    let now = Utc::now();

    // Generate actual keypair
    let (raw_private_key, public_key, address) = match generate_keypair(&chain_type) {
        Ok(result) => result,
        Err(e) => {
            tracing::error!(error = %e, chain_type = %chain_type, "Failed to generate keypair");
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "failed to generate keypair",
                    "detail": e,
                })),
            );
        }
    };

    // Encrypt private key before storage
    let encryption_key = state.config.jwt_secret.as_bytes();
    let encrypted_key = encrypt_key_material(&raw_private_key, encryption_key);

    // Zeroize the raw key after encryption
    let mut raw_private_key = raw_private_key;
    raw_private_key.zeroize();

    // Persist encrypted key material to PostgreSQL
    match sqlx::query(
        "INSERT INTO wallet_keys (wallet_id, user_id, encrypted_key, public_key, address, chain_type, derivation_path, status, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9, $10)",
    )
    .bind(wallet_id)
    .bind(&req.user_id)
    .bind(&encrypted_key)
    .bind(&public_key)
    .bind(&address)
    .bind(&chain_type)
    .bind(&derivation_path)
    .bind(&req.metadata)
    .bind(now)
    .bind(now)
    .execute(&state.db)
    .await
    {
        Ok(_) => {
            tracing::info!(user_id = %req.user_id, wallet_id = %wallet_id, chain_type = %chain_type, "Wallet generated");

            crate::metrics::WALLET_KEY_OPS_TOTAL
                .with_label_values(&["generate"])
                .inc();
            crate::metrics::ACTIVE_WALLET_KEYS.inc();

            (
                StatusCode::CREATED,
                Json(GenerateWalletResponse {
                    wallet_id: wallet_id.to_string(),
                    public_key,
                    address,
                    chain_type,
                    derivation_path,
                    created_at: now.to_rfc3339(),
                }),
            )
        }
        Err(e) => {
            tracing::error!(error = %e, wallet_id = %wallet_id, "Failed to persist wallet");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "failed to persist wallet",
                    "detail": e.to_string(),
                })),
            )
        }
    }
}

// ---------------------------------------------------------------------------
// GET /v1/wallet/:wallet_id
// ---------------------------------------------------------------------------

pub async fn get_wallet(
    State(state): State<Arc<AppState>>,
    Path(wallet_id): Path<String>,
) -> impl axum::response::IntoResponse {
    // Try cache first
    let cache_key = format!("wallet:{}", wallet_id);
    if let Ok(Some(cached)) = state.redis.cache_get(&cache_key).await {
        crate::metrics::CACHE_HIT_TOTAL
            .with_label_values(&["wallet"])
            .inc();
        if let Ok(response) = serde_json::from_str::<WalletResponse>(&cached) {
            return (StatusCode::OK, Json(response));
        }
    }

    // Fall back to database
    match sqlx::query(
        "SELECT wallet_id, public_key, address, chain_type, status, metadata, created_at
         FROM wallet_keys
         WHERE wallet_id = $1 AND status = 'active'",
    )
    .bind(&wallet_id)
    .fetch_one(&state.db)
    .await
    {
        Ok(row) => {
            let response = WalletResponse {
                wallet_id: row.get::<Uuid, _>("wallet_id").to_string(),
                public_key: row.get("public_key"),
                address: row.get("address"),
                chain_type: row.get("chain_type"),
                status: row.get("status"),
                created_at: row.get::<DateTime<Utc>, _>("created_at").to_rfc3339(),
                metadata: row.get("metadata"),
            };

            // Cache the result
            if let Ok(serialized) = serde_json::to_string(&response) {
                let _ = state.redis.cache_set(&cache_key, &serialized, state.config.redis_cache_ttl_secs).await;
            }

            crate::metrics::WALLET_KEY_OPS_TOTAL
                .with_label_values(&["get"])
                .inc();

            (StatusCode::OK, Json(response))
        }
        Err(sqlx::Error::RowNotFound) => {
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "wallet not found or deleted",
                    "wallet_id": wallet_id,
                })),
            )
        }
        Err(e) => {
            tracing::error!(error = %e, wallet_id = %wallet_id, "Failed to fetch wallet");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "failed to fetch wallet",
                    "detail": e.to_string(),
                })),
            )
        }
    }
}

// ---------------------------------------------------------------------------
// POST /v1/wallet/:wallet_id/sign
// ---------------------------------------------------------------------------

pub async fn sign_message(
    State(state): State<Arc<AppState>>,
    Path(wallet_id): Path<String>,
    Json(req): Json<SignMessageRequest>,
) -> impl axum::response::IntoResponse {
    // Fetch wallet from database
    let row = match sqlx::query(
        "SELECT wallet_id, encrypted_key, chain_type, status
         FROM wallet_keys
         WHERE wallet_id = $1 AND status = 'active'",
    )
    .bind(&wallet_id)
    .fetch_one(&state.db)
    .await
    {
        Ok(row) => row,
        Err(sqlx::Error::RowNotFound) => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "wallet not found or deleted",
                    "wallet_id": wallet_id,
                })),
            );
        }
        Err(e) => {
            tracing::error!(error = %e, wallet_id = %wallet_id, "Failed to fetch wallet for signing");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "failed to fetch wallet",
                    "detail": e.to_string(),
                })),
            );
        }
    };

    let chain_type: String = row.get("chain_type");
    let encrypted_key: String = row.get("encrypted_key");

    // Decrypt private key
    let encryption_key = state.config.jwt_secret.as_bytes();
    let private_key_bytes = match decrypt_key_material(&encrypted_key, encryption_key) {
        Ok(bytes) => bytes,
        Err(e) => {
            tracing::error!(error = %e, wallet_id = %wallet_id, "Failed to decrypt wallet key");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "failed to decrypt wallet key",
                    "detail": e,
                })),
            );
        }
    };

    // Sign the message
    match sign_message(&chain_type, &private_key_bytes, &req.message) {
        Ok(signature) => {
            crate::metrics::WALLET_KEY_OPS_TOTAL
                .with_label_values(&["sign"])
                .inc();

            (
                StatusCode::OK,
                Json(SignMessageResponse {
                    signature,
                    wallet_id,
                }),
            )
        }
        Err(e) => {
            tracing::error!(error = %e, wallet_id = %wallet_id, "Failed to sign message");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "failed to sign message",
                    "detail": e,
                })),
            )
        }
    }
}

// ---------------------------------------------------------------------------
// DELETE /v1/wallet/:wallet_id
// ---------------------------------------------------------------------------

pub async fn delete_wallet(
    State(state): State<Arc<AppState>>,
    Path(wallet_id): Path<String>,
) -> impl axum::response::IntoResponse {
    match sqlx::query(
        "UPDATE wallet_keys SET status = 'deleted', updated_at = $1
         WHERE wallet_id = $2 AND status = 'active'",
    )
    .bind(Utc::now())
    .bind(&wallet_id)
    .execute(&state.db)
    .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                return (
                    StatusCode::NOT_FOUND,
                    Json(serde_json::json!({
                        "error": "wallet not found or already deleted",
                        "wallet_id": wallet_id,
                    })),
                );
            }

            // Invalidate cache
            let _ = state.redis.cache_delete(&format!("wallet:{}", wallet_id)).await;

            crate::metrics::WALLET_KEY_OPS_TOTAL
                .with_label_values(&["delete"])
                .inc();
            crate::metrics::ACTIVE_WALLET_KEYS.dec();

            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "status": "deleted",
                    "wallet_id": wallet_id,
                })),
            )
        }
        Err(e) => {
            tracing::error!(error = %e, wallet_id = %wallet_id, "Failed to delete wallet");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "failed to delete wallet",
                    "detail": e.to_string(),
                })),
            )
        }
    }
}
