use jsonwebtoken::{EncodingKey, Header};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};

use crate::config::Config;
use crate::metrics::{record_push_failed, record_push_sent};
use crate::types::PushResponse;

/// Firebase Cloud Messaging HTTP v1 API client.
///
/// Uses OAuth2 service account flow with real JWT signing via `jsonwebtoken` + `ring`.
pub struct FcmClient {
    config: Config,
    http_client: reqwest::Client,
    oauth_token: std::sync::RwLock<Option<FcmToken>>,
}

/// Cached OAuth2 access token for FCM.
#[derive(Debug, Clone)]
struct FcmToken {
    access_token: String,
    expires_at: std::time::Instant,
}

/// Service account key structure for FCM OAuth2.
#[derive(Debug, Deserialize)]
struct ServiceAccountKey {
    client_email: String,
    private_key: String,
}

/// Google OAuth2 token response.
#[derive(Debug, Deserialize)]
struct GoogleTokenResponse {
    access_token: String,
    expires_in: u64,
    token_type: String,
}

impl FcmClient {
    /// Create a new FCM client from config.
    pub fn new(config: &Config) -> Self {
        Self {
            config: config.clone(),
            http_client: reqwest::Client::new(),
            oauth_token: std::sync::RwLock::new(None),
        }
    }

    /// Get a valid OAuth2 access token, refreshing if expired.
    ///
    /// Reads the service account JSON, signs a JWT with the RSA private key,
    /// and exchanges it for a short-lived access token from Google's OAuth2 endpoint.
    async fn get_access_token(&self) -> Result<String, String> {
        // Check if we have a cached token that's still valid.
        {
            let guard = self.oauth_token.read().map_err(|e| e.to_string())?;
            if let Some(token) = guard.as_ref() {
                if token.expires_at > std::time::Instant::now() {
                    return Ok(token.access_token.clone());
                }
            }
        }

        // Load service account JSON.
        let sa_bytes = std::fs::read(&self.config.fcm_service_account_path)
            .map_err(|e| format!("Failed to read FCM service account: {}", e))?;

        let sa: ServiceAccountKey = serde_json::from_slice(&sa_bytes)
            .map_err(|e| format!("Failed to parse FCM service account: {}", e))?;

        // Build JWT claim set.
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?;
        let iat = now.as_secs() as i64;
        let exp = iat + 3600; // 1 hour

        let claims = serde_json::json!({
            "iss": sa.client_email,
            "scope": "https://www.googleapis.com/auth/firebase.messaging",
            "aud": "https://oauth2.googleapis.com/token",
            "exp": exp,
            "iat": iat,
        });

        // Sign JWT with RSA-SHA256 using the service account private key.
        let token = jsonwebtoken::encode(
            &Header::new(jsonwebtoken::Algorithm::RS256),
            &claims,
            &EncodingKey::from_rsa_pem(sa.private_key.as_bytes())
                .map_err(|e| format!("Failed to create encoding key: {}", e))?,
        )
        .map_err(|e| format!("Failed to sign JWT: {}", e))?;

        // Exchange JWT assertion for an access token.
        let resp = self
            .http_client
            .post("https://oauth2.googleapis.com/token")
            .header(CONTENT_TYPE, "application/x-www-form-urlencoded")
            .form(&[
                ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
                ("assertion", &token),
            ])
            .send()
            .await
            .map_err(|e| format!("OAuth2 request failed: {}", e))?;

        let status = resp.status();
        let body: GoogleTokenResponse = resp.json().await.map_err(|e| {
            format!("Failed to parse OAuth2 response (status {}): {}", status, e)
        })?;

        if body.access_token.is_empty() {
            return Err("OAuth2 returned empty access token".into());
        }

        let new_token = FcmToken {
            access_token: body.access_token,
            expires_at: std::time::Instant::now()
                + std::time::Duration::from_secs(body.expires_in.saturating_sub(60)),
        };

        {
            let mut guard = self.oauth_token.write().map_err(|e| e.to_string())?;
            *guard = Some(new_token.clone());
        }

        Ok(new_token.access_token)
    }

    /// Send a push notification via FCM HTTP v1 API.
    pub async fn send(
        &self,
        registration_id: &str,
        title: Option<&str>,
        body: &str,
        data: &std::collections::HashMap<String, String>,
        ttl: Option<u32>,
        priority: Option<&str>,
        collapse_key: Option<&str>,
    ) -> PushResponse {
        let access_token = match self.get_access_token().await {
            Ok(t) => t,
            Err(e) => {
                record_push_failed("fcm");
                return PushResponse {
                    success: false,
                    message_id: None,
                    error: Some(format!("OAuth2 token error: {}", e)),
                    platform: "fcm".to_string(),
                };
            }
        };

        let url = format!(
            "https://fcm.googleapis.com/v1/projects/{}/messages:send",
            self.config.fcm_project_id
        );

        let fcm_priority = match priority.unwrap_or("high") {
            "high" => "HIGH",
            _ => "NORMAL",
        };

        let payload = FcmMessageRequest::build(
            registration_id,
            title,
            body,
            data,
            ttl,
            fcm_priority,
            collapse_key,
        );

        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", access_token)).unwrap(),
        );
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

        match self
            .http_client
            .post(&url)
            .headers(headers)
            .json(&payload)
            .send()
            .await
        {
            Ok(resp) => {
                let status = resp.status();
                if status.is_success() {
                    let resp_body: FcmMessageResponse = match resp.json().await {
                        Ok(b) => b,
                        Err(e) => {
                            record_push_failed("fcm");
                            return PushResponse {
                                success: false,
                                message_id: None,
                                error: Some(format!("FCM response parse error: {}", e)),
                                platform: "fcm".to_string(),
                            };
                        }
                    };
                    record_push_sent("fcm");
                    PushResponse {
                        success: true,
                        message_id: Some(resp_body.name),
                        error: None,
                        platform: "fcm".to_string(),
                    }
                } else {
                    let body_text = resp.text().await.unwrap_or_default();
                    record_push_failed("fcm");
                    PushResponse {
                        success: false,
                        message_id: None,
                        error: Some(format!("FCM error {}: {}", status, body_text)),
                        platform: "fcm".to_string(),
                    }
                }
            }
            Err(e) => {
                record_push_failed("fcm");
                PushResponse {
                    success: false,
                    message_id: None,
                    error: Some(format!("FCM request failed: {}", e)),
                    platform: "fcm".to_string(),
                }
            }
        }
    }
}

/// FCM v1 API message request body.
#[derive(Debug, Serialize)]
struct FcmMessageRequest {
    message: FcmMessage,
}

impl FcmMessageRequest {
    fn build(
        registration_id: &str,
        title: Option<&str>,
        body: &str,
        data: &std::collections::HashMap<String, String>,
        ttl: Option<u32>,
        priority: &str,
        collapse_key: Option<&str>,
    ) -> Self {
        let notification = title.map(|t| FcmNotification {
            title: t.to_string(),
            body: body.to_string(),
        });

        let mut android_config = serde_json::Map::new();
        android_config.insert("priority".to_string(), serde_json::json!(priority.to_lowercase()));
        if let Some(ttl_val) = ttl {
            android_config.insert("ttl".to_string(), serde_json::json!(format!("{}s", ttl_val)));
        }
        if let Some(ck) = collapse_key {
            android_config.insert("collapse_key".to_string(), serde_json::json!(ck));
        }

        Self {
            message: FcmMessage {
                token: registration_id.to_string(),
                notification,
                data: if data.is_empty() {
                    None
                } else {
                    Some(data.clone())
                },
                android: Some(android_config),
            },
        }
    }
}

/// FCM notification payload (title + body).
#[derive(Debug, Serialize)]
struct FcmNotification {
    title: String,
    body: String,
}

#[derive(Debug, Serialize)]
struct FcmMessage {
    token: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    notification: Option<FcmNotification>,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<std::collections::HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    android: Option<serde_json::Map<String, serde_json::Value>>,
}

/// FCM v1 API message response.
#[derive(Debug, Deserialize)]
struct FcmMessageResponse {
    name: String,
}
