use alloy::primitives::{Address, Bytes, Signature as AlloySignature};
use serde::{Deserialize, Serialize};

/// ERC-6492 wrapped signature suffix
pub const ERC6492_SUFFIX: [u8; 32] = [
    0x64, 0x92, 0x64, 0x92, 0x64, 0x92, 0x64, 0x92,
    0x64, 0x92, 0x64, 0x92, 0x64, 0x92, 0x64, 0x92,
    0x64, 0x92, 0x64, 0x92, 0x64, 0x92, 0x64, 0x92,
    0x64, 0x92, 0x64, 0x92, 0x64, 0x92, 0x64, 0x92,
];

/// EIP-1271 magic value for valid contract signatures
pub const EIP1271_MAGIC_VALUE: [u8; 4] = [0x16, 0x26, 0xba, 0x7e];

/// Signature format type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SignatureFormat {
    /// EIP-191 personal signature (65 bytes)
    Eip191,
    /// EIP-1271 contract wallet signature
    Eip1271,
    /// ERC-6492 wrapped signature for pre-deployed contracts
    Erc6492,
}

/// Verification result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationResult {
    pub valid: bool,
    pub format: SignatureFormat,
    pub signer: Option<Address>,
    pub error: Option<String>,
}

/// ERC-6492 wrapped signature components
#[derive(Debug, Clone)]
pub struct WrappedSignature {
    pub factory_address: Address,
    pub factory_calldata: Bytes,
    pub inner_signature: Bytes,
}
