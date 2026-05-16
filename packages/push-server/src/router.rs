use axum::{routing, Router};

use crate::handler;
use crate::AppState;

/// Build the application router with all routes.
pub fn create_router() -> Router<AppState> {
    Router::new()
        .route("/v1/push", routing::post(handler::push))
        .route("/v1/register", routing::post(handler::register))
        .route("/v1/health", routing::get(handler::health))
        .route("/metrics", routing::get(handler::metrics_handler))
}
