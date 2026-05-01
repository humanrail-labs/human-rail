use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DwalletArtifact {
    pub created_at: String,
    pub network: String,
    pub ika_program_id: String,
    pub grpc_endpoint: String,
    pub creator: String,
    pub curve: String,
    pub dwallet_signing_public_key_hex: String,
    pub dwallet_signing_public_key_base64: String,
    pub dwallet_pda: String,
    pub authority: String,
    pub state: String,
    pub dkg_attestation_base64: String,
    pub network_pubkey_base64: String,
    pub epoch: u64,
    pub session_identifier_preimage_base64: String,
    pub notes: String,
}
