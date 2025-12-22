use anchor_lang::prelude::*;

use crate::error::HumanRegistryError;
use crate::state::{AttestationRef, HumanProfile, MAX_ATTESTATIONS};

/// Register or update an attestation for the caller's profile and recompute score.
pub fn handle(
    ctx: Context<RegisterAttestation>,
    source: Pubkey,
    payload_hash: [u8; 32],
    weight: u16,
) -> Result<()> {
    let profile = &mut ctx.accounts.profile;

    // Ensure only the owner of the profile can modify its attestations.
    require!(
        profile.wallet == ctx.accounts.authority.key(),
        HumanRegistryError::WalletMismatch
    );

    // Update an existing attestation from the same source if present.
    if let Some(existing) = profile
        .attestations
        .iter_mut()
        .find(|att| att.source == source)
    ) {
        existing.payload_hash = payload_hash;
        existing.weight = weight;
    } else {
        // Otherwise append a new attestation, respecting the max capacity.
        require!(
            profile.attestations.len() < MAX_ATTESTATIONS,
            HumanRegistryError::TooManyAttestations
        );

        profile.attestations.push(AttestationRef {
            source,
            payload_hash,
            weight,
        });
    }

    // Recompute aggregated score and uniqueness flag.
    profile.recompute_score();

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
        seeds = [b"profile", authority.key().as_ref()],
        bump = profile.bump
    )]
    pub profile: Account<'info, HumanProfile>,
}
