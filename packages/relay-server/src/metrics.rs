use lazy_static::lazy_static;
use prometheus::{IntCounter, IntGauge, Opts, Registry, Histogram, HistogramOpts};

lazy_static! {
    pub static ref REGISTRY: Registry = Registry::new();

    pub static ref RELAY_CONNECTIONS_TOTAL: IntCounter =
        IntCounter::with_opts(Opts::new(
            "relay_connections_total",
            "Total number of WebSocket connections established"
        )).unwrap();

    pub static ref RELAY_ACTIVE_CONNECTIONS: IntGauge =
        IntGauge::with_opts(Opts::new(
            "relay_active_connections",
            "Number of currently active WebSocket connections"
        )).unwrap();

    pub static ref RELAY_MESSAGES_PUBLISHED_TOTAL: IntCounter =
        IntCounter::with_opts(Opts::new(
            "relay_messages_published_total",
            "Total number of messages published to topics"
        )).unwrap();

    pub static ref RELAY_MESSAGES_DELIVERED_TOTAL: IntCounter =
        IntCounter::with_opts(Opts::new(
            "relay_messages_delivered_total",
            "Total number of messages delivered to subscribers"
        )).unwrap();

    pub static ref RELAY_SUBSCRIPTIONS_TOTAL: IntCounter =
        IntCounter::with_opts(Opts::new(
            "relay_subscriptions_total",
            "Total number of topic subscriptions created"
        )).unwrap();

    pub static ref RELAY_ACTIVE_SUBSCRIPTIONS: IntGauge =
        IntGauge::with_opts(Opts::new(
            "relay_active_subscriptions",
            "Number of currently active subscriptions"
        )).unwrap();

    pub static ref RELAY_TOPICS_EXPIRED_TOTAL: IntCounter =
        IntCounter::with_opts(Opts::new(
            "relay_topics_expired_total",
            "Total number of topics expired and cleaned up"
        )).unwrap();

    pub static ref RELAY_PUBLISH_ERRORS_TOTAL: IntCounter =
        IntCounter::with_opts(Opts::new(
            "relay_publish_errors_total",
            "Total number of publish errors"
        )).unwrap();

    pub static ref RELAY_PROTOCOL_ERRORS_TOTAL: IntCounter =
        IntCounter::with_opts(Opts::new(
            "relay_protocol_errors_total",
            "Total number of WebSocket protocol errors"
        )).unwrap();

    pub static ref RELAY_PARSE_ERRORS_TOTAL: IntCounter =
        IntCounter::with_opts(Opts::new(
            "relay_parse_errors_total",
            "Total number of JSON parse errors"
        )).unwrap();

    pub static ref RELAY_MESSAGE_SIZE_EXCEEDED_TOTAL: IntCounter =
        IntCounter::with_opts(Opts::new(
            "relay_message_size_exceeded_total",
            "Total number of messages exceeding size limit"
        )).unwrap();

    pub static ref RELAY_RATE_LIMITED_TOTAL: IntCounter =
        IntCounter::with_opts(Opts::new(
            "relay_rate_limited_total",
            "Total number of rate-limited connection attempts"
        )).unwrap();

    pub static ref RELAY_MESSAGE_SIZE: Histogram =
        Histogram::with_opts(HistogramOpts::new(
            "relay_message_size_bytes",
            "Distribution of message sizes in bytes"
        )).unwrap();
}

/// Register all metrics with the global registry.
pub fn init() {
    REGISTRY.register(Box::new(RELAY_CONNECTIONS_TOTAL.clone())).unwrap();
    REGISTRY.register(Box::new(RELAY_ACTIVE_CONNECTIONS.clone())).unwrap();
    REGISTRY.register(Box::new(RELAY_MESSAGES_PUBLISHED_TOTAL.clone())).unwrap();
    REGISTRY.register(Box::new(RELAY_MESSAGES_DELIVERED_TOTAL.clone())).unwrap();
    REGISTRY.register(Box::new(RELAY_SUBSCRIPTIONS_TOTAL.clone())).unwrap();
    REGISTRY.register(Box::new(RELAY_ACTIVE_SUBSCRIPTIONS.clone())).unwrap();
    REGISTRY.register(Box::new(RELAY_TOPICS_EXPIRED_TOTAL.clone())).unwrap();
    REGISTRY.register(Box::new(RELAY_PUBLISH_ERRORS_TOTAL.clone())).unwrap();
    REGISTRY.register(Box::new(RELAY_PROTOCOL_ERRORS_TOTAL.clone())).unwrap();
    REGISTRY.register(Box::new(RELAY_PARSE_ERRORS_TOTAL.clone())).unwrap();
    REGISTRY.register(Box::new(RELAY_MESSAGE_SIZE_EXCEEDED_TOTAL.clone())).unwrap();
    REGISTRY.register(Box::new(RELAY_RATE_LIMITED_TOTAL.clone())).unwrap();
    REGISTRY.register(Box::new(RELAY_MESSAGE_SIZE.clone())).unwrap();
}

/// Metrics helper for HTTP handler state.
#[derive(Clone)]
pub struct Metrics {
    pub total_connections: u64,
}

impl Metrics {
    pub fn new() -> Self {
        Self { total_connections: 0 }
    }

    pub fn inc_connections(&mut self) {
        self.total_connections += 1;
    }
}

/// Tracks server uptime.
pub struct UptimeTracker {
    pub start: std::time::Instant,
}

impl UptimeTracker {
    pub fn new() -> Self {
        Self { start: std::time::Instant::now() }
    }
}
