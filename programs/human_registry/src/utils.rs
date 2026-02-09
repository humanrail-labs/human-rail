use crate::state::AttestationRef;
use anchor_lang::prelude::*;

/// Calculate total human score from attestations
pub fn calculate_human_score(attestations: &[AttestationRef], _count: u8) -> u16 {
    let mut total: u32 = 0;

    for att in attestations.iter() {
        total = total.saturating_add(att.weight as u32);
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
pub fn get_profile_seeds(wallet: &Pubkey) -> [&[u8]; 2] {
    [b"human_profile", wallet.as_ref()]
}

/// Seeds for RegistryConfig PDA
pub fn get_config_seeds() -> [&'static [u8]; 1] {
    [b"registry_config"]
}
