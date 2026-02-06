use anchor_lang::prelude::*;
use crate::state_v2::HumanProfile;

/// Initialize a new HumanProfile PDA for the calling authority.
pub fn handle(ctx: Context<InitProfile>) -> Result<()> {
    let clock = Clock::get()?;
    let profile = &mut ctx.accounts.profile;
    profile.wallet = ctx.accounts.authority.key();
    profile.human_score = 0;
    profile.is_unique = false;
    profile.total_attestation_count = 0;
    profile.active_attestation_count = 0;
    profile.last_attestation_at = 0;
    profile.last_score_update = 0;
    profile.attestations = Vec::new();
    // SECURITY: Default false — only enabled when recompute_score()
    // finds human_score >= MIN_HUMAN_SCORE_FOR_AGENT (50)
    profile.can_register_agents = false;
    profile.agents_registered = 0;
    profile.created_at = clock.unix_timestamp;
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
    /// NOTE: HumanProfile::LEN already includes the 8-byte Anchor discriminator.
    #[account(
        init,
        payer = authority,
        space = HumanProfile::LEN,
        seeds = [b"human_profile", authority.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, HumanProfile>,
    /// System program for account creation.
    pub system_program: Program<'info, System>,
}
