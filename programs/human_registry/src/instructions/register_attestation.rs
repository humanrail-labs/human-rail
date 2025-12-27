use anchor_lang::prelude::*;

use crate::{
    error::HumanRegistryError,
    state::{AttestationRef, HumanProfile, MAX_ATTESTATIONS},
};

/// Register a new attestation and update the profile's human score.
pub fn handle(
    ctx: Context<RegisterAttestation>,
    source: Pubkey,
    payload_hash: [u8; 32],
    weight: u16,
) -> Result<()> {
    let profile = &mut ctx.accounts.profile;
    let clock = Clock::get()?;

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

    // Emit event for easy inspection
    emit!(AttestationRegistered {
        profile: ctx.accounts.profile.key(),
        wallet: profile.wallet,
        source,
        payload_hash,
        weight,
        new_score: profile.human_score,
        is_unique: profile.is_unique,
        attestation_count: profile.attestation_count,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Attestation registered: count={}, score={}, unique={}",
        profile.attestation_count,
        profile.human_score,
        profile.is_unique
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
    pub profile: Account<'info, HumanProfile>,
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
