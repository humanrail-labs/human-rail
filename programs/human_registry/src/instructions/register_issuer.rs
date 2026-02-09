use anchor_lang::prelude::*;

use crate::state_v2::{
    Issuer, IssuerRegistry, IssuerStatus, IssuerType, DEFAULT_ATTESTATION_VALIDITY,
};

/// Register a new trusted attestation issuer.
/// Only the registry admin can add issuers.
pub fn handler(ctx: Context<RegisterIssuer>, params: RegisterIssuerParams) -> Result<()> {
    let clock = Clock::get()?;
    let registry = &mut ctx.accounts.registry;
    let issuer = &mut ctx.accounts.issuer;

    // Validate weight limits
    require!(
        params.max_weight >= registry.min_attestation_weight
            && params.max_weight <= registry.max_attestation_weight,
        IssuerError::InvalidWeight
    );

    issuer.authority = params.authority;
    issuer.name = params.name;
    issuer.issuer_type = params.issuer_type;
    issuer.status = IssuerStatus::Active;
    issuer.max_weight = params.max_weight;
    issuer.contributes_to_uniqueness = params.contributes_to_uniqueness;
    issuer.default_validity = params
        .default_validity
        .unwrap_or(DEFAULT_ATTESTATION_VALIDITY);
    issuer.attestations_issued = 0;
    issuer.attestations_revoked = 0;
    issuer.registered_at = clock.unix_timestamp;
    issuer.registered_by = ctx.accounts.admin.key();
    issuer.bump = ctx.bumps.issuer;

    if let Some(uri) = params.metadata_uri {
        issuer.metadata_uri = uri;
        issuer.has_metadata_uri = true;
    } else {
        issuer.metadata_uri = [0u8; 64];
        issuer.has_metadata_uri = false;
    }

    registry.issuer_count = registry.issuer_count.saturating_add(1);

    emit!(IssuerRegistered {
        issuer: issuer.key(),
        authority: issuer.authority,
        name: issuer.name,
        issuer_type: issuer.issuer_type,
        max_weight: issuer.max_weight,
        contributes_to_uniqueness: issuer.contributes_to_uniqueness,
        registered_by: issuer.registered_by,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Issuer registered: authority={}, type={:?}",
        issuer.authority,
        issuer.issuer_type
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(params: RegisterIssuerParams)]
pub struct RegisterIssuer<'info> {
    /// Registry admin
    #[account(
        mut,
        constraint = admin.key() == registry.admin @ IssuerError::Unauthorized
    )]
    pub admin: Signer<'info>,

    /// The issuer registry
    #[account(
        mut,
        seeds = [b"issuer_registry"],
        bump = registry.bump
    )]
    pub registry: Account<'info, IssuerRegistry>,

    /// The new issuer account
    #[account(
        init,
        payer = admin,
        space = Issuer::LEN,
        seeds = [b"issuer", params.authority.as_ref()],
        bump
    )]
    pub issuer: Account<'info, Issuer>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RegisterIssuerParams {
    /// Issuer's signing authority
    pub authority: Pubkey,
    /// Human-readable name (32 bytes)
    pub name: [u8; 32],
    /// Type of attestations this issuer provides
    pub issuer_type: IssuerType,
    /// Maximum weight per attestation
    pub max_weight: u16,
    /// Whether attestations count toward uniqueness
    pub contributes_to_uniqueness: bool,
    /// Default validity period (None = use registry default)
    pub default_validity: Option<i64>,
    /// Optional metadata URI
    pub metadata_uri: Option<[u8; 64]>,
}

#[event]
pub struct IssuerRegistered {
    pub issuer: Pubkey,
    pub authority: Pubkey,
    pub name: [u8; 32],
    pub issuer_type: IssuerType,
    pub max_weight: u16,
    pub contributes_to_uniqueness: bool,
    pub registered_by: Pubkey,
    pub timestamp: i64,
}

#[error_code]
pub enum IssuerError {
    #[msg("Unauthorized: not registry admin")]
    Unauthorized,

    #[msg("Invalid attestation weight")]
    InvalidWeight,

    #[msg("Issuer not active")]
    IssuerNotActive,

    #[msg("Registration is paused")]
    RegistrationPaused,
}
