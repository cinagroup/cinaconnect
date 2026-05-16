use lazy_static::lazy_static;
use prometheus::{IntCounterVec, Opts, Registry};

lazy_static! {
    static ref REGISTRY: Registry = Registry::new();

    /// Total number of push notifications sent (labelled by platform).
    pub static ref PUSH_SENT_TOTAL: IntCounterVec = IntCounterVec::new(
        Opts::new("push_sent_total", "Total push notifications sent"),
        &["platform"]
    )
    .unwrap();

    /// Total number of failed push notifications (labelled by platform).
    pub static ref PUSH_FAILED_TOTAL: IntCounterVec = IntCounterVec::new(
        Opts::new("push_failed_total", "Total push notifications that failed"),
        &["platform"]
    )
    .unwrap();
}

/// Register all metrics with the global registry.
fn register_metrics() {
    REGISTRY
        .register(Box::new(PUSH_SENT_TOTAL.clone()))
        .expect("Failed to register push_sent_total");
    REGISTRY
        .register(Box::new(PUSH_FAILED_TOTAL.clone()))
        .expect("Failed to register push_failed_total");
}

/// Record a successful push for the given platform.
pub fn record_push_sent(platform: &str) {
    PUSH_SENT_TOTAL.with_label_values(&[platform]).inc();
}

/// Record a failed push for the given platform.
pub fn record_push_failed(platform: &str) {
    PUSH_FAILED_TOTAL.with_label_values(&[platform]).inc();
}

/// Initialize metrics (call once at startup).
pub fn init() {
    register_metrics();
}
