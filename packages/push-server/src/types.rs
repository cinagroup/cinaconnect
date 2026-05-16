use serde::{Deserialize, Serialize};

/// Platform identifier for push routing.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Platform {
    Apns,
    Fcm,
}

/// Unified push notification request body.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushRequest {
    /// Device-specific token (APNs device token or FCM registration ID).
    pub token: String,
    /// Platform: "apns" or "fcm".
    pub platform: Platform,
    /// Notification title.
    pub title: Option<String>,
    /// Notification body text.
    pub body: String,
    /// Optional badge number (APNs only).
    pub badge: Option<i32>,
    /// Optional sound name or file path.
    pub sound: Option<String>,
    /// Custom key-value payload for the notification.
    #[serde(default)]
    pub data: std::collections::HashMap<String, String>,
    /// Optional priority: "high" or "normal" (default: "high").
    pub priority: Option<String>,
    /// Optional time-to-live in seconds (FCM only, default: 2419200 = 4 weeks).
    pub ttl: Option<u32>,
    /// Collapse key for grouping notifications (FCM).
    pub collapse_key: Option<String>,
    /// Thread identifier for grouping notifications (APNs).
    pub thread_id: Option<String>,
    /// Mutable content flag for APNs (allows Notification Service Extension).
    pub mutable_content: Option<bool>,
    /// Custom category identifier for APNs action buttons.
    pub category: Option<String>,
}

/// Unified push notification response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushResponse {
    /// Whether the push was accepted by the platform.
    pub success: bool,
    /// Platform-specific message ID.
    pub message_id: Option<String>,
    /// Error description if push failed.
    pub error: Option<String>,
    /// Platform that handled the push.
    pub platform: String,
}

/// Device token registration request.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterRequest {
    /// Device token / registration ID.
    pub token: String,
    /// Platform: "apns" or "fcm".
    pub platform: Platform,
    /// Optional user identifier to associate with this device.
    pub user_id: Option<String>,
    /// Optional app version.
    pub app_version: Option<String>,
    /// Device model identifier.
    pub device_model: Option<String>,
}

/// Device token registration response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterResponse {
    /// Whether registration succeeded.
    pub success: bool,
    /// Device identifier in our system.
    pub device_id: Option<String>,
    /// Error description if registration failed.
    pub error: Option<String>,
}

/// Health check response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub apns_configured: bool,
    pub fcm_configured: bool,
    pub redis_connected: bool,
    pub timestamp: String,
}

/// Internal device record for Redis storage.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceRecord {
    pub token: String,
    pub platform: Platform,
    pub user_id: Option<String>,
    pub app_version: Option<String>,
    pub device_model: Option<String>,
    pub registered_at: chrono::DateTime<chrono::Utc>,
}
