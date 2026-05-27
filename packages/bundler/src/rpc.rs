//! JSON-RPC + HTTP server for the bundler.
//!
//! Implements the ERC-4337 bundler API plus operational endpoints:
//! - eth_sendUserOperation
//! - eth_estimateUserOperationGas
//! - eth_getUserOperationByHash
//! - eth_getUserOperationReceipt
//! - eth_supportedEntryPoints
//! - GET /health — health check
//! - GET /metrics — Prometheus metrics

use crate::bundler::Bundler;
use crate::config::BundlerConfig;
use crate::metrics::Metrics;
use crate::types::{UserOpReceipt, UserOpStatus, UserOperation};
use alloy_primitives::{B256, U256};
use axum::{
    extract::State,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use tracing::info;

/// JSON-RPC request envelope.
#[derive(Debug, Deserialize)]
pub struct RpcRequest {
    pub jsonrpc: String,
    pub id: Option<Value>,
    pub method: String,
    pub params: Option<Vec<Value>>,
}

/// JSON-RPC response envelope.
#[derive(Debug, Serialize)]
pub struct RpcResponse {
    pub jsonrpc: String,
    pub id: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<RpcError>,
}

#[derive(Debug, Serialize)]
pub struct RpcError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

/// Health check response.
#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub pending_ops: usize,
    pub uptime_seconds: u64,
}

/// App state shared across handlers.
pub struct AppState {
    pub bundler: Bundler,
    pub config: BundlerConfig,
    pub metrics: Metrics,
    pub start_time: std::time::Instant,
}

/// Start the JSON-RPC HTTP server with health and metrics endpoints.
pub async fn serve(
    config: BundlerConfig,
    bundler: Bundler,
    metrics: Metrics,
) -> Result<(), std::io::Error> {
    let state = Arc::new(AppState {
        bundler,
        config: config.clone(),
        metrics: metrics.clone(),
        start_time: std::time::Instant::now(),
    });

    // Build the router
    let mut app = Router::new()
        .route("/", post(handle_rpc))
        // Health check endpoint
        .route(&config.health.path, get(health_check))
        // Prometheus metrics endpoint
        .route(&config.metrics.path, get(metrics_endpoint))
        .with_state(state);

    // Add CORS middleware
    app = app.layer(
        tower_http::cors::CorsLayer::permissive(),
    );

    info!(addr = %config.listen_addr, "Starting bundler RPC server");

    let listener = tokio::net::TcpListener::bind(&config.listen_addr).await?;
    axum::serve(listener, app).await
}

/// Testable entry point: handle a single RPC request (used in tests).
pub async fn handle_rpc_request(state: &AppState, request: RpcRequest) -> RpcResponse {
    let start = std::time::Instant::now();
    let method = request.method.clone();

    let result = match request.method.as_str() {
        "eth_sendUserOperation" => rpc_send_user_op(state, request.params).await,
        "eth_estimateUserOperationGas" => rpc_estimate_gas(state, request.params).await,
        "eth_getUserOperationByHash" => rpc_get_user_op_by_hash(state, request.params).await,
        "eth_getUserOperationReceipt" => rpc_get_receipt(state, request.params).await,
        "eth_supportedEntryPoints" => rpc_supported_entry_points(state),
        "cinacoin_getBundlerConfig" => rpc_get_config(state),
        "cinacoin_getReputationStats" => rpc_reputation_stats(state).await,
        "web3_clientVersion" => rpc_client_version(),
        _ => {
            state.metrics.record_rpc(&method, "error", start.elapsed().as_secs_f64());
            return RpcResponse {
                jsonrpc: "2.0".into(),
                id: request.id,
                result: None,
                error: Some(RpcError {
                    code: -32601,
                    message: "Method not found".into(),
                    data: None,
                }),
            };
        }
    };

    let status = if result.is_ok() { "ok" } else { "error" };
    state.metrics.record_rpc(&method, status, start.elapsed().as_secs_f64());

    match result {
        Ok(value) => RpcResponse {
            jsonrpc: "2.0".into(),
            id: request.id,
            result: Some(value),
            error: None,
        },
        Err(e) => RpcResponse {
            jsonrpc: "2.0".into(),
            id: request.id,
            result: None,
            error: Some(RpcError {
                code: -32603,
                message: e.to_string(),
                data: None,
            }),
        },
    }
}

/// Health check handler.
async fn health_check(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let pending = state.bundler.mempool.pending_count().await;
    let uptime = state.start_time.elapsed().as_secs();

    let response = HealthResponse {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        pending_ops: pending,
        uptime_seconds: uptime,
    };

    Json(response)
}

/// Prometheus metrics handler.
async fn metrics_endpoint(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    // Update gauges before encoding
    state.bundler.update_metrics();

    let body = state.metrics.encode();
    (
        [(axum::http::header::CONTENT_TYPE, "text/plain; version=0.0.4; charset=utf-8")],
        body,
    )
}

/// Handle incoming JSON-RPC requests.
async fn handle_rpc(
    State(state): State<Arc<AppState>>,
    Json(request): Json<RpcRequest>,
) -> Json<RpcResponse> {
    let start = std::time::Instant::now();
    let method = request.method.clone();

    let result = match request.method.as_str() {
        "eth_sendUserOperation" => rpc_send_user_op(&state, request.params).await,
        "eth_estimateUserOperationGas" => rpc_estimate_gas(&state, request.params).await,
        "eth_getUserOperationByHash" => rpc_get_user_op_by_hash(&state, request.params).await,
        "eth_getUserOperationReceipt" => rpc_get_receipt(&state, request.params).await,
        "eth_supportedEntryPoints" => rpc_supported_entry_points(&state),
        "cinacoin_getBundlerConfig" => rpc_get_config(&state),
        "cinacoin_getReputationStats" => rpc_reputation_stats(&state),
        "web3_clientVersion" => rpc_client_version(),
        _ => {
            state.metrics.record_rpc(&method, "error", start.elapsed().as_secs_f64());
            return Json(RpcResponse {
                jsonrpc: "2.0".into(),
                id: request.id,
                result: None,
                error: Some(RpcError {
                    code: -32601,
                    message: "Method not found".into(),
                    data: None,
                }),
            });
        }
    };

    let status = if result.is_ok() { "ok" } else { "error" };
    state.metrics.record_rpc(&method, status, start.elapsed().as_secs_f64());

    match result {
        Ok(value) => Json(RpcResponse {
            jsonrpc: "2.0".into(),
            id: request.id,
            result: Some(value),
            error: None,
        }),
        Err(e) => Json(RpcResponse {
            jsonrpc: "2.0".into(),
            id: request.id,
            result: None,
            error: Some(RpcError {
                code: -32603,
                message: e.to_string(),
                data: None,
            }),
        }),
    }
}

async fn rpc_send_user_op(
    state: &AppState,
    params: Option<Vec<Value>>,
) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
    let params = params.ok_or("missing params")?;
    let user_op: UserOperation = serde_json::from_value(params[0].clone())?;

    let hash = state
        .bundler
        .submit_user_op(user_op)
        .await
        .map_err(|e| format!("failed to submit: {e}"))?;

    Ok(serde_json::to_value(format!("{hash:#x}"))?)
}

async fn rpc_estimate_gas(
    state: &AppState,
    params: Option<Vec<Value>>,
) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
    let params = params.ok_or("missing params")?;
    let user_op: UserOperation = serde_json::from_value(params[0].clone())?;

    let estimation = state
        .bundler
        .estimate_gas(&user_op)
        .await
        .map_err(|e| format!("failed to estimate: {e}"))?;

    Ok(serde_json::to_value(estimation)?)
}

async fn rpc_get_user_op_by_hash(
    state: &AppState,
    params: Option<Vec<Value>>,
) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
    let params = params.ok_or("missing params")?;
    let hash_str = params[0].as_str().ok_or("invalid hash parameter")?;
    let hash: B256 = hash_str.parse().map_err(|_| "invalid hash")?;

    match state.bundler.mempool.get(&hash).await {
        Some(tracked) => Ok(serde_json::to_value(tracked.user_op)?),
        None => Ok(Value::Null),
    }
}

async fn rpc_get_receipt(
    state: &AppState,
    params: Option<Vec<Value>>,
) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
    let params = params.ok_or("missing params")?;
    let hash_str = params[0].as_str().ok_or("invalid hash parameter")?;
    let hash: B256 = hash_str.parse().map_err(|_| "invalid hash")?;

    match state.bundler.mempool.get(&hash).await {
        Some(tracked) => {
            let receipt = UserOpReceipt {
                user_op_hash: tracked.hash,
                sender: tracked.user_op.sender,
                nonce: tracked.user_op.nonce,
                actual_gas_cost: U256::ZERO,
                actual_gas_used: U256::ZERO,
                success: tracked.status == UserOpStatus::Included,
                logs: vec![],
                receipt: serde_json::Value::Null,
            };
            Ok(serde_json::to_value(receipt)?)
        }
        None => Ok(Value::Null),
    }
}

fn rpc_supported_entry_points(state: &AppState) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
    let eps: Vec<String> = state
        .bundler
        .supported_entry_points()
        .into_iter()
        .map(|addr| format!("{addr:#x}"))
        .collect();
    Ok(serde_json::to_value(eps)?)
}

/// Return the current bundler configuration (redacted).
fn rpc_get_config(state: &AppState) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
    let config = &state.config;
    let mut obj = serde_json::Map::new();
    obj.insert("chain_id".into(), config.chain_id.into());
    obj.insert("entry_point".into(), format!("{:#x}", config.entry_point_address).into());
    obj.insert("max_ops_per_bundle".into(), config.max_ops_per_bundle.into());
    obj.insert("simulation_enabled".into(), config.simulation.enabled.into());
    obj.insert("metrics_enabled".into(), config.metrics.enabled.into());
    obj.insert("health_enabled".into(), config.health.enabled.into());
    // Don't expose private key or beneficiary
    Ok(Value::Object(obj))
}

/// Return reputation stats for all known senders.
async fn rpc_reputation_stats(
    state: &AppState,
    _params: Option<Vec<Value>>,
) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
    let stats = state.bundler.mempool.reputation.stats().await;
    let arr: Vec<Value> = stats.into_iter().map(|(addr, rep)| {
        serde_json::json!({
            "sender": format!("{:#x}", addr),
            "score": rep.score,
            "violations": rep.violations,
            "successes": rep.successes,
        })
    }).collect();
    Ok(Value::Array(arr))
}

fn rpc_client_version() -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
    Ok(serde_json::to_value("cinacoin-bundler/0.2.0")?)
}
