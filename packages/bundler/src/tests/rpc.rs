//! JSON-RPC server tests for the bundler.
//!
//! Tests the RPC request/response handling:
//! - Method routing and error handling
//! - eth_sendUserOperation
//! - eth_estimateUserOperationGas
//! - eth_getUserOperationByHash
//! - eth_getUserOperationReceipt
//! - eth_supportedEntryPoints
//! - Custom methods (cinacoin_*)
//! - Method-not-found errors
//! - Health check endpoint
//! - Metrics endpoint

use crate::config::{BundlerConfig, ReputationConfig, SimulationConfig};
use crate::mempool::UserOpPool;
use crate::types::{UserOperation, UserOpStatus, TrackedUserOp};
use crate::bundler::Bundler;
use crate::metrics::Metrics;
use crate::rpc::{RpcRequest, RpcResponse, handle_rpc_request};
use alloy_primitives::{Address, B256, U256, Bytes};
use serde_json::json;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn make_user_op(sender: Address, max_fee: U256, max_priority_fee: U256, signature: Bytes) -> UserOperation {
    UserOperation {
        sender,
        nonce: U256::ZERO,
        init_code: Bytes::new(),
        call_data: Bytes::new(),
        call_gas_limit: U256::from(500_000u64),
        verification_gas_limit: U256::from(100_000u64),
        pre_verification_gas: U256::from(50_000u64),
        max_fee_per_gas: max_fee,
        max_priority_fee_per_gas: max_priority_fee,
        paymaster: Address::ZERO,
        paymaster_verification_gas_limit: U256::ZERO,
        paymaster_post_op_gas_limit: U256::ZERO,
        paymaster_data: Bytes::new(),
        signature,
    }
}

fn make_tracked(op: UserOperation) -> TrackedUserOp {
    TrackedUserOp {
        hash: B256::ZERO,
        user_op: op,
        status: UserOpStatus::Pending,
        received_at: chrono::Utc::now(),
        bundle_tx_hash: None,
    }
}

fn make_config() -> BundlerConfig {
    BundlerConfig {
        rpc_url: "http://localhost:8545".to_string(),
        chain_id: 1,
        entry_point_address: Address::ZERO,
        signer_private_key: String::new(),
        beneficiary: None,
        listen_addr: "0.0.0.0:3000".to_string(),
        max_ops_per_bundle: 128,
        bundle_interval_ms: 2000,
        bundle_timeout_ms: 5000,
        min_gas_limit: 21000,
        redis_url: String::new(),
        min_profit_margin_bps: 500,
        reputation: ReputationConfig::default(),
        blacklisted_senders: Default::default(),
        simulation: SimulationConfig {
            enabled: false,
            max_simulation_gas: 30_000_000,
        },
        metrics: crate::config::MetricsConfig::default(),
        health: crate::config::HealthConfig::default(),
    }
}

async fn make_test_state() -> crate::rpc::AppState {
    let config = make_config();
    let rep_config = ReputationConfig::default();
    let pool = UserOpPool::new("", rep_config).await;
    let gas_oracle = crate::gas_oracle::GasOracle::new("http://invalid-host-99999.example").await.unwrap();
    let metrics = Metrics::new();
    let bundler = Bundler::new(config.clone(), pool, gas_oracle, std::sync::Arc::new(metrics.clone())).await.unwrap();

    crate::rpc::AppState {
        bundler,
        config,
        metrics,
        start_time: std::time::Instant::now(),
    }
}

fn make_rpc_request(method: &str, params: Option<serde_json::Value>) -> RpcRequest {
    RpcRequest {
        jsonrpc: "2.0".to_string(),
        id: Some(json!(1)),
        method: method.to_string(),
        params: params.map(|p| vec![p]),
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[test]
fn rpc_method_not_found_returns_error() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let state = make_test_state().await;

        let request = make_rpc_request("eth_unknownMethod", None);
        let response = handle_rpc_request(&state, request).await;

        assert!(response.error.is_some());
        let err = response.error.unwrap();
        assert_eq!(err.code, -32601); // Method not found
    });
}

#[test]
fn rpc_supported_entry_points_returns_array() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let state = make_test_state().await;

        let request = make_rpc_request("eth_supportedEntryPoints", None);
        let response = handle_rpc_request(&state, request).await;

        assert!(response.result.is_some());
        let result = response.result.unwrap();
        assert!(result.is_array());
        assert_eq!(result.as_array().unwrap().len(), 1);
    });
}

#[test]
fn rpc_client_version_returns_string() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let state = make_test_state().await;

        let request = make_rpc_request("web3_clientVersion", None);
        let response = handle_rpc_request(&state, request).await;

        assert!(response.result.is_some());
        let result = response.result.unwrap();
        assert!(result.is_string());
    });
}

#[test]
fn rpc_get_config_returns_config() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let state = make_test_state().await;

        let request = make_rpc_request("cinacoin_getBundlerConfig", None);
        let response = handle_rpc_request(&state, request).await;

        assert!(response.result.is_some());
        let result = response.result.unwrap();
        assert!(result.is_object());

        let obj = result.as_object().unwrap();
        assert!(obj.contains_key("chain_id"));
        assert!(obj.contains_key("max_ops_per_bundle"));
        assert!(obj.contains_key("simulation_enabled"));
        // Sensitive fields should NOT be present
        assert!(!obj.contains_key("signer_private_key"));
    });
}

#[test]
fn rpc_reputation_stats_returns_array() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let state = make_test_state().await;

        let request = make_rpc_request("cinacoin_getReputationStats", None);
        let response = handle_rpc_request(&state, request).await;

        assert!(response.result.is_some());
        let result = response.result.unwrap();
        assert!(result.is_array());
    });
}

#[test]
fn rpc_missing_params_returns_error() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let state = make_test_state().await;

        let request = RpcRequest {
            jsonrpc: "2.0".to_string(),
            id: Some(json!(1)),
            method: "eth_sendUserOperation".to_string(),
            params: None, // Missing params
        };
        let response = handle_rpc_request(&state, request).await;

        assert!(response.error.is_some());
        let err = response.error.unwrap();
        assert_eq!(err.code, -32603); // Internal error
    });
}

#[test]
fn rpc_invalid_hash_returns_error() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let state = make_test_state().await;

        let request = make_rpc_request(
            "eth_getUserOperationByHash",
            Some(json!("not-a-valid-hash")),
        );
        let response = handle_rpc_request(&state, request).await;

        assert!(response.error.is_some());
    });
}

#[test]
fn rpc_get_user_op_by_hash_not_found_returns_null() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let state = make_test_state().await;

        let hash = format!("{:#x}", B256::random());
        let request = make_rpc_request(
            "eth_getUserOperationByHash",
            Some(json!(hash)),
        );
        let response = handle_rpc_request(&state, request).await;

        // Not found should return null (not an error)
        assert!(response.result.is_some());
        assert!(response.result.unwrap().is_null());
    });
}
