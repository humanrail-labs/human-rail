use crate::state_v2::IssuerRegistry;
use anchor_lang::prelude::*;

/// Initialize the issuer registry.
/// This must be called once before any issuers can be registered.
pub fn handler(ctx: Context<InitRegistry>) -> Result<()> {
    let registry = &mut ctx.accounts.registry;

    registry.admin = ctx.accounts.admin.key();
    registry.issuer_count = 0;
    registry.registration_paused = false;
    registry.min_attestation_weight = 1;
    registry.max_attestation_weight = 100;
    registry.bump = ctx.bumps.registry;

    msg!("Issuer registry initialized with admin: {}", registry.admin);
    Ok(())
}

#[derive(Accounts)]
pub struct InitRegistry<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = IssuerRegistry::LEN,
        seeds = [b"issuer_registry"],
        bump
    )]
    pub registry: Account<'info, IssuerRegistry>,

    pub system_program: Program<'info, System>,
}
