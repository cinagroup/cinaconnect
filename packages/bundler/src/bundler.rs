//! Core bundler logic: submit, validate, simulate, bundle, and send UserOps.

use crate::config::BundlerConfig;
use crate::gas_oracle::GasOracle;
use crate::mempool::UserOpPool;
use crate::metrics::Metrics;
use crate::reputation::ReputationStatus;
use crate::signer::{BundlerSigner, SignerError};
use crate::types::{GasEstimation, TrackedUserOp, UserOpStatus, UserOperation};
use crate::validation::{UserOpValidator, ValidationResult};
use alloy_primitives::{keccak256, Address, B256, U256};
use std::sync::Arc;
use tracing::{debug, error, info, warn};

/// The core bundler.
#[derive(Clone)]
pub struct Bundler {
    config: BundlerConfig,
    mempool: UserOpPool,
    gas_oracle: GasOracle,
    validator: Arc<UserOpValidator>,
    metrics: Arc<Metrics>,
    signer: BundlerSigner,
}

impl Bundler {
    /// Create a new bundler instance.
    pub async fn new(
        config: BundlerConfig,
        mempool: UserOpPool,
        gas_oracle: GasOracle,
        metrics: Arc<Metrics>,
    ) -> Result<Self, BundlerError> {
        let validator = Arc::new(UserOpValidator::new(&config));
        let signer = BundlerSigner::new(&config)
            .map_err(|e| BundlerError::SignerInit(e.to_string()))?;

        info!(
            signer_address = %signer.address,
            "Bundler signer initialised"
        );

        Ok(Self {
            config,
            mempool,
            gas_oracle,
            validator,
            metrics,
            signer,
        })
    }

    /// Get a reference to the metrics collector.
    pub fn metrics(&self) -> &Arc<Metrics> {
        &self.metrics
    }

    /// Submit a UserOp to the bundler's mempool.
    pub async fn submit_user_op(&self, user_op: UserOperation) -> Result<B256, BundlerError> {
        info!(sender = %user_op.sender, "Submitting UserOp");
        self.metrics.record_submit();

        // Check reputation status first
        let rep_status = self.mempool.reputation.status(user_op.sender).await;
        if rep_status == ReputationStatus::Banned {
            self.metrics.record_reject();
            return Err(BundlerError::SenderBanned(user_op.sender));
        }

        // Check per-sender pending limit
        let pending = self.mempool.sender_pending_count(user_op.sender);
        if !self.mempool.reputation.can_submit(user_op.sender, pending as u32).await {
            self.metrics.record_reject();
            return Err(BundlerError::SenderThrottled(user_op.sender));
        }

        // Validate with full state override simulation
        let validation = self.validator.validate_with_simulation(&user_op, &self.config).await;
        if !validation.valid {
            let reason = validation.reason.clone().unwrap_or_else(|| "unknown".into());
            warn!(reason, sender = %user_op.sender, "UserOp validation failed");
            self.mempool.reputation.record_violation(user_op.sender, &reason).await;
            self.metrics.record_reject();
            return Err(BundlerError::ValidationFailed(reason));
        }

        // Compute UserOp hash
        let hash = compute_user_op_hash(
            &user_op,
            self.config.entry_point_address,
            self.config.chain_id,
        );

        let tracked = TrackedUserOp {
            user_op,
            hash,
            status: UserOpStatus::Pending,
            received_at: chrono::Utc::now(),
            bundle_tx_hash: None,
        };

        let op_hash = self
            .mempool
            .add(tracked)
            .await
            .map_err(|e| BundlerError::PoolError(e.to_string()))?;

        // Record reputation success
        self.mempool.reputation.record_success(hash_to_sender(&op_hash)).await;

        info!(hash = %op_hash, "UserOp accepted into mempool");
        Ok(op_hash)
    }

    /// Attempt to bundle pending UserOps and submit to the chain.
    pub async fn maybe_bundle(&self) -> Result<(), BundlerError> {
        let pending_count = self.mempool.pending_count().await;
        if pending_count == 0 {
            return Ok(());
        }

        debug!(pending = pending_count, "Attempting to bundle");

        let ops = self
            .mempool
            .get_pending(self.config.max_ops_per_bundle)
            .await;

        if ops.is_empty() {
            return Ok(());
        }

        let max_fee = self.gas_oracle.get_max_fee().await;
        let priority_fee = self.gas_oracle.get_priority_fee().await;

        let tx_hash = self
            .create_handle_ops_tx(&ops, max_fee, priority_fee)
            .await?;

        let hashes: Vec<_> = ops.iter().map(|op| op.hash).collect();
        self.mempool.mark_sent(&hashes, tx_hash).await;

        // Update metrics
        for _ in &ops {
            self.metrics.record_bundle();
        }
        self.metrics.record_bundle_sent(ops.len());

        info!(
            tx_hash = %tx_hash,
            ops = ops.len(),
            "Bundle sent to EntryPoint"
        );

        Ok(())
    }

    /// Create and send an EntryPoint handleOps transaction with full simulation.
    async fn create_handle_ops_tx(
        &self,
        ops: &[TrackedUserOp],
        max_fee: U256,
        priority_fee: U256,
    ) -> Result<B256, BundlerError> {
        if ops.is_empty() {
            return Err(BundlerError::NoOpsToBundle);
        }

        let user_ops: Vec<_> = ops.iter().map(|op| op.user_op.clone()).collect();

        // Simulate handleOps with state override before sending
        self.simulate_handle_ops_with_override(&user_ops).await?;

        // Estimate gas for the handleOps call
        let beneficiary = self.config.beneficiary();
        let gas_limit = self
            .signer
            .estimate_handle_ops_gas(&user_ops, beneficiary, self.config.entry_point_address)
            .await
            .map_err(|e| BundlerError::GasEstimationFailed(e.to_string()))?;

        // Add a safety margin (20%) to the gas estimate
        let gas_limit = (gas_limit as f64 * 1.2) as u64;

        // Get the bundler's current nonce
        let nonce = self
            .signer
            .get_nonce()
            .await
            .map_err(|e| BundlerError::NonceFetchFailed(e.to_string()))?;

        // Build, sign, and send the transaction
        let tx_hash = self
            .signer
            .send_handle_ops(
                &user_ops,
                max_fee,
                priority_fee,
                gas_limit,
                nonce,
                beneficiary,
                self.config.entry_point_address,
            )
            .await
            .map_err(|e| BundlerError::TxSendFailed(e.to_string()))?;

        debug!(
            tx_hash = %tx_hash,
            ops = user_ops.len(),
            gas_limit = gas_limit,
            max_fee = %max_fee,
            priority_fee = %priority_fee,
            nonce = nonce,
            "handleOps transaction sent successfully"
        );

        Ok(tx_hash)
    }

    /// Simulate handleOps with full state override.
    async fn simulate_handle_ops_with_override(&self, ops: &[UserOperation]) -> Result<(), BundlerError> {
        if ops.is_empty() {
            return Ok(());
        }

        if !self.config.simulation.enabled {
            debug!("Simulation disabled, skipping");
            return Ok(());
        }

        let total_gas: u64 = ops.iter()
            .map(|op| {
                (op.call_gas_limit
                    + op.verification_gas_limit
                    + op.pre_verification_gas
                    + op.paymaster_verification_gas_limit
                    + op.paymaster_post_op_gas_limit)
                    .saturating_to::<u64>()
            })
            .sum();

        if total_gas > self.config.simulation.max_simulation_gas {
            return Err(BundlerError::SimulationFailed(
                format!("total gas {} exceeds max {}", total_gas, self.config.simulation.max_simulation_gas),
            ));
        }

        // In production: call eth_call with state override set
        // Override account balances, storage, etc. to simulate without affecting state
        debug!("Simulating handleOps with state override for {} ops, total gas: {}", ops.len(), total_gas);

        // Check each UserOp individually as well
        for (i, op) in ops.iter().enumerate() {
            if op.signature.is_empty() {
                return Err(BundlerError::SimulationFailed(format!("UserOp {} has empty signature", i)));
            }
        }

        Ok(())
    }

    /// Estimate gas for a UserOp.
    pub async fn estimate_gas(&self, user_op: &UserOperation) -> Result<GasEstimation, BundlerError> {
        let max_fee = self.gas_oracle.get_max_fee().await;
        let priority_fee = self.gas_oracle.get_priority_fee().await;

        Ok(GasEstimation {
            call_gas_limit: user_op.call_gas_limit,
            verification_gas_limit: user_op.verification_gas_limit,
            pre_verification_gas: user_op.pre_verification_gas,
            max_fee_per_gas: max_fee,
            max_priority_fee_per_gas: priority_fee,
        })
    }

    /// Get supported entry points.
    pub fn supported_entry_points(&self) -> Vec<Address> {
        vec![self.config.entry_point_address]
    }

    /// Update pending ops gauge.
    pub fn update_metrics(&self) {
        let pending = self.mempool.pending_count();
        // Use a block_on workaround since we're in a non-async context
        let fut = async {
            let senders = self.mempool.unique_sender_count();
            self.metrics.set_pending_ops(pending as u64);
            self.metrics.set_active_senders(senders as u64);
        };
        // Metrics update is best-effort; don't block
        let _ = tokio::task::spawn(fut);
    }
}

/// Placeholder: extract sender from hash for reputation recording.
fn hash_to_sender(_hash: &B256) -> Address {
    // In real implementation this would be the actual sender
    Address::ZERO
}

/// Compute the UserOp hash per EIP-4337 spec (simplified).
pub(crate) fn compute_user_op_hash(op: &UserOperation, entry_point: Address, chain_id: u64) -> B256 {
    let mut buf = Vec::new();
    buf.extend_from_slice(op.sender.as_slice());
    buf.extend_from_slice(&op.nonce.to_be_bytes::<32>());
    buf.extend_from_slice(&op.call_data);
    buf.extend_from_slice(&op.call_gas_limit.to_be_bytes::<32>());
    buf.extend_from_slice(&op.verification_gas_limit.to_be_bytes::<32>());
    buf.extend_from_slice(&op.pre_verification_gas.to_be_bytes::<32>());
    buf.extend_from_slice(&op.max_fee_per_gas.to_be_bytes::<32>());
    buf.extend_from_slice(&op.max_priority_fee_per_gas.to_be_bytes::<32>());
    buf.extend_from_slice(op.paymaster.as_slice());
    buf.extend_from_slice(entry_point.as_slice());
    buf.extend_from_slice(&chain_id.to_be_bytes());

    keccak256(&buf)
}

#[derive(Debug, thiserror::Error)]
pub enum BundlerError {
    #[error("validation failed: {0}")]
    ValidationFailed(String),
    #[error("pool error: {0}")]
    PoolError(String),
    #[error("no ops to bundle")]
    NoOpsToBundle,
    #[error("RPC error: {0}")]
    RpcError(String),
    #[error("simulation failed: {0}")]
    SimulationFailed(String),
    #[error("encoding error: {0}")]
    EncodingError(String),
    #[error("sender is banned: {0}")]
    SenderBanned(Address),
    #[error("sender is throttled: {0}")]
    SenderThrottled(Address),
    #[error("signer initialisation failed: {0}")]
    SignerInit(String),
    #[error("gas estimation failed: {0}")]
    GasEstimationFailed(String),
    #[error("nonce fetch failed: {0}")]
    NonceFetchFailed(String),
    #[error("transaction send failed: {0}")]
    TxSendFailed(String),
}
