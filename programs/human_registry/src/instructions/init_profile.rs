use anchor_lang::prelude::*;

use crate::state::{HumanProfile, MAX_ATTESTATIONS};

/// Initialize a new HumanProfile PDA for the calling authority.
pub fn handle(ctx: Context<InitProfile>) -> Result<()> {
    let profile = &mut ctx.accounts.profile;

    profile.wallet = ctx.accounts.authority.key();
    profile.human_score = 0;
    profile.is_unique = false;
    profile.attestation_count = 0;
    profile.last_attestation_at = 0;
    profile.last_attestation_hash = [0u8; 32];
    profile.attestations = Vec::with_capacity(MAX_ATTESTATIONS);
    profile.bump = ctx.bumps.profile;

    msg!("Initialized profile for wallet: {}", profile.wallet);

    Ok(())
}

#[derive(Accounts)]
pub struct InitProfile<'info> {
    /// The wallet for which we are creating a profile.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// PDA storing the HumanProfile for this authority.
    #[account(
        init,
        payer = authority,
        space = 8 + HumanProfile::LEN,
        seeds = [b"human_profile", authority.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, HumanProfile>,

    /// System program for account creation.
    pub system_program: Program<'info, System>,
}
