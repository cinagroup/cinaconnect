use std::time::{SystemTime, UNIX_EPOCH};

use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use ring::signature::Ed25519KeyPair;

use crate::config::Config;
use crate::metrics::{record_push_failed, record_push_sent};
use crate::types::PushResponse;

/// Apple Push Notification Service HTTP/2 client.
pub struct ApnsClient {
    config: Config,
    http_client: reqwest::Client,
}

impl ApnsClient {
    /// Create a new APNs client from config.
    pub fn new(config: &Config) -> Self {
        Self {
            config: config.clone(),
            http_client: reqwest::Client::new(),
        }
    }

    /// Generate a JWT token for APNs authentication (ES256).
    ///
    /// The token is valid for 60 minutes per Apple's specification.
    pub fn generate_token(&self) -> Result<String, ApnsError> {
        let key_bytes = std::fs::read(&self.config.apns_cert_path)
            .map_err(|e| ApnsError::KeyRead(e.to_string()))?;

        let key_pair = Ed25519KeyPair::from_pkcs8(&key_bytes)
            .map_err(|e| ApnsError::KeyParse(e.to_string()))?;

        let encoding_key =
            EncodingKey::from_secret(key_pair.as_ref());

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| ApnsError::Time(e.to_string()))?;

        let claims = ApnsClaims {
            iss: &self.config.apns_team_id,
            iat: now.as_secs() as i64,
        };

        let mut header = Header::new(Algorithm::ES256);
        header.kid = Some(self.config.apns_key_id.clone());

        encode(&header, &claims, &encoding_key)
            .map_err(|e| ApnsError::Jwt(e.to_string()))
    }

    /// Send a push notification to an APNs device.
    ///
    /// # Arguments
    /// * `device_token` - The APNs device token (hex string, no spaces).
    /// * `title` - Notification title.
    /// * `body` - Notification body text.
    /// * `data` - Custom payload key-value pairs.
    /// * `priority` - "high" (10) or "normal" (5).
    /// * `badge` - Badge number for the app icon.
    /// * `sound` - Sound file name or system sound.
    /// * `thread_id` - Thread ID for grouping.
    /// * `mutable_content` - Enable Notification Service Extension.
    /// * `category` - Category for action buttons.
    pub async fn send(
        &self,
        device_token: &str,
        title: Option<&str>,
        body: &str,
        data: &std::collections::HashMap<String, String>,
        priority: Option<&str>,
        badge: Option<i32>,
        sound: Option<&str>,
        thread_id: Option<&str>,
        mutable_content: Option<bool>,
        category: Option<&str>,
    ) -> PushResponse {
        let token = match self.generate_token() {
            Ok(t) => t,
            Err(e) => {
                record_push_failed("apns");
                return PushResponse {
                    success: false,
                    message_id: None,
                    error: Some(format!("Token generation failed: {}", e)),
                    platform: "apns".to_string(),
                };
            }
        };

        let payload = build_apns_payload(title, body, data, badge, sound, thread_id, mutable_content, category);

        let apns_priority = match priority.unwrap_or("high") {
            "high" => "10",
            _ => "5",
        };

        let url = format!("{}/3/device/{}", self.config.apns_base_url, device_token);

        let mut headers = HeaderMap::new();
        headers.insert("apns-topic", HeaderValue::from_str(&self.config.apns_topic).unwrap());
        headers.insert("apns-push-type", HeaderValue::from_static("alert"));
        headers.insert("apns-priority", HeaderValue::from_static(apns_priority));
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", token)).unwrap(),
        );

        if let Some(tid) = thread_id {
            if let Ok(v) = HeaderValue::from_str(tid) {
                headers.insert("apns-thread-id", v);
            }
        }

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
                    let apns_id = resp
                        .headers()
                        .get("apns-id")
                        .and_then(|v| v.to_str().ok())
                        .map(String::from);
                    record_push_sent("apns");
                    PushResponse {
                        success: true,
                        message_id: apns_id,
                        error: None,
                        platform: "apns".to_string(),
                    }
                } else {
                    let body_text = resp.text().await.unwrap_or_default();
                    record_push_failed("apns");
                    PushResponse {
                        success: false,
                        message_id: None,
                        error: Some(format!("APNs error {}: {}", status, body_text)),
                        platform: "apns".to_string(),
                    }
                }
            }
            Err(e) => {
                record_push_failed("apns");
                PushResponse {
                    success: false,
                    message_id: None,
                    error: Some(format!("APNs request failed: {}", e)),
                    platform: "apns".to_string(),
                }
            }
        }
    }
}

/// JWT claims for APNs token-based authentication.
#[derive(serde::Serialize)]
struct ApnsClaims<'a> {
    iss: &'a str,
    iat: i64,
}

/// APNs error types.
#[derive(Debug)]
pub enum ApnsError {
    KeyRead(String),
    KeyParse(String),
    Time(String),
    Jwt(String),
}

impl std::fmt::Display for ApnsError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::KeyRead(e) => write!(f, "key read error: {}", e),
            Self::KeyParse(e) => write!(f, "key parse error: {}", e),
            Self::Time(e) => write!(f, "time error: {}", e),
            Self::Jwt(e) => write!(f, "JWT error: {}", e),
        }
    }
}

/// Build the APNs JSON payload.
fn build_apns_payload(
    title: Option<&str>,
    body: &str,
    data: &std::collections::HashMap<String, String>,
    badge: Option<i32>,
    sound: Option<&str>,
    thread_id: Option<&str>,
    mutable_content: Option<bool>,
    category: Option<&str>,
) -> serde_json::Value {
    let mut alert = serde_json::Map::new();
    if let Some(t) = title {
        alert.insert("title".to_string(), serde_json::json!(t));
    }
    alert.insert("body".to_string(), serde_json::json!(body));

    let mut aps = serde_json::Map::new();
    aps.insert("alert".to_string(), serde_json::Value::Object(alert));

    if let Some(b) = badge {
        aps.insert("badge".to_string(), serde_json::json!(b));
    }
    if let Some(s) = sound {
        aps.insert("sound".to_string(), serde_json::json!(s));
    }
    if let Some(tid) = thread_id {
        aps.insert("thread-id".to_string(), serde_json::json!(tid));
    }
    if mutable_content == Some(true) {
        aps.insert("mutable-content".to_string(), serde_json::json!(1));
    }
    if let Some(cat) = category {
        aps.insert("category".to_string(), serde_json::json!(cat));
    }

    let mut payload = serde_json::Map::new();
    payload.insert("aps".to_string(), serde_json::Value::Object(aps));

    // Custom data fields at top level.
    for (k, v) in data {
        payload.insert(k.clone(), serde_json::json!(v));
    }

    serde_json::Value::Object(payload)
}
