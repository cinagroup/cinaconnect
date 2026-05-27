//! Health check endpoints with dependency status reporting.

use crate::config::Config;
use crate::metrics::init as init_metrics;
use actix_web::{web, HttpResponse, Responder};
use serde::Serialize;

pub use crate::metrics::{Metrics, UptimeTracker};

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub uptime_secs: u64,
    pub region: String,
    pub dependencies: DependencyStatus,
    pub timestamp: String,
}

#[derive(Serialize)]
pub struct DependencyStatus {
    pub redis: DependencyHealth,
    pub nats: Option<DependencyHealth>,
    pub database: Option<DependencyHealth>,
}

#[derive(Serialize)]
pub struct DependencyHealth {
    pub status: String, // "healthy" | "degraded" | "unhealthy"
    pub latency_ms: Option<f64>,
    pub details: Option<String>,
}

/// GET /v1/health — Health check service route.
#[actix_web::get("/v1/health")]
pub async fn health(
    config: web::Data<Config>,
    start_time: web::Data<std::time::Instant>,
    region: web::Data<String>,
    project_id: web::Data<String>,
) -> impl Responder {
    let uptime = start_time.elapsed().as_secs();

    // Check Redis
    let redis_health = check_redis(&config.redis_url).await;

    // Check NATS (if configured)
    let nats_health = if config.nats_url.is_some() {
        Some(check_nats(config.nats_url.as_ref().unwrap()).await)
    } else {
        None
    };

    // Check database (if session persistence enabled)
    let db_health = if config.session_persistence_enabled && config.database_url.is_some() {
        Some(check_database(config.database_url.as_ref().unwrap()).await)
    } else {
        None
    };

    // Determine overall status
    let all_healthy = redis_health.status == "healthy"
        && nats_health
            .as_ref()
            .map(|h| h.status == "healthy" || h.status == "unconfigured")
            .unwrap_or(true)
        && db_health
            .as_ref()
            .map(|h| h.status == "healthy" || h.status == "unconfigured")
            .unwrap_or(true);

    let status = if all_healthy {
        "healthy"
    } else {
        "degraded"
    };

    HttpResponse::Ok().json(HealthResponse {
        status: status.to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime_secs: uptime,
        region: region.get_ref().clone(),
        dependencies: DependencyStatus {
            redis: redis_health,
            nats: nats_health,
            database: db_health,
        },
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

/// GET /metrics — Prometheus metrics scrape endpoint.
#[actix_web::get("/metrics")]
pub async fn metrics() -> impl Responder {
    use prometheus::Encoder;
    let encoder = prometheus::TextEncoder::new();
    let mut buffer = Vec::new();
    encoder
        .encode(&prometheus::gather(), &mut buffer)
        .unwrap_or_default();
    HttpResponse::Ok()
        .content_type("text/plain; version=0.0.4")
        .body(buffer)
}

/// POST /v1/pairing — Create a pairing URI.
#[actix_web::post("/v1/pairing")]
pub async fn create_pairing(project_id: web::Data<String>) -> impl Responder {
    let pairing_id = uuid::Uuid::new_v4().to_string();
    HttpResponse::Ok().json(serde_json::json!({
        "pairing_uri": format!("wc:{}@2?relay-protocol=wss&relay-url=wss://{}", pairing_id, project_id.as_str()),
        "pairing_id": pairing_id,
    }))
}

async fn check_redis(redis_url: &str) -> DependencyHealth {
    let start = std::time::Instant::now();
    match redis::Client::open(redis_url) {
        Ok(client) => match client.get_multiplexed_async_connection().await {
            Ok(mut conn) => {
                let result: redis::RedisResult<()> =
                    redis::cmd("PING").query_async(&mut conn).await;
                let latency = start.elapsed().as_secs_f64() * 1000.0;
                match result {
                    Ok(_) => DependencyHealth {
                        status: "healthy".to_string(),
                        latency_ms: Some(latency),
                        details: None,
                    },
                    Err(e) => DependencyHealth {
                        status: "unhealthy".to_string(),
                        latency_ms: Some(latency),
                        details: Some(format!("PING failed: {}", e)),
                    },
                }
            }
            Err(e) => DependencyHealth {
                status: "unhealthy".to_string(),
                latency_ms: None,
                details: Some(format!("Connection failed: {}", e)),
            },
        },
        Err(e) => DependencyHealth {
            status: "unhealthy".to_string(),
            latency_ms: None,
            details: Some(format!("Client error: {}", e)),
        },
    }
}

async fn check_nats(nats_url: &str) -> DependencyHealth {
    let start = std::time::Instant::now();
    match async_nats::ConnectOptions::new()
        .connect(nats_url)
        .await
    {
        Ok(client) => {
            let latency = start.elapsed().as_secs_f64() * 1000.0;
            // Verify the connection is actually usable
            if client.is_connected() {
                DependencyHealth {
                    status: "healthy".to_string(),
                    latency_ms: Some(latency),
                    details: None,
                }
            } else {
                DependencyHealth {
                    status: "degraded".to_string(),
                    latency_ms: Some(latency),
                    details: Some("NATS connected but not ready".to_string()),
                }
            }
        }
        Err(e) => DependencyHealth {
            status: "unhealthy".to_string(),
            latency_ms: None,
            details: Some(format!("NATS connection failed: {}", e)),
        },
    }
}

async fn check_database(database_url: &str) -> DependencyHealth {
    let start = std::time::Instant::now();
    match sqlx::PgPool::connect(database_url).await {
        Ok(pool) => {
            let result = sqlx::query("SELECT 1").execute(&pool).await;
            let latency = start.elapsed().as_secs_f64() * 1000.0;
            match result {
                Ok(_) => DependencyHealth {
                    status: "healthy".to_string(),
                    latency_ms: Some(latency),
                    details: None,
                },
                Err(e) => DependencyHealth {
                    status: "unhealthy".to_string(),
                    latency_ms: Some(latency),
                    details: Some(format!("Query failed: {}", e)),
                },
            }
        }
        Err(e) => DependencyHealth {
            status: "unhealthy".to_string(),
            latency_ms: None,
            details: Some(format!("Connection failed: {}", e)),
        },
    }
}

/// Initialize the relay-server metrics at startup.
pub fn init() {
    init_metrics();
}
