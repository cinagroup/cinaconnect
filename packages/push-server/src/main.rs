mod apns;
mod config;
mod fcm;
mod handler;
mod metrics;
mod router;
mod types;

use axum::Router;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

#[tokio::main]
async fn main() {
    metrics::init();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let config = config::Config::from_env();
    let state = handler::AppState {
        apns_client: apns::ApnsClient::new(&config),
        fcm_client: fcm::FcmClient::new(&config),
        redis_url: config.redis_url.clone(),
    };

    let app = Router::new()
        .merge(router::create_router())
        .with_state(state)
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive());

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("Push server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("failed to bind address");

    axum::serve(listener, app)
        .await
        .expect("server error");
}
