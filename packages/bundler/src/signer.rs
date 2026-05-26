//! Transaction signing & sending for the ERC-4337 bundler.
//!
//! Encodes the EntryPoint `handleOps` calldata, builds an EIP-1559 transaction,
//! signs it with the bundler's private key, and sends it via `eth_sendRawTransaction`.

use crate::config::BundlerConfig;
use crate::types::UserOperation;
use alloy_primitives::{keccak256, Address, B256, U256};
use k256::ecdsa::{RecoveryId, SigningKey};
use tracing::debug;

/// Bundler-side transaction signer.
#[derive(Clone)]
pub struct BundlerSigner {
    key: SigningKey,
    /// The bundler's ethereum address (derived from key).
    pub address: Address,
    chain_id: u64,
    rpc_url: String,
}

impl BundlerSigner {
    /// Create a new signer from bundler config.
    pub fn new(config: &BundlerConfig) -> Result<Self, SignerError> {
        let hex_key = config
            .signer_private_key
            .strip_prefix("0x")
            .unwrap_or(&config.signer_private_key);
        let key_bytes =
            hex::decode(hex_key).map_err(|e| SignerError::InvalidKey(e.to_string()))?;
        let key =
            SigningKey::from_slice(&key_bytes).map_err(|e| SignerError::InvalidKey(e.to_string()))?;

        // Derive bundler address from public key.
        let pk = key.verifying_key().to_encoded_point(false); // uncompressed: 0x04 || x || y
        let address = Address::from_slice(&keccak256(&pk.as_bytes()[1..])[12..]);

        Ok(Self {
            key,
            address,
            chain_id: config.chain_id,
            rpc_url: config.rpc_url.clone(),
        })
    }

    // -- RPC helpers ---------------------------------------------------------

    /// Get the bundler's current nonce via `eth_getTransactionCount`.
    pub async fn get_nonce(&self) -> Result<u64, SignerError> {
        let body = serde_json::json!({
            "jsonrpc": "2.0",
            "method": "eth_getTransactionCount",
            "params": [format!("{:#x}", self.address), "pending"],
            "id": 1,
        });
        let resp = rpc_json::<String>(&self.rpc_url, body).await?;
        if resp == "0x0" || resp == "0x" {
            return Ok(0);
        }
        u64::from_str_radix(resp.trim_start_matches("0x"), 16)
            .map_err(|e| SignerError::Parse(e.to_string()))
    }

    /// Estimate gas for a `handleOps` call via `eth_estimateGas`.
    pub async fn estimate_handle_ops_gas(
        &self,
        ops: &[UserOperation],
        beneficiary: Address,
        entry_point: Address,
    ) -> Result<u64, SignerError> {
        let calldata = encode_handle_ops_calldata(ops, beneficiary);
        let body = serde_json::json!({
            "jsonrpc": "2.0",
            "method": "eth_estimateGas",
            "params": [{
                "to": format!("{:#x}", entry_point),
                "data": format!("0x{}", hex::encode(&calldata)),
                "from": format!("{:#x}", self.address),
            }],
            "id": 1,
        });
        let resp = rpc_json::<String>(&self.rpc_url, body).await?;
        u64::from_str_radix(resp.trim_start_matches("0x"), 16)
            .map_err(|e| SignerError::Parse(e.to_string()))
    }

    // -- Transaction creation ------------------------------------------------

    /// Build, sign, and send an EIP-1559 `handleOps` transaction.
    ///
    /// Returns the on-chain transaction hash (keccak256 of the RLP-encoded signed tx).
    pub async fn send_handle_ops(
        &self,
        ops: &[UserOperation],
        max_fee: U256,
        priority_fee: U256,
        gas_limit: u64,
        nonce: u64,
        beneficiary: Address,
        entry_point: Address,
    ) -> Result<B256, SignerError> {
        // 1. ABI-encode handleOps calldata
        let calldata = encode_handle_ops_calldata(ops, beneficiary);

        // 2. Build the unsigned EIP-1559 tx pre-image and hash it
        let signing_hash = eip1559_signing_hash(
            self.chain_id, nonce, priority_fee, max_fee,
            gas_limit, entry_point, &calldata,
        );

        // 3. Sign
        let (sig, rec_id) = self.key.sign_prehash_recoverable(&signing_hash);
        let r = U256::from_be_slice(&sig.to_bytes()[..32]);
        let s = U256::from_be_slice(&sig.to_bytes()[32..]);
        // EIP-155 v = chain_id * 2 + 35 + recovery_id
        let v: u64 = self.chain_id * 2 + 35 + rec_id.to_byte() as u64;

        // 4. RLP-encode the signed transaction (0x02 || rlp([fields..., r, s, v]))
        let signed_tx = encode_signed_eip1559(
            self.chain_id, nonce, priority_fee, max_fee,
            gas_limit, entry_point, &calldata, r, s, v,
        );

        // 5. Broadcast via eth_sendRawTransaction
        let body = serde_json::json!({
            "jsonrpc": "2.0",
            "method": "eth_sendRawTransaction",
            "params": [format!("0x{}", hex::encode(&signed_tx))],
            "id": 1,
        });
        let tx_hash_hex = rpc_json::<String>(&self.rpc_url, body).await?;
        let tx_hash: B256 = tx_hash_hex
            .parse()
            .map_err(|e| SignerError::Parse(format!("invalid tx hash {tx_hash_hex}: {e}")))?;

        debug!(
            tx_hash = %tx_hash,
            ops = ops.len(),
            gas_limit = gas_limit,
            nonce = nonce,
            "handleOps sent",
        );
        Ok(tx_hash)
    }
}

// ─── handleOps ABI encoding ─────────────────────────────────────────────────

/// Function selector for
/// `handleOps((address,uint256,bytes,bytes,uint256,uint256,uint256,uint256,uint256,address,uint256,uint256,bytes,bytes)[],address)`
/// = first 4 bytes of keccak256 of the above signature string.
const HANDLE_OPS_SELECTOR: [u8; 4] = [0x97, 0x63, 0x76, 0x1b];

/// Encode calldata for `EntryPoint.handleOps(ops, beneficiary)`.
///
/// The calldata layout (after the 4-byte selector):
///
/// ```text
/// offset_to_ops          : uint256  = 0x40
/// beneficiary            : bytes32  (right-padded)
/// ops.length             : uint256
/// [for each op]  static fields (14 × 32 bytes, with offsets for dynamic bytes fields)
/// [for each op]  dynamic data (initCode, callData, paymasterData, signature)
/// ```
pub fn encode_handle_ops_calldata(
    ops: &[UserOperation],
    beneficiary: Address,
) -> Vec<u8> {
    let mut out = Vec::new();
    out.extend_from_slice(&HANDLE_OPS_SELECTOR);

    // Offset to array data = 0x40 (2 words: offset + beneficiary)
    out.extend_from_slice(&u256_be(0x40));
    // Beneficiary address, right-padded
    out.extend_from_slice(&[0u8; 12]);
    out.extend_from_slice(beneficiary.as_slice());
    // Array length
    out.extend_from_slice(&u256_be(ops.len() as u64));

    for op in ops {
        encode_packed_user_op(&mut out, op);
    }
    out
}

/// Encode a single `PackedUserOperation` tuple (14 fields, 4 dynamic).
fn encode_packed_user_op(buf: &mut Vec<u8>, op: &UserOperation) {
    let static_size: u64 = 14 * 32; // 448 bytes

    let mut static_part = vec![0u8; 14 * 32];
    let mut dyn_part = Vec::new();

    // Helper: write a 32-byte word at position i
    let mut write_word = |i: usize, w: [u8; 32]| {
        static_part[i * 32..(i + 1) * 32].copy_from_slice(&w);
    };

    // 0  sender (address, right-padded)
    let mut w = [0u8; 32];
    w[12..].copy_from_slice(op.sender.as_slice());
    write_word(0, w);

    // 1  nonce
    write_word(1, op.nonce.to_be_bytes::<32>());

    // 2  initCode (bytes) — dynamic
    write_word(2, u256_be(static_size + dyn_part.len() as u64));
    encode_bytes(&mut dyn_part, &op.init_code);

    // 3  callData (bytes) — dynamic
    write_word(3, u256_be(static_size + dyn_part.len() as u64));
    encode_bytes(&mut dyn_part, &op.call_data);

    // 4  callGasLimit
    write_word(4, op.call_gas_limit.to_be_bytes::<32>());

    // 5  verificationGasLimit
    write_word(5, op.verification_gas_limit.to_be_bytes::<32>());

    // 6  preVerificationGas
    write_word(6, op.pre_verification_gas.to_be_bytes::<32>());

    // 7  maxFeePerGas
    write_word(7, op.max_fee_per_gas.to_be_bytes::<32>());

    // 8  maxPriorityFeePerGas
    write_word(8, op.max_priority_fee_per_gas.to_be_bytes::<32>());

    // 9  paymaster (address, right-padded)
    let mut w = [0u8; 32];
    w[12..].copy_from_slice(op.paymaster.as_slice());
    write_word(9, w);

    // 10 paymasterVerificationGasLimit
    write_word(10, op.paymaster_verification_gas_limit.to_be_bytes::<32>());

    // 11 paymasterPostOpGasLimit
    write_word(11, op.paymaster_post_op_gas_limit.to_be_bytes::<32>());

    // 12 paymasterData (bytes) — dynamic
    write_word(12, u256_be(static_size + dyn_part.len() as u64));
    encode_bytes(&mut dyn_part, &op.paymaster_data);

    // 13 signature (bytes) — dynamic
    write_word(13, u256_be(static_size + dyn_part.len() as u64));
    encode_bytes(&mut dyn_part, &op.signature);

    buf.extend_from_slice(&static_part);
    buf.extend_from_slice(&dyn_part);
}

/// Encode an ABI `bytes` value: [len: uint256][data][pad to 32].
fn encode_bytes(buf: &mut Vec<u8>, data: &[u8]) {
    buf.extend_from_slice(&u256_be(data.len() as u64));
    buf.extend_from_slice(data);
    let pad = (32 - data.len() % 32) % 32;
    if pad > 0 {
        buf.resize(buf.len() + pad, 0);
    }
}

/// Encode a u64 as an ABI uint256 (32 bytes, big-endian).
fn u256_be(n: u64) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[24..32].copy_from_slice(&n.to_be_bytes());
    out
}

// ─── EIP-1559 transaction RLP encoding ──────────────────────────────────────

/// Build the EIP-1559 signing pre-image and return its keccak256 hash.
///
/// pre-image = 0x02 || rlp([
///   chain_id, nonce, max_priority_fee_per_gas, max_fee_per_gas,
///   gas_limit, to, value, data, access_list
/// ])
fn eip1559_signing_hash(
    chain_id: u64,
    nonce: u64,
    max_priority_fee_per_gas: U256,
    max_fee_per_gas: U256,
    gas_limit: u64,
    to: Address,
    data: &[u8],
) -> [u8; 32] {
    let mut payload = Vec::new();
    rlp_u64(&mut payload, chain_id);
    rlp_u64(&mut payload, nonce);
    rlp_u256(&mut payload, max_priority_fee_per_gas);
    rlp_u256(&mut payload, max_fee_per_gas);
    rlp_u64(&mut payload, gas_limit);
    rlp_address(&mut payload, to);
    rlp_zero(&mut payload); // value
    rlp_bytes(&mut payload, data);
    rlp_empty_list(&mut payload); // access_list

    let mut preimage = Vec::with_capacity(1 + payload.len() + 4);
    preimage.push(0x02);
    rlp_list_header(&mut preimage, payload.len());
    preimage.extend_from_slice(&payload);

    keccak256(&preimage)
}

/// Encode a fully signed EIP-1559 tx as raw bytes (ready for `eth_sendRawTransaction`).
///
/// Output = 0x02 || rlp([
///   chain_id, nonce, max_priority_fee_per_gas, max_fee_per_gas,
///   gas_limit, to, value, data, access_list,
///   r, s, v
/// ])
fn encode_signed_eip1559(
    chain_id: u64,
    nonce: u64,
    max_priority_fee_per_gas: U256,
    max_fee_per_gas: U256,
    gas_limit: u64,
    to: Address,
    data: &[u8],
    r: U256,
    s: U256,
    v: u64,
) -> Vec<u8> {
    let mut payload = Vec::new();
    rlp_u64(&mut payload, chain_id);
    rlp_u64(&mut payload, nonce);
    rlp_u256(&mut payload, max_priority_fee_per_gas);
    rlp_u256(&mut payload, max_fee_per_gas);
    rlp_u64(&mut payload, gas_limit);
    rlp_address(&mut payload, to);
    rlp_zero(&mut payload); // value
    rlp_bytes(&mut payload, data);
    rlp_empty_list(&mut payload); // access_list
    rlp_u256(&mut payload, r);
    rlp_u256(&mut payload, s);
    rlp_u64(&mut payload, v);

    let mut out = Vec::with_capacity(1 + payload.len() + 4);
    out.push(0x02);
    rlp_list_header(&mut out, payload.len());
    out.extend_from_slice(&payload);
    out
}

// ─── Minimal RLP encoder ────────────────────────────────────────────────────

fn rlp_list_header(buf: &mut Vec<u8>, payload_len: usize) {
    if payload_len < 56 {
        buf.push(0xc0 + payload_len as u8);
    } else {
        let len_bytes = payload_len.to_be_bytes();
        let sig = &len_bytes[len_bytes.iter().position(|&b| b != 0).unwrap_or(7)..];
        buf.push(0xf7 + sig.len() as u8);
        buf.extend_from_slice(sig);
    }
}

fn rlp_bytes_header(buf: &mut Vec<u8>, data_len: usize) {
    if data_len == 0 {
        buf.push(0x80);
    } else if data_len == 1 {
        // handled inline in rlp_bytes
    } else if data_len < 56 {
        buf.push(0x80 + data_len as u8);
    } else {
        let len_bytes = data_len.to_be_bytes();
        let sig = &len_bytes[len_bytes.iter().position(|&b| b != 0).unwrap_or(7)..];
        buf.push(0xb7 + sig.len() as u8);
        buf.extend_from_slice(sig);
    }
}

fn rlp_bytes(buf: &mut Vec<u8>, data: &[u8]) {
    if data.is_empty() {
        buf.push(0x80);
    } else if data.len() == 1 && data[0] < 0x80 {
        buf.push(data[0]);
    } else {
        rlp_bytes_header(buf, data.len());
        buf.extend_from_slice(data);
    }
}

fn rlp_u64(buf: &mut Vec<u8>, n: u64) {
    if n == 0 {
        buf.push(0x80);
        return;
    }
    let bytes = n.to_be_bytes();
    let sig = &bytes[bytes.iter().position(|&b| b != 0).unwrap_or(7)..];
    if sig.len() == 1 && sig[0] < 0x80 {
        buf.push(sig[0]);
    } else {
        buf.push(0x80 + sig.len() as u8);
        buf.extend_from_slice(sig);
    }
}

fn rlp_u256(buf: &mut Vec<u8>, n: U256) {
    if n.is_zero() {
        buf.push(0x80);
        return;
    }
    let bytes = n.to_be_bytes::<32>();
    let sig = &bytes[bytes.iter().position(|&b| b != 0).unwrap_or(31)..];
    if sig.len() == 1 && sig[0] < 0x80 {
        buf.push(sig[0]);
    } else {
        buf.push(0x80 + sig.len() as u8);
        buf.extend_from_slice(sig);
    }
}

fn rlp_zero(buf: &mut Vec<u8>) {
    buf.push(0x80);
}

fn rlp_address(buf: &mut Vec<u8>, addr: Address) {
    buf.push(0x94); // 0x80 + 20
    buf.extend_from_slice(addr.as_slice());
}

fn rlp_empty_list(buf: &mut Vec<u8>) {
    buf.push(0xc0);
}

// ─── RPC helper ─────────────────────────────────────────────────────────────

/// Issue a JSON-RPC POST and return the `result` field as `T`.
async fn rpc_json<T: serde::de::DeserializeOwned>(
    url: &str,
    body: serde_json::Value,
) -> Result<T, SignerError> {
    let client = reqwest::Client::new();
    let resp = client
        .post(url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| SignerError::Rpc(e.to_string()))?;

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| SignerError::Parse(e.to_string()))?;

    if let Some(err) = json.get("error") {
        return Err(SignerError::Rpc(err.to_string()));
    }

    serde_json::from_value(json["result"].clone())
        .map_err(|e| SignerError::Parse(e.to_string()))
}

// ─── Errors ─────────────────────────────────────────────────────────────────

#[derive(Debug, thiserror::Error)]
pub enum SignerError {
    #[error("invalid private key: {0}")]
    InvalidKey(String),
    #[error("RPC error: {0}")]
    Rpc(String),
    #[error("parse error: {0}")]
    Parse(String),
}
