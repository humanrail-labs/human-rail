use anchor_lang::prelude::*;

use crate::{
    error::HumanRegistryError,
    state::{AttestationRef, HumanProfileLegacy, MAX_ATTESTATIONS},
};

/// Register a new attestation and update the profile's human score.
pub fn handle(
    ctx: Context<RegisterAttestation>,
    source: Pubkey,
    payload_hash: [u8; 32],
    weight: u16,
) -> Result<()> {
    let clock = Clock::get()?;
    
    // Get profile_key BEFORE mutable borrow
    let profile_key = ctx.accounts.profile.key();
    
    // Now take mutable borrow
    let profile = &mut ctx.accounts.profile;

    // Check if we've hit the attestation limit
    require!(
        profile.attestations.len() < MAX_ATTESTATIONS,
        HumanRegistryError::TooManyAttestations
    );

    // Create new attestation reference
    let attestation = AttestationRef {
        source,
        payload_hash,
        weight,
    };

    // Add to bounded Vec
    profile.attestations.push(attestation);

    // Update tracking fields
    profile.attestation_count = profile.attestation_count.saturating_add(1);
    profile.last_attestation_at = clock.unix_timestamp;
    profile.last_attestation_hash = payload_hash;

    // Recompute score and uniqueness
    profile.recompute_score();

    // Get values for event
    let wallet = profile.wallet;
    let new_score = profile.human_score;
    let is_unique = profile.is_unique;
    let attestation_count = profile.attestation_count;

    // Emit event for easy inspection
    emit!(AttestationRegistered {
        profile: profile_key,
        wallet,
        source,
        payload_hash,
        weight,
        new_score,
        is_unique,
        attestation_count,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Attestation registered: count={}, score={}, unique={}",
        attestation_count,
        new_score,
        is_unique
    );

    Ok(())
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
