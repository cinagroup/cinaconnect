//! ERC-6492 Signature Verification
//!
//! Supports three signature formats:
//! - EIP-191: Standard personal signatures (0x02 prefix)
//! - EIP-1271: Contract wallet signatures (0x01 prefix)
//! - ERC-6492: Wrapped signatures for pre-deployed contracts (0x6492 suffix)

pub mod types;
pub mod decoder;
pub mod verify;
pub mod factory;

pub use types::*;
pub use decoder::*;
pub use verify::*;
pub use factory::*;
