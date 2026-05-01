use std::time::{Duration, Instant};

use anyhow::{Context, Result, bail};
use solana_rpc_client::rpc_client::RpcClient;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::Keypair;
use solana_sdk::signer::Signer;
use tonic::transport::{Channel, ClientTlsConfig};

use ika_dwallet_types::*;
use ika_grpc::d_wallet_service_client::DWalletServiceClient;
use ika_grpc::UserSignedRequest;

use base64::engine::Engine;
use crate::config::CliConfig;
use crate::output::DwalletArtifact;

// ── Ika program constants ──
const IKA_DWALLET_PROGRAM_ID: &str = "87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY";
const SEED_DWALLET_COORDINATOR: &[u8] = b"dwallet_coordinator";
const SEED_DWALLET: &[u8] = b"dwallet";

const DISC_COORDINATOR: u8 = 1;
const DISC_NEK: u8 = 3;
const DISC_DWALLET: u8 = 2;

const COORDINATOR_LEN: usize = 116;
const NEK_LEN: usize = 164;
const DWALLET_LEN: usize = 153;

// ── dWallet offsets (verified against real 153-byte devnet accounts) ──
//   0      discriminator (1)
//   1      version (1)
//   2..34  authority (32)
//   34..36 curve u16 LE (2)
//   36     state (1)
//   37     public_key_len (1)
//   38..103 public_key (65 bytes padded)
//   103..111 created_epoch u64 LE (8)
//   111..143 noa_public_key (32)
//   143    is_imported (1)
//   144    bump (1)
//   145..153 reserved (8)
const DW_AUTHORITY: usize = 2;
const DW_CURVE: usize = 34;
const DW_STATE: usize = 36;
const DW_PUBLIC_KEY_LEN: usize = 37;
const DW_PUBLIC_KEY: usize = 38;
const DW_CREATED_EPOCH: usize = 103;
const DW_NOA_PUBLIC_KEY: usize = 111;
const DW_IS_IMPORTED: usize = 143;
const DW_BUMP: usize = 144;

/// Full DKG flow: gRPC DKG → poll on-chain → parse → artifact.
pub async fn create_dwallet_via_dkg(
    config: &CliConfig,
    payer: &Keypair,
    solana_client: &RpcClient,
) -> Result<DwalletArtifact> {
    let dwallet_program_id = IKA_DWALLET_PROGRAM_ID.parse::<Pubkey>()
        .expect("static IKA program ID is valid");

    // ── 1. Wait for Ika program state ──
    println!("[1/6] Waiting for Ika program state...");
    let (coordinator_pda, _) =
        Pubkey::find_program_address(&[SEED_DWALLET_COORDINATOR], &dwallet_program_id);

    let coordinator_data = poll_account(
        solana_client,
        &coordinator_pda,
        |d| d.len() >= COORDINATOR_LEN && d[0] == DISC_COORDINATOR,
        Duration::from_secs(30),
    )
    .context("DWalletCoordinator not found — Ika devnet may be resetting")?;
    println!("      Coordinator: {}", coordinator_pda);

    // Extract epoch from coordinator (offset 2 + 32 = 34 for authority, then 8 bytes for epoch)
    let epoch = u64::from_le_bytes(
        coordinator_data[34..42]
            .try_into()
            .unwrap_or([1, 0, 0, 0, 0, 0, 0, 0]),
    );
    println!("      Epoch: {}", epoch);

    // Find NEK via getProgramAccounts
    let nek_accounts = find_nek_accounts(solana_client, &dwallet_program_id)
        .context("No NetworkEncryptionKey accounts found")?;
    let (nek_pda, nek_data) = &nek_accounts[0];
    let noa_pubkey_bytes: [u8; 32] = nek_data.data[2..34].try_into().unwrap();
    let noa_pubkey = Pubkey::new_from_array(noa_pubkey_bytes);
    println!("      NEK: {}", nek_pda);
    println!("      NOA: {}", noa_pubkey);

    // ── 2. Connect to gRPC ──
    println!("[2/6] Connecting to Ika gRPC...");
    let mut grpc_client = connect_grpc(&config.grpc_url).await?;
    println!("      Connected: {}", config.grpc_url);

    // ── 3. Build and submit DKG request ──
    println!("[3/6] Submitting DKG request...");
    let session_id = solana_sdk::signature::Keypair::new().pubkey().to_bytes();

    let dkg_request = build_dkg_request(payer, config.curve, session_id, epoch);
    let response = grpc_client
        .submit_transaction(dkg_request)
        .await
        .context("gRPC SubmitTransaction failed")?;

    let response_data: TransactionResponseData =
        bcs::from_bytes(&response.into_inner().response_data)
            .context("BCS deserialize TransactionResponseData failed")?;

    let attestation = match response_data {
        TransactionResponseData::Attestation(att) => {
            println!("      ✓ DKG attestation received");
            att
        }
        TransactionResponseData::Error { message } => {
            bail!("DKG rejected by Ika network: {}", message);
        }
        TransactionResponseData::Signature { signature } => {
            bail!("Unexpected Signature response (expected Attestation): {} bytes", signature.len());
        }
    };

    // ── 4. Decode attestation ──
    println!("[4/6] Decoding DKG attestation...");
    let versioned: VersionedDWalletDataAttestation =
        bcs::from_bytes(&attestation.attestation_data)
            .context("BCS decode VersionedDWalletDataAttestation failed")?;

    let VersionedDWalletDataAttestation::V1(ref data) = versioned;
    let public_key = data.public_key.clone();
    let dwallet_session_id: [u8; 32] = data.session_identifier;

    println!("      dWallet session ID: {}", hex::encode(dwallet_session_id));
    println!("      Public key: {} ({} bytes)", hex::encode(&public_key), public_key.len());
    println!("      Curve: {:?}", data.curve);

    // ── 5. Derive dWallet PDA ──
    println!("[5/6] Deriving dWallet PDA...");
    let curve_u16 = config.curve as u16;
    let payload = pack_dwallet_seed_payload(curve_u16, &public_key);
    let mut seeds: Vec<&[u8]> = Vec::with_capacity(4);
    seeds.push(SEED_DWALLET);
    for chunk in payload.chunks(32) {
        seeds.push(chunk);
    }
    let (dwallet_pda, _) = Pubkey::find_program_address(&seeds, &dwallet_program_id);
    println!("      PDA: {}", dwallet_pda);

    // ── 6. Poll for dWallet on-chain (or skip) ──
    if config.skip_poll {
        println!("[6/6] Skipping on-chain poll (--skip-poll).");
        println!("      PDA: {} (verify manually)", dwallet_pda);
        return Ok(build_artifact(
            config, payer, &public_key, &dwallet_pda, &attestation, &session_id, epoch,
            &payer.pubkey(), "Active (pending verification)",
        ));
    }

    println!("[6/6] Polling for dWallet on-chain (timeout {}s)...", config.poll_timeout.as_secs());
    let dwallet_data = poll_account(
        solana_client,
        &dwallet_pda,
        |d| d.len() >= DWALLET_LEN && d[0] == DISC_DWALLET,
        config.poll_timeout,
    )
    .context("dWallet PDA did not appear on-chain within timeout")?;

    println!("      ✓ dWallet account found ({} bytes)", dwallet_data.len());

    // Parse dWallet account
    let authority = Pubkey::new_from_array(
        dwallet_data[DW_AUTHORITY..DW_AUTHORITY + 32]
            .try_into()
            .unwrap(),
    );
    let curve_u16_le = u16::from_le_bytes([
        dwallet_data[DW_CURVE],
        dwallet_data[DW_CURVE + 1],
    ]);
    let state_byte = dwallet_data[DW_STATE];
    let public_key_len = dwallet_data[DW_PUBLIC_KEY_LEN] as usize;
    let onchain_public_key = &dwallet_data[DW_PUBLIC_KEY..DW_PUBLIC_KEY + public_key_len.min(65)];
    let created_epoch = u64::from_le_bytes(
        dwallet_data[DW_CREATED_EPOCH..DW_CREATED_EPOCH + 8]
            .try_into()
            .unwrap(),
    );
    let onchain_noa = Pubkey::new_from_array(
        dwallet_data[DW_NOA_PUBLIC_KEY..DW_NOA_PUBLIC_KEY + 32]
            .try_into()
            .unwrap(),
    );
    let is_imported = dwallet_data[DW_IS_IMPORTED] == 1;
    let bump = dwallet_data[DW_BUMP];

    println!("      Authority:          {}", authority);
    println!("      Curve (on-chain):   {} (u16 LE)", curve_u16_le);
    println!("      State (on-chain):   {}", state_byte);
    println!("      Public key len:     {}", public_key_len);
    println!("      Public key match:   {}", onchain_public_key == public_key.as_slice());
    println!("      Created epoch:      {}", created_epoch);
    println!("      NOA pubkey:         {}", onchain_noa);
    println!("      Is imported:        {}", is_imported);
    println!("      Bump:               {}", bump);

    // Verify critical fields
    if authority != payer.pubkey() {
        println!("      WARNING: Authority is not the payer — mock may have transferred it.");
    }
    if onchain_public_key != public_key.as_slice() {
        bail!("On-chain public key does not match attestation!");
    }
    if state_byte != 1 {
        println!("      WARNING: Expected state=Active(1), got {}", state_byte);
    }

    let state_name = match state_byte {
        0 => "DKGInProgress",
        1 => "Active",
        2 => "Frozen",
        _ => "Unknown",
    };

    Ok(build_artifact(
        config, payer, &public_key, &dwallet_pda, &attestation, &session_id, epoch,
        &authority, state_name,
    ))
}

/// Build artifact from DKG result data.
fn build_artifact(
    config: &CliConfig,
    payer: &Keypair,
    public_key: &[u8],
    dwallet_pda: &Pubkey,
    attestation: &NetworkSignedAttestation,
    session_id: &[u8; 32],
    epoch: u64,
    authority: &Pubkey,
    state: &str,
) -> DwalletArtifact {
    let curve_name = match config.curve {
        DWalletCurve::Secp256k1 => "Secp256k1",
        DWalletCurve::Secp256r1 => "Secp256r1",
        DWalletCurve::Curve25519 => "Curve25519",
        DWalletCurve::Ristretto => "Ristretto",
    };

    DwalletArtifact {
        created_at: chrono::Utc::now().to_rfc3339(),
        network: "devnet".to_string(),
        ika_program_id: IKA_DWALLET_PROGRAM_ID.to_string(),
        grpc_endpoint: config.grpc_url.clone(),
        creator: payer.pubkey().to_string(),
        curve: curve_name.to_string(),
        dwallet_signing_public_key_hex: hex::encode(public_key),
        dwallet_signing_public_key_base64: base64::engine::general_purpose::STANDARD.encode(public_key),
        dwallet_pda: dwallet_pda.to_string(),
        authority: authority.to_string(),
        state: state.to_string(),
        dkg_attestation_base64: base64::engine::general_purpose::STANDARD.encode(&attestation.attestation_data),
        network_pubkey_base64: base64::engine::general_purpose::STANDARD.encode(&attestation.network_pubkey),
        epoch,
        session_identifier_preimage_base64: base64::engine::general_purpose::STANDARD.encode(session_id),
        notes: "Ika pre-alpha mock signer; not production custody.".to_string(),
    }
}

/// Connect to Ika gRPC endpoint.
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

/// Build the DKG gRPC request.
///
/// Based on official Ika e2e examples. In pre-alpha, the mock signer
/// generates the actual keypair server-side, so the client sends zeroed
/// placeholder values for crypto material. The user signature is also
/// zeroed because the mock skips verification.
fn build_dkg_request(
    payer: &Keypair,
    curve: DWalletCurve,
    session_id: [u8; 32],
    epoch: u64,
) -> UserSignedRequest {
    let signed_data = SignedRequestData {
        session_identifier_preimage: session_id,
        epoch,
        chain_id: ChainId::Solana,
        intended_chain_sender: payer.pubkey().to_bytes().to_vec(),
        request: DWalletRequest::DKG {
            dwallet_network_encryption_public_key: vec![0u8; 32],
            curve,
            centralized_public_key_share_and_proof: vec![0u8; 32],
            user_secret_key_share: UserSecretKeyShare::Encrypted {
                encrypted_centralized_secret_share_and_proof: vec![0u8; 32],
                encryption_key: vec![0u8; 32],
                signer_public_key: payer.pubkey().to_bytes().to_vec(),
            },
            user_public_output: vec![0u8; 32],
            sign_during_dkg_request: None,
        },
    };

    let signed_bytes = bcs::to_bytes(&signed_data).expect("BCS serialize SignedRequestData");

    // In pre-alpha, the mock skips signature verification.
    // We send a zeroed Ed25519 signature with the real public key.
    // See: chains/solana/examples/*/e2e-rust/src/main.rs
    let user_sig = UserSignature::Ed25519 {
        signature: vec![0u8; 64],
        public_key: payer.pubkey().to_bytes().to_vec(),
    };

    UserSignedRequest {
        user_signature: bcs::to_bytes(&user_sig).expect("BCS serialize UserSignature"),
        signed_request_data: signed_bytes,
    }
}

/// Pack `curve_u16_le || public_key` into a single buffer for dWallet PDA seeds.
/// Mirrors `DWalletPdaSeeds::new` in the Ika program.
fn pack_dwallet_seed_payload(curve: u16, public_key: &[u8]) -> Vec<u8> {
    let mut buf = Vec::with_capacity(2 + public_key.len());
    buf.extend_from_slice(&curve.to_le_bytes());
    buf.extend_from_slice(public_key);
    buf
}

/// Poll Solana until an account matching the predicate appears.
fn poll_account(
    client: &RpcClient,
    pubkey: &Pubkey,
    check: impl Fn(&[u8]) -> bool,
    timeout: Duration,
) -> Result<Vec<u8>> {
    let start = Instant::now();
    loop {
        if start.elapsed() > timeout {
            bail!("Timeout waiting for account {}", pubkey);
        }
        if let Ok(acct) = client.get_account(pubkey) {
            if check(&acct.data) {
                return Ok(acct.data);
            }
        }
        std::thread::sleep(Duration::from_millis(500));
    }
}

/// Find all NetworkEncryptionKey accounts owned by the Ika program.
fn find_nek_accounts(
    client: &RpcClient,
    program_id: &Pubkey,
) -> Result<Vec<(Pubkey, solana_sdk::account::Account)>> {
    // solana-rpc-client 2.2 returns Vec<(Pubkey, UiAccount)> or Vec<(Pubkey, Account)>
    // depending on the method. get_program_accounts returns Vec<(Pubkey, Account)>.
    let accs = client
        .get_program_accounts(program_id)
        .context("get_program_accounts failed")?;
    let neks: Vec<_> = accs
        .into_iter()
        .filter(|(_, a)| a.data.len() >= NEK_LEN && a.data[0] == DISC_NEK)
        .collect();
    if neks.is_empty() {
        bail!("No NEK accounts found");
    }
    Ok(neks)
}
