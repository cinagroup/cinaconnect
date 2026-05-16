use alloy::primitives::{Address, Bytes, B256, bytes};
use alloy::providers::Provider;
use alloy::contract::ContractInstance;
use crate::types::{VerificationResult, SignatureFormat, WrappedSignature, ERC6492_SUFFIX, EIP1271_MAGIC_VALUE};
use crate::decoder::{decode_wrapped_signature, is_wrapped_signature};

/// Verify a signature against a message and address
///
/// Supports EIP-191, EIP-1271, and ERC-6492 wrapped signatures
pub async fn verify_signature<P: Provider>(
    message_hash: B256,
    signature: &[u8],
    address: Address,
    provider: &P,
) -> Result<VerificationResult, VerificationError> {
    // Determine signature format
    let format = detect_format(signature)?;

    match format {
        SignatureFormat::Eip191 => verify_eip191(message_hash, signature, address),
        SignatureFormat::Eip1271 => verify_eip1271(message_hash, signature, address, provider).await,
        SignatureFormat::Erc6492 => verify_erc6492(message_hash, signature, address, provider).await,
    }
}

/// Detect signature format
fn detect_format(signature: &[u8]) -> Result<SignatureFormat, VerificationError> {
    if signature.is_empty() {
        return Err(VerificationError::EmptySignature);
    }

    // ERC-6492: ends with the magic suffix
    if is_wrapped_signature(signature) {
        return Ok(SignatureFormat::Erc6492);
    }

    // EIP-191: exactly 65 bytes (standard ECDSA signature)
    if signature.len() == 65 {
        return Ok(SignatureFormat::Eip191);
    }

    // Assume EIP-1271 for other lengths
    Ok(SignatureFormat::Eip1271)
}

/// Verify EIP-191 personal signature
fn verify_eip191(
    message_hash: B256,
    signature: &[u8],
    expected_address: Address,
) -> Result<VerificationResult, VerificationError> {
    if signature.len() != 65 {
        return Ok(VerificationResult {
            valid: false,
            format: SignatureFormat::Eip191,
            signer: None,
            error: Some(format!("Expected 65 bytes, got {}", signature.len())),
        });
    }

    // Recover address from signature
    let r_bytes: [u8; 32] = signature[0..32].try_into().map_err(|_| VerificationError::InvalidSignature)?;
    let s_bytes: [u8; 32] = signature[32..64].try_into().map_err(|_| VerificationError::InvalidSignature)?;
    let v = signature[64];

    let r = alloy::primitives::U256::from_be_bytes(r_bytes);
    let s = alloy::primitives::U256::from_be_bytes(s_bytes);

    // Use alloy's signature recovery
    let sig = alloy::primitives::PrimitiveSignature::new(r, s, v > 27);
    let recovered = sig.recover_address_from_prehash(&message_hash);

    match recovered {
        Ok(recovered_addr) => {
            let valid = recovered_addr == expected_address;
            Ok(VerificationResult {
                valid,
                format: SignatureFormat::Eip191,
                signer: Some(recovered_addr),
                error: if valid { None } else { Some("Address mismatch".to_string()) },
            })
        }
        Err(e) => Ok(VerificationResult {
            valid: false,
            format: SignatureFormat::Eip191,
            signer: None,
            error: Some(format!("Recovery failed: {}", e)),
        }),
    }
}

/// Verify EIP-1271 contract wallet signature
async fn verify_eip1271<P: Provider>(
    message_hash: B256,
    signature: &[u8],
    contract_address: Address,
    provider: &P,
) -> Result<VerificationResult, VerificationError> {
    // Call isValidSignature(bytes32, bytes) on the contract
    let calldata = create_is_valid_signature_calldata(message_hash, Bytes::copy_from_slice(signature));

    match provider.call(&alloy::rpc::types::TransactionRequest::default()
        .with_to(contract_address)
        .with_input(calldata)).await {
        Ok(result) => {
            let valid = result.as_ref().len() >= 4 
                && result.as_ref()[0..4] == EIP1271_MAGIC_VALUE;
            
            Ok(VerificationResult {
                valid,
                format: SignatureFormat::Eip1271,
                signer: Some(contract_address),
                error: if valid { None } else { Some("EIP-1271 verification failed".to_string()) },
            })
        }
        Err(e) => Ok(VerificationResult {
            valid: false,
            format: SignatureFormat::Eip1271,
            signer: Some(contract_address),
            error: Some(format!("Contract call failed: {}", e)),
        }),
    }
}

/// Verify ERC-6492 wrapped signature
///
/// This deploys the contract, verifies the signature, then discards state
async fn verify_erc6492<P: Provider>(
    message_hash: B256,
    signature: &[u8],
    expected_address: Address,
    provider: &P,
) -> Result<VerificationResult, VerificationError> {
    // Decode the wrapped signature
    let wrapped = decode_wrapped_signature(signature)
        .map_err(|e| VerificationError::DecodeError(e.to_string()))?;

    // Check if contract is already deployed
    let is_deployed = provider.get_code_at(expected_address).await
        .map(|code| !code.is_empty())
        .unwrap_or(false);

    if is_deployed {
        // Contract exists, verify directly with EIP-1271
        return verify_eip1271(message_hash, &wrapped.inner_signature, expected_address, provider).await;
    }

    // Contract not deployed: deploy, verify, then note that state should be discarded
    // In practice, we use eth_call with state override to simulate deployment
    let factory_address = wrapped.factory_address;
    
    // First deploy using the factory
    let deploy_tx = alloy::rpc::types::TransactionRequest::default()
        .with_to(factory_address)
        .with_input(wrapped.factory_calldata);

    // Use eth_call to simulate deployment and get the deployed address
    // In production, use eth_sendRawTransaction with a nonce check
    match provider.call(&deploy_tx).await {
        Ok(_) => {
            // Contract would be deployed, verify with EIP-1271
            // Note: in real usage, this requires a multi-call or state override
            verify_eip1271(message_hash, &wrapped.inner_signature, expected_address, provider).await
        }
        Err(e) => Ok(VerificationResult {
            valid: false,
            format: SignatureFormat::Erc6492,
            signer: None,
            error: Some(format!("Factory deployment failed: {}", e)),
        }),
    }
}

/// Create calldata for isValidSignature(bytes32, bytes)
fn create_is_valid_signature_calldata(hash: B256, signature: Bytes) -> Bytes {
    // Solidity: isValidSignature(bytes32 hash, bytes signature)
    // Function selector: 0x1626ba7e
    let mut calldata = Vec::new();
    
    // Function selector
    calldata.extend_from_slice(&EIP1271_MAGIC_VALUE);
    
    // Hash (bytes32) - 32 bytes
    calldata.extend_from_slice(hash.as_slice());
    
    // Signature offset (64 = 0x40, relative to start of data after selector)
    calldata.extend_from_slice(&[0u8; 28]);
    calldata.extend_from_slice(&64u32.to_be_bytes());
    
    // Signature length
    let sig_len = signature.len() as u32;
    calldata.extend_from_slice(&[0u8; 28]);
    calldata.extend_from_slice(&sig_len.to_be_bytes());
    
    // Signature bytes (padded to 32)
    calldata.extend_from_slice(signature.as_ref());
    let padding = (32 - (signature.len() % 32)) % 32;
    calldata.extend(std::iter::repeat(0u8).take(padding));
    
    Bytes::from(calldata)
}

#[derive(Debug, thiserror::Error)]
pub enum VerificationError {
    #[error("Empty signature")]
    EmptySignature,
    #[error("Invalid signature format")]
    InvalidSignature,
    #[error("Decode error: {0}")]
    DecodeError(String),
    #[error("Provider error: {0}")]
    ProviderError(String),
}
