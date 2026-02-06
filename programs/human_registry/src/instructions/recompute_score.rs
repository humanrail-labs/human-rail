use anchor_lang::prelude::*;
use crate::{
    error::HumanRegistryError,
    state_v2::HumanProfile,
};

#[derive(Accounts)]
pub struct RecomputeScore<'info> {
    #[account(
        mut,
        seeds = [b"human_profile", wallet.key().as_ref()],
        bump = profile.bump,
        constraint = profile.wallet == wallet.key() @ HumanRegistryError::Unauthorized
    )]
    pub profile: Account<'info, HumanProfile>,

    pub wallet: Signer<'info>,
}

/// Recompute human_score from active attestations (v2 profile).
pub fn handler(ctx: Context<RecomputeScore>) -> Result<()> {
    let clock = Clock::get()?;
    let profile = &mut ctx.accounts.profile;

    let old_score = profile.human_score;
    let old_unique = profile.is_unique;
    let old_can_register = profile.can_register_agents;

    // v2 recompute_score takes current timestamp for expiry checks
    profile.recompute_score(clock.unix_timestamp);

    msg!(
        "Recomputed score: {} -> {} (unique: {} -> {}, can_register: {} -> {})",
        old_score,
        profile.human_score,
        old_unique,
        profile.is_unique,
        old_can_register,
        profile.can_register_agents
    );

    Ok(())
}
