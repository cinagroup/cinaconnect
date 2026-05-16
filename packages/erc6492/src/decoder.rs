use alloy::primitives::{Address, Bytes, fixed_bytes};
use crate::types::{ERC6492_SUFFIX, WrappedSignature};

/// Decode an ERC-6492 wrapped signature
///
/// Format: abi.encode(factoryAddress, factoryCalldata, innerSignature)
pub fn decode_wrapped_signature(signature: &[u8]) -> Result<WrappedSignature, DecodingError> {
    if !is_wrapped_signature(signature) {
        return Err(DecodingError::NotWrappedSignature);
    }

    // Strip the 32-byte suffix
    let payload = &signature[..signature.len() - 32];

    // ABI decode: (address, bytes, bytes)
    // Simple decoding: address (20 bytes) + calldata length + calldata + sig length + sig
    let mut offset = 0;

    // Skip ABI encoding header (first 96 bytes = 3 * 32 for offsets)
    if payload.len() < 96 {
        return Err(DecodingError::PayloadTooShort);
    }

    // Factory address is at offset specified by first word
    let addr_offset = u32::from_be_bytes([
        payload[28], payload[29], payload[30], payload[31],
    ]) as usize;

    if addr_offset + 20 > payload.len() {
        return Err(DecodingError::InvalidAddressOffset);
    }

    let factory_address = Address::from_slice(&payload[addr_offset..addr_offset + 20]);

    // Calldata offset
    let calldata_offset = u32::from_be_bytes([
        payload[60], payload[61], payload[62], payload[63],
    ]) as usize;

    // Calldata length at calldata_offset
    if calldata_offset + 32 > payload.len() {
        return Err(DecodingError::InvalidCalldataOffset);
    }
    let calldata_len = u32::from_be_bytes([
        payload[calldata_offset + 28], payload[calldata_offset + 29],
        payload[calldata_offset + 30], payload[calldata_offset + 31],
    ]) as usize;

    let calldata_start = calldata_offset + 32;
    if calldata_start + calldata_len > payload.len() {
        return Err(DecodingError::CalldataTooLong);
    }
    let factory_calldata = Bytes::copy_from_slice(&payload[calldata_start..calldata_start + calldata_len]);

    // Signature offset
    let sig_offset = u32::from_be_bytes([
        payload[92], payload[93], payload[94], payload[95],
    ]) as usize;

    if sig_offset + 32 > payload.len() {
        return Err(DecodingError::InvalidSignatureOffset);
    }
    let sig_len = u32::from_be_bytes([
        payload[sig_offset + 28], payload[sig_offset + 29],
        payload[sig_offset + 30], payload[sig_offset + 31],
    ]) as usize;

    let sig_start = sig_offset + 32;
    if sig_start + sig_len > payload.len() {
        return Err(DecodingError::SignatureTooLong);
    }
    let inner_signature = Bytes::copy_from_slice(&payload[sig_start..sig_start + sig_len]);

    Ok(WrappedSignature {
        factory_address,
        factory_calldata,
        inner_signature,
    })
}

/// Check if a signature is ERC-6492 wrapped
pub fn is_wrapped_signature(signature: &[u8]) -> bool {
    if signature.len() < 32 {
        return false;
    }
    let suffix = &signature[signature.len() - 32..];
    suffix == ERC6492_SUFFIX
}

#[derive(Debug, thiserror::Error)]
pub enum DecodingError {
    #[error("Not an ERC-6492 wrapped signature")]
    NotWrappedSignature,
    #[error("Payload too short")]
    PayloadTooShort,
    #[error("Invalid address offset")]
    InvalidAddressOffset,
    #[error("Invalid calldata offset")]
    InvalidCalldataOffset,
    #[error("Calldata too long")]
    CalldataTooLong,
    #[error("Invalid signature offset")]
    InvalidSignatureOffset,
    #[error("Signature too long")]
    SignatureTooLong,
    #[error("ABI decode error")]
    AbiDecodeError,
}
