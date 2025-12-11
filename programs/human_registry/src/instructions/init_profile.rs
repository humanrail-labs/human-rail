use anchor_lang::prelude::*;
use crate::state::{HumanProfile, MAX_ATTESTATIONS, AttestationRef};

#[derive(Accounts)]
pub struct InitProfile<'info> {
    #[account(
        init,
        payer = wallet,
        space = HumanProfile::LEN,
        seeds = [b"human_profile", wallet.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, HumanProfile>,

    #[account(mut)]
    pub wallet: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitProfile>) -> Result<()> {
    let profile = &mut ctx.accounts.profile;
    let clock = Clock::get()?;

    profile.wallet = ctx.accounts.wallet.key();
    profile.human_score = 0;
    profile.is_unique = false;
    profile.attestation_count = 0;
    profile.attestations = [AttestationRef::default(); MAX_ATTESTATIONS];
    profile.last_updated = clock.unix_timestamp;
    profile.bump = ctx.bumps.profile;

    msg!("Initialized human profile for wallet: {}", profile.wallet);
    
    Ok(())
}
