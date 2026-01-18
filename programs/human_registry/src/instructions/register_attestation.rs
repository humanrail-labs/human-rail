use anchor_lang::prelude::*;

use crate::{
    error::HumanRegistryError,
    state::{AttestationRef, HumanProfileLegacy, MAX_ATTESTATIONS},
};

/// Register a new attestation and update the profile's human score.
/// 
/// SECURITY: This legacy path is DISABLED. It allowed arbitrary attestations
/// without issuer verification, enabling score inflation attacks.
/// Use `issue_attestation` with a registered issuer instead.
#[allow(unused_variables)]
pub fn handle(
    ctx: Context<RegisterAttestation>,
    source: Pubkey,
    payload_hash: [u8; 32],
    weight: u16,
) -> Result<()> {
    // H-12 FIX: Disable legacy attestation path - no issuer verification
    // All attestations must go through issue_attestation with verified issuers
    return Err(HumanRegistryError::LegacyPathDisabled.into());
}

#[derive(Accounts)]
pub struct RegisterAttestation<'info> {
    /// The wallet that owns the profile and signs the transaction.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The HumanProfile PDA tied to the authority wallet.
    #[account(
        mut,
        seeds = [b"human_profile", authority.key().as_ref()],
        bump = profile.bump
    )]
    pub profile: Account<'info, HumanProfileLegacy>,
}

/// Event emitted when an attestation is registered.
#[event]
pub struct AttestationRegistered {
    pub profile: Pubkey,
    pub wallet: Pubkey,
    pub source: Pubkey,
    pub payload_hash: [u8; 32],
    pub weight: u16,
    pub new_score: u16,
    pub is_unique: bool,
    pub attestation_count: u32,
    pub timestamp: i64,
}