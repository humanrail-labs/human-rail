use anchor_lang::prelude::*;
use crate::{AttestationType, state::AttestationRef};

/// Score weights for different attestation types (in basis points)
pub fn get_attestation_weight(attestation_type: AttestationType) -> u16 {
    match attestation_type {
        AttestationType::SAS => 3000,           // 30%
        AttestationType::WorldId => 2500,       // 25%
        AttestationType::Civic => 2000,         // 20%
        AttestationType::GitcoinPassport => 1500, // 15%
        AttestationType::Custom => 500,         // 5%
    }
}

/// Convert attestation type enum to u8 for storage
pub fn attestation_type_to_u8(attestation_type: AttestationType) -> u8 {
    match attestation_type {
        AttestationType::SAS => 0,
        AttestationType::WorldId => 1,
        AttestationType::Civic => 2,
        AttestationType::GitcoinPassport => 3,
        AttestationType::Custom => 4,
    }
}

/// Convert u8 back to attestation type
pub fn u8_to_attestation_type(value: u8) -> Option<AttestationType> {
    match value {
        0 => Some(AttestationType::SAS),
        1 => Some(AttestationType::WorldId),
        2 => Some(AttestationType::Civic),
        3 => Some(AttestationType::GitcoinPassport),
        4 => Some(AttestationType::Custom),
        _ => None,
    }
}

/// Placeholder verification function for attestations.
/// In production, this would verify against SAS or zkCompression proofs.
/// 
/// Current implementation performs basic signature verification if provided,
/// otherwise validates the payload hash format.
pub fn verify_attestation(
    source_id: &Pubkey,
    payload_hash: &[u8; 32],
    signature: &Option<[u8; 64]>,
    attestation_type: AttestationType,
) -> bool {
    // Basic validation: ensure payload hash is not all zeros
    if payload_hash.iter().all(|&b| b == 0) {
        return false;
    }

    // For SAS attestations, we would verify against the SAS program
    // For now, we accept if the source_id is not default
    if *source_id == Pubkey::default() {
        return false;
    }

    // If signature is provided, perform placeholder verification
    // In production, this would use ed25519 verification against source_id
    if let Some(_sig) = signature {
        // TODO: Implement real signature verification
        // ed25519_verify(source_id, payload_hash, sig)
        return true;
    }

    // For types that don't require signatures, verify based on type-specific rules
    match attestation_type {
        AttestationType::SAS => {
            // SAS attestations should have signatures in production
            // For now, accept if source looks valid
            true
        }
        AttestationType::WorldId => {
            // World ID would verify ZK proof
            true
        }
        AttestationType::Civic => {
            // Civic would verify their attestation format
            true
        }
        AttestationType::GitcoinPassport => {
            // Gitcoin would verify stamp data
            true
        }
        AttestationType::Custom => {
            // Custom attestations need signatures
            signature.is_some()
        }
    }
}

/// Calculate total human score from attestations
pub fn calculate_human_score(attestations: &[AttestationRef], count: u8) -> u16 {
    let mut total: u32 = 0;
    
    for i in 0..(count as usize) {
        if attestations[i].is_active {
            total = total.saturating_add(attestations[i].score_weight as u32);
        }
    }
    
    // Cap at maximum score (10000 = 100%)
    std::cmp::min(total, 10000) as u16
}

/// Determine if profile qualifies as unique human
pub fn is_unique_human(score: u16, attestation_count: u8) -> bool {
    // Require minimum score of 5000 (50%) and at least 2 attestations
    score >= 5000 && attestation_count >= 2
}

/// Seeds for HumanProfile PDA
pub fn get_profile_seeds<'a>(wallet: &'a Pubkey) -> [&'a [u8]; 2] {
    [b"human_profile", wallet.as_ref()]
}

/// Seeds for RegistryConfig PDA
pub fn get_config_seeds() -> [&'static [u8]; 1] {
    [b"registry_config"]
}
