use anchor_lang::prelude::*;

use crate::state_v2::{AttestationStatus, HumanProfile, Issuer, SignedAttestation};

/// Revoke an attestation. Can be called by:
/// - The issuer authority (issuer-initiated revocation)
/// - The profile owner (self-revocation)
pub fn handler(ctx: Context<RevokeAttestation>) -> Result<()> {
    let clock = Clock::get()?;
    let attestation = &mut ctx.accounts.attestation;
    let profile = &mut ctx.accounts.profile;
    let issuer = &mut ctx.accounts.issuer;

    // Validate attestation is not already revoked
    require!(
        attestation.status != AttestationStatus::Revoked,
        RevokeError::AlreadyRevoked
    );

    // Validate caller is either issuer or profile owner
    let is_issuer = ctx.accounts.authority.key() == issuer.authority;
    let is_profile_owner = ctx.accounts.authority.key() == profile.wallet;
    require!(is_issuer || is_profile_owner, RevokeError::Unauthorized);

    // Revoke attestation
    attestation.status = AttestationStatus::Revoked;
    attestation.revoked_at = clock.unix_timestamp;

    // Remove from profile's attestation list
    profile.remove_attestation(&attestation.key());

    // Recompute profile score
    profile.recompute_score(clock.unix_timestamp);

    // Update issuer stats
    issuer.attestations_revoked = issuer.attestations_revoked.saturating_add(1);

    emit!(AttestationRevoked {
        attestation: attestation.key(),
        profile: profile.key(),
        issuer: issuer.key(),
        revoked_by: ctx.accounts.authority.key(),
        was_issuer_revocation: is_issuer,
        new_human_score: profile.human_score,
        is_unique: profile.is_unique,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Attestation revoked: profile={}, new_score={}",
        profile.wallet,
        profile.human_score
    );

    Ok(())
}

#[derive(Accounts)]
pub struct RevokeAttestation<'info> {
    /// Authority revoking - either issuer or profile owner
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The attestation to revoke
    #[account(
        mut,
        seeds = [
            b"attestation",
            attestation.profile.as_ref(),
            attestation.issuer.as_ref(),
            &attestation.nonce.to_le_bytes()
        ],
        bump = attestation.bump
    )]
    pub attestation: Account<'info, SignedAttestation>,

    /// The profile that has this attestation
    #[account(
        mut,
        seeds = [b"human_profile", profile.wallet.as_ref()],
        bump = profile.bump,
        constraint = profile.key() == attestation.profile @ RevokeError::ProfileMismatch
    )]
    pub profile: Account<'info, HumanProfile>,

    /// The issuer who created the attestation
    #[account(
        mut,
        seeds = [b"issuer", issuer.authority.as_ref()],
        bump = issuer.bump,
        constraint = issuer.key() == attestation.issuer @ RevokeError::IssuerMismatch
    )]
    pub issuer: Account<'info, Issuer>,
}

#[event]
pub struct AttestationRevoked {
    pub attestation: Pubkey,
    pub profile: Pubkey,
    pub issuer: Pubkey,
    pub revoked_by: Pubkey,
    pub was_issuer_revocation: bool,
    pub new_human_score: u16,
    pub is_unique: bool,
    pub timestamp: i64,
}

#[error_code]
pub enum RevokeError {
    #[msg("Unauthorized: must be issuer or profile owner")]
    Unauthorized,

    #[msg("Attestation already revoked")]
    AlreadyRevoked,

    #[msg("Profile does not match attestation")]
    ProfileMismatch,

    #[msg("Issuer does not match attestation")]
    IssuerMismatch,
}
