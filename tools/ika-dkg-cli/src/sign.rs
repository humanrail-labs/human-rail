// Copyright (c) dWallet Labs, Ltd. / HumanRail Labs
// SPDX-License-Identifier: BSD-3-Clause-Clear
//
// Ika dWallet Sign CLI — HumanRail Phase 5E
//
// Signs an approved MessageApproval via Ika gRPC (presign → sign → poll on-chain).
// Based on official Ika pre-alpha examples:
//   - chains/solana/examples/voting/e2e-rust/src/main.rs
//   - chains/solana/examples/multisig/e2e-rust/src/main.rs
//   - chains/solana/examples/protocols-e2e/src/main.rs
//
// Pre-alpha disclaimer: Ika uses a single mock signer, not real MPC.
// All data is subject to periodic wipes. Not production custody.

use std::path::PathBuf;
use std::time::{Duration, Instant};

use anyhow::{Context, Result, bail};
use base64::engine::Engine;
use solana_rpc_client::rpc_client::RpcClient;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::Keypair;
use solana_sdk::signer::Signer;
use tonic::transport::{Channel, ClientTlsConfig};

use ika_dwallet_types::*;
use ika_grpc::d_wallet_service_client::DWalletServiceClient;
use ika_grpc::UserSignedRequest;

use crate::config::CliConfig;
use crate::output::DwalletArtifact;

// ── Ika program constants ──
const IKA_DWALLET_PROGRAM_ID: &str = "87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY";

const MA_LEN: usize = 312;
const MA_DISC: u8 = 14;
const MA_OFFSET_STATUS: usize = 172;
const MA_OFFSET_SIG_LEN: usize = 173;
const MA_OFFSET_SIG: usize = 175;

// ── Signing request artifact (matches .local-ika/signing-request.json) ──

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SigningRequestArtifact {
    pub created_at: String,
    pub preimage: String,
    #[serde(rename = "messageDigestHex")]
    pub message_digest_hex: String,
    #[serde(rename = "messageMetadataDigestHex")]
    pub message_metadata_digest_hex: String,
    pub signature_scheme: String,
    #[serde(rename = "requestIdHex")]
    pub request_id_hex: String,
    #[serde(rename = "guardedDwalletPda")]
    pub guarded_dwallet_pda: String,
    #[serde(rename = "guardSigningRequestPda")]
    pub guard_signing_request_pda: String,
    #[serde(rename = "ikaMessageApprovalPda")]
    pub ika_message_approval_pda: String,
    #[serde(rename = "approveGuardedMessageSignature")]
    pub approve_guarded_message_signature: String,
    pub amount: String,
    pub destination_chain_id: u64,
    #[serde(rename = "assetHashHex")]
    pub asset_hash_hex: String,
    #[serde(rename = "recipientHashHex")]
    pub recipient_hash_hex: String,
    pub status: String,
    pub notes: String,
    // Phase 5E fields (populated after signing)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sign_submitted_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub presign_session_identifier_hex: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sign_response_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ika_signature_hex: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ika_signature_base64: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message_approval_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signed_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signature_len: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_chain_signature_hex: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub slot_used: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub presign_response_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes_5e: Option<String>,
}

/// Full sign flow: load artifacts → verify → presign → sign → poll → update artifact.
pub async fn sign_approved_message(
    config: &CliConfig,
    payer: &Keypair,
    solana_client: &RpcClient,
    dwallet_artifact_path: &PathBuf,
    request_artifact_path: &PathBuf,
) -> Result<()> {
    println!("═══════════════════════════════════════════════════════════");
    println!("  Ika dWallet Sign — HumanRail Phase 5E");
    println!("═══════════════════════════════════════════════════════════");
    println!();

    // ── 1. Load artifacts ──
    println!("[1/8] Loading artifacts...");
    let dwallet = load_dwallet_artifact(dwallet_artifact_path)
        .with_context(|| format!("Failed to load dWallet artifact from {:?}", dwallet_artifact_path))?;
    let mut request = load_signing_request_artifact(request_artifact_path)
        .with_context(|| format!("Failed to load signing request artifact from {:?}", request_artifact_path))?;

    println!("      dWallet PDA:        {}", dwallet.dwallet_pda);
    println!("      MessageApproval:    {}", request.ika_message_approval_pda);
    println!("      Message digest:     {}", request.message_digest_hex);
    println!();

    // ── 2. Parse and verify MessageApproval on-chain ──
    println!("[2/8] Verifying MessageApproval on-chain...");
    let ma_pda: Pubkey = request.ika_message_approval_pda.parse()
        .context("Invalid MessageApproval PDA in artifact")?;
    let dwallet_pda: Pubkey = dwallet.dwallet_pda.parse()
        .context("Invalid dWallet PDA in artifact")?;

    let ma_data = solana_client
        .get_account(&ma_pda)
        .with_context(|| format!("MessageApproval account {} not found on-chain", ma_pda))?;

    if ma_data.data.len() < MA_LEN {
        bail!("MessageApproval account data too short: {} bytes (expected {})", ma_data.data.len(), MA_LEN);
    }
    if ma_data.data[0] != MA_DISC {
        bail!("MessageApproval discriminator mismatch: expected {}, got {}", MA_DISC, ma_data.data[0]);
    }

    // Verify dwallet field matches
    let ma_dwallet = Pubkey::new_from_array(
        ma_data.data[2..34].try_into().unwrap()
    );
    if ma_dwallet != dwallet_pda {
        bail!(
            "MessageApproval.dwallet mismatch: expected {}, got {}",
            dwallet_pda, ma_dwallet
        );
    }
    println!("      ✓ dWallet match: {}", ma_dwallet);

    // Verify message digest matches
    let ma_digest = &ma_data.data[34..66];
    let expected_digest = hex::decode(&request.message_digest_hex)
        .context("Invalid messageDigestHex in artifact")?;
    if ma_digest != expected_digest.as_slice() {
        bail!(
            "MessageApproval.message_digest mismatch:\n  expected: {}\n  got:      {}",
            hex::encode(&expected_digest), hex::encode(ma_digest)
        );
    }
    println!("      ✓ Message digest match");

    // Check status
    let status = ma_data.data[MA_OFFSET_STATUS];
    let sig_len = u16::from_le_bytes([
        ma_data.data[MA_OFFSET_SIG_LEN],
        ma_data.data[MA_OFFSET_SIG_LEN + 1],
    ]);

    if status == 1 {
        println!("      MessageApproval is already SIGNED (status=1, signature_len={})", sig_len);
        let sig = &ma_data.data[MA_OFFSET_SIG..MA_OFFSET_SIG + sig_len as usize];
        println!("      Signature (hex): {}", hex::encode(sig));
        println!("      Signature (base64): {}", base64::engine::general_purpose::STANDARD.encode(sig));

        // Update artifact with existing signature
        request.status = "Signed".to_string();
        request.message_approval_status = Some("Signed".to_string());
        request.signature_len = Some(sig_len);
        request.on_chain_signature_hex = Some(hex::encode(sig));
        request.ika_signature_hex = Some(hex::encode(sig));
        request.ika_signature_base64 = Some(base64::engine::general_purpose::STANDARD.encode(sig));
        request.signed_at = Some(chrono::Utc::now().to_rfc3339());
        request.notes_5e = Some("Signature was already committed on-chain.".to_string());
        save_signing_request_artifact(request_artifact_path, &request)?;
        println!("      Artifact updated.");
        return Ok(());
    }

    if status != 0 {
        bail!("Unexpected MessageApproval status: {} (expected 0=Pending or 1=Signed)", status);
    }

    println!("      Status: Pending (0), signature_len: {}", sig_len);
    println!();

    // ── 3. Connect to Ika gRPC ──
    println!("[3/8] Connecting to Ika gRPC...");
    let mut grpc_client = connect_grpc(&config.grpc_url).await?;
    println!("      Connected: {}", config.grpc_url);
    println!();

    // ── 4. Reconstruct dWallet attestation ──
    println!("[4/8] Reconstructing dWallet attestation...");
    let attestation_data = base64::engine::general_purpose::STANDARD
        .decode(&dwallet.dkg_attestation_base64)
        .context("Failed to decode dkg_attestation_base64")?;
    let network_pubkey = base64::engine::general_purpose::STANDARD
        .decode(&dwallet.network_pubkey_base64)
        .context("Failed to decode network_pubkey_base64")?;
    let session_id = base64::engine::general_purpose::STANDARD
        .decode(&dwallet.session_identifier_preimage_base64)
        .context("Failed to decode session_identifier_preimage_base64")?;

    if session_id.len() != 32 {
        bail!("session_identifier_preimage must be 32 bytes, got {}", session_id.len());
    }
    let session_id_array: [u8; 32] = session_id.try_into().unwrap();

    // Phase 5B CLI only stored attestation_data, not the full NetworkSignedAttestation.
    // The network_signature is missing. We reconstruct with zeros; the mock signer
    // may accept it (official protocols-e2e tests use zeroed attestations).
    let reconstructed_attestation = NetworkSignedAttestation {
        attestation_data,
        network_signature: vec![0u8; 64],
        network_pubkey,
        epoch: dwallet.epoch,
    };
    println!("      Attestation epoch: {}", reconstructed_attestation.epoch);
    println!("      ⚠ network_signature is missing from Phase 5B artifact — using zeros");
    println!("        (mock signer may accept this; protocols-e2e tests use zeroed data)");
    println!();

    // ── 5. Determine curve and signature algorithm ──
    println!("[5/8] Determining curve and signature algorithm...");
    let curve = parse_curve(&dwallet.curve)?;
    let signature_algorithm = curve_to_signature_algorithm(curve)?;
    println!("      Curve: {:?}", curve);
    println!("      Signature algorithm: {:?}", signature_algorithm);
    println!();

    // ── 6. Submit presign request ──
    println!("[6/8] Submitting presign request...");
    let presign_request = build_presign_request(
        payer,
        session_id_array,
        curve,
        signature_algorithm,
    );

    let presign_response = grpc_client
        .submit_transaction(presign_request)
        .await
        .context("gRPC Presign submit_transaction failed")?;

    let presign_response_data: TransactionResponseData =
        bcs::from_bytes(&presign_response.into_inner().response_data)
            .context("BCS deserialize presign TransactionResponseData failed")?;

    let presign_id = match presign_response_data {
        TransactionResponseData::Attestation(att) => {
            println!("      ✓ Presign attestation received");
            let versioned: VersionedPresignDataAttestation =
                bcs::from_bytes(&att.attestation_data)
                    .context("BCS decode VersionedPresignDataAttestation failed")?;
            let VersionedPresignDataAttestation::V1(ref data) = versioned;
            println!("      Presign session identifier: {} bytes", data.presign_session_identifier.len());
            data.presign_session_identifier.clone()
        }
        TransactionResponseData::Error { message } => {
            bail!("Presign rejected by Ika network: {}", message);
        }
        TransactionResponseData::Signature { signature } => {
            bail!("Unexpected Signature response from presign: {} bytes", signature.len());
        }
    };

    request.presign_response_type = Some("Attestation".to_string());
    request.presign_session_identifier_hex = Some(hex::encode(&presign_id));
    println!();

    // ── 7. Build and submit sign request ──
    println!("[7/8] Submitting sign request...");

    // Fetch actual slot for the approval transaction, or use 0 as fallback.
    // Official examples use slot=0 with comment "mock skips verification".
    let slot = fetch_approval_slot(solana_client, &request.approve_guarded_message_signature)
        .await
        .unwrap_or(0);
    println!("      ApprovalProof slot: {} (fetched or fallback)", slot);

    let tx_sig_bytes = bs58::decode(&request.approve_guarded_message_signature)
        .into_vec()
        .context("Failed to base58-decode approveGuardedMessageSignature")?;

    let approval_proof = ApprovalProof::Solana {
        transaction_signature: tx_sig_bytes,
        slot,
    };

    // message = raw preimage bytes (Ika network hashes internally based on scheme)
    let message = request.preimage.as_bytes().to_vec();

    let sign_request = build_sign_request(
        payer,
        session_id_array,
        message,
        presign_id,
        reconstructed_attestation,
        approval_proof,
    );

    let sign_response = grpc_client
        .submit_transaction(sign_request)
        .await
        .context("gRPC Sign submit_transaction failed")?;

    let sign_response_data: TransactionResponseData =
        bcs::from_bytes(&sign_response.into_inner().response_data)
            .context("BCS deserialize sign TransactionResponseData failed")?;

    let signature = match sign_response_data {
        TransactionResponseData::Signature { signature } => {
            println!("      ✓ Signature received from Ika network ({} bytes)", signature.len());
            request.sign_response_type = Some("Signature".to_string());
            signature
        }
        TransactionResponseData::Error { message } => {
            bail!("Sign rejected by Ika network: {}", message);
        }
        TransactionResponseData::Attestation(att) => {
            bail!(
                "Unexpected Attestation response from sign: attestation_data={} bytes, epoch={}",
                att.attestation_data.len(), att.epoch
            );
        }
    };

    request.ika_signature_hex = Some(hex::encode(&signature));
    request.ika_signature_base64 = Some(base64::engine::general_purpose::STANDARD.encode(&signature));
    request.sign_submitted_at = Some(chrono::Utc::now().to_rfc3339());
    request.slot_used = Some(slot);
    println!();

    // ── 8. Poll MessageApproval for on-chain signature ──
    println!("[8/8] Polling MessageApproval for on-chain signature...");
    let (final_status, final_sig_len, onchain_sig) = poll_message_approval_signed(
        solana_client,
        &ma_pda,
        Duration::from_secs(180),
    )
    .context("MessageApproval did not transition to Signed within timeout")?;

    println!("      ✓ MessageApproval status: {} ({}), signature_len: {}",
        if final_status == 1 { "Signed" } else { "Pending" },
        final_status,
        final_sig_len
    );
    println!("      On-chain signature (hex): {}", hex::encode(&onchain_sig));
    println!("      gRPC signature   (hex): {}", hex::encode(&signature));

    if onchain_sig == signature {
        println!("      ✓ On-chain signature matches gRPC response");
    } else {
        println!("      ⚠ On-chain signature differs from gRPC response (mock signer behavior)");
    }

    // Update artifact
    request.status = "Signed".to_string();
    request.message_approval_status = Some("Signed".to_string());
    request.signature_len = Some(final_sig_len);
    request.on_chain_signature_hex = Some(hex::encode(&onchain_sig));
    request.signed_at = Some(chrono::Utc::now().to_rfc3339());
    request.notes_5e = Some(format!(
        "Ika pre-alpha mock signer. Presign+Sign submitted via gRPC. Slot={}. Signature committed on-chain.",
        slot
    ));

    save_signing_request_artifact(request_artifact_path, &request)?;
    println!();
    println!("═══════════════════════════════════════════════════════════");
    println!("  Phase 5E Complete — Signature committed on-chain");
    println!("═══════════════════════════════════════════════════════════");
    println!("  MessageApproval: {}", request.ika_message_approval_pda);
    println!("  Signature (hex):    {}", request.on_chain_signature_hex.as_ref().unwrap());
    println!("  Signature (base64): {}", request.ika_signature_base64.as_ref().unwrap());
    println!("  Artifact updated:   {}", request_artifact_path.display());
    println!();

    Ok(())
}

// ── Helpers ──

fn load_dwallet_artifact(path: &PathBuf) -> Result<DwalletArtifact> {
    let data = std::fs::read_to_string(path)
        .with_context(|| format!("Cannot read dWallet artifact: {:?}", path))?;
    let artifact: DwalletArtifact = serde_json::from_str(&data)
        .with_context(|| format!("Failed to parse dWallet artifact JSON: {:?}", path))?;
    Ok(artifact)
}

fn load_signing_request_artifact(path: &PathBuf) -> Result<SigningRequestArtifact> {
    let data = std::fs::read_to_string(path)
        .with_context(|| format!("Cannot read signing request artifact: {:?}", path))?;
    let artifact: SigningRequestArtifact = serde_json::from_str(&data)
        .with_context(|| format!("Failed to parse signing request artifact JSON: {:?}", path))?;
    Ok(artifact)
}

fn save_signing_request_artifact(path: &PathBuf, artifact: &SigningRequestArtifact) -> Result<()> {
    let json = serde_json::to_string_pretty(artifact)
        .context("Failed to serialize signing request artifact")?;
    std::fs::write(path, json)
        .with_context(|| format!("Failed to write signing request artifact to {:?}", path))?;
    Ok(())
}

async fn connect_grpc(url: &str) -> Result<DWalletServiceClient<Channel>> {
    if url.starts_with("https") {
        let tls = ClientTlsConfig::new().with_native_roots();
        let channel = Channel::from_shared(url.to_string())
            .context("Invalid gRPC URL")?
            .tls_config(tls)
            .context("TLS config failed")?
            .connect()
            .await
            .context("gRPC connect failed")?;
        Ok(DWalletServiceClient::new(channel))
    } else {
        let channel = Channel::from_shared(url.to_string())
            .context("Invalid gRPC URL")?
            .connect()
            .await
            .context("gRPC connect failed")?;
        Ok(DWalletServiceClient::new(channel))
    }
}

fn build_presign_request(
    payer: &Keypair,
    session_id: [u8; 32],
    curve: DWalletCurve,
    signature_algorithm: DWalletSignatureAlgorithm,
) -> UserSignedRequest {
    let signed_data = SignedRequestData {
        session_identifier_preimage: session_id,
        epoch: 1, // Ika pre-alpha uses epoch=1 for mock
        chain_id: ChainId::Solana,
        intended_chain_sender: payer.pubkey().to_bytes().to_vec(),
        request: DWalletRequest::Presign {
            dwallet_network_encryption_public_key: vec![0u8; 32],
            curve,
            signature_algorithm,
        },
    };

    let signed_bytes = bcs::to_bytes(&signed_data).expect("BCS serialize SignedRequestData");

    let user_sig = UserSignature::Ed25519 {
        signature: vec![0u8; 64],
        public_key: payer.pubkey().to_bytes().to_vec(),
    };

    UserSignedRequest {
        user_signature: bcs::to_bytes(&user_sig).expect("BCS serialize UserSignature"),
        signed_request_data: signed_bytes,
    }
}

fn build_sign_request(
    payer: &Keypair,
    session_id: [u8; 32],
    message: Vec<u8>,
    presign_session_identifier: Vec<u8>,
    dwallet_attestation: NetworkSignedAttestation,
    approval_proof: ApprovalProof,
) -> UserSignedRequest {
    let signed_data = SignedRequestData {
        session_identifier_preimage: session_id,
        epoch: 1, // Ika pre-alpha uses epoch=1 for mock
        chain_id: ChainId::Solana,
        intended_chain_sender: payer.pubkey().to_bytes().to_vec(),
        request: DWalletRequest::Sign {
            message,
            message_metadata: vec![],
            presign_session_identifier,
            message_centralized_signature: vec![0u8; 64],
            dwallet_attestation,
            approval_proof,
        },
    };

    let signed_bytes = bcs::to_bytes(&signed_data).expect("BCS serialize SignedRequestData");

    let user_sig = UserSignature::Ed25519 {
        signature: vec![0u8; 64],
        public_key: payer.pubkey().to_bytes().to_vec(),
    };

    UserSignedRequest {
        user_signature: bcs::to_bytes(&user_sig).expect("BCS serialize UserSignature"),
        signed_request_data: signed_bytes,
    }
}

async fn fetch_approval_slot(
    client: &RpcClient,
    signature: &str,
) -> Result<u64> {
    let sig = solana_sdk::signature::Signature::from_str(signature)
        .context("Invalid Solana signature string")?;

    let statuses = client
        .get_signature_statuses(&[sig])
        .context("get_signature_statuses RPC call failed")?;

    if let Some(Some(status)) = statuses.value.get(0) {
        return Ok(status.slot);
    }

    bail!("Could not fetch slot for approval transaction — signature not found in status history")
}

fn poll_message_approval_signed(
    client: &RpcClient,
    ma_pda: &Pubkey,
    timeout: Duration,
) -> Result<(u8, u16, Vec<u8>)> {
    let start = Instant::now();
    loop {
        if start.elapsed() > timeout {
            bail!("Timeout waiting for MessageApproval to transition to Signed");
        }

        if let Ok(acct) = client.get_account(ma_pda) {
            if acct.data.len() >= MA_LEN && acct.data[0] == MA_DISC {
                let status = acct.data[MA_OFFSET_STATUS];
                let sig_len = u16::from_le_bytes([
                    acct.data[MA_OFFSET_SIG_LEN],
                    acct.data[MA_OFFSET_SIG_LEN + 1],
                ]);

                if status == 1 && sig_len > 0 {
                    let sig = acct.data[MA_OFFSET_SIG..MA_OFFSET_SIG + sig_len as usize].to_vec();
                    return Ok((status, sig_len, sig));
                }
            }
        }

        std::thread::sleep(Duration::from_secs(2));
    }
}

fn parse_curve(name: &str) -> Result<DWalletCurve> {
    match name {
        "Secp256k1" => Ok(DWalletCurve::Secp256k1),
        "Secp256r1" => Ok(DWalletCurve::Secp256r1),
        "Curve25519" => Ok(DWalletCurve::Curve25519),
        "Ristretto" => Ok(DWalletCurve::Ristretto),
        other => bail!("Unsupported curve: {}", other),
    }
}

fn curve_to_signature_algorithm(curve: DWalletCurve) -> Result<DWalletSignatureAlgorithm> {
    match curve {
        DWalletCurve::Secp256k1 => Ok(DWalletSignatureAlgorithm::ECDSASecp256k1),
        DWalletCurve::Secp256r1 => Ok(DWalletSignatureAlgorithm::ECDSASecp256r1),
        DWalletCurve::Curve25519 => Ok(DWalletSignatureAlgorithm::EdDSA),
        DWalletCurve::Ristretto => bail!("Ristretto curve does not have a standard signature algorithm mapping"),
    }
}

use std::str::FromStr;
