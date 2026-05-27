//! CinaConnect ERC-4337 Bundler
//!
//! Production-grade bundler for ERC-4337 UserOperations. Accepts UserOps via JSON-RPC,
//! validates and simulates them, pools them in a reputation-aware priority mempool,
//! and bundles them into EntryPoint `handleOps` transactions.
//!
//! # Quick Start (YAML config)
//!
//! ```bash
//! cp config.yaml.example config.yaml
//! # Edit config.yaml with your settings
//! cargo run -- --config config.yaml
//! ```
//!
//! # Quick Start (env vars, backward-compatible)
//!
//! ```bash
//! export ENTRY_POINT_ADDRESS=0x0000000071727De22E5E9d8BAf0edAc6f37da032
//! export BUNDLER_BENEFICIARY=0x...
//! export RPC_URL=https://ethereum-rpc.publicnode.com
//! export SIGNER_PRIVATE_KEY=0x...
//! cargo run
//! ```

mod bundler;
mod config;
mod gas_oracle;
mod mempool;
mod metrics;
mod reputation;
mod rpc;
mod signer;
mod types;
mod validation;

#[cfg(test)]
mod tests;

use config::BundlerConfig;
use metrics::Metrics;
use tracing::{info, Level};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "cinacoin_bundler=info,tower_http=info".into()),
        )
        .init();

    // Load config: try YAML first, fall back to env vars
    let config = BundlerConfig::from_file("config.yaml")
        .or_else(|e| {
            tracing::warn!(error = %e, "Failed to load config.yaml, falling back to env vars");
            BundlerConfig::from_env()
        })?;

    info!(
        entry_point = %config.entry_point_address,
        beneficiary = %config.beneficiary(),
        chain_id = config.chain_id,
        rpc_url = %config.rpc_url,
        "Starting CinaConnect Bundler"
    );

    // Initialise metrics
    let metrics = Metrics::new();

    // Initialise gas oracle
    let gas_oracle = gas_oracle::GasOracle::new(&config.rpc_url).await?;

    // Initialise mempool with reputation config
    let mempool = mempool::UserOpPool::new(&config.redis_url, config.reputation.clone()).await;

    // Instantiate the bundler core
    let bundler = bundler::Bundler::new(
        config.clone(),
        mempool,
        gas_oracle,
        std::sync::Arc::new(metrics.clone()),
    ).await?;

    // Start the bundling loop
    let bundler_clone = bundler.clone();
    let bundle_interval = config.bundle_interval_ms;
    let metrics_clone = metrics.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_millis(bundle_interval));
        loop {
            interval.tick().await;
            bundler_clone.update_metrics();
            if let Err(e) = bundler_clone.maybe_bundle().await {
                tracing::error!(error = %e, "Bundle attempt failed");
            }
        }
    });

    // Start JSON-RPC / HTTP server with health and metrics endpoints
    rpc::serve(config.clone(), bundler, metrics).await?;

    Ok(())
}
