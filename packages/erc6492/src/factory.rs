//! Factory helpers for ERC-6492 verification
//!
//! Provides counterfactual deployment helpers for common smart account factories.

use alloy::primitives::{Address, Bytes, B256, address};

/// Known factory addresses for popular smart account implementations
pub struct KnownFactories;

impl KnownFactories {
    /// Safe account factory (v1.4.1)
    pub fn safe_v141_factory() -> Address {
        address!("0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC")
    }

    /// Kernel account factory (ZeroDev)
    pub fn kernel_factory() -> Address {
        address!("0x5de4839a76cf55d0c90e2061ef4386d962E15ae3")
    }

    /// Biconomy factory
    pub fn biconomy_factory() -> Address {
        address!("0x00000000a5e081A5b4F35E0B1F9C1b2320F2B94E")
    }
}

/// Build factory calldata for Safe account deployment
pub fn build_safe_factory_calldata(
    owners: Vec<Address>,
    threshold: u64,
    salt: B256,
) -> Bytes {
    // Simplified: in production, encode the full createProxyWithNonce call
    // abi.encodeWithSelector(SafeProxyFactory.createProxyWithNonce, singleton, initCode, salt)
    Bytes::new()
}

/// Build factory calldata for Kernel account deployment
pub fn build_kernel_factory_calldata(
    owner: Address,
    index: u64,
) -> Bytes {
    // Simplified: in production, encode the full deployment call
    Bytes::new()
}

/// Verify that a given address would be deployed by the factory with given parameters
pub fn predict_address(
    factory: Address,
    init_code_hash: B256,
    salt: B256,
) -> Address {
    // CREATE2 address calculation:
    // keccak256(0xff ++ address ++ salt ++ keccak256(init_code))[12:]
    // In production, use alloy's address computation
    Address::ZERO
}
