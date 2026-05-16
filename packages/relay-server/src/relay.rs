//! Relay core: WebSocket handler with topic subscription, message routing, and pub/sub.
//!
//! Each WebSocket connection is handled by an `ActixActor` that:
//! 1. Receives messages from the client
//! 2. Validates and routes them (subscribe/unsubscribe/publish)
//! 3. Delivers published messages to subscribers via in-memory broadcast + Redis Pub/Sub
//! 4. Maintains per-connection subscription state
//! 5. Enforces message size limits, rate limiting, and topic expiration

use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::{Duration, Instant};

use actix::prelude::*;
use actix::fut::ActorFuture;
use actix_web::web;
use actix_web_actors::ws;
use redis::aio::ConnectionManager;
use serde_json::json;
use tokio::sync::{broadcast, Mutex};
use tracing::{debug, error, info, warn};

use crate::config::Config;
use crate::metrics;
use crate::models::*;

/// Heartbeat interval (seconds).
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(30);

/// Client inactivity timeout.
const CLIENT_TIMEOUT: Duration = Duration::from_secs(60);

/// Topic metadata for expiration tracking.
#[derive(Debug, Clone)]
pub struct TopicMeta {
    pub created_at: Instant,
    pub ttl_secs: u64,
    pub last_activity: Instant,
}

impl TopicMeta {
    pub fn is_expired(&self) -> bool {
        if self.ttl_secs == 0 {
            return false;
        }
        self.last_activity.elapsed().as_secs() > self.ttl_secs
            || self.created_at.elapsed().as_secs() > self.ttl_secs
    }
}

/// A message published on a topic, sent via the in-memory broadcast channel.
#[derive(Debug, Clone)]
pub struct BroadcastMessage {
    pub topic: String,
    /// JSON-serialized `RelayMessage` ready to send to WebSocket clients.
    pub json: String,
    /// Client ID of the publisher (so we can skip echoing back).
    pub publisher_id: String,
}

/// Shared state accessible by all WebSocket sessions.
#[derive(Clone)]
pub struct AppState {
    /// Redis connection for session storage and topic tracking.
    pub redis: ConnectionManager,
    /// Map of topic → list of connected client IDs subscribed to that topic.
    pub subscriptions: Arc<Mutex<HashMap<String, Vec<String>>>>,
    /// Topic metadata for expiration tracking.
    pub topic_meta: Arc<Mutex<HashMap<String, TopicMeta>>>,
    /// Counter for generating unique client IDs.
    pub client_counter: Arc<Mutex<u64>>,
    /// In-memory rate limiter: IP → (count, reset_at).
    pub rate_limiter: Arc<Mutex<HashMap<String, (u32, Instant)>>>,
    /// Server configuration.
    pub config: Config,
    /// Broadcast channel for delivering published messages to local subscribers.
    pub broadcast_tx: broadcast::Sender<BroadcastMessage>,
}

impl AppState {
    /// Create a new AppState with a broadcast channel of the given capacity.
    pub fn new(redis: ConnectionManager, config: Config, broadcast_capacity: usize) -> Self {
        let (broadcast_tx, _) = broadcast::channel(broadcast_capacity);
        Self {
            redis,
            subscriptions: Arc::new(Mutex::new(HashMap::new())),
            topic_meta: Arc::new(Mutex::new(HashMap::new())),
            client_counter: Arc::new(Mutex::new(0u64)),
            rate_limiter: Arc::new(Mutex::new(HashMap::new())),
            config,
            broadcast_tx,
        }
    }

    /// Generate a unique client ID.
    pub async fn next_client_id(&self) -> String {
        let mut counter = self.client_counter.lock().await;
        *counter += 1;
        format!("client-{}", counter)
    }

    /// Check whether an IP is rate-limited.
    pub async fn check_rate_limit(&self, ip: &str) -> bool {
        let mut limiter = self.rate_limiter.lock().await;
        let now = Instant::now();
        let window = Duration::from_secs(self.config.connection_rate_window_secs);

        let entry = limiter.entry(ip.to_string()).or_insert((0, now));

        // Reset counter if window expired.
        if now.duration_since(entry.1) > window {
            entry.0 = 0;
            entry.1 = now;
        }

        if entry.0 >= self.config.connection_rate_limit {
            metrics::RELAY_RATE_LIMITED_TOTAL.inc();
            return false;
        }

        entry.0 += 1;
        true
    }

    /// Register or refresh topic metadata.
    pub async fn touch_topic(&self, topic: &str) {
        let mut meta = self.topic_meta.lock().await;
        meta.insert(
            topic.to_string(),
            TopicMeta {
                created_at: meta
                    .get(topic)
                    .map(|m| m.created_at)
                    .unwrap_or_else(Instant::now),
                ttl_secs: self.config.topic_ttl_secs,
                last_activity: Instant::now(),
            },
        );
    }

    /// Remove expired topics.
    pub async fn cleanup_expired_topics(&self) -> Vec<String> {
        let mut meta = self.topic_meta.lock().await;
        let mut subs = self.subscriptions.lock().await;
        let mut expired = Vec::new();

        meta.retain(|topic, m| {
            if m.is_expired() {
                expired.push(topic.clone());
                subs.remove(topic);
                false
            } else {
                true
            }
        });

        for topic in &expired {
            metrics::RELAY_TOPICS_EXPIRED_TOTAL.inc();
            let subs_key = format!("topic:{}:subs", topic);
            let _ = self.redis.del(&subs_key).await;
            info!(topic, "expired topic cleaned up");
        }

        expired
    }
}

/// Background task: subscribe to Redis Pub/Sub and deliver messages to the broadcast channel.
///
/// This ensures that messages published by other relay-server instances (or
/// cross-instance) are received locally and forwarded to subscribers.
pub async fn redis_pubsub_subscriber(
    redis_url: String,
    broadcast_tx: broadcast::Sender<BroadcastMessage>,
) {
    use redis::Client;
    use futures_util::StreamExt;

    let client = match Client::open(redis_url.clone()) {
        Ok(c) => c,
        Err(e) => {
            error!(error = %e, "redis pubsub subscriber: failed to create client");
            return;
        }
    };

    loop {
        let pubsub_conn = match client.get_async_pubsub().await {
            Ok(conn) => conn,
            Err(e) => {
                error!(error = %e, "redis pubsub subscriber: failed to connect, retrying in 5s");
                tokio::time::sleep(Duration::from_secs(5)).await;
                continue;
            }
        };

        // Subscribe to all topic channels with a wildcard pattern.
        let mut pubsub_conn = match pubsub_conn.psubscribe("topic:*").await {
            Ok(_) => pubsub_conn,
            Err(e) => {
                error!(error = %e, "redis pubsub subscriber: failed to subscribe, retrying in 5s");
                tokio::time::sleep(Duration::from_secs(5)).await;
                continue;
            }
        };

        info!("redis pubsub subscriber: subscribed to topic:*");

        // Drain messages from the pubsub stream.
        let mut on_message = pubsub_conn.on_message();
        while let Some(msg) = on_message.next().await {
            let channel = match msg.get_channel_name::<String>() {
                Ok(ch) => ch,
                Err(e) => {
                    warn!(error = %e, "redis pubsub subscriber: failed to get channel name");
                    continue;
                }
            };

            let payload: String = match msg.get_payload() {
                Ok(p) => p,
                Err(e) => {
                    warn!(error = %e, "redis pubsub subscriber: failed to get payload");
                    continue;
                }
            };

            // The channel name is like "topic:abc123...". Extract the topic.
            let topic = match channel.strip_prefix("topic:") {
                Some(t) => t.to_string(),
                None => {
                    warn!(channel, "redis pubsub subscriber: unexpected channel format");
                    continue;
                }
            };

            // Deliver to local subscribers via broadcast.
            let bm = BroadcastMessage {
                topic: topic.clone(),
                json: payload.clone(),
                publisher_id: String::new(), // cross-instance, deliver to all
            };

            if let Err(e) = broadcast_tx.send(bm) {
                warn!(error = %e, topic, "redis pubsub subscriber: broadcast channel has no receivers");
            }

            metrics::RELAY_MESSAGES_PUBLISHED_TOTAL.inc();
            debug!(topic, "redis pubsub subscriber: delivered message to broadcast");
        }

        // Stream ended, reconnect.
        warn!("redis pubsub subscriber: stream ended, reconnecting in 2s");
        tokio::time::sleep(Duration::from_secs(2)).await;
    }
}

/// WebSocket session actor for a single client connection.
pub struct RelaySession {
    /// Unique identifier for this connection.
    pub id: String,
    /// Set of topics this client is subscribed to.
    pub subscriptions: HashSet<String>,
    /// Reference to shared application state.
    pub state: AppState,
    /// Last heartbeat timestamp.
    pub hb: Instant,
    /// Receiver for broadcast messages.
    broadcast_rx: Option<broadcast::Receiver<BroadcastMessage>>,
}

impl RelaySession {
    /// Create a new relay session.
    pub fn new(state: AppState, id: String) -> Self {
        metrics::RELAY_ACTIVE_CONNECTIONS.inc();
        metrics::RELAY_CONNECTIONS_TOTAL.inc();

        // Subscribe to the broadcast channel.
        let broadcast_rx = state.broadcast_tx.subscribe();

        Self {
            id,
            subscriptions: HashSet::new(),
            state,
            hb: Instant::now(),
            broadcast_rx: Some(broadcast_rx),
        }
    }

    /// Start the heartbeat timer for this session.
    fn heartbeat(&self, ctx: &mut <Self as Actor>::Context) {
        ctx.run_interval(HEARTBEAT_INTERVAL, |act, ctx| {
            if Instant::now().duration_since(act.hb) > CLIENT_TIMEOUT {
                warn!(client_id = %act.id, "client heartbeat timeout — disconnecting");
                ctx.stop();
                return;
            }
            ctx.ping(b"");
        });
    }

    /// Start listening for broadcast messages from the in-memory channel.
    /// This ensures the local session receives messages published on topics
    /// it's subscribed to, even when the publisher is another local client.
    fn start_broadcast_listener(&mut self, ctx: &mut <Self as Actor>::Context) {
        let rx = match self.broadcast_rx.take() {
            Some(rx) => rx,
            None => return, // already started
        };
        Self::poll_broadcast(ctx, self.id.clone(), rx);
    }

    /// Recursively poll the broadcast receiver using ActorFuture.
    /// Each time a message arrives, we deliver it to the client if the client
    /// is subscribed to the topic and is not the publisher.
    fn poll_broadcast(
        ctx: &mut <Self as Actor>::Context,
        client_id: String,
        rx: broadcast::Receiver<BroadcastMessage>,
    ) {
        let fut = Self::recv_once(rx);

        ctx.spawn(
            Box::pin(fut)
                .into_actor()
                .map(move |result, act: &mut Self, ctx: &mut <Self as Actor>::Context| {
                    if let Some((msg, new_rx)) = result {
                        // Resubscribe for next message.
                        Self::poll_broadcast(ctx, client_id.clone(), new_rx);

                        // Skip lagged/empty messages.
                        if msg.json.is_empty() {
                            return;
                        }

                        // Deliver only if subscribed and not the publisher.
                        if act.subscriptions.contains(&msg.topic)
                            && act.id != msg.publisher_id
                        {
                            Self::send_text(ctx, msg.json);
                            metrics::RELAY_MESSAGES_DELIVERED_TOTAL.inc();
                            debug!(client_id = %act.id, topic = %msg.topic, "delivered broadcast message");
                        }
                    }
                    // If None, channel closed — stop polling.
                })
                .wait(ctx),
        );
    }

    /// Helper: receive one message from the broadcast channel.
    fn recv_once(
        mut rx: broadcast::Receiver<BroadcastMessage>,
    ) -> impl Future<Output = Option<(BroadcastMessage, broadcast::Receiver<BroadcastMessage>)>> {
        async move {
            match rx.recv().await {
                Ok(msg) => Some((msg, rx)),
                Err(broadcast::error::RecvError::Closed) => None,
                Err(broadcast::error::RecvError::Lagged(_)) => {
                    // Receiver fell behind; skip this message and continue listening.
                    Some((
                        BroadcastMessage {
                            topic: String::new(),
                            json: String::new(),
                            publisher_id: String::new(),
                        },
                        rx,
                    ))
                }
            }
        }
    }

    /// Send a text frame to the client.
    fn send_text(ctx: &mut <Self as Actor>::Context, text: String) {
        ctx.text(text);
    }

    /// Handle subscribe: register the client for a topic.
    async fn do_subscribe(
        redis: &ConnectionManager,
        shared_subs: &Arc<Mutex<HashMap<String, Vec<String>>>>,
        client_id: &str,
        topic: &str,
    ) {
        // Add to shared subscription map
        {
            let mut subs = shared_subs.lock().await;
            subs.entry(topic.to_string())
                .or_default()
                .push(client_id.to_string());
        }

        // Track session in Redis with 30-day TTL
        let session_key = format!("session:{}", topic);
        let now_ms = crate::now_ms();
        if let Err(e) = redis
            .set_ex(
                &session_key,
                serde_json::to_string(&json!({
                    "connected_at": now_ms,
                    "client_id": client_id,
                }))
                .unwrap_or_default(),
                30 * 24 * 3600u64,
            )
            .await
        {
            warn!(error = %e, "failed to store session in redis");
        }

        // Track subscriber set in Redis
        let subs_key = format!("topic:{}:subs", topic);
        let _ = redis.sadd(&subs_key, client_id).await;
    }

    /// Handle unsubscribe: deregister the client from a topic.
    async fn do_unsubscribe(
        redis: &ConnectionManager,
        shared_subs: &Arc<Mutex<HashMap<String, Vec<String>>>>,
        client_id: &str,
        topic: &str,
    ) {
        {
            let mut subs = shared_subs.lock().await;
            if let Some(clients) = subs.get_mut(topic) {
                clients.retain(|id| id != client_id);
            }
        }

        let subs_key = format!("topic:{}:subs", topic);
        let _ = redis.srem(&subs_key, client_id).await;
    }

    /// Handle publish: route a message to all topic subscribers.
    ///
    /// 1. Deliver locally via the broadcast channel (for same-instance subscribers).
    /// 2. Publish to Redis Pub/Sub (for cross-instance subscribers).
    async fn do_publish(
        state: &AppState,
        shared_subs: &Arc<Mutex<HashMap<String, Vec<String>>>>,
        client_id: &str,
        topic: &str,
        payload: &str,
    ) {
        let message = RelayMessage {
            msg_type: MessageType::Message,
            topic: topic.to_string(),
            payload: payload.to_string(),
            tag: None,
            id: Some(uuid::Uuid::new_v4().to_string()),
            timestamp: crate::now_ms(),
        };

        let json_str = serde_json::to_string(&message).unwrap_or_default();
        let payload_size = payload.len();

        metrics::RELAY_MESSAGES_PUBLISHED_TOTAL.inc();
        metrics::RELAY_MESSAGE_SIZE
            .observe(payload_size as f64);

        // 1. Deliver locally via broadcast channel.
        let bm = BroadcastMessage {
            topic: topic.to_string(),
            json: json_str.clone(),
            publisher_id: client_id.to_string(),
        };

        match state.broadcast_tx.send(bm) {
            Ok(receivers) => {
                debug!(topic, from = %client_id, receivers, "broadcast delivery to local receivers");
            }
            Err(e) => {
                debug!(topic, from = %client_id, error = %e, "no local receivers");
            }
        }

        // 2. Cross-instance delivery via Redis Pub/Sub.
        let channel = format!("topic:{}", topic);
        if let Err(e) = state.redis.publish(&channel, &json_str).await {
            warn!(error = %e, "failed to publish to redis");
            metrics::RELAY_PUBLISH_ERRORS_TOTAL.inc();
        }

        // Log delivery confirmations
        {
            let subs = shared_subs.lock().await;
            let subscriber_count = subs.get(topic).map_or(0, |v| v.len());
            info!(
                topic,
                from = %client_id,
                local_subscribers = subscriber_count,
                "message published with delivery confirmation"
            );
        }
    }
}

impl Actor for RelaySession {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        info!(client_id = %self.id, "websocket connection established");
        // Set max frame size from config
        ctx.set_max_frame_size(self.state.config.max_message_size_bytes);
        self.heartbeat(ctx);
        self.start_broadcast_listener(ctx);
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        info!(client_id = %self.id, "websocket connection closed");
        metrics::RELAY_ACTIVE_CONNECTIONS.dec();

        // Clean up all subscriptions
        let state = self.state.clone();
        let id = self.id.clone();
        let topics: Vec<String> = self.subscriptions.iter().cloned().collect();

        actix::spawn(async move {
            let mut subs = state.subscriptions.lock().await;
            for topic in &topics {
                if let Some(clients) = subs.get_mut(topic) {
                    clients.retain(|cid| cid != &id);
                }
                let subs_key = format!("topic:{}:subs", topic);
                let _ = state.redis.srem(&subs_key, &id).await;
            }
        });
    }
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for RelaySession {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Ping(n)) => {
                self.hb = Instant::now();
                ctx.pong(&n);
            }
            Ok(ws::Message::Pong(_)) => {
                self.hb = Instant::now();
            }
            Ok(ws::Message::Text(text)) => {
                let text = text.to_string();

                // --- Message size limit ---
                if text.len() > self.state.config.max_message_size_bytes {
                    metrics::RELAY_MESSAGE_SIZE_EXCEEDED_TOTAL.inc();
                    Self::send_text(
                        ctx,
                        serde_json::to_string(&json!({
                            "type": "error",
                            "message": "message too large",
                            "code": 413,
                        }))
                        .unwrap_or_default(),
                    );
                    return;
                }

                let id = self.id.clone();
                let state = self.state.clone();

                // Parse the message synchronously
                let relay_msg = match RelayMessage::from_json(&text) {
                    Ok(m) => m,
                    Err(e) => {
                        warn!(client_id = %id, error = %e, "invalid json");
                        metrics::RELAY_PARSE_ERRORS_TOTAL.inc();
                        Self::send_text(
                            ctx,
                            serde_json::to_string(&json!({
                                "type": "error",
                                "message": format!("invalid json: {}", e),
                                "code": 400,
                            }))
                            .unwrap_or_default(),
                        );
                        return;
                    }
                };

                match relay_msg.msg_type {
                    MessageType::Subscribe => {
                        if let Err(e) = validate_topic(&relay_msg.topic) {
                            Self::send_text(
                                ctx,
                                serde_json::to_string(&json!({
                                    "type": "error",
                                    "message": e,
                                    "code": 400,
                                }))
                                .unwrap_or_default(),
                            );
                            return;
                        }
                        if !self.subscriptions.contains(&relay_msg.topic) {
                            self.subscriptions.insert(relay_msg.topic.clone());
                            metrics::RELAY_SUBSCRIPTIONS_TOTAL.inc();
                            metrics::RELAY_ACTIVE_SUBSCRIPTIONS.inc();
                        }

                        // Touch topic for expiration tracking
                        let state_clone = self.state.clone();
                        let topic = relay_msg.topic.clone();
                        actix::spawn(async move {
                            state_clone.touch_topic(&topic).await;
                        });

                        let redis = state.redis.clone();
                        let shared_subs = state.subscriptions.clone();
                        let client_id = id.clone();
                        let topic = relay_msg.topic.clone();

                        Self::send_text(
                            ctx,
                            serde_json::to_string(&json!({
                                "type": "ack",
                                "topic": topic,
                            }))
                            .unwrap_or_default(),
                        );

                        actix::spawn(async move {
                            Self::do_subscribe(&redis, &shared_subs, &client_id, &topic).await;
                            info!(client_id = %client_id, topic, "subscribed");
                        });
                    }
                    MessageType::Unsubscribe => {
                        if let Err(e) = validate_topic(&relay_msg.topic) {
                            Self::send_text(
                                ctx,
                                serde_json::to_string(&json!({
                                    "type": "error",
                                    "message": e,
                                    "code": 400,
                                }))
                                .unwrap_or_default(),
                            );
                            return;
                        }
                        self.subscriptions.remove(&relay_msg.topic);
                        metrics::RELAY_ACTIVE_SUBSCRIPTIONS.dec();

                        let redis = state.redis.clone();
                        let shared_subs = state.subscriptions.clone();
                        let client_id = id.clone();
                        let topic = relay_msg.topic.clone();

                        Self::send_text(
                            ctx,
                            serde_json::to_string(&json!({
                                "type": "ack",
                                "topic": topic,
                            }))
                            .unwrap_or_default(),
                        );

                        actix::spawn(async move {
                            Self::do_unsubscribe(&redis, &shared_subs, &client_id, &topic).await;
                            info!(client_id = %client_id, topic, "unsubscribed");
                        });
                    }
                    MessageType::Publish => {
                        if let Err(e) = validate_topic(&relay_msg.topic) {
                            Self::send_text(
                                ctx,
                                serde_json::to_string(&json!({
                                    "type": "error",
                                    "message": e,
                                    "code": 400,
                                }))
                                .unwrap_or_default(),
                            );
                            return;
                        }

                        let state = state.clone();
                        let shared_subs = state.subscriptions.clone();
                        let client_id = id.clone();
                        let topic = relay_msg.topic.clone();
                        let payload = relay_msg.payload.clone();

                        Self::send_text(
                            ctx,
                            serde_json::to_string(&json!({
                                "type": "ack",
                                "topic": topic,
                            }))
                            .unwrap_or_default(),
                        );

                        actix::spawn(async move {
                            Self::do_publish(&state, &shared_subs, &client_id, &topic, &payload)
                                .await;
                        });
                    }
                    MessageType::Ping => {
                        Self::send_text(
                            ctx,
                            serde_json::to_string(&json!({
                                "type": "pong",
                                "timestamp": crate::now_ms(),
                            }))
                            .unwrap_or_default(),
                        );
                    }
                    _ => {
                        warn!(client_id = %id, msg_type = ?relay_msg.msg_type, "unexpected message type");
                    }
                }
            }
            Ok(ws::Message::Binary(_bin)) => {
                Self::send_text(
                    ctx,
                    serde_json::to_string(&json!({
                        "type": "error",
                        "message": "binary messages not supported",
                        "code": 400,
                    }))
                    .unwrap_or_default(),
                );
            }
            Ok(ws::Message::Close(reason)) => {
                info!(client_id = %self.id, reason = ?reason, "client closed connection");
                ctx.stop();
            }
            Err(e) => {
                error!(client_id = %self.id, error = %e, "protocol error");
                metrics::RELAY_PROTOCOL_ERRORS_TOTAL.inc();
                ctx.stop();
            }
        }
    }
}
