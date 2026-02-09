use crate::{error::HumanRegistryError, state_v2::HumanProfile};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct AssertUnique<'info> {
    #[account(
        seeds = [b"human_profile", wallet.key().as_ref()],
        bump = profile.bump,
        constraint = profile.wallet == wallet.key() @ HumanRegistryError::Unauthorized
    )]
    pub profile: Account<'info, HumanProfile>,

    /// The wallet being verified — must match profile.
    /// CHECK: Verified via profile constraint.
    pub wallet: UncheckedAccount<'info>,
}

/// Assert that a human profile meets minimum requirements.
/// Designed for CPI calls from other programs.
/// Does not modify state — only validates.
pub fn handler(ctx: Context<AssertUnique>, min_score: u16) -> Result<()> {
    let profile = &ctx.accounts.profile;

    require!(
        profile.human_score >= min_score,
        HumanRegistryError::InsufficientHumanScore
    );

    if min_score >= 5000 {
        require!(profile.is_unique, HumanRegistryError::NotUniqueHuman);
    }

    msg!(
        "Profile {} verified: score={}, unique={}, can_register_agents={}",
        profile.wallet,
        profile.human_score,
        profile.is_unique,
        profile.can_register_agents
    );

    Ok(())
}
