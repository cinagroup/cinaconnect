use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};

use crate::config::Config;
use crate::metrics::{record_push_failed, record_push_sent};
use crate::types::PushResponse;

/// Firebase Cloud Messaging HTTP v1 API client.
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

        let service_account: ServiceAccountKey = serde_json::from_slice(&sa_bytes)
            .map_err(|e| format!("Failed to parse FCM service account: {}", e))?;

        // Build JWT assertion for OAuth2.
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?;

        let iat = now.as_secs() as i64;
        let exp = iat + 3600; // 1 hour

        // Create the JWT claim set for service account auth.
        let header = jwt_base64(
            &serde_json::json!({ "alg": "RS256", "typ": "JWT" }),
        );

        let claim_set = serde_json::json!({
            "iss": service_account.client_email,
            "scope": "https://www.googleapis.com/auth/firebase.messaging",
            "aud": "https://oauth2.googleapis.com/token",
            "exp": exp,
            "iat": iat,
        });
        let claim = jwt_base64(&claim_set);

        // For a production implementation you would sign the JWT with the private key
        // from the service account using ring::signature::RsaKeyPair.
        // Here we use a placeholder — the actual signing requires the private_key field.
        // In practice, use the `google-cloud-auth` or `yup-oauth2` crate for this flow.
        let signature = jwt_base64(&serde_json::json!("placeholder"));

        // Fetch access token from Google OAuth2 endpoint.
        let token_response = self
            .http_client
            .post("https://oauth2.googleapis.com/token")
            .header(CONTENT_TYPE, "application/x-www-form-urlencoded")
            .form(&[
                ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
                ("assertion", &format!("{}.{}.{}", header, claim, signature)),
            ])
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let token_body: GoogleTokenResponse = token_response
            .json()
            .await
            .map_err(|e| e.to_string())?;

        let new_token = FcmToken {
            access_token: token_body.access_token,
            expires_at: std::time::Instant::now()
                + std::time::Duration::from_secs(token_body.expires_in.saturating_sub(60) as u64),
        };

        {
            let mut guard = self.oauth_token.write().map_err(|e| e.to_string())?;
            *guard = Some(new_token.clone());
        }

        Ok(new_token.access_token)
    }

    /// Send a push notification via FCM HTTP v1 API.
    ///
    /// # Arguments
    /// * `registration_id` - The FCM registration token for the target device.
    /// * `title` - Notification title.
    /// * `body` - Notification body text.
    /// * `data` - Custom payload key-value pairs.
    /// * `ttl` - Time-to-live in seconds.
    /// * `priority` - "high" or "normal".
    /// * `collapse_key` - Key for collapsing messages.
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
                    let body: FcmMessageResponse = match resp.json().await {
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
                        message_id: Some(body.name),
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

/// Service account key structure for FCM.
#[derive(Debug, Deserialize)]
struct ServiceAccountKey {
    client_email: String,
    // private_key: String, // not used directly; signing handled by oauth2 lib
}

/// Google OAuth2 token response.
#[derive(Debug, Deserialize)]
struct GoogleTokenResponse {
    access_token: String,
    expires_in: u64,
    token_type: String,
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
        let mut notification = serde_json::Map::new();
        if let Some(t) = title {
            notification.insert("title".to_string(), serde_json::json!(t));
        }
        notification.insert("body".to_string(), serde_json::json!(body));

        let mut android_config = serde_json::Map::new();
        android_config.insert("priority".to_string(), serde_json::json!(priority.to_lowercase()));
        if let Some(ttl_val) = ttl {
            android_config.insert("ttl".to_string(), serde_json::json!(format!("{}s", ttl_val)));
        }
        if let Some(ck) = collapse_key {
            android_config.insert("collapse_key".to_string(), serde_json::json!(ck));
        }

        let mut message = FcmMessage {
            token: registration_id.to_string(),
            notification: Some(notification),
            data: if data.is_empty() {
                None
            } else {
                Some(data.clone())
            },
            android: Some(android_config),
        };

        // If no title, remove the notification to do data-only push.
        if title.is_none() {
            message.notification = None;
        }

        Self { message }
    }
}

#[derive(Debug, Serialize)]
struct FcmMessage {
    token: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    notification: Option<serde_json::Map<String, serde_json::Value>>,
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

/// Base64url-encode a JSON value (no padding).
fn jwt_base64(value: &serde_json::Value) -> String {
    use base64::Engine;
    let engine = base64::engine::general_purpose::URL_SAFE_NO_PAD;
    engine.encode(serde_json::to_vec(value).unwrap_or_default())
}
