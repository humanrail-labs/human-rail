use anchor_lang::prelude::*;
use crate::{
    AttestationInput,
    error::HumanRegistryError,
    state::{HumanProfile, AttestationRef, MAX_ATTESTATIONS},
    utils::{
        verify_attestation, 
        get_attestation_weight, 
        attestation_type_to_u8,
        calculate_human_score,
        is_unique_human
    },
};

#[derive(Accounts)]
pub struct RegisterAttestation<'info> {
    #[account(
        mut,
        seeds = [b"human_profile", wallet.key().as_ref()],
        bump = profile.bump,
        constraint = profile.wallet == wallet.key() @ HumanRegistryError::Unauthorized
    )]
    pub profile: Account<'info, HumanProfile>,

    pub wallet: Signer<'info>,
}

pub fn handler(ctx: Context<RegisterAttestation>, attestation: AttestationInput) -> Result<()> {
    let profile = &mut ctx.accounts.profile;
    let clock = Clock::get()?;

    // Check we haven't reached max attestations
    require!(
        (profile.attestation_count as usize) < MAX_ATTESTATIONS,
        HumanRegistryError::MaxAttestationsReached
    );

    // Check for duplicate attestation from same source
    for i in 0..(profile.attestation_count as usize) {
        if profile.attestations[i].source_id == attestation.source_id {
            return Err(HumanRegistryError::AttestationAlreadyRegistered.into());
        }
    }

    // Verify the attestation
    require!(
        verify_attestation(
            &attestation.source_id,
            &attestation.payload_hash,
            &attestation.signature,
            attestation.attestation_type
        ),
        HumanRegistryError::InvalidAttestationSignature
    );

    // Get weight for this attestation type
    let weight = get_attestation_weight(attestation.attestation_type);

    // Store the attestation reference
    let idx = profile.attestation_count as usize;
    profile.attestations[idx] = AttestationRef {
        source_id: attestation.source_id,
        payload_hash: attestation.payload_hash,
        attestation_type: attestation_type_to_u8(attestation.attestation_type),
        score_weight: weight,
        registered_at: clock.unix_timestamp,
        is_active: true,
    };
    profile.attestation_count += 1;

    // Recalculate score
    profile.human_score = calculate_human_score(&profile.attestations, profile.attestation_count);
    profile.is_unique = is_unique_human(profile.human_score, profile.attestation_count);
    profile.last_updated = clock.unix_timestamp;

    msg!(
        "Registered attestation for profile. New score: {}, is_unique: {}",
        profile.human_score,
        profile.is_unique
    );

    Ok(())
}
